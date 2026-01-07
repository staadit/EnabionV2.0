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
import { EmailService } from '../email/email.service';
import { AuthUser, UserRole } from './auth.types';
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

type UserWithDeactivation = User & { deactivatedAt?: Date | null };

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
  private readonly appPublicUrl = (process.env.APP_PUBLIC_URL || '').trim();
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventService,
    private readonly emailService: EmailService,
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
        const slug = await this.generateOrgSlug(tx, orgName);
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug,
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
    if ((user as UserWithDeactivation).deactivatedAt) {
      this.recordFailedLogin(attemptKey);
      throw new UnauthorizedException('Account deactivated');
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
    if ((session.user as UserWithDeactivation).deactivatedAt) {
      throw new UnauthorizedException('Account deactivated');
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
    const correlationId = ulid();

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

    await this.emitPasswordResetEvent(
      EVENT_TYPES.USER_PASSWORD_RESET_REQUESTED,
      user,
      tokenRecord.id,
      correlationId,
    );

    if (this.resetDebug) {
      return {
        status: 'ok',
        resetToken: token,
        expiresAt: expiresAt.toISOString(),
      };
    }

    try {
      const resetUrl = this.buildResetUrl(token);
      const result = await this.emailService.sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        ttlMinutes: this.resetTtlMinutes,
      });
      await this.emitEmailEvent({
        type: EVENT_TYPES.EMAIL_SENT,
        user,
        resetTokenId: tokenRecord.id,
        correlationId,
        messageId: result.messageId,
      });
    } catch (err) {
      await this.emitEmailEvent({
        type: EVENT_TYPES.EMAIL_FAILED,
        user,
        resetTokenId: tokenRecord.id,
        correlationId,
        errorCode: this.getEmailErrorCode(err),
      });
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
        ? { ...basePayload, email: user.email, role: this.normalizeRole(user.role) }
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

  private async emitPasswordResetEvent(
    type: string,
    user: User,
    resetTokenId: string,
    correlationId?: string,
  ) {
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
      correlationId: correlationId ?? ulid(),
      payload: {
        payloadVersion: 1,
        userId: user.id,
        orgId: user.orgId,
        resetTokenId,
      },
    });
  }

  private async emitEmailEvent(input: {
    type: string;
    user: User;
    resetTokenId: string;
    correlationId: string;
    messageId?: string;
    errorCode?: string;
  }) {
    const payloadBase = {
      payloadVersion: 1,
      messageType: 'password_reset',
      transport: 'smtp',
      resetTokenId: input.resetTokenId,
    };
    const payload =
      input.type === EVENT_TYPES.EMAIL_SENT
        ? { ...payloadBase, messageId: input.messageId }
        : { ...payloadBase, errorCode: input.errorCode || 'unknown' };

    await this.events.emitEvent({
      type: input.type as any,
      occurredAt: new Date(),
      orgId: input.user.orgId,
      actorUserId: input.user.id,
      subjectType: 'USER',
      subjectId: input.user.id,
      lifecycleStep: 'CLARIFY',
      pipelineStage: 'NEW',
      channel: 'api',
      correlationId: input.correlationId,
      payload,
    });
  }

  private buildResetUrl(token: string): string {
    if (!this.appPublicUrl) {
      throw new Error('APP_PUBLIC_URL_NOT_CONFIGURED');
    }

    const baseUrl = this.appPublicUrl.endsWith('/')
      ? this.appPublicUrl.slice(0, -1)
      : this.appPublicUrl;

    return `${baseUrl}/reset/confirm?token=${token}`;
  }

  private getEmailErrorCode(err: unknown): string {
    if (err instanceof Error) {
      if (err.message === 'SMTP_NOT_CONFIGURED') {
        return 'smtp_not_configured';
      }
      if (err.message === 'APP_PUBLIC_URL_NOT_CONFIGURED') {
        return 'app_public_url_not_configured';
      }
    }
    if (err && typeof err === 'object') {
      const code = (err as { code?: string }).code;
      if (code) {
        return String(code).toLowerCase();
      }
      const name = (err as { name?: string }).name;
      if (name) {
        return String(name).toLowerCase();
      }
    }
    return 'unknown';
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      orgId: user.orgId,
      role: this.normalizeRole(user.role),
      isPlatformAdmin: this.isPlatformAdminEmail(user.email),
    };
  }

  private normalizeRole(role: string | null | undefined): UserRole {
    if (role === 'BD-AM') {
      return 'BD_AM';
    }
    return role as UserRole;
  }

  private isPlatformAdminEmail(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return false;
    const raw = process.env.PLATFORM_ADMIN_EMAIL_ALLOWLIST || '';
    const allowlist = raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    return allowlist.includes(normalized);
  }

  private slugifyOrgName(name: string): string {
    const normalized = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized;
  }

  private buildSlugCandidate(base: string, suffix?: number): string {
    if (!suffix) return base;
    const suffixText = String(suffix);
    const maxBaseLen = Math.max(3, 40 - suffixText.length - 1);
    const trimmedBase = base.slice(0, maxBaseLen).replace(/-+$/g, '');
    return `${trimmedBase}-${suffixText}`;
  }

  private async generateOrgSlug(tx: Prisma.TransactionClient, orgName: string): Promise<string> {
    const base = this.slugifyOrgName(orgName);
    const baseCandidate = base.length >= 3 ? base.slice(0, 40) : 'org';
    let candidate =
      base.length >= 3
        ? baseCandidate
        : `org-${ulid().toLowerCase().slice(0, 8)}`;
    candidate = candidate.replace(/-+$/g, '');
    if (candidate.length < 3) {
      candidate = `org-${ulid().toLowerCase().slice(0, 8)}`.slice(0, 40);
    }

    let suffix = 2;
    while (await tx.organization.findUnique({ where: { slug: candidate } })) {
      candidate = this.buildSlugCandidate(baseCandidate, suffix);
      suffix += 1;
    }
    return candidate;
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
