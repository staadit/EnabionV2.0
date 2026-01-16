import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IntentService } from './intent.service';
import { INTENT_STAGES, IntentStage } from './intent.types';

const LANGUAGE_OPTIONS = ['EN', 'PL', 'DE', 'NL'] as const;

const createIntentSchema = z.object({
  intentName: z.string().min(1),
  goal: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  sourceTextRaw: z.string().optional().nullable(),
  context: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  kpi: z.string().optional().nullable(),
  risks: z.string().optional().nullable(),
  deadlineAt: z.string().optional().nullable(),
});

const updateIntentSchema = z.object({
  intentName: z.string().optional().nullable(),
  client: z.string().optional().nullable(),
  ownerUserId: z.string().optional().nullable(),
  language: z.enum(LANGUAGE_OPTIONS).optional(),
  goal: z.string().optional().nullable(),
  context: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  kpi: z.string().optional().nullable(),
  risks: z.string().optional().nullable(),
  deadlineAt: z.string().optional().nullable(),
  pipelineStage: z.string().optional(),
  stage: z.string().optional(),
});

const suggestIntentCoachSchema = z
  .object({
    requestedLanguage: z.string().optional().nullable(),
    tasks: z.array(z.string()).optional(),
    instructions: z.string().optional().nullable(),
    focusFields: z.array(z.string()).optional().nullable(),
    mode: z.enum(['initial', 'refine', 'suggestion_only']).optional(),
    channel: z.enum(['ui', 'api']).optional(),
  })
  .default({});

const decideSuggestionSchema = z
  .object({
    reasonCode: z.string().optional().nullable(),
    channel: z.enum(['ui', 'api']).optional(),
  })
  .default({});

const MAX_SOURCE_TEXT_LENGTH = 100000;

@UseGuards(AuthGuard, RolesGuard)
@Controller('intents')
export class IntentController {
  constructor(private readonly intentService: IntentService) {}

  @Post()
  @Roles('Owner', 'BD_AM')
  async createIntent(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(createIntentSchema, body);

    const rawText = typeof parsed.sourceTextRaw === 'string' ? parsed.sourceTextRaw : '';
    const rawTrimmed = rawText.trim();
    const hasRaw = rawTrimmed.length > 0;

    const goal = typeof parsed.goal === 'string' ? parsed.goal.trim() : '';
    if (!hasRaw && goal.length < 3) {
      throw new BadRequestException('Goal must be at least 3 characters');
    }
    if (hasRaw && rawText.length > MAX_SOURCE_TEXT_LENGTH) {
      throw new BadRequestException('sourceTextRaw exceeds max length');
    }

    const intent = await this.intentService.createIntent({
      orgId: user.orgId,
      actorUserId: user.id,
      intentName: parsed.intentName,
      goal: hasRaw ? null : goal,
      title: hasRaw ? this.normalizeOptionalText(parsed.title) : null,
      sourceTextRaw: hasRaw ? rawText : null,
      context: hasRaw ? null : this.normalizeOptionalText(parsed.context),
      scope: hasRaw ? null : this.normalizeOptionalText(parsed.scope),
      kpi: hasRaw ? null : this.normalizeOptionalText(parsed.kpi),
      risks: hasRaw ? null : this.normalizeOptionalText(parsed.risks),
      deadlineAt: hasRaw ? null : this.parseDeadline(parsed.deadlineAt),
    });

    return { intent };
  }

  @Post(':intentId/coach/run')
  @HttpCode(202)
  @Roles('Owner', 'BD_AM')
  async runIntentCoach(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
  ) {
    const user = this.requireUser(req);
    return this.intentService.runIntentCoach({
      orgId: user.orgId,
      intentId,
      actorUserId: user.id,
    });
  }

  @Post(':intentId/coach/suggest')
  @Roles('Owner', 'BD_AM')
  async suggestIntentCoach(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(suggestIntentCoachSchema, body);
    return this.intentService.suggestIntentCoach({
      orgId: user.orgId,
      intentId,
      actorUserId: user.id,
      tasks: parsed.tasks,
      requestedLanguage: this.normalizeOptionalText(parsed.requestedLanguage),
      instructions: this.normalizeOptionalText(parsed.instructions),
      focusFields: parsed.focusFields ?? null,
      mode: parsed.mode,
      channel: parsed.channel,
    });
  }

  @Get(':intentId/coach/history')
  @Roles('Owner', 'BD_AM')
  async getIntentCoachHistory(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
  ) {
    const user = this.requireUser(req);
    return this.intentService.getIntentCoachHistory({
      orgId: user.orgId,
      intentId,
    });
  }

  @Post(':intentId/coach/suggestions/:suggestionId/accept')
  @Roles('Owner', 'BD_AM')
  async acceptIntentCoachSuggestion(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Param('suggestionId') suggestionId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(decideSuggestionSchema, body);
    return this.intentService.acceptIntentCoachSuggestion({
      orgId: user.orgId,
      intentId,
      suggestionId,
      actorUserId: user.id,
      channel: parsed.channel,
    });
  }

  @Post(':intentId/coach/suggestions/:suggestionId/reject')
  @Roles('Owner', 'BD_AM')
  async rejectIntentCoachSuggestion(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Param('suggestionId') suggestionId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(decideSuggestionSchema, body);
    return this.intentService.rejectIntentCoachSuggestion({
      orgId: user.orgId,
      intentId,
      suggestionId,
      actorUserId: user.id,
      reasonCode: this.normalizeOptionalText(parsed.reasonCode) ?? undefined,
      channel: parsed.channel,
    });
  }

  @Patch(':intentId')
  @Roles('Owner', 'BD_AM')
  async updateIntentStage(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(updateIntentSchema, body);
    const stageInput = parsed.pipelineStage ?? parsed.stage;
    const nextStage = stageInput ? this.parseStageValue(stageInput) : undefined;

    const intent = await this.intentService.updateIntent({
      orgId: user.orgId,
      actorUserId: user.id,
      intentId,
      intentName: this.normalizeOptionalText(parsed.intentName) ?? undefined,
      client: this.normalizeOptionalText(parsed.client) ?? undefined,
      ownerUserId: this.normalizeOptionalText(parsed.ownerUserId) ?? undefined,
      language: parsed.language ?? undefined,
      goal: this.normalizeOptionalText(parsed.goal) ?? undefined,
      context: this.normalizeOptionalText(parsed.context) ?? undefined,
      scope: this.normalizeOptionalText(parsed.scope) ?? undefined,
      kpi: this.normalizeOptionalText(parsed.kpi) ?? undefined,
      risks: this.normalizeOptionalText(parsed.risks) ?? undefined,
      deadlineAt:
        parsed.deadlineAt !== undefined ? this.parseDeadline(parsed.deadlineAt) : undefined,
      pipelineStage: nextStage,
    });

    return { intent };
  }

  @Get()
  async listIntents(
    @Req() req: AuthenticatedRequest,
    @Query() query?: Record<string, unknown>,
  ) {
    const user = this.requireUser(req);
    const params = query ?? {};
    const statusParam =
      params.status ??
      params['status[]'] ??
      params.pipelineStage ??
      params['pipelineStage[]'] ??
      params.stage;
    const parsedStatuses = this.parseStatusList(statusParam);
    const parsedLimit = this.parseLimit(params.limit);
    const parsedOwnerId = this.parseOptionalString(params.ownerId);
    const parsedLanguage = this.parseLanguage(params.language);
    const parsedQuery = this.parseSearchQuery(params.q);
    const parsedFrom = this.parseDate(params.from, 'from');
    const parsedTo = this.parseDate(params.to, 'to');
    const parsedSort = this.parseSort(params.sort);
    const parsedOrder = this.parseOrder(params.order);
    const parsedCursor = this.parseOptionalString(params.cursor);

    const result = await this.intentService.listIntents({
      orgId: user.orgId,
      statuses: parsedStatuses,
      ownerId: parsedOwnerId,
      language: parsedLanguage,
      q: parsedQuery,
      from: parsedFrom,
      to: parsedTo,
      sort: parsedSort,
      order: parsedOrder,
      limit: parsedLimit,
      cursor: parsedCursor,
    });

    return { items: result.items, nextCursor: result.nextCursor, intents: result.items };
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }

  private normalizeOptionalText(value: string | null | undefined) {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private parseDeadline(value: string | null | undefined): Date | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid deadline date');
    }
    return parsed;
  }

  private parseStatusList(value: unknown): IntentStage[] | undefined {
    const raw = this.parseStringArray(value);
    if (!raw.length) return undefined;
    const normalized = raw.map((item) => item.trim().toUpperCase()).filter(Boolean);
    const invalid = normalized.filter((item) => !INTENT_STAGES.includes(item as IntentStage));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid status: ${invalid.join(', ')}`);
    }
    return normalized as IntentStage[];
  }

  private parseStageValue(value: unknown): IntentStage {
    const normalized = this.parseOptionalString(value)?.toUpperCase();
    if (!normalized) {
      throw new BadRequestException('pipelineStage is required');
    }
    if (!INTENT_STAGES.includes(normalized as IntentStage)) {
      throw new BadRequestException(`Invalid pipelineStage: ${normalized}`);
    }
    return normalized as IntentStage;
  }

  private parseLanguage(value: unknown): string | undefined {
    const normalized = this.parseOptionalString(value)?.toUpperCase();
    if (!normalized) return undefined;
    if (!LANGUAGE_OPTIONS.includes(normalized as (typeof LANGUAGE_OPTIONS)[number])) {
      throw new BadRequestException('Invalid language');
    }
    return normalized;
  }

  private parseSearchQuery(value: unknown): string | undefined {
    const normalized = this.parseOptionalString(value);
    return normalized && normalized.length > 1 ? normalized : undefined;
  }

  private parseDate(value: unknown, label: string): Date | undefined {
    const normalized = this.parseOptionalString(value);
    if (!normalized) return undefined;
    const parsed = this.parseDateValue(normalized, label === 'to');
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid ${label} date`);
    }
    return parsed;
  }

  private parseSort(value: unknown): 'lastActivityAt' | 'createdAt' | undefined {
    const normalized = this.parseOptionalString(value);
    if (!normalized) return undefined;
    if (normalized !== 'lastActivityAt' && normalized !== 'createdAt') {
      throw new BadRequestException('Invalid sort');
    }
    return normalized;
  }

  private parseOrder(value: unknown): 'asc' | 'desc' | undefined {
    const normalized = this.parseOptionalString(value)?.toLowerCase();
    if (!normalized) return undefined;
    if (normalized !== 'asc' && normalized !== 'desc') {
      throw new BadRequestException('Invalid order');
    }
    return normalized as 'asc' | 'desc';
  }

  private parseDateValue(value: string, isEndOfDay: boolean) {
    if (!isEndOfDay) {
      return new Date(value);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
      return date;
    }
    return new Date(value);
  }

  private parseLimit(value: unknown): number | undefined {
    const normalized = this.parseOptionalString(value);
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid limit');
    }
    return Math.min(Math.floor(parsed), 100);
  }

  private parseStringArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.flatMap((item) => this.parseStringArray(item));
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  private parseOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
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
