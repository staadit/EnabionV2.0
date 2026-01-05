import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest, USER_ROLES, UserRole } from '../auth/auth.types';
import { OrgService } from './org.service';

const createMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(USER_ROLES).optional(),
});

@UseGuards(AuthGuard)
@Controller('v1/org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('members')
  async listMembers(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    this.assertOwner(user.role);

    const members = await this.orgService.listMembers(user.orgId);
    return { members };
  }

  @Post('members')
  async createMember(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    this.assertOwner(user.role);

    const parsed = this.parseBody(createMemberSchema, body);
    const email = parsed.email.trim().toLowerCase();
    const role = parsed.role ?? 'Viewer';

    return this.orgService.createMember({
      orgId: user.orgId,
      email,
      role,
    });
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }

  private assertOwner(role: UserRole) {
    if (role !== 'Owner') {
      throw new ForbiddenException('Owner role required');
    }
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
