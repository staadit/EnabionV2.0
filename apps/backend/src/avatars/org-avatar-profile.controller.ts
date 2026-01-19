import { BadRequestException, Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { OrgAvatarService } from './org-avatar.service';

const profileSchema = z
  .object({
    markets: z.array(z.string()).optional().nullable(),
    industries: z.array(z.string()).optional().nullable(),
    clientTypes: z.array(z.string()).optional().nullable(),
    servicePortfolio: z.array(z.string()).optional().nullable(),
    techStack: z.array(z.string()).optional().nullable(),
    excludedSectors: z.array(z.string()).optional().nullable(),
    constraints: z.record(z.any()).optional().nullable(),
  })
  .default({});

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1/org/avatar-profile')
export class OrgAvatarProfileController {
  constructor(private readonly orgAvatar: OrgAvatarService) {}

  @Get()
  @Roles('Owner', 'BD_AM', 'Viewer')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    const profile = await this.orgAvatar.getProfile(user.orgId);
    return { profile };
  }

  @Put()
  @Roles('Owner', 'BD_AM')
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(profileSchema, body);
    const profile = await this.orgAvatar.updateProfile({
      orgId: user.orgId,
      actorUserId: user.id,
      profile: parsed,
    });
    return { profile };
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
