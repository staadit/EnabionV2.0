import { BadRequestException, Body, Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AvatarSuggestionService } from './avatar-suggestion.service';

const DECISION_REASON_CODES = [
  'HELPFUL_STRUCTURING',
  'TOO_GENERIC',
  'INCORRECT_ASSUMPTION',
  'MISSING_CONTEXT',
  'NOT_RELEVANT',
  'ALREADY_KNOWN',
  'OTHER',
] as const;

const decideSchema = z.object({
  note: z.string().max(280).optional().nullable(),
  reasonCode: z.enum(DECISION_REASON_CODES).optional().nullable(),
  channel: z.enum(['ui', 'api']).optional(),
});

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1/avatars/suggestions')
export class AvatarSuggestionController {
  constructor(private readonly suggestions: AvatarSuggestionService) {}

  @Post(':suggestionId/accept')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async accept(
    @Req() req: AuthenticatedRequest,
    @Param('suggestionId') suggestionId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(decideSchema, body);
    return this.suggestions.acceptSuggestion({
      orgId: user.orgId,
      suggestionId,
      actorUserId: user.id,
      channel: parsed.channel,
      note: parsed.note ?? null,
    });
  }

  @Post(':suggestionId/reject')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async reject(
    @Req() req: AuthenticatedRequest,
    @Param('suggestionId') suggestionId: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(decideSchema, body);
    return this.suggestions.rejectSuggestion({
      orgId: user.orgId,
      suggestionId,
      actorUserId: user.id,
      channel: parsed.channel,
      reasonCode: parsed.reasonCode ?? undefined,
      note: parsed.note ?? null,
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
