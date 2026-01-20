import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { SystemAvatarService } from './system-avatar.service';

const updateOnboardingSchema = z.object({
  stepId: z.string().min(1),
  action: z.enum(['complete', 'skip']),
});

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1/avatars/system')
export class SystemAvatarController {
  constructor(private readonly systemAvatar: SystemAvatarService) {}

  @Get('onboarding-state')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async getOnboardingState(@Req() req: AuthenticatedRequest) {
    const user = this.requireUser(req);
    const state = await this.systemAvatar.getOnboardingState(user.orgId, user.id);
    return { state };
  }

  @Post('onboarding-state')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async updateOnboardingState(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const user = this.requireUser(req);
    const parsed = this.parseBody(updateOnboardingSchema, body);
    const state = await this.systemAvatar.updateOnboardingState(
      user.orgId,
      user.id,
      parsed.stepId,
      parsed.action,
    );
    return { state };
  }

  @Get('dashboard')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async getDashboard(
    @Req() req: AuthenticatedRequest,
    @Query('intentId') intentId?: string,
  ) {
    const user = this.requireUser(req);
    const data = await this.systemAvatar.getDashboard({
      orgId: user.orgId,
      userId: user.id,
      intentId: intentId?.trim() || null,
    });
    return data;
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
