import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ShareLinkService } from './share-link.service';

type CreateBody = {
  ttlDays?: number;
};

@UseGuards(AuthGuard, RolesGuard)
@Controller('v1/intents/:intentId/share-links')
export class ShareLinkController {
  constructor(private readonly shareLinks: ShareLinkService) {}

  @Post()
  @Roles('Owner', 'BD_AM')
  async createShareLink(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Body() body: CreateBody,
  ) {
    const user = this.requireUser(req);
    const result = await this.shareLinks.createShareLink({
      orgId: user.orgId,
      intentId,
      actorUserId: user.id,
    });
    return {
      token: result.token,
      expiresAt: result.expiresAt.toISOString(),
      shareUrl: result.shareUrl,
    };
  }

  @Get()
  @Roles('Owner', 'BD_AM')
  async listShareLinks(@Req() req: AuthenticatedRequest, @Param('intentId') intentId: string) {
    const user = this.requireUser(req);
    const links = await this.shareLinks.listShareLinks(user.orgId, intentId);
    return { items: links };
  }

  @Post(':shareLinkId/revoke')
  @Roles('Owner', 'BD_AM')
  async revokeShareLink(
    @Req() req: AuthenticatedRequest,
    @Param('intentId') intentId: string,
    @Param('shareLinkId') shareLinkId: string,
  ) {
    const user = this.requireUser(req);
    await this.shareLinks.revokeShareLink(user.orgId, intentId, shareLinkId, user.id);
    return { revoked: true };
  }

  private requireUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }
    return req.user;
  }
}
