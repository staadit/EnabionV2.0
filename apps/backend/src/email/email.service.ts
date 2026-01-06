import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type EmailConfig = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpTlsRejectUnauthorized: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
};

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  ttlMinutes: number;
};

function parseBool(value?: string): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseBoolOr(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return parseBool(value);
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function loadEmailConfig(): EmailConfig {
  return {
    smtpHost: (process.env.SMTP_HOST || '').trim(),
    smtpPort: parseNumber(process.env.SMTP_PORT, 25),
    smtpSecure: parseBool(process.env.SMTP_SECURE),
    smtpTlsRejectUnauthorized: parseBoolOr(process.env.SMTP_TLS_REJECT_UNAUTHORIZED, true),
    smtpUser: process.env.SMTP_USER || undefined,
    smtpPass: process.env.SMTP_PASS || undefined,
    smtpFrom: process.env.SMTP_FROM || undefined,
  };
}

@Injectable()
export class EmailService {
  private readonly config = loadEmailConfig();
  private readonly transporter = this.config.smtpHost
    ? nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.smtpSecure,
        tls: this.config.smtpTlsRejectUnauthorized ? undefined : { rejectUnauthorized: false },
        auth: this.config.smtpUser
          ? {
              user: this.config.smtpUser,
              pass: this.config.smtpPass || '',
            }
          : undefined,
      })
    : null;

  isConfigured(): boolean {
    return Boolean(this.transporter && this.config.smtpFrom);
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<{ messageId?: string }> {
    if (!this.isConfigured() || !this.transporter || !this.config.smtpFrom) {
      throw new Error('SMTP_NOT_CONFIGURED');
    }

    const ttlLine = input.ttlMinutes > 0 ? `This link expires in ${input.ttlMinutes} minutes.` : '';
    const text = [
      'You requested a password reset for your Enabion account.',
      `Reset link: ${input.resetUrl}`,
      ttlLine,
      'If you did not request this, you can ignore this email.',
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
      <p>You requested a password reset for your Enabion account.</p>
      <p><a href="${input.resetUrl}">Reset your password</a></p>
      ${ttlLine ? `<p>${ttlLine}</p>` : ''}
      <p>If you did not request this, you can ignore this email.</p>
    `;

    const info = await this.transporter.sendMail({
      from: this.config.smtpFrom,
      to: input.to,
      subject: 'Reset your Enabion password',
      text,
      html,
    });

    return { messageId: info.messageId };
  }
}
