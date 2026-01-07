import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { PlatformAdminService } from './platform-admin.service';

@UseGuards(PlatformAdminGuard)
@Controller('platform-admin')
export class PlatformAdminController {
  constructor(private readonly platformAdmin: PlatformAdminService) {}

  @Get('tenants')
  async listTenants(@Req() req: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    const user = this.requireUser(req);
    return this.platformAdmin.listTenants(user, {
      q: query.q,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get('tenants/:orgId')
  async getTenant(@Req() req: AuthenticatedRequest, @Param('orgId') orgId: string) {
    const user = this.requireUser(req);
    return this.platformAdmin.getTenant(user, orgId);
  }

  @Get('tenants/:orgId/users')
  async listTenantUsers(@Req() req: AuthenticatedRequest, @Param('orgId') orgId: string) {
    const user = this.requireUser(req);
    return this.platformAdmin.listTenantUsers(user, orgId);
  }

  @Get('users/search')
  async searchUsers(@Req() req: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    const user = this.requireUser(req);
    return this.platformAdmin.searchUsers(user, {
      email: query.email,
      userId: query.userId,
    });
  }

  @Get('users/:userId')
  async getUser(@Req() req: AuthenticatedRequest, @Param('userId') userId: string) {
    const user = this.requireUser(req);
    return this.platformAdmin.getUser(user, userId);
  }

  @Get('events')
  async listEvents(@Req() req: AuthenticatedRequest, @Query() query: Record<string, unknown>) {
    const user = this.requireUser(req);
    return this.platformAdmin.listEvents(user, {
      orgId: query.orgId,
      subjectId: query.subjectId,
      type: query.type,
      from: query.from,
      to: query.to,
      limit: query.limit,
    });
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }
}
