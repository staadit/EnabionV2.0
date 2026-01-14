import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { AiGatewayService } from '../src/ai-gateway/ai-gateway.service';
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

function buildGateway(overrides?: Partial<AiGatewayConfig>) {
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
    logger as any,
  );
  return { service, provider, events };
}

function baseRequest(): AiGatewayRequest {
  return {
    tenantId: 'org-1',
    userId: 'user-1',
    useCase: 'intent_gap_detection',
    messages: [{ role: 'user', content: 'Goal: build a pilot' }],
    inputClass: 'L1',
    containsL2: false,
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
  const { service } = buildGateway();
  const request = { ...baseRequest(), inputClass: 'L2' as const };
  let threw = false;
  try {
    await service.generateText(request);
  } catch (err) {
    threw = err instanceof ForbiddenException;
  }
  assert(threw, 'L2 input should be blocked');
}

async function testRateLimit() {
  const { service } = buildGateway({
    rateLimit: {
      tenantRpm: 1,
      userRpm: 1,
      useCaseRpm: {},
      backend: 'memory',
      cleanupIntervalMs: 60000,
      retentionHours: 24,
    },
  });
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

async function run() {
  await testModelAllowlist();
  await testTemperatureClamp();
  await testL2Blocked();
  await testRateLimit();
  testRedaction();
  // eslint-disable-next-line no-console
  console.log('AI gateway tests passed.');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
