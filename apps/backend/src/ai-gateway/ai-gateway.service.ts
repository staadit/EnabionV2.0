import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { PrismaService } from '../prisma.service';
import { AiGatewayConfig } from './ai-gateway.config';
import { AI_GATEWAY_CONFIG, AI_RATE_LIMITER } from './ai-gateway.tokens';
import type { AiGatewayRequest, AiGatewayResponse } from './ai-gateway.types';
import { normalizeUseCase } from './use-cases';
import { redactForLogs } from './redact';
import { OpenAiProvider, OpenAiProviderError } from './openai.provider';
import type { RateLimiter } from './rate-limiter';

const MAX_TEMPERATURE = 1.2;
const MIN_TEMPERATURE = 0;

@Injectable()
export class AiGatewayService {
  constructor(
    @Inject(AI_GATEWAY_CONFIG) private readonly config: AiGatewayConfig,
    @Inject(AI_RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    private readonly provider: OpenAiProvider,
    private readonly events: EventService,
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AiGatewayService.name);
  }

  async generateText(request: AiGatewayRequest): Promise<AiGatewayResponse> {
    const requestId = request.requestId || randomUUID();
    let useCase: string;
    try {
      useCase = normalizeUseCase(request.useCase);
    } catch {
      throw new BadRequestException('AI_USE_CASE_INVALID');
    }
    const model = (request.model || this.config.defaultModel || '').trim();
    if (request.inputClass !== 'L1' && request.inputClass !== 'L2') {
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_FAILED, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model: model || this.config.defaultModel,
        errorClass: 'INPUT_CLASS_REQUIRED',
      });
      throw new BadRequestException('AI_INPUT_CLASS_REQUIRED');
    }
    if (!model) {
      throw new BadRequestException('AI_MODEL_REQUIRED');
    }
    if (!this.config.allowedModels.includes(model)) {
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_FAILED, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        errorClass: 'MODEL_NOT_ALLOWED',
      });
      throw new BadRequestException('AI_MODEL_NOT_ALLOWED');
    }

    if (!request.messages || request.messages.length === 0) {
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_FAILED, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        errorClass: 'EMPTY_MESSAGES',
      });
      throw new BadRequestException('AI_MESSAGES_REQUIRED');
    }

    const redacted = redactForLogs(request);
    if (redacted.totalChars > this.config.maxInputChars) {
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_FAILED, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        errorClass: 'INPUT_TOO_LARGE',
      });
      throw new BadRequestException('AI_INPUT_TOO_LARGE');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: request.tenantId },
      select: { policyAiEnabled: true },
    });
    if (!org || !org.policyAiEnabled) {
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_BLOCKED_POLICY, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        errorClass: 'POLICY_DISABLED',
      });
      throw new ForbiddenException('AI_POLICY_DISABLED');
    }

    const containsL2 = request.containsL2 ?? request.inputClass === 'L2';
    if (request.inputClass === 'L2' || containsL2) {
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_BLOCKED_POLICY, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        errorClass: 'INPUT_CLASS_L2',
      });
      throw new ForbiddenException('AI_INPUT_L2_BLOCKED');
    }

    await this.checkRateLimits(request, useCase, requestId, model);

    const maxOutputTokens = this.clamp(
      request.maxOutputTokens ?? this.config.maxOutputTokens,
      1,
      this.config.maxOutputTokens,
    );
    const temperature = this.clamp(
      request.temperature ?? this.config.defaultTemperature,
      MIN_TEMPERATURE,
      MAX_TEMPERATURE,
    );

    await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_REQUESTED, requestId, {
      tenantId: request.tenantId,
      userId: request.userId ?? null,
      useCase,
      model,
      inputClass: request.inputClass,
      containsL2,
      messageCount: redacted.messageCount,
      totalChars: redacted.totalChars,
      contentHash: redacted.contentHash,
    });

    this.logger.info(
      {
        requestId,
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        ...redacted,
      },
      'AI gateway request',
    );

    const started = Date.now();
    try {
      const result = await this.provider.generateText({
        model,
        messages: request.messages,
        maxOutputTokens,
        temperature,
      });
      const latencyMs = Date.now() - started;

      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_SUCCEEDED, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model: result.model || model,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
        totalTokens: result.usage?.totalTokens ?? null,
        latencyMs,
      });

      return {
        text: result.text,
        model: result.model || model,
        provider: 'openai',
        usage: result.usage,
        latencyMs,
        requestId,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - started;
      const errorClass =
        err instanceof OpenAiProviderError ? err.errorClass : 'PROVIDER_ERROR';
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_FAILED, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        errorClass,
        latencyMs,
      });
      throw new ServiceUnavailableException('AI_PROVIDER_FAILED');
    }
  }

  private async checkRateLimits(
    request: AiGatewayRequest,
    useCase: string,
    requestId: string,
    model: string,
  ) {
    const perUseCase = this.config.rateLimit.useCaseRpm[useCase];
    const tenantLimit = perUseCase ?? this.config.rateLimit.tenantRpm;
    const userLimit = perUseCase ?? this.config.rateLimit.userRpm;
    const now = new Date();

    const tenantKey = `tenant:${request.tenantId}:useCase:${useCase}`;
    const tenantResult = await this.rateLimiter.consume(tenantKey, tenantLimit, now);
    if (!tenantResult.allowed) {
      await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_RATE_LIMITED, requestId, {
        tenantId: request.tenantId,
        userId: request.userId ?? null,
        useCase,
        model,
        errorClass: 'TENANT_RATE_LIMIT',
      });
      throw new HttpException('AI_RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (request.userId) {
      const userKey = `user:${request.userId}:useCase:${useCase}`;
      const userResult = await this.rateLimiter.consume(userKey, userLimit, now);
      if (!userResult.allowed) {
        await this.emitGatewayEvent(EVENT_TYPES.AI_GATEWAY_RATE_LIMITED, requestId, {
          tenantId: request.tenantId,
          userId: request.userId,
          useCase,
          model,
          errorClass: 'USER_RATE_LIMIT',
        });
        throw new HttpException('AI_RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }

  private clamp(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  private async emitGatewayEvent(type: string, requestId: string, payload: Record<string, any>) {
    await this.events.emitEvent({
      type: type as any,
      occurredAt: new Date(),
      orgId: payload.tenantId,
      actorUserId: payload.userId ?? undefined,
      actorOrgId: payload.tenantId,
      subjectType: 'AI_GATEWAY',
      subjectId: requestId,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'system',
      correlationId: requestId,
      payload: {
        payloadVersion: 1,
        requestId,
        ...payload,
      },
    });
  }
}
