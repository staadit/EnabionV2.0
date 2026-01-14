import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthService } from '../auth/auth.service';
import { getCookieValue } from '../auth/auth.cookies';
import { DEFAULT_PALETTE, normalizeTokens, type PaletteTokenKey } from './theme.tokens';

const PREVIEW_COOKIE = 'enabion_palette_preview';

type ResolvedTheme = {
  paletteId?: string;
  slug?: string;
  tokens: Record<PaletteTokenKey, string>;
  source: 'preview' | 'global' | 'fallback';
};

@Injectable()
export class ThemeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async resolveTheme(options: {
    cookie?: string;
    shareToken?: string;
    orgSlug?: string;
  }): Promise<ResolvedTheme> {
    const cookie = options.cookie;
    const previewId = getCookieValue(cookie, PREVIEW_COOKIE);
    const user = await this.tryResolveUser(cookie);

    if (previewId && user?.isPlatformAdmin) {
      const previewPalette = await this.findPaletteById(previewId);
      if (previewPalette) {
        return {
          paletteId: previewPalette.id,
          slug: previewPalette.slug,
          tokens: normalizeTokens(previewPalette.tokensJson, DEFAULT_PALETTE, {
            fillAccentsFromBrand: true,
          }),
          source: 'preview',
        };
      }
    }

    const globalPalette = await this.prisma.themePalette.findFirst({
      where: { isGlobalDefault: true },
    });
    if (globalPalette) {
      return {
        paletteId: globalPalette.id,
        slug: globalPalette.slug,
        tokens: normalizeTokens(globalPalette.tokensJson, DEFAULT_PALETTE, {
          fillAccentsFromBrand: true,
        }),
        source: 'global',
      };
    }

    return { tokens: { ...DEFAULT_PALETTE }, source: 'fallback' };
  }

  async findPaletteById(id: string) {
    if (!id) return null;
    return this.prisma.themePalette.findUnique({ where: { id } });
  }

  private async tryResolveUser(cookie?: string) {
    const token = getCookieValue(cookie, this.auth.getCookieName());
    if (!token) return null;
    try {
      const session = await this.auth.validateSession(token);
      return session.user;
    } catch {
      return null;
    }
  }

}
