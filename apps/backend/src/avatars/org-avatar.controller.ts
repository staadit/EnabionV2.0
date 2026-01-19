import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { OrgAvatarService } from './org-avatar.service';

const qualifySchema = z.object({
  intentId: z.string().min(1),
  channel: z.enum(['ui', 'api']).optional(),
});

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1/avatars/org')
export class OrgAvatarController {
  constructor(private readonly orgAvatar: OrgAvatarService) {}

  @Post('qualify-intent')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async qualifyIntent(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(qualifySchema, body);
    return this.orgAvatar.qualifyIntent({
      orgId: user.orgId,
      actorUserId: user.id,
      intentId: parsed.intentId,
      channel: parsed.channel,
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
