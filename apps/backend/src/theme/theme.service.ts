import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { AuthService } from '../auth/auth.service';
import { getCookieValue } from '../auth/auth.cookies';
import { DEFAULT_PALETTE, normalizeTokens, type PaletteTokenKey } from './theme.tokens';

const PREVIEW_COOKIE = 'enabion_palette_preview';

type ResolvedTheme = {
  paletteId?: string;
  slug?: string;
  tokens: Record<PaletteTokenKey, string>;
  source: 'preview' | 'org' | 'global' | 'fallback';
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

    const orgId =
      (await this.resolveOrgIdFromShareToken(options.shareToken)) ||
      user?.orgId ||
      (await this.resolveOrgIdFromSlug(options.orgSlug));

    if (orgId) {
      const orgPalette = await this.resolveOrgPalette(orgId);
      if (orgPalette) {
        return {
          paletteId: orgPalette.id,
          slug: orgPalette.slug,
          tokens: normalizeTokens(orgPalette.tokensJson, DEFAULT_PALETTE, {
            fillAccentsFromBrand: true,
          }),
          source: 'org',
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

  async resolveOrgPalette(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { themePaletteId: true },
    });
    if (!org?.themePaletteId) return null;
    return this.findPaletteById(org.themePaletteId);
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

  private async resolveOrgIdFromSlug(orgSlug?: string) {
    if (!orgSlug) return null;
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true },
    });
    return org?.id ?? null;
  }

  private async resolveOrgIdFromShareToken(token?: string) {
    if (!token || token.length < 8) return null;
    const tokenHashSha256 = this.hashToken(token);
    const now = new Date();
    const link = await this.prisma.intentShareLink.findFirst({
      where: {
        tokenHashSha256,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { orgId: true },
    });
    return link?.orgId ?? null;
  }

  private hashToken(token: string) {
    const pepper = process.env.SHARE_LINK_TOKEN_PEPPER || '';
    return createHash('sha256').update(token + pepper).digest('hex');
  }
}
