import { BadRequestException, Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { IntentExportService } from './intent-export.service';

type ExportFormat = 'md' | 'pdf' | 'docx';

@UseGuards(AuthGuard)
@Controller('v1/intents/:intentId/export')
export class IntentExportController {
  constructor(private readonly exports: IntentExportService) {}

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

    const model = await this.exports.buildModel(intentId, user.orgId);
    const rendered = await this.exports.render(format, model);

    res.setHeader('Content-Type', rendered.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="intent-${intentId}-l1.${rendered.extension}"`,
    );
    res.send(rendered.data);
  }
}
