import { BadRequestException, Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ulid } from 'ulid';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { IntentExportService } from './intent-export.service';

type ExportFormat = 'md' | 'pdf' | 'docx';

@UseGuards(AuthGuard)
@Controller('v1/intents/:intentId/export')
export class IntentExportController {
  constructor(
    private readonly exports: IntentExportService,
    private readonly events: EventService,
  ) {}

  @Get()
  async exportIntent(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('intentId') intentId: string,
    @Query('format') formatQuery?: ExportFormat,
  ) {
    const user = req.user;
    if (!user) throw new BadRequestException('Missing session');
    const format: ExportFormat = formatQuery ?? 'md';
    const correlationId = (req.headers['x-request-id'] as string) ?? ulid();

    const model = await this.exports.buildModel(intentId, user.orgId);
    const rendered = await this.exports.render(format, model);
    const exportId = ulid();
    const lifecycleStep = this.mapLifecycleStep(model.pipelineStage);
    const payloadFormat = format === 'md' ? 'markdown' : format === 'pdf' ? 'pdf' : 'docx';

    await this.events.emitEvent({
      orgId: user.orgId,
      actorUserId: user.id,
      actorOrgId: user.orgId,
      subjectType: 'EXPORT',
      subjectId: exportId,
      lifecycleStep,
      pipelineStage: (model.pipelineStage as any) || 'NEW',
      channel: 'ui',
      correlationId,
      occurredAt: new Date(),
      type: EVENT_TYPES.EXPORT_GENERATED,
      payload: {
        payloadVersion: 1,
        intentId,
        exportId,
        format: payloadFormat,
      },
    });

    res.setHeader('Content-Type', rendered.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="intent-${intentId}-l1.${rendered.extension}"`,
    );
    res.send(rendered.data);
  }

  private mapLifecycleStep(pipelineStage?: string | null) {
    const stage = pipelineStage?.toUpperCase();
    if (stage === 'MATCH') return 'MATCH_ALIGN';
    if (stage === 'COMMIT') return 'COMMIT_ASSURE';
    return 'CLARIFY';
  }
}
