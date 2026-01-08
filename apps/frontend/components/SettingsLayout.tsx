import Link from 'next/link';
import type { ReactNode, CSSProperties } from 'react';
import type { AdminLabels } from '../lib/admin-i18n';
import type { AdminOrg, AdminUser } from '../lib/admin-server';

type SettingsLayoutProps = {
  user: AdminUser;
  org: AdminOrg;
  active: 'org' | 'members' | 'preferences' | 'nda';
  labels: AdminLabels;
  children: ReactNode;
};

export default function SettingsLayout({
  user,
  org,
  active,
  labels,
  children,
}: SettingsLayoutProps) {
  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>{labels.settingsTitle}</p>
          <h1 style={titleStyle}>{org.name}</h1>
          <p style={subTitleStyle}>
            {org.slug} - {user.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href={`/${org.slug}/intents`} style={ghostButtonStyle}>
            {labels.navHome}
          </Link>
          <button
            type="button"
            style={buttonStyle}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            {labels.signOut}
          </button>
        </div>
      </header>

      <div style={contentGridStyle}>
        <nav style={navStyle}>
          <NavItem href={`/${org.slug}/settings/org`} active={active === 'org'}>
            {labels.navOrg}
          </NavItem>
          <NavItem href={`/${org.slug}/settings/members`} active={active === 'members'}>
            {labels.navMembers}
          </NavItem>
          <NavItem href={`/${org.slug}/settings/preferences`} active={active === 'preferences'}>
            {labels.navPreferences}
          </NavItem>
          <NavItem href={`/${org.slug}/settings/nda`} active={active === 'nda'}>
            {labels.navNda}
          </NavItem>
        </nav>
        <section style={panelStyle}>{children}</section>
      </div>
    </div>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} style={{ ...navItemStyle, ...(active ? navItemActiveStyle : {}) }}>
      {children}
    </Link>
  );
}

const shellStyle: CSSProperties = {
  minHeight: '100vh',
  padding: '2.5rem',
  fontFamily: '"Space Grotesk", "IBM Plex Sans", "Noto Sans", sans-serif',
  background:
    'radial-gradient(120% 120% at 10% 0%, #f6e1c7 0%, #edf2f0 45%, #d2e4ef 100%)',
  color: '#1b1d1f',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '2rem',
  marginBottom: '2rem',
};

const eyebrowStyle: CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  fontSize: '0.7rem',
  color: '#6a6f76',
  marginBottom: '0.5rem',
};

const titleStyle: CSSProperties = {
  fontSize: '2.2rem',
  margin: 0,
};

const subTitleStyle: CSSProperties = {
  marginTop: '0.4rem',
  color: '#4b4f54',
};

const contentGridStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1.5rem',
};

const navStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  flex: '0 0 220px',
  minWidth: '200px',
  maxWidth: '100%',
};

const navItemStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 600,
  color: '#1f2933',
  border: '1px solid transparent',
  background: 'rgba(255, 255, 255, 0.65)',
};

const navItemActiveStyle: CSSProperties = {
  borderColor: 'rgba(15, 37, 54, 0.2)',
  boxShadow: '0 10px 18px rgba(15, 37, 54, 0.08)',
  background: '#ffffff',
};

const panelStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: '20px',
  padding: '2rem',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  boxShadow: '0 18px 36px rgba(15, 37, 54, 0.08)',
  minHeight: '60vh',
  flex: '1 1 520px',
  minWidth: '280px',
};

const buttonStyle: CSSProperties = {
  padding: '0.75rem 1.2rem',
  borderRadius: '12px',
  border: 'none',
  background: '#0f3a4b',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostButtonStyle: CSSProperties = {
  padding: '0.7rem 1.1rem',
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  color: '#0f3a4b',
  textDecoration: 'none',
  fontWeight: 600,
  background: 'rgba(255, 255, 255, 0.7)',
};
