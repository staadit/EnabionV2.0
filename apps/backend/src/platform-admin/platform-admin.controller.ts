import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { PlatformAdminService } from './platform-admin.service';

const createNdaSchema = z.object({
  ndaVersion: z.string().min(1),
  enMarkdown: z.string().min(1),
  summaryPl: z.string().optional().nullable(),
  summaryDe: z.string().optional().nullable(),
  summaryNl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateNdaSchema = z.object({
  ndaVersion: z.string().min(1).optional(),
  enMarkdown: z.string().min(1).optional(),
  summaryPl: z.string().optional().nullable(),
  summaryDe: z.string().optional().nullable(),
  summaryNl: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

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

  @Get('nda')
  async listNda(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    return this.platformAdmin.listNdaDocuments(user);
  }

  @Post('nda')
  async createNda(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(createNdaSchema, body);
    return this.platformAdmin.createNdaDocument(user, parsed);
  }

  @Patch('nda/:id')
  async updateNda(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(updateNdaSchema, body);
    return this.platformAdmin.updateNdaDocument(user, id, parsed);
  }

  @Delete('nda/:id')
  async deleteNda(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = this.requireUser(req);
    await this.platformAdmin.deleteNdaDocument(user, id);
    return { ok: true };
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
