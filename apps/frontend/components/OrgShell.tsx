import Link from 'next/link';
import type { ReactNode, CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import type { OrgInfo, OrgUser } from '../lib/org-context';
import { getAvatarLabels } from '../lib/avatar-i18n';
import { ThemeSwitcher } from './theme/ThemeSwitcher';

export type NavItem = {
  label: string;
  href: string;
  active?: boolean;
};

type OrgShellProps = {
  user: OrgUser;
  org: OrgInfo;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  navItems: NavItem[];
  children: ReactNode;
};

export default function OrgShell({
  user,
  org,
  title,
  subtitle,
  eyebrow = 'Workspace',
  navItems,
  children,
}: OrgShellProps) {
  const avatarLabels = getAvatarLabels(org.defaultLanguage);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem('onboardingPromptDismissed') === '1') {
      return;
    }
    let active = true;
    fetch('/api/avatars/system/onboarding-state')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const state = data?.state;
        if (state && !state.completedAt) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        if (!active) return;
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={shellStyle}>
      {showOnboarding ? (
        <div style={overlayStyle} role="dialog" aria-modal="true">
          <div style={modalStyle}>
            <p style={modalEyebrowStyle}>{avatarLabels.onboardingTitle}</p>
            <h3 style={{ marginTop: 0 }}>{avatarLabels.systemTitle}</h3>
            <ul style={modalListStyle}>
              {Object.values(avatarLabels.onboardingStepTitles).map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <div style={modalActionsStyle}>
              <Link href={`/${org.slug}/avatars/system`} style={primaryActionStyle}>
                {avatarLabels.systemCardCta}
              </Link>
              <button
                type="button"
                style={secondaryActionStyle}
                onClick={() => {
                  window.sessionStorage.setItem('onboardingPromptDismissed', '1');
                  setShowOnboarding(false);
                }}
              >
                {avatarLabels.onboardingStepSkip}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>{eyebrow}</p>
          <h1 style={titleStyle}>{org.name}</h1>
          <p style={subTitleStyle}>
            {org.slug} - {user.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ThemeSwitcher compact />
          <Link href={`/${org.slug}/intents`} style={ghostButtonStyle}>
            Home
          </Link>
          <button
            type="button"
            style={buttonStyle}
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={contentGridStyle}>
        <nav style={navStyle}>
          {navItems.map((item) => (
            <NavItem key={item.href} href={item.href} active={Boolean(item.active)}>
              {item.label}
            </NavItem>
          ))}
        </nav>
        <section style={panelStyle}>
          {title ? (
            <div style={panelHeaderStyle}>
              <h2 style={{ margin: 0 }}>{title}</h2>
              {subtitle ? <p style={panelSubtitleStyle}>{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </div>
  );
}

function NavItem({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
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
  background: 'transparent',
  color: 'var(--text)',
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
  color: 'var(--muted)',
  marginBottom: '0.5rem',
};

const titleStyle: CSSProperties = {
  fontSize: '2.2rem',
  margin: 0,
};

const subTitleStyle: CSSProperties = {
  marginTop: '0.4rem',
  color: 'var(--muted)',
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
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '1rem',
};

const navItemStyle: CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: 'var(--radius)',
  textDecoration: 'none',
  fontWeight: 600,
  color: 'var(--text)',
  border: '1px solid transparent',
  background: 'var(--surface-2)',
};

const navItemActiveStyle: CSSProperties = {
  borderColor: 'var(--ocean)',
  boxShadow: 'var(--shadow)',
  background: 'var(--surface)',
};

const panelStyle: CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-2)',
  padding: '2rem',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow)',
  minHeight: '60vh',
  flex: '1 1 520px',
  minWidth: '280px',
};

const panelHeaderStyle: CSSProperties = {
  marginBottom: '1.5rem',
};

const panelSubtitleStyle: CSSProperties = {
  marginTop: '0.5rem',
  color: 'var(--muted)',
};

const buttonStyle: CSSProperties = {
  padding: '0.75rem 1.2rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--navy)',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostButtonStyle: CSSProperties = {
  padding: '0.7rem 1.1rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  textDecoration: 'none',
  fontWeight: 600,
  background: 'var(--surface)',
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(10, 18, 33, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  zIndex: 1000,
};

const modalStyle: CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-2)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow)',
  padding: '1.75rem',
  maxWidth: '520px',
  width: '100%',
};

const modalEyebrowStyle: CSSProperties = {
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  fontSize: '0.65rem',
  color: 'var(--muted2)',
  marginTop: 0,
  marginBottom: '0.5rem',
};

const modalListStyle: CSSProperties = {
  margin: '0 0 1.25rem 0',
  paddingLeft: '1.1rem',
  color: 'var(--muted)',
  display: 'grid',
  gap: '0.4rem',
};

const modalActionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
};

const primaryActionStyle: CSSProperties = {
  padding: '0.7rem 1.1rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--navy)',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
};

const secondaryActionStyle: CSSProperties = {
  padding: '0.65rem 1rem',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontWeight: 600,
  cursor: 'pointer',
};
