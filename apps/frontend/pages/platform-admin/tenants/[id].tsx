import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../../lib/require-platform-admin';
import { formatDateTime } from '../../../lib/date-format';

type TenantUser = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string | null;
  deactivatedAt?: string | null;
};

type TenantDetailProps = {
  user: PlatformAdminUser;
  org: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    themePaletteId?: string | null;
  };
  counts: {
    userCount: number;
    intentCount: number;
  };
  members: TenantUser[];
  palettes: { id: string; name: string; slug: string }[];
};

export default function TenantDetailPage({
  user,
  org,
  counts,
  members,
  palettes,
}: TenantDetailProps) {
  const [paletteId, setPaletteId] = useState(org.themePaletteId ?? '');
  const [paletteSaving, setPaletteSaving] = useState(false);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteSelectRef = useRef<HTMLDivElement | null>(null);

  const paletteOptions = [
    { id: '', label: 'Global default' },
    ...palettes.map((palette) => ({
      id: palette.id,
      label: `${palette.name} (${palette.slug})`,
    })),
  ];
  const selectedPalette =
    paletteOptions.find((option) => option.id === paletteId) ?? paletteOptions[0];

  useEffect(() => {
    if (!paletteOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!paletteSelectRef.current) return;
      if (!paletteSelectRef.current.contains(event.target as Node)) {
        setPaletteOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [paletteOpen]);

  const savePalette = async () => {
    setPaletteSaving(true);
    setPaletteError(null);
    try {
      const res = await fetch(`/api/platform-admin/tenants/${org.id}/theme`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paletteId: paletteId || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPaletteError(data?.error ?? 'Save failed');
      }
    } catch {
      setPaletteError('Save failed');
    } finally {
      setPaletteSaving(false);
    }
  };

  return (
    <PlatformAdminLayout user={user} active="tenants">
      <Head>
        <title>Platform Admin - Tenant {org.name}</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>{org.name}</h2>
      <div style={metaGridStyle}>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Tenant ID</p>
          <p style={metaValueStyle}>{org.id}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Slug</p>
          <p style={metaValueStyle}>{org.slug}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Status</p>
          <p style={metaValueStyle}>{org.status}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Created</p>
            <p style={metaValueStyle}>{formatDateTime(org.createdAt)}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Users</p>
          <p style={metaValueStyle}>{counts.userCount}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Intents</p>
          <p style={metaValueStyle}>{counts.intentCount}</p>
        </div>
      </div>

      <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
        <Link
          href={`/platform-admin/events?orgId=${encodeURIComponent(org.id)}&type=INTENT_CREATED`}
          style={linkStyle}
        >
          View INTENT_CREATED events
        </Link>
      </div>

      <div style={paletteCardStyle}>
        <h3 style={{ marginTop: 0 }}>Theme palette</h3>
        <div style={paletteRowStyle}>
          <div style={paletteSelectWrapStyle} ref={paletteSelectRef}>
            <button
              type="button"
              style={paletteSelectButtonStyle}
              onClick={() => setPaletteOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={paletteOpen}
            >
              <span>{selectedPalette.label}</span>
              <span style={paletteChevronStyle}>▾</span>
            </button>
            {paletteOpen ? (
              <div style={paletteDropdownStyle} role="listbox" aria-label="Theme palette">
                {paletteOptions.map((option) => {
                  const isSelected = option.id === paletteId;
                  return (
                    <button
                      key={option.id || 'global-default'}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      style={{
                        ...paletteOptionStyle,
                        ...(isSelected ? paletteOptionSelectedStyle : null),
                      }}
                      onClick={() => {
                        setPaletteId(option.id);
                        setPaletteOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <button type="button" style={buttonStyle} onClick={savePalette} disabled={paletteSaving}>
            {paletteSaving ? 'Saving...' : 'Save palette'}
          </button>
        </div>
        {paletteError ? <p style={errorStyle}>{paletteError}</p> : null}
        <p style={paletteHintStyle}>
          Assigning a palette overrides the global default for this tenant.
        </p>
      </div>

      <h3>Members</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Last login</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td style={tdStyle}>
                  <Link href={`/platform-admin/users/${member.id}`} style={linkStyle}>
                    {member.email}
                  </Link>
                </td>
                <td style={tdStyle}>{member.role}</td>
                <td style={tdStyle}>{member.deactivatedAt ? 'Deactivated' : 'Active'}</td>
                <td style={tdStyle}>{formatDateTime(member.lastLoginAt)}</td>
                <td style={tdStyle}>{formatDateTime(member.createdAt)}</td>
              </tr>
            ))}
            {!members.length ? (
              <tr>
                <td style={tdStyle} colSpan={5}>
                  No members found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<TenantDetailProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const orgId = ctx.params?.id as string;
  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const cookie = result.context!.cookie;

  const [orgRes, membersRes, palettesRes] = await Promise.all([
    fetch(`${backendBase}/platform-admin/tenants/${orgId}`, { headers: { cookie } }),
    fetch(`${backendBase}/platform-admin/tenants/${orgId}/users`, { headers: { cookie } }),
    fetch(`${backendBase}/platform-admin/palettes`, { headers: { cookie } }),
  ]);

  if (!orgRes.ok) {
    return { redirect: { destination: '/platform-admin/tenants', permanent: false } };
  }

  const orgData = await orgRes.json();
  const membersData = membersRes.ok ? await membersRes.json() : { users: [] };
  const palettesData = palettesRes.ok ? await palettesRes.json() : { palettes: [] };

  return {
    props: {
      user: result.context!.user,
      org: orgData.org,
      counts: orgData.counts,
      members: membersData.users || [],
      palettes: palettesData.palettes || [],
    },
  };
};

const metaGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem',
};

const metaCardStyle = {
  padding: '0.9rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
};

const metaLabelStyle = {
  margin: 0,
  color: 'var(--muted-2)',
  fontSize: '0.8rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const metaValueStyle = {
  margin: 0,
  fontWeight: 600,
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '0.95rem',
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid var(--border)',
};

const linkStyle = {
  color: 'var(--green)',
  textDecoration: 'none',
  fontWeight: 600,
};

const paletteSelectWrapStyle = {
  position: 'relative' as const,
  minWidth: '260px',
};

const paletteSelectButtonStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  cursor: 'pointer',
};

const paletteChevronStyle = {
  opacity: 0.7,
  fontSize: '0.85rem',
};

const paletteDropdownStyle = {
  position: 'absolute' as const,
  top: 'calc(100% + 0.4rem)',
  left: 0,
  width: '100%',
  padding: '0.35rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  boxShadow: 'var(--shadow)',
  zIndex: 10,
};

const paletteOptionStyle = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  textAlign: 'left' as const,
  padding: '0.45rem 0.6rem',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
};

const paletteOptionSelectedStyle = {
  background: 'var(--surface-2)',
};

const buttonStyle = {
  padding: '0.55rem 0.9rem',
  borderRadius: '8px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  boxShadow: 'var(--shadow)',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle = {
  marginTop: '0.5rem',
  color: 'var(--danger)',
};

const paletteCardStyle = {
  marginBottom: '2rem',
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
};

const paletteRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'center',
};

const paletteHintStyle = {
  marginTop: '0.5rem',
  marginBottom: 0,
  color: 'var(--muted-2)',
};
