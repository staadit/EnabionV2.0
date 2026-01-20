import type { NavItem } from '../components/OrgShell';

export type XNavKey = 'intents' | 'pipeline' | 'avatars' | 'inbox' | 'settings' | 'ops';
export type YNavKey = 'inbox';

export function getXNavItems(orgSlug: string, active: XNavKey): NavItem[] {
  return [
    { label: 'Intents', href: `/${orgSlug}/intents`, active: active === 'intents' },
    { label: 'Pipeline', href: `/${orgSlug}/pipeline`, active: active === 'pipeline' },
    { label: 'Avatars', href: `/${orgSlug}/avatars`, active: active === 'avatars' },
    { label: 'Inbox', href: `/${orgSlug}/incoming-intents`, active: active === 'inbox' },
    { label: 'Settings', href: `/${orgSlug}/settings/org`, active: active === 'settings' },
    { label: 'Ops', href: `/${orgSlug}/ops/telemetry`, active: active === 'ops' },
  ];
}

export function getYNavItems(orgSlug: string, active: YNavKey): NavItem[] {
  return [
    { label: 'Inbox', href: `/${orgSlug}/incoming-intents`, active: active === 'inbox' },
  ];
}
