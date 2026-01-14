import {
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventModule } from '../events/event.module';
import { PrismaService } from '../prisma.service';
import { AiGatewayConfig, loadAiGatewayConfig } from './ai-gateway.config';
import { AiGatewayService } from './ai-gateway.service';
import { AI_GATEWAY_CONFIG, AI_RATE_LIMITER } from './ai-gateway.tokens';
import { OpenAiProvider } from './openai.provider';
import { MemoryRateLimiter, PostgresRateLimiter, RateLimiter } from './rate-limiter';

@Injectable()
class AiRateLimitCleanupService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(AI_GATEWAY_CONFIG) private readonly config: AiGatewayConfig,
    @Inject(AI_RATE_LIMITER) private readonly rateLimiter: RateLimiter,
  ) {}

  async onModuleInit() {
    if (!this.rateLimiter.cleanup) {
      return;
    }
    await this.runCleanup();
    this.timer = setInterval(
      () => this.runCleanup(),
      this.config.rateLimit.cleanupIntervalMs,
    );
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runCleanup() {
    if (!this.rateLimiter.cleanup) {
      return;
    }
    const cutoff = new Date(
      Date.now() - this.config.rateLimit.retentionHours * 60 * 60 * 1000,
    );
    await this.rateLimiter.cleanup(cutoff);
  }
}

@Module({
  imports: [EventModule],
  providers: [
    PrismaService,
    OpenAiProvider,
    AiGatewayService,
    AiRateLimitCleanupService,
    {
      provide: AI_GATEWAY_CONFIG,
      useFactory: (): AiGatewayConfig => loadAiGatewayConfig(),
    },
    {
      provide: AI_RATE_LIMITER,
      inject: [AI_GATEWAY_CONFIG, PrismaService],
      useFactory: (config: AiGatewayConfig, prisma: PrismaService): RateLimiter => {
        if (config.rateLimit.backend === 'memory') {
          return new MemoryRateLimiter();
        }
        return new PostgresRateLimiter(prisma);
      },
    },
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
