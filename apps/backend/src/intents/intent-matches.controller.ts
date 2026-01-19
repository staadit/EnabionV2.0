import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IntentMatchingService } from './intent-matching.service';

type MatchFeedbackAction = 'SHORTLIST' | 'HIDE' | 'NOT_RELEVANT';

const feedbackSchema = z
  .object({
    candidateOrgId: z.string().min(1),
    action: z.enum(['SHORTLIST', 'HIDE', 'NOT_RELEVANT']).optional(),
    rating: z.enum(['up', 'down']).optional(),
    notes: z.string().max(280).optional().nullable(),
})
  .refine((data) => data.action || data.rating, {
    message: 'Action is required',
  });

function resolveFeedbackAction(input: { action?: MatchFeedbackAction; rating?: string }) {
  if (input.action) {
    return input.action;
  }
  if (input.rating === 'up') {
    return 'SHORTLIST';
  }
  if (input.rating === 'down') {
    return 'NOT_RELEVANT';
  }
  return null;
}

@UseGuards(AuthGuard, RolesGuard)
@Controller('intents')
export class IntentMatchesController {
  constructor(private readonly matching: IntentMatchingService) {}

  @Post(':intentId/matches/run')
  @Roles('Owner', 'BD_AM')
  async runMatching(@Req() req: AuthenticatedRequest, @Param('intentId') intentId: string) {
    const user = this.requireUser(req);
    const trimmed = intentId?.trim();
    if (!trimmed) {
      throw new BadRequestException('Intent id is required');
    }
    const matchList = await this.matching.runMatching({
      orgId: user.orgId,
      intentId: trimmed,
      actorUserId: user.id,
    });
    return { matchList };
  }

  @Post(':intentId/matches/:matchListId/feedback')
  @Roles('Owner', 'BD_AM')
  async recordFeedback(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Param('matchListId') matchListId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(feedbackSchema, body);
    const action = resolveFeedbackAction(parsed);
    if (!action) {
      throw new BadRequestException('Action is required');
    }
    const trimmedIntentId = intentId?.trim();
    const trimmedMatchListId = matchListId?.trim();
    if (!trimmedIntentId || !trimmedMatchListId) {
      throw new BadRequestException('Intent id and match list id are required');
    }
    const result = await this.matching.recordFeedback({
      orgId: user.orgId,
      intentId: trimmedIntentId,
      matchListId: trimmedMatchListId,
      candidateOrgId: parsed.candidateOrgId,
      action,
      notes: parsed.notes ?? undefined,
      actorUserId: user.id,
    });
    return result;
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

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1/intents')
export class IntentMatchesV1Controller {
  constructor(private readonly matching: IntentMatchingService) {}

  @Post(':intentId/matches/run')
  @Roles('Owner', 'BD_AM')
  async runMatching(@Req() req: AuthenticatedRequest, @Param('intentId') intentId: string) {
    const user = this.requireUser(req);
    const trimmed = intentId?.trim();
    if (!trimmed) {
      throw new BadRequestException('Intent id is required');
    }
    const matchList = await this.matching.runMatching({
      orgId: user.orgId,
      intentId: trimmed,
      actorUserId: user.id,
    });
    return { matchList };
  }

  @Post(':intentId/matches/:matchListId/feedback')
  @Roles('Owner', 'BD_AM')
  async recordFeedback(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Param('matchListId') matchListId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(feedbackSchema, body);
    const action = resolveFeedbackAction(parsed);
    if (!action) {
      throw new BadRequestException('Action is required');
    }
    const trimmedIntentId = intentId?.trim();
    const trimmedMatchListId = matchListId?.trim();
    if (!trimmedIntentId || !trimmedMatchListId) {
      throw new BadRequestException('Intent id and match list id are required');
    }
    const result = await this.matching.recordFeedback({
      orgId: user.orgId,
      intentId: trimmedIntentId,
      matchListId: trimmedMatchListId,
      candidateOrgId: parsed.candidateOrgId,
      action,
      notes: parsed.notes ?? undefined,
      actorUserId: user.id,
    });
    return result;
  }

  @Get(':intentId/matches')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async getLatestMatchList(@Req() req: AuthenticatedRequest, @Param('intentId') intentId: string) {
    const user = this.requireUser(req);
    const trimmed = intentId?.trim();
    if (!trimmed) {
      throw new BadRequestException('Intent id is required');
    }
    const matchList = await this.matching.getLatestMatchList({
      orgId: user.orgId,
      intentId: trimmed,
    });
    return { matchList };
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }
}
