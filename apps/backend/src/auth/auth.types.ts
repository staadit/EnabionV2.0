import type { Request } from 'express';

export type AuthUser = {
  id: string;
  email: string;
  orgId: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
  sessionId?: string;
};
