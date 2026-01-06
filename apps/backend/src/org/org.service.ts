import { ConflictException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';

type CreateMemberInput = {
  orgId: string;
  email: string;
  role: UserRole;
};

@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async listMembers(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMember(input: CreateMemberInput) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        orgId: input.orgId,
        email: input.email,
        role: input.role,
        passwordHash: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    const reset = await this.authService.requestPasswordReset(user.email);
    if (reset && typeof reset === 'object' && 'resetToken' in reset) {
      const token = (reset as { resetToken?: string }).resetToken;
      const expiresAt = (reset as { expiresAt?: string }).expiresAt;
      if (token) {
        return {
          user,
          resetToken: token,
          resetExpiresAt: expiresAt,
        };
      }
    }

    return { user };
  }
}
