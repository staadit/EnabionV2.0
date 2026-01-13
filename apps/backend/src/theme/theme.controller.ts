import { Controller, Get, Query, Req } from '@nestjs/common';
import { ThemeService } from './theme.service';
import type { Request } from 'express';

@Controller('v1/theme')
export class ThemeController {
  constructor(private readonly theme: ThemeService) {}

  @Get()
  async getTheme(@Req() req: Request, @Query() query: Record<string, unknown>) {
    const shareToken = typeof query.shareToken === 'string' ? query.shareToken : undefined;
    const orgSlug = typeof query.orgSlug === 'string' ? query.orgSlug : undefined;
    const resolved = await this.theme.resolveTheme({
      cookie: req.headers.cookie,
      shareToken,
      orgSlug,
    });
    return {
      paletteId: resolved.paletteId,
      slug: resolved.slug,
      tokens: resolved.tokens,
      source: resolved.source,
    };
  }
}
