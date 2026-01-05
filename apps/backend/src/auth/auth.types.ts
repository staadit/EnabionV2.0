import type { Request } from 'express';

export const USER_ROLES = ['Owner', 'BD-AM', 'Viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type AuthUser = {
  id: string;
  email: string;
  orgId: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
  sessionId?: string;
};
