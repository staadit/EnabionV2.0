import type { GetServerSidePropsContext, Redirect } from 'next';

export type AdminUser = {
  id: string;
  email: string;
  orgId: string;
  role: string;
};

export type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  defaultLanguage: string;
  policyAiEnabled: boolean;
  policyShareLinksEnabled: boolean;
  policyEmailIngestEnabled: boolean;
  inboundEmailAddress?: string;
};

export type OwnerContext = {
  user: AdminUser;
  org: AdminOrg;
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

export async function getOwnerContext(
  ctx: GetServerSidePropsContext,
): Promise<{ context?: OwnerContext; redirect?: Redirect }> {
  const cookie = ctx.req.headers.cookie ?? '';
  try {
    const authRes = await fetch(`${BACKEND_BASE}/auth/me`, {
      headers: { cookie },
    });
    if (!authRes.ok) {
      return loginRedirect(ctx.resolvedUrl);
    }

    const authData = await authRes.json();
    const user = authData?.user as AdminUser | undefined;
    if (!user) {
      return loginRedirect(ctx.resolvedUrl);
    }
    if (user.role !== 'Owner') {
      return { redirect: { destination: '/', permanent: false } };
    }

    const orgRes = await fetch(`${BACKEND_BASE}/v1/org/me`, {
      headers: { cookie },
    });
    if (!orgRes.ok) {
      return { redirect: { destination: '/', permanent: false } };
    }
    const orgData = await orgRes.json();
    const org = orgData?.org as AdminOrg | undefined;
    if (!org) {
      return { redirect: { destination: '/', permanent: false } };
    }

    return { context: { user, org, cookie } };
  } catch {
    return loginRedirect(ctx.resolvedUrl);
  }
}
