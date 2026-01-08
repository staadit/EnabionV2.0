import type { GetServerSidePropsContext, Redirect } from 'next';

export type OrgUser = {
  id: string;
  email: string;
  orgId: string;
  orgSlug?: string;
  role: string;
  isPlatformAdmin?: boolean;
};

export type OrgInfo = {
  id: string;
  name: string;
  slug: string;
  defaultLanguage?: string;
};

export type OrgContext = {
  user: OrgUser;
  org: OrgInfo;
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

function buildOrgSlugRedirect(path: string, orgSlug: string): Redirect {
  const [rawPath, query] = path.split('?');
  const segments = rawPath.split('/').filter(Boolean);
  if (segments.length === 0) {
    return {
      destination: `/${orgSlug}`,
      permanent: false,
    };
  }
  segments[0] = orgSlug;
  const nextPath = `/${segments.join('/')}`;
  return {
    destination: query ? `${nextPath}?${query}` : nextPath,
    permanent: false,
  };
}

export async function requireOrgContext(
  ctx: GetServerSidePropsContext,
): Promise<{ context?: OrgContext; redirect?: Redirect }> {
  const cookie = ctx.req.headers.cookie ?? '';
  try {
    const authRes = await fetch(`${BACKEND_BASE}/auth/me`, {
      headers: { cookie },
    });
    if (!authRes.ok) {
      return loginRedirect(ctx.resolvedUrl);
    }

    const authData = await authRes.json();
    const user = authData?.user as OrgUser | undefined;
    if (!user) {
      return loginRedirect(ctx.resolvedUrl);
    }

    const paramSlug = typeof ctx.params?.orgSlug === 'string' ? ctx.params.orgSlug : undefined;
    const authOrgSlug = typeof user.orgSlug === 'string' ? user.orgSlug : undefined;
    let org: OrgInfo | undefined;

    const orgRes = await fetch(`${BACKEND_BASE}/v1/org/me`, {
      headers: { cookie },
    });
    if (orgRes.ok) {
      const orgData = await orgRes.json();
      org = orgData?.org as OrgInfo | undefined;
      if (!org) {
        return { redirect: { destination: '/', permanent: false } };
      }
      if (paramSlug && paramSlug !== org.slug) {
        return { redirect: buildOrgSlugRedirect(ctx.resolvedUrl, org.slug) };
      }
    } else {
      if (authOrgSlug && paramSlug && paramSlug !== authOrgSlug) {
        return { redirect: buildOrgSlugRedirect(ctx.resolvedUrl, authOrgSlug) };
      }
      const fallbackSlug = authOrgSlug || paramSlug || 'org';
      org = {
        id: user.orgId,
        name: authOrgSlug || paramSlug || 'Organization',
        slug: fallbackSlug,
      };
    }

    return { context: { user, org, cookie } };
  } catch {
    return loginRedirect(ctx.resolvedUrl);
  }
}
