import { BadRequestException, Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { IntentRedactionService } from './intent-redaction.service';

@Controller('v1')
export class IntentRedactionController {
  constructor(private readonly redaction: IntentRedactionService) {}

  @UseGuards(AuthGuard)
  @Get('incoming-intents/:intentId')
  async getIncomingIntent(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
  ) {
    const user = this.requireUser(req);
    return this.redaction.getIncomingPayload(intentId, user.orgId);
  }

  @UseGuards(AuthGuard)
  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }
}
