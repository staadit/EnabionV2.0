import Head from 'next/head';
import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../lib/require-platform-admin';
import { formatDateTime } from '../../lib/date-format';

type PaletteTokens = Record<string, string>;

type PaletteRow = {
  id: string;
  slug: string;
  name: string;
  tokens: PaletteTokens;
  isGlobalDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaletteAdminProps = {
  user: PlatformAdminUser;
  palettes: PaletteRow[];
};

const TOKEN_FIELDS = [
  { key: 'brand-ocean', label: 'Brand Ocean' },
  { key: 'brand-green', label: 'Brand Green' },
  { key: 'brand-gold', label: 'Brand Gold' },
  { key: 'brand-navy', label: 'Brand Navy' },
  { key: 'accent-1', label: 'Accent 1' },
  { key: 'accent-2', label: 'Accent 2' },
  { key: 'accent-3', label: 'Accent 3' },
  { key: 'danger', label: 'Danger' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
];

const DEFAULT_TOKENS: PaletteTokens = {
  'brand-ocean': '#126E82',
  'brand-green': '#38A169',
  'brand-gold': '#FDBA45',
  'brand-navy': '#0B2239',
  'accent-1': '#126E82',
  'accent-2': '#38A169',
  'accent-3': '#FDBA45',
  danger: '#F87171',
  success: '#2F9E44',
  warning: '#F59F00',
  info: '#228BE6',
};

export default function PaletteAdminPage({ user, palettes }: PaletteAdminProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [tokens, setTokens] = useState<PaletteTokens>({ ...DEFAULT_TOKENS });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) {
      setName('');
      setSlug('');
      setTokens({ ...DEFAULT_TOKENS });
    }
  }, [editingId]);

  const startEdit = (palette: PaletteRow) => {
    setEditingId(palette.id);
    setName(palette.name);
    setSlug(palette.slug);
    setTokens({ ...DEFAULT_TOKENS, ...palette.tokens });
    setError(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSlug('');
    setTokens({ ...DEFAULT_TOKENS });
    setError(null);
  };

  const updateToken = (key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
  };

  const submitForm = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const endpoint = editingId ? `/api/platform-admin/palettes/${editingId}` : '/api/platform-admin/palettes';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim(),
          name: name.trim(),
          tokens,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Save failed');
      } else {
        window.location.reload();
      }
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const activatePalette = async (id: string) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/palettes/${id}/activate`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Activate failed');
      } else {
        window.location.reload();
      }
    } catch {
      setError('Activate failed');
    } finally {
      setSaving(false);
    }
  };

  const previewPalette = async (id: string) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/palettes/${id}/preview`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Preview failed');
      } else {
        window.location.reload();
      }
    } catch {
      setError('Preview failed');
    } finally {
      setSaving(false);
    }
  };

  const clearPreview = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/platform-admin/palettes/preview', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Clear preview failed');
      } else {
        window.location.reload();
      }
    } catch {
      setError('Clear preview failed');
    } finally {
      setSaving(false);
    }
  };

  const deletePalette = async (id: string) => {
    if (!window.confirm('Delete this palette?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/palettes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Delete failed');
      } else {
        window.location.reload();
      }
    } catch {
      setError('Delete failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlatformAdminLayout user={user} active="palettes">
      <Head>
        <title>Platform Admin - Palettes</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>UI Palettes</h2>
      <p style={subtitleStyle}>
        Manage brand tokens and activate the global default palette.
      </p>

      <div style={infoCardStyle}>
        <p style={infoTitleStyle}>Te wartości są edytowalne w panelu:</p>
        <ul style={infoListStyle}>
          <li>
            <span style={infoLabelStyle}>Brand:</span> brand-ocean, brand-green, brand-gold,
            brand-navy
          </li>
          <li>
            <span style={infoLabelStyle}>Accents:</span> accent-1, accent-2, accent-3 (domyślnie
            kopiują brand)
          </li>
          <li>
            <span style={infoLabelStyle}>Statusy:</span> danger, success, warning, info
          </li>
        </ul>
        <p style={infoTitleStyle}>Jak to się przekłada na UI (B)</p>
        <ul style={infoListStyle}>
          <li>
            <span style={infoLabelStyle}>Primary button:</span> --gradient-primary (z accent-1 →
            accent-2) + --text-on-brand
          </li>
          <li>
            <span style={infoLabelStyle}>Linki:</span> --link (obecnie = --text)
          </li>
          <li>
            <span style={infoLabelStyle}>Alerty:</span> --danger + --danger-bg + --danger-border
            (liczone z palety)
          </li>
          <li>
            <span style={infoLabelStyle}>Success/Info/Warning:</span> analogicznie z --success,
            --info, --warning
          </li>
        </ul>
      </div>

      <div style={actionRowStyle}>
        <button type="button" style={ghostButtonStyle} onClick={clearPreview}>
          Clear preview
        </button>
      </div>

      {error ? <p style={errorStyle}>{error}</p> : null}

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Default</th>
              <th style={thStyle}>Updated</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {palettes.map((palette) => (
              <tr key={palette.id}>
                <td style={tdStyle}>{palette.name}</td>
                <td style={tdStyle}>{palette.slug}</td>
                <td style={tdStyle}>{palette.isGlobalDefault ? 'Yes' : 'No'}</td>
                <td style={tdStyle}>{formatDateTime(palette.updatedAt)}</td>
                <td style={tdStyle}>
                  <div style={actionRowStyle}>
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() => startEdit(palette)}
                    >
                      Edit
                    </button>
                    {!palette.isGlobalDefault ? (
                      <button
                        type="button"
                        style={linkButtonStyle}
                        onClick={() => activatePalette(palette.id)}
                      >
                        Activate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      style={linkButtonStyle}
                      onClick={() => previewPalette(palette.id)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      style={dangerButtonStyle}
                      onClick={() => deletePalette(palette.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!palettes.length ? (
              <tr>
                <td style={tdStyle} colSpan={5}>
                  No palettes found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={formCardStyle}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit palette' : 'Create palette'}</h3>
        <div style={formGridStyle}>
          <label style={labelStyle}>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
              placeholder="Enabion Default"
            />
          </label>
          <label style={labelStyle}>
            Slug
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              style={inputStyle}
              placeholder="enabion-default"
            />
          </label>
        </div>

        <div style={tokenGridStyle}>
          {TOKEN_FIELDS.map((field) => (
            <label key={field.key} style={tokenLabelStyle}>
              <span>{field.label}</span>
              <div style={tokenInputRowStyle}>
                <input
                  type="color"
                  value={tokens[field.key] || '#000000'}
                  onChange={(event) => updateToken(field.key, event.target.value)}
                  style={colorInputStyle}
                />
                <input
                  value={tokens[field.key] || ''}
                  onChange={(event) => updateToken(field.key, event.target.value)}
                  style={tokenTextStyle}
                  placeholder="#RRGGBB"
                />
              </div>
            </label>
          ))}
        </div>

        <div style={actionRowStyle}>
          <button type="button" style={primaryButtonStyle} onClick={submitForm} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create palette'}
          </button>
          {editingId ? (
            <button type="button" style={ghostButtonStyle} onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<PaletteAdminProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/platform-admin/palettes`, {
    headers: { cookie: result.context!.cookie },
  });

  const data = await res.json().catch(() => null);
  return {
    props: {
      user: result.context!.user,
      palettes: data?.palettes ?? [],
    },
  };
};

const subtitleStyle = {
  marginTop: '0.4rem',
  color: 'var(--muted)',
};

const infoCardStyle = {
  marginTop: '1rem',
  marginBottom: '1.5rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
};

const infoTitleStyle = {
  marginTop: 0,
  marginBottom: '0.5rem',
  fontWeight: 700,
  color: 'var(--text)',
};

const infoListStyle = {
  marginTop: 0,
  marginBottom: '0.75rem',
  paddingLeft: '1.25rem',
  color: 'var(--muted)',
};

const infoLabelStyle = {
  color: 'var(--text)',
  fontWeight: 600,
};

const tableWrapStyle = {
  overflowX: 'auto' as const,
  marginBottom: '2rem',
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
  color: 'var(--muted)',
};

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid var(--border)',
};

const actionRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.6rem',
  alignItems: 'center',
};

const linkButtonStyle = {
  border: 'none',
  background: 'none',
  color: 'var(--text)',
  cursor: 'pointer',
  fontWeight: 600,
};

const dangerButtonStyle = {
  border: 'none',
  background: 'none',
  color: 'var(--danger)',
  cursor: 'pointer',
  fontWeight: 600,
};

const formCardStyle = {
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '1.5rem',
  background: 'var(--surface)',
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
  marginBottom: '1.5rem',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.5rem',
  fontWeight: 600,
};

const inputStyle = {
  borderRadius: '10px',
  padding: '0.6rem 0.75rem',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
};

const tokenGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1.5rem',
};

const tokenLabelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.5rem',
  fontWeight: 600,
};

const tokenInputRowStyle = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
};

const colorInputStyle = {
  width: '38px',
  height: '38px',
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
};

const tokenTextStyle = {
  flex: 1,
  borderRadius: '10px',
  padding: '0.6rem 0.75rem',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontFamily: 'var(--mono)',
};

const primaryButtonStyle = {
  padding: '0.7rem 1rem',
  borderRadius: '10px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostButtonStyle = {
  padding: '0.7rem 1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle = {
  color: 'var(--danger)',
  fontWeight: 600,
};
