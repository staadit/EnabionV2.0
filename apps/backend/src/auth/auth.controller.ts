import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { getCookieValue } from './auth.cookies';
import { AuthenticatedRequest } from './auth.types';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  orgName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = this.parseBody(signupSchema, body);
    const result = await this.authService.signup(parsed);

    res.cookie(this.authService.getCookieName(), result.session.token, this.authService.getCookieOptions());

    return {
      user: result.user,
      expiresAt: result.session.expiresAt.toISOString(),
    };
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parsed = this.parseBody(loginSchema, body);
    const ip = this.getClientIp(req);
    const result = await this.authService.login({ ...parsed, ip });

    res.cookie(this.authService.getCookieName(), result.session.token, this.authService.getCookieOptions());

    return {
      user: result.user,
      expiresAt: result.session.expiresAt.toISOString(),
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = getCookieValue(req.headers.cookie, this.authService.getCookieName());
    await this.authService.logout(token);

    res.clearCookie(this.authService.getCookieName(), this.authService.getClearCookieOptions());

    return { status: 'ok' };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new BadRequestException('Missing session');
    }

    return {
      user: req.user,
      sessionId: req.sessionId,
    };
  }

  private parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
    const result = schema.safeParse(body);
    if (result.success) {
      return result.data;
    }

    const message = result.error.issues.map((issue) => issue.message).join('; ');
    throw new BadRequestException(message || 'Invalid request');
  }

  private getClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip;
  }
}
