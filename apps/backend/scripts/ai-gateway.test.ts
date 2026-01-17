import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { AiGatewayService } from '../src/ai-gateway/ai-gateway.service';
import { PiiRedactionService } from '../src/ai-gateway/pii-redaction.service';
import { MemoryRateLimiter } from '../src/ai-gateway/rate-limiter';
import { redactForLogs } from '../src/ai-gateway/redact';
import type { AiGatewayConfig } from '../src/ai-gateway/ai-gateway.config';
import type { AiGatewayRequest } from '../src/ai-gateway/ai-gateway.types';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

class StubProvider {
  lastArgs: any = null;
  async generateText(args: any) {
    this.lastArgs = args;
    return {
      text: 'ok',
      model: args.model,
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    };
  }
}

class StubEventService {
  events: any[] = [];
  async emitEvent(event: any) {
    this.events.push(event);
    return event;
  }
}

class StubPrisma {
  organization = {
    findUnique: async () => ({ policyAiEnabled: true }),
  };
}

class StubAiAccessService {
  constructor(private readonly allowL2: boolean) {}
  async resolveAiDataAccess() {
    return { allowL2: this.allowL2, reason: 'TOGGLE_DISABLED' };
  }
}

function buildGateway(overrides?: Partial<AiGatewayConfig>, allowL2 = false) {
  const config: AiGatewayConfig = {
    openaiApiKey: 'test',
    defaultModel: 'gpt-4o-mini',
    allowedModels: ['gpt-4o-mini'],
    maxOutputTokens: 100,
    maxInputChars: 1000,
    timeoutMs: 1000,
    defaultTemperature: 0.4,
    openaiOrgId: undefined,
    openaiProjectId: undefined,
    rateLimit: {
      tenantRpm: 1,
      userRpm: 1,
      useCaseRpm: {},
      backend: 'memory',
      cleanupIntervalMs: 60000,
      retentionHours: 24,
    },
    ...overrides,
  };
  const provider = new StubProvider();
  const events = new StubEventService();
  const prisma = new StubPrisma();
  const aiAccess = new StubAiAccessService(allowL2);
  const redaction = new PiiRedactionService();
  const logger = {
    setContext: () => {},
    info: () => {},
    error: () => {},
  };
  const limiter = new MemoryRateLimiter();
  const service = new AiGatewayService(
    config,
    limiter,
    provider as any,
    events as any,
    prisma as any,
    aiAccess as any,
    redaction as any,
    logger as any,
  );
  return { service, provider, events };
}

function baseRequest(): AiGatewayRequest {
  return {
    tenantId: 'org-1',
    userId: 'user-1',
    useCase: 'intent_gap_detection',
    messages: [{ role: 'user' as const, content: 'Goal: build a pilot' }],
    inputClass: 'L1',
  };
}

async function testModelAllowlist() {
  const { service } = buildGateway();
  const request = { ...baseRequest(), model: 'bad-model' };
  let threw = false;
  try {
    await service.generateText(request);
  } catch (err) {
    threw = err instanceof BadRequestException;
  }
  assert(threw, 'Invalid model should throw BadRequestException');
}

async function testTemperatureClamp() {
  const { service, provider } = buildGateway();
  const request = { ...baseRequest(), temperature: 5 };
  await service.generateText(request);
  assert(provider.lastArgs.temperature === 1.2, 'Temperature should be clamped to 1.2');
}

async function testL2Blocked() {
  const { service } = buildGateway(undefined, false);
  const request = {
    ...baseRequest(),
    intentId: 'intent-1',
    inputClass: 'L2' as const,
    containsL2: true,
    requestedDataLevel: 'L2' as const,
  };
  let threw = false;
  try {
    await service.generateText(request);
  } catch (err) {
    threw = err instanceof ForbiddenException;
  }
  assert(threw, 'L2 input should be blocked');
}

async function testL2AllowedEmitsEvent() {
  const { service, events } = buildGateway(undefined, true);
  const request = {
    ...baseRequest(),
    intentId: 'intent-allow',
    inputClass: 'L2' as const,
    containsL2: true,
    requestedDataLevel: 'L2' as const,
    messages: [{ role: 'user' as const, content: 'Email: test@example.com' }],
  };
  await service.generateText(request);
  const l2Events = events.events.filter((event) => event.type === 'AI_L2_USED');
  assert(l2Events.length === 1, 'AI_L2_USED should be emitted for L2 requests');
  const payload = l2Events[0].payload as any;
  assert(payload.redactionApplied === true, 'AI_L2_USED should reflect redaction');
}

async function testRateLimit() {
  const { service } = buildGateway(
    {
      rateLimit: {
        tenantRpm: 1,
        userRpm: 1,
        useCaseRpm: {},
        backend: 'memory',
        cleanupIntervalMs: 60000,
        retentionHours: 24,
      },
    },
    false,
  );
  await service.generateText(baseRequest());
  let threw = false;
  try {
    await service.generateText(baseRequest());
  } catch (err) {
    threw = err instanceof HttpException && err.getStatus() === 429;
  }
  assert(threw, 'Second call should be rate limited');
}

function testRedaction() {
  const request = baseRequest();
  const redacted = redactForLogs(request);
  const payload = JSON.stringify(redacted);
  assert(!payload.includes('build a pilot'), 'Redaction should not include raw content');
}

function testPiiRedaction() {
  const redaction = new PiiRedactionService();
  const message =
    'Email: jane.doe@example.com Phone: +48 600 700 800 IBAN: PL27114020040000300201355387 PESEL 44051401358 NIP 123-456-32-18 SSN 123-45-6789';
  const result = redaction.redactInputMessages([{ role: 'user', content: message }]);
  const output = result.messages[0].content;
  assert(output.includes('[REDACTED_EMAIL]'), 'Email should be redacted');
  assert(output.includes('[REDACTED_PHONE]'), 'Phone should be redacted');
  assert(output.includes('[REDACTED_IBAN]'), 'IBAN should be redacted');
  assert(output.includes('[REDACTED_PESEL]'), 'PESEL should be redacted');
  assert(output.includes('[REDACTED_NIP]'), 'NIP should be redacted');
  assert(output.includes('[REDACTED_SSN]'), 'SSN should be redacted');
}

async function run() {
  await testModelAllowlist();
  await testTemperatureClamp();
  await testL2Blocked();
  await testL2AllowedEmitsEvent();
  await testRateLimit();
  testRedaction();
  testPiiRedaction();
  // eslint-disable-next-line no-console
  console.log('AI gateway tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
