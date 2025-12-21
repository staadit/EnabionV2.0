import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CookieOptions } from 'express';
import { Prisma, User } from '@prisma/client';
import { ulid } from 'ulid';
import { PrismaService } from '../prisma.service';
import { EventService } from '../events/event.service';
import { EVENT_TYPES } from '../events/event-registry';
import { AuthUser } from './auth.types';
import {
  generateResetToken,
  generateSessionToken,
  hashPassword,
  hashResetToken,
  hashSessionToken,
  verifyPassword,
} from './auth.utils';

type SignupInput = {
  email: string;
  password: string;
  orgName: string;
};

type LoginInput = {
  email: string;
  password: string;
  ip?: string;
};

type SessionOutput = {
  sessionId: string;
  token: string;
  expiresAt: Date;
};

@Injectable()
export class AuthService {
  private readonly cookieName = process.env.AUTH_COOKIE_NAME || 'enabion_session';
  private readonly cookieDomain = process.env.AUTH_COOKIE_DOMAIN || undefined;
  private readonly cookieSecure =
    this.parseBool(process.env.AUTH_COOKIE_SECURE) || process.env.NODE_ENV === 'production';
  private readonly sessionTtlHours = this.parseNumber(process.env.AUTH_SESSION_TTL_HOURS, 12);
  private readonly loginWindowMinutes = this.parseNumber(process.env.AUTH_LOGIN_WINDOW_MINUTES, 10);
  private readonly loginMaxAttempts = this.parseNumber(process.env.AUTH_LOGIN_MAX_ATTEMPTS, 5);
  private readonly resetTtlMinutes = this.parseNumber(process.env.AUTH_RESET_TTL_MINUTES, 30);
  private readonly resetDebug = this.parseBool(process.env.AUTH_RESET_DEBUG);
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
  ) {}

  getCookieName(): string {
    return this.cookieName;
  }

  getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookieSecure,
      domain: this.cookieDomain || undefined,
      path: '/',
      maxAge: this.sessionTtlHours * 60 * 60 * 1000,
    };
  }

  getClearCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookieSecure,
      domain: this.cookieDomain || undefined,
      path: '/',
    };
  }

  async signup(input: SignupInput) {
    const email = this.normalizeEmail(input.email);
    const orgName = input.orgName.trim();
    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: orgName,
          },
        });

        const user = await tx.user.create({
          data: {
            orgId: org.id,
            email,
            role: 'Owner',
            passwordHash,
            passwordUpdatedAt: now,
            lastLoginAt: now,
          },
        });

        const session = await this.createSession(tx, user.id, now);

        return { org, user, session };
      });

      await this.emitUserEvent(EVENT_TYPES.USER_SIGNED_UP, result.user, result.session.sessionId);

      return {
        user: this.toAuthUser(result.user),
        session: result.session,
      };
    } catch (err: any) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('Email already registered');
      }
      throw err;
    }
  }

  async login(input: LoginInput) {
    const email = this.normalizeEmail(input.email);
    const attemptKey = this.getAttemptKey(email, input.ip);
    this.assertLoginAllowed(attemptKey);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      this.recordFailedLogin(attemptKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) {
      this.recordFailedLogin(attemptKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    const session = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      });
      return this.createSession(tx, user.id, now);
    });

    this.clearLoginAttempts(attemptKey);
    await this.emitUserEvent(EVENT_TYPES.USER_LOGGED_IN, user, session.sessionId);

    return {
      user: this.toAuthUser(user),
      session,
    };
  }

  async logout(token: string | undefined) {
    if (!token) {
      return;
    }

    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return;
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.emitUserEvent(EVENT_TYPES.USER_LOGGED_OUT, session.user, session.id);
  }

  async validateSession(token: string) {
    const tokenHash = hashSessionToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    return {
      user: this.toAuthUser(session.user),
      sessionId: session.id,
    };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return { status: 'ok' };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.resetTtlMinutes * 60 * 1000);
    const token = generateResetToken();
    const tokenHash = hashResetToken(token);

    const tokenRecord = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });

      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    await this.emitPasswordResetEvent(EVENT_TYPES.USER_PASSWORD_RESET_REQUESTED, user, tokenRecord.id);

    if (this.resetDebug) {
      return {
        status: 'ok',
        resetToken: token,
        expiresAt: expiresAt.toISOString(),
      };
    }

    return { status: 'ok' };
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    const tokenHash = hashResetToken(token);
    const now = new Date();

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt <= now) {
      throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);
    }

    const passwordHash = await hashPassword(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash,
          passwordUpdatedAt: now,
        },
      });

      await tx.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: now },
      });

      await tx.session.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    await this.emitPasswordResetEvent(
      EVENT_TYPES.USER_PASSWORD_RESET_COMPLETED,
      tokenRecord.user,
      tokenRecord.id,
    );

    return { status: 'ok' };
  }

  private async createSession(tx: Prisma.TransactionClient, userId: string, now: Date): Promise<SessionOutput> {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(now.getTime() + this.sessionTtlHours * 60 * 60 * 1000);

    const session = await tx.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      sessionId: session.id,
      token,
      expiresAt,
    };
  }

  private async emitUserEvent(type: string, user: User, sessionId: string) {
    const basePayload = {
      payloadVersion: 1,
      userId: user.id,
      orgId: user.orgId,
      sessionId,
    };
    const payload =
      type === EVENT_TYPES.USER_SIGNED_UP
        ? { ...basePayload, email: user.email, role: user.role }
        : basePayload;

    await this.events.emitEvent({
      type: type as any,
      occurredAt: new Date(),
      orgId: user.orgId,
      actorUserId: user.id,
      subjectType: 'USER',
      subjectId: user.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'api',
      correlationId: ulid(),
      payload,
    });
  }

  private async emitPasswordResetEvent(type: string, user: User, resetTokenId: string) {
    await this.events.emitEvent({
      type: type as any,
      occurredAt: new Date(),
      orgId: user.orgId,
      actorUserId: user.id,
      subjectType: 'USER',
      subjectId: user.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'api',
      correlationId: ulid(),
      payload: {
        payloadVersion: 1,
        userId: user.id,
        orgId: user.orgId,
        resetTokenId,
      },
    });
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getAttemptKey(email: string, ip?: string): string {
    return `${email}|${ip || 'unknown'}`;
  }

  private assertLoginAllowed(key: string) {
    const entry = this.loginAttempts.get(key);
    if (!entry) {
      return;
    }

    const now = Date.now();
    if (now > entry.resetAt) {
      this.loginAttempts.delete(key);
      return;
    }

    if (entry.count >= this.loginMaxAttempts) {
      throw new HttpException('Too many login attempts, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private recordFailedLogin(key: string) {
    const now = Date.now();
    const windowMs = this.loginWindowMinutes * 60 * 1000;
    const entry = this.loginAttempts.get(key);

    if (!entry || now > entry.resetAt) {
      this.loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    entry.count += 1;
    this.loginAttempts.set(key, entry);
  }

  private clearLoginAttempts(key: string) {
    this.loginAttempts.delete(key);
  }

  private parseBool(value?: string): boolean {
    if (!value) return false;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private isUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
  }
}
