import { BadRequestException, Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { IntentRedactionService } from './intent-redaction.service';
import { ulid } from 'ulid';

@Controller('v1')
export class IntentRedactionController {
  constructor(
    private readonly redaction: IntentRedactionService,
    private readonly events: EventService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('incoming-intents')
  async listIncomingIntents(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    return this.redaction.listIncomingIntents(user.orgId);
  }

  @UseGuards(AuthGuard)
  @Get('y/inbox/intents')
  async listYInboxIntents(@Req() req: AuthenticatedRequest) {
    return this.listIncomingIntents(req);
  }

  @UseGuards(AuthGuard)
  @Get('incoming-intents/:intentId')
  async getIncomingIntent(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
  ) {
    const user = this.requireUser(req);
    const payload = await this.redaction.getIncomingPayload(intentId, user.orgId);
    await this.emitIncomingViewEvent(req, payload.intent, user);
    return payload;
  }

  @UseGuards(AuthGuard)
  @Get('y/inbox/intents/:intentId')
  async getYInboxIntent(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
  ) {
    return this.getIncomingIntent(req, intentId);
  }

  @UseGuards(AuthGuard)
  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }

  private async emitIncomingViewEvent(
    req: AuthenticatedRequest,
    intent: {
      id: string;
      stage: string;
      senderOrgId?: string | null;
    },
    user: { id: string; orgId: string },
  ) {
    if (!intent?.senderOrgId) {
      return;
    }
    const pipelineStage = (intent.stage as any) || 'NEW';
    const lifecycleStep = this.mapLifecycleStep(pipelineStage);
    const correlationId = (req.headers?.['x-request-id'] as string) ?? ulid();
    await this.events.emitEvent({
      orgId: intent.senderOrgId,
      actorUserId: user.id,
      actorOrgId: user.orgId,
      subjectType: 'INTENT',
      subjectId: intent.id,
      lifecycleStep,
      pipelineStage: pipelineStage as any,
      channel: 'ui',
      correlationId,
      occurredAt: new Date(),
      type: EVENT_TYPES.INTENT_VIEWED,
      payload: {
        payloadVersion: 1,
        intentId: intent.id,
        viewContext: 'y_portal',
      },
    });
  }

  private mapLifecycleStep(stage?: string | null) {
    const value = stage?.toUpperCase();
    if (value === 'MATCH') return 'MATCH_ALIGN';
    if (value === 'COMMIT') return 'COMMIT_ASSURE';
    return 'CLARIFY';
  }
}
