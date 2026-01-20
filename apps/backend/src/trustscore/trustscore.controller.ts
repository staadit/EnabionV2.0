import { BadRequestException, Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { TrustScoreService } from './trustscore.service';

@UseGuards(AuthGuard)
@Controller('v1/org')
export class TrustScoreController {
  constructor(private readonly trustScore: TrustScoreService) {}

  @Get('trust-score')
  async getTrustScore(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    const trustScore = await this.trustScore.getLatestSnapshot({
      orgId: req.user.orgId,
      actorUserId: req.user.id,
    });
    return { trustScore };
  }
}
