import Head from 'next/head';
import { useState, type FormEvent } from 'react';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../lib/require-platform-admin';
import { formatDateTime } from '../../lib/date-format';

type NdaDocumentRow = {
  id: string;
  ndaVersion: string;
  enHashSha256: string;
  enMarkdown: string;
  summaryPl?: string | null;
  summaryDe?: string | null;
  summaryNl?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type NdaAdminProps = {
  user: PlatformAdminUser;
  documents: NdaDocumentRow[];
};

const DEFAULT_VERSION = 'Enabion_mutual_nda_v0.1_en';

export default function NdaAdminPage({ user, documents }: NdaAdminProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    ndaVersion: DEFAULT_VERSION,
    enMarkdown: '',
    summaryPl: '',
    summaryDe: '',
    summaryNl: '',
    isActive: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (doc: NdaDocumentRow) => {
    setEditingId(doc.id);
    setFormState({
      ndaVersion: doc.ndaVersion,
      enMarkdown: doc.enMarkdown,
      summaryPl: doc.summaryPl ?? '',
      summaryDe: doc.summaryDe ?? '',
      summaryNl: doc.summaryNl ?? '',
      isActive: doc.isActive,
    });
    setError(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormState({
      ndaVersion: DEFAULT_VERSION,
      enMarkdown: '',
      summaryPl: '',
      summaryDe: '',
      summaryNl: '',
      isActive: false,
    });
    setError(null);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const endpoint = editingId
        ? `/api/platform-admin/nda/${editingId}`
        : '/api/platform-admin/nda';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ndaVersion: formState.ndaVersion.trim(),
          enMarkdown: formState.enMarkdown,
          summaryPl: formState.summaryPl || null,
          summaryDe: formState.summaryDe || null,
          summaryNl: formState.summaryNl || null,
          isActive: formState.isActive,
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

  const activateDocument = async (id: string) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/nda/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
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

  const deleteDocument = async (id: string) => {
    if (!window.confirm('Delete this NDA document?')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform-admin/nda/${id}`, { method: 'DELETE' });
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
    <PlatformAdminLayout user={user} active="nda">
      <Head>
        <title>Platform Admin - NDA</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>Mutual NDA</h2>
      <p style={subtitleStyle}>
        Manage the platform-wide Mutual NDA text, summaries, and active version.
      </p>

      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Version</th>
              <th style={thStyle}>Hash</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Updated</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td style={tdStyle}>{doc.ndaVersion}</td>
                <td style={tdStyle}>{doc.enHashSha256.slice(0, 16)}...</td>
                <td style={tdStyle}>{doc.isActive ? 'Yes' : 'No'}</td>
                <td style={tdStyle}>{formatDateTime(doc.updatedAt)}</td>
                <td style={tdStyle}>
                  <div style={actionRowStyle}>
                    <button type="button" style={linkButtonStyle} onClick={() => startEdit(doc)}>
                      Edit
                    </button>
                    {!doc.isActive ? (
                      <button
                        type="button"
                        style={linkButtonStyle}
                        onClick={() => activateDocument(doc.id)}
                      >
                        Activate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      style={dangerButtonStyle}
                      onClick={() => deleteDocument(doc.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!documents.length ? (
              <tr>
                <td style={tdStyle} colSpan={5}>
                  No NDA documents yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form onSubmit={submitForm} style={formStyle}>
        <div style={formHeaderStyle}>
          <h3 style={{ margin: 0 }}>{editingId ? 'Edit NDA' : 'Add NDA'}</h3>
          <button type="button" style={linkButtonStyle} onClick={resetForm}>
            Reset
          </button>
        </div>
        <label style={fieldStyle}>
          NDA version
          <input
            style={inputStyle}
            value={formState.ndaVersion}
            onChange={(event) => setFormState({ ...formState, ndaVersion: event.target.value })}
            required
          />
        </label>
        <label style={fieldStyle}>
          EN markdown
          <textarea
            style={textareaStyle}
            rows={10}
            value={formState.enMarkdown}
            onChange={(event) => setFormState({ ...formState, enMarkdown: event.target.value })}
            required
          />
        </label>
        <div style={summaryGridStyle}>
          <label style={fieldStyle}>
            Summary PL
            <textarea
              style={textareaStyle}
              rows={6}
              value={formState.summaryPl}
              onChange={(event) => setFormState({ ...formState, summaryPl: event.target.value })}
            />
          </label>
          <label style={fieldStyle}>
            Summary DE
            <textarea
              style={textareaStyle}
              rows={6}
              value={formState.summaryDe}
              onChange={(event) => setFormState({ ...formState, summaryDe: event.target.value })}
            />
          </label>
          <label style={fieldStyle}>
            Summary NL
            <textarea
              style={textareaStyle}
              rows={6}
              value={formState.summaryNl}
              onChange={(event) => setFormState({ ...formState, summaryNl: event.target.value })}
            />
          </label>
        </div>
        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={formState.isActive}
            onChange={(event) =>
              setFormState({ ...formState, isActive: event.target.checked })
            }
          />
          <span>Set as active</span>
        </label>
        <div style={formActionsStyle}>
          <button type="submit" style={primaryButtonStyle} disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create NDA'}
          </button>
          {error ? <span style={errorStyle}>{error}</span> : null}
        </div>
      </form>
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<NdaAdminProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/platform-admin/nda`, {
    headers: { cookie: result.context!.cookie },
  });
  const data = await res.json().catch(() => ({ documents: [] }));

  return {
    props: {
      user: result.context!.user,
      documents: Array.isArray(data?.documents) ? data.documents : [],
    },
  };
};

const subtitleStyle = {
  marginTop: 0,
  color: '#4b5c6b',
  marginBottom: '1.5rem',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '0.95rem',
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.12)',
};

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.08)',
  verticalAlign: 'top' as const,
};

const actionRowStyle = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap' as const,
};

const linkButtonStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  color: '#1c6e5a',
  fontWeight: 600,
  cursor: 'pointer',
};

const dangerButtonStyle = {
  border: 'none',
  background: 'none',
  padding: 0,
  color: '#b42318',
  fontWeight: 600,
  cursor: 'pointer',
};

const formStyle = {
  borderTop: '1px solid rgba(15, 37, 54, 0.12)',
  paddingTop: '1.5rem',
};

const formHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.4rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const inputStyle = {
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
};

const textareaStyle = {
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  fontFamily: 'inherit',
};

const summaryGridStyle = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
};

const checkboxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontWeight: 600,
  marginBottom: '1rem',
};

const formActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const primaryButtonStyle = {
  padding: '0.7rem 1.2rem',
  borderRadius: '10px',
  border: 'none',
  background: '#0f3a4b',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle = {
  color: '#b42318',
  fontWeight: 600,
};
