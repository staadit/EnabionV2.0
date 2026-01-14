import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IntentService } from './intent.service';

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1/intents')
export class IntentV1Controller {
  constructor(private readonly intentService: IntentService) {}

  @Get(':intentId')
  @Roles('Owner', 'BD_AM', 'Viewer')
  async getIntent(@Req() req: AuthenticatedRequest, @Param('intentId') intentId: string) {
    const user = this.requireUser(req);
    const intent = await this.intentService.getIntentDetail({
      orgId: user.orgId,
      intentId,
    });
    return { intent };
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }
}
