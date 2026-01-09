export const RESERVED_ORG_SLUGS = [
  'api',
  'login',
  'signup',
  'logout',
  'reset',
  'share',
  'settings',
  'platform-admin',
  'platform',
  'admin',
] as const;

const RESERVED_SET = new Set<string>(RESERVED_ORG_SLUGS);

export const isReservedOrgSlug = (slug: string) => RESERVED_SET.has(slug);
