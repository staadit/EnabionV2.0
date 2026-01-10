import { Controller, Get, Param } from '@nestjs/common';
import { ShareLinkService } from './share-link.service';

@Controller('share/intent')
export class SharePublicController {
  constructor(private readonly shareLinks: ShareLinkService) {}

  @Get(':token')
  async viewSharedIntent(@Param('token') token: string) {
    return this.shareLinks.resolvePublicView(token);
  }
}
