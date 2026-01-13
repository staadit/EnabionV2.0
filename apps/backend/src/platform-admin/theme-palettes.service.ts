import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DEFAULT_PALETTE, normalizeTokens, PALETTE_TOKEN_KEYS } from '../theme/theme.tokens';

type PaletteTokens = Record<(typeof PALETTE_TOKEN_KEYS)[number], string>;

type CreatePaletteInput = {
  slug: string;
  name: string;
  tokens?: Record<string, string>;
};

type UpdatePaletteInput = {
  slug?: string;
  name?: string;
  tokens?: Record<string, string>;
};

@Injectable()
export class ThemePalettesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPalettes() {
    const palettes = await this.prisma.themePalette.findMany({
      orderBy: [{ isGlobalDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    const assignedCounts = await this.prisma.organization.groupBy({
      by: ['themePaletteId'],
      where: { themePaletteId: { not: null } },
      _count: { _all: true },
    });

    const assignedMap = new Map(
      assignedCounts
        .filter((row) => row.themePaletteId)
        .map((row) => [row.themePaletteId as string, row._count._all]),
    );

    return palettes.map((palette) => ({
      id: palette.id,
      slug: palette.slug,
      name: palette.name,
      tokens: palette.tokensJson,
      isGlobalDefault: palette.isGlobalDefault,
      createdAt: palette.createdAt,
      updatedAt: palette.updatedAt,
      assignedCount: assignedMap.get(palette.id) ?? 0,
    }));
  }

  async getPalette(id: string) {
    const palette = await this.prisma.themePalette.findUnique({ where: { id } });
    if (!palette) {
      throw new NotFoundException('Palette not found');
    }
    return palette;
  }

  async createPalette(actorUserId: string, input: CreatePaletteInput) {
    const tokens = normalizeTokens(input.tokens ?? {}, DEFAULT_PALETTE, {
      fillAccentsFromBrand: true,
    });

    try {
      const palette = await this.prisma.themePalette.create({
        data: {
          slug: input.slug,
          name: input.name,
          tokensJson: tokens,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
        },
      });
      await this.createRevision(palette.id, 1, tokens, actorUserId);
      return palette;
    } catch (err: any) {
      if (this.isUniqueViolation(err)) {
        throw new BadRequestException('Palette slug already exists');
      }
      if (this.isTokenError(err)) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async updatePalette(actorUserId: string, id: string, input: UpdatePaletteInput) {
    const palette = await this.prisma.themePalette.findUnique({ where: { id } });
    if (!palette) {
      throw new NotFoundException('Palette not found');
    }

    let tokensChanged = false;
    let nextTokens: PaletteTokens | undefined;
    if (input.tokens) {
      try {
        nextTokens = normalizeTokens(
          input.tokens,
          palette.tokensJson as PaletteTokens,
          { fillAccentsFromBrand: false },
        );
      } catch (err: any) {
        if (this.isTokenError(err)) {
          throw new BadRequestException(err.message);
        }
        throw err;
      }
      tokensChanged = PALETTE_TOKEN_KEYS.some(
        (key) => nextTokens![key] !== (palette.tokensJson as PaletteTokens)[key],
      );
    }

    try {
      const updated = await this.prisma.themePalette.update({
        where: { id },
        data: {
          slug: input.slug ?? palette.slug,
          name: input.name ?? palette.name,
          ...(tokensChanged && nextTokens ? { tokensJson: nextTokens } : {}),
          updatedByUserId: actorUserId,
        },
      });

      if (tokensChanged && nextTokens) {
        const nextRevision = await this.nextRevisionNumber(id);
        await this.createRevision(id, nextRevision, nextTokens, actorUserId);
      }

      return updated;
    } catch (err: any) {
      if (this.isUniqueViolation(err)) {
        throw new BadRequestException('Palette slug already exists');
      }
      throw err;
    }
  }

  async deletePalette(id: string) {
    const palette = await this.prisma.themePalette.findUnique({ where: { id } });
    if (!palette) {
      throw new NotFoundException('Palette not found');
    }
    if (palette.isGlobalDefault) {
      throw new BadRequestException('Cannot delete the global default palette');
    }
    const assignedCount = await this.prisma.organization.count({
      where: { themePaletteId: id },
    });
    if (assignedCount > 0) {
      throw new BadRequestException('Palette is assigned to organizations');
    }
    await this.prisma.themePalette.delete({ where: { id } });
  }

  async activatePalette(actorUserId: string, id: string) {
    const palette = await this.prisma.themePalette.findUnique({ where: { id } });
    if (!palette) {
      throw new NotFoundException('Palette not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.themePalette.updateMany({
        where: { isGlobalDefault: true },
        data: { isGlobalDefault: false },
      });
      await tx.themePalette.update({
        where: { id },
        data: { isGlobalDefault: true, updatedByUserId: actorUserId },
      });
    });
  }

  async assignPalette(orgId: string, paletteId: string | null) {
    if (paletteId) {
      const palette = await this.prisma.themePalette.findUnique({ where: { id: paletteId } });
      if (!palette) {
        throw new NotFoundException('Palette not found');
      }
    }
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException('Tenant not found');
    }
    return this.prisma.organization.update({
      where: { id: orgId },
      data: { themePaletteId: paletteId },
      select: { id: true, name: true, slug: true, themePaletteId: true },
    });
  }

  private async nextRevisionNumber(paletteId: string) {
    const latest = await this.prisma.themePaletteRevision.findFirst({
      where: { paletteId },
      orderBy: { revision: 'desc' },
      select: { revision: true },
    });
    return (latest?.revision ?? 0) + 1;
  }

  private async createRevision(
    paletteId: string,
    revision: number,
    tokens: PaletteTokens,
    actorUserId: string,
  ) {
    await this.prisma.themePaletteRevision.create({
      data: {
        paletteId,
        revision,
        tokensJson: tokens,
        createdByUserId: actorUserId,
      },
    });
  }

  private isUniqueViolation(err: any) {
    return err?.code === 'P2002';
  }

  private isTokenError(err: any) {
    return typeof err?.message === 'string' && err.message.includes('Token');
  }
}
