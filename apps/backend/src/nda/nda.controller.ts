import { NdaChannel } from '@prisma/client';
import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { NdaService } from './nda.service';

const acceptSchema = z.object({
  typedName: z.string().min(1),
  typedRole: z.string().min(1),
  language: z.string().optional(),
  counterpartyOrgId: z.string().optional(),
});

const requestSchema = z.object({
  counterpartyOrgId: z.string().min(1),
  intentId: z.string().optional(),
});

@UseGuards(AuthGuard)
@Controller('v1/nda/mutual')
export class NdaController {
  constructor(private readonly ndaService: NdaService) {}

  @Get('current')
  async getCurrent(@Req() req: AuthenticatedRequest, @Query('lang') lang?: string) {
    this.requireUser(req);
    const language = this.ndaService.normalizeLanguage(lang);
    const doc = await this.ndaService.getCurrentDocument();
    return {
      ndaVersion: doc.ndaVersion,
      enHashSha256: doc.enHashSha256,
      enMarkdown: doc.enMarkdown,
      summaryMarkdown: this.ndaService.getSummaryForLanguage(doc, language),
    };
  }

  @Get('status')
  async getStatus(
    @Req() req: AuthenticatedRequest,
    @Query('counterpartyOrgId') counterpartyOrgId?: string,
  ) {
    const user = this.requireUser(req);
    const accepted = await this.ndaService.getAcceptanceStatus({
      orgId: user.orgId,
      counterpartyOrgId: counterpartyOrgId ?? null,
    });
    if (!accepted) {
      return { accepted: false };
    }
    return {
      accepted: true,
      acceptance: {
        id: accepted.id,
        ndaVersion: accepted.ndaVersion,
        enHashSha256: accepted.enHashSha256,
        acceptedAt: accepted.acceptedAt,
        acceptedByUserId: accepted.acceptedByUserId,
        language: accepted.language,
        channel: accepted.channel,
        typedName: accepted.typedName,
        typedRole: accepted.typedRole,
        counterpartyOrgId: accepted.counterpartyOrgId ?? undefined,
      },
    };
  }

  @Post('accept')
  async accept(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(acceptSchema, body);
    const typedName = parsed.typedName.trim();
    const typedRole = parsed.typedRole.trim();
    if (!typedName || !typedRole) {
      throw new BadRequestException('typedName and typedRole are required');
    }
    const acceptance = await this.ndaService.acceptMutualNda({
      orgId: user.orgId,
      userId: user.id,
      typedName,
      typedRole,
      language: parsed.language ?? 'EN',
      channel: NdaChannel.ui,
      counterpartyOrgId: parsed.counterpartyOrgId ?? null,
    });
    return {
      acceptance: {
        id: acceptance.id,
        ndaVersion: acceptance.ndaVersion,
        enHashSha256: acceptance.enHashSha256,
        acceptedAt: acceptance.acceptedAt,
        acceptedByUserId: acceptance.acceptedByUserId,
        language: acceptance.language,
        channel: acceptance.channel,
        typedName: acceptance.typedName,
        typedRole: acceptance.typedRole,
        counterpartyOrgId: acceptance.counterpartyOrgId ?? undefined,
      },
    };
  }

  @Post('request')
  async request(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(requestSchema, body);
    return this.ndaService.requestMutualNda({
      requesterOrgId: user.orgId,
      requesterUserId: user.id,
      counterpartyOrgId: parsed.counterpartyOrgId,
      intentId: parsed.intentId,
    });
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }

  private parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
    const result = schema.safeParse(body);
    if (result.success) {
      return result.data;
    }
    const message = result.error.issues.map((issue) => issue.message).join('; ');
    throw new BadRequestException(message || 'Invalid request');
  }
}
