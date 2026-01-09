import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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

const createIntentSchema = z.object({
  goal: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  sourceTextRaw: z.string().optional().nullable(),
  context: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
  kpi: z.string().optional().nullable(),
  risks: z.string().optional().nullable(),
  deadlineAt: z.string().optional().nullable(),
});

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
    });
  }

  @Get()
  async listIntents(
    @Req() req: AuthenticatedRequest,
    @Query('stage') stage?: string,
    @Query('limit') limit?: string,
  ) {
    const user = this.requireUser(req);
    const parsedStage = this.parseStage(stage);
    const parsedLimit = this.parseLimit(limit);

    const intents = await this.intentService.listIntents({
      orgId: user.orgId,
      stage: parsedStage,
      limit: parsedLimit,
    });

    return { intents };
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

  private parseStage(value: string | undefined): IntentStage | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    if (!normalized) return undefined;
    if (!INTENT_STAGES.includes(normalized as IntentStage)) {
      throw new BadRequestException('Invalid stage');
    }
    return normalized as IntentStage;
  }

  private parseLimit(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid limit');
    }
    return Math.min(Math.floor(parsed), 200);
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
