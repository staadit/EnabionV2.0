import type { GetServerSidePropsContext, Redirect } from 'next';

export type PlatformAdminUser = {
  id: string;
  email: string;
  orgId: string;
  role: string;
  isPlatformAdmin: boolean;
};

export type PlatformAdminContext = {
  user: PlatformAdminUser;
  cookie: string;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

function loginRedirect(path: string): { redirect: Redirect } {
  const next = encodeURIComponent(path);
  return {
    redirect: {
      destination: `/login?next=${next}`,
      permanent: false,
    },
  };
}

export async function requirePlatformAdmin(
  ctx: GetServerSidePropsContext,
): Promise<{ context?: PlatformAdminContext; redirect?: Redirect }> {
  const cookie = ctx.req.headers.cookie ?? '';
  try {
    const authRes = await fetch(`${BACKEND_BASE}/auth/me`, {
      headers: { cookie },
    });
    if (!authRes.ok) {
      return loginRedirect(ctx.resolvedUrl);
    }

    const authData = await authRes.json();
    const user = authData?.user as PlatformAdminUser | undefined;
    if (!user) {
      return loginRedirect(ctx.resolvedUrl);
    }
    if (!user.isPlatformAdmin) {
      return { redirect: { destination: '/', permanent: false } };
    }

    return { context: { user, cookie } };
  } catch {
    return loginRedirect(ctx.resolvedUrl);
  }
}
