import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Get,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { Response } from 'express';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ThemePalettesService } from './theme-palettes.service';

const PREVIEW_COOKIE = 'enabion_palette_preview';
const PREVIEW_TTL_MS = 30 * 60 * 1000;

const paletteSlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const tokensSchema = z.record(z.string(), z.string());

const createPaletteSchema = z.object({
  slug: paletteSlugSchema,
  name: z.string().min(1),
  tokens: tokensSchema.optional(),
});

const updatePaletteSchema = z.object({
  slug: paletteSlugSchema.optional(),
  name: z.string().min(1).optional(),
  tokens: tokensSchema.optional(),
});

@UseGuards(PlatformAdminGuard)
@Controller('platform-admin')
export class ThemePalettesController {
  constructor(private readonly palettes: ThemePalettesService) {}

  @Get('palettes')
  async listPalettes() {
    const palettes = await this.palettes.listPalettes();
    return { palettes };
  }

  @Post('palettes')
  async createPalette(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = this.parseBody(createPaletteSchema, body);
    const user = this.requireUser(req);
    const palette = await this.palettes.createPalette(user.id, parsed);
    return { palette };
  }

  @Patch('palettes/:id')
  async updatePalette(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = this.parseBody(updatePaletteSchema, body);
    const user = this.requireUser(req);
    const palette = await this.palettes.updatePalette(user.id, id, parsed);
    return { palette };
  }

  @Delete('palettes/:id')
  async deletePalette(@Param('id') id: string) {
    await this.palettes.deletePalette(id);
    return { ok: true };
  }

  @Post('palettes/:id/activate')
  async activatePalette(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const user = this.requireUser(req);
    await this.palettes.activatePalette(user.id, id);
    return { ok: true };
  }

  @Post('palettes/:id/preview')
  async previewPalette(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.palettes.getPalette(id);
    res.cookie(PREVIEW_COOKIE, id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: PREVIEW_TTL_MS,
    });
    return { ok: true };
  }

  @Delete('palettes/preview')
  async clearPreview(@Res({ passthrough: true }) res: Response) {
    res.cookie(PREVIEW_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return { ok: true };
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
