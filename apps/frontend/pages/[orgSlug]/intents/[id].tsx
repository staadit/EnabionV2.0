import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useState, type FormEvent } from 'react';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { fetchIntentAttachments, type IntentAttachment } from '../../../lib/org-attachments';
import { formatDateTime } from '../../../lib/date-format';

type IntentDetailProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  attachments: IntentAttachment[];
};

export default function IntentDetail({ user, org, intentId, attachments }: IntentDetailProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const canUpload = user.role !== 'Viewer';

  const onUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploading) return;
    setUploading(true);
    setUploadError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await fetch(`/api/intents/${intentId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setUploadError(data?.error ?? 'Upload failed');
      } else {
        window.location.reload();
      }
    } catch {
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <OrgShell user={user} org={org} title="" subtitle="" navItems={getXNavItems(org.slug, 'intents')}>
      <Head>
        <title>
          {org.name} - Intent {intentId}
        </title>
      </Head>
      <div style={panel}>
        <div style={headerRow}>
          <div>
            <h2 style={headerTitle}>Intent {intentId}</h2>
            <p style={headerSubtitle}>Detail view with overview, coach, matches, actions, attachments, and NDA.</p>
          </div>
          <div style={actionBar}>
            <a href={`/${org.slug}/intents/${intentId}/export`} style={primaryButton}>
              Export
            </a>
            <a href={`/${org.slug}/intents/${intentId}/share`} style={primaryButton}>
              Share link
            </a>
            <a href={`/${org.slug}/intents/${intentId}/nda`} style={primaryButton}>
              NDA
            </a>
          </div>
        </div>

        <div style={placeholderBox}>
          <p style={placeholderTitle}>Detail placeholder</p>
          <p style={placeholderBody}>Tabs, activity timeline, and matching UI will be added here.</p>
        </div>

        <div style={section}>
          <div style={sectionHeader}>
            <div>
              <h3 style={sectionTitle}>Attachments</h3>
              <p style={sectionSubtitle}>Share files that belong to this intent.</p>
            </div>
          </div>

          {canUpload ? (
            <form onSubmit={onUpload} style={uploadForm} encType="multipart/form-data">
              <input type="file" name="file" required style={fileInput} />
              <select name="confidentiality" defaultValue="L1" style={select}>
                <option value="L1">L1 (No NDA)</option>
                <option value="L2">L2 (NDA required)</option>
              </select>
              <button type="submit" style={primaryButton} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              {uploadError ? <span style={errorStyle}>{uploadError}</span> : null}
            </form>
          ) : (
            <p style={mutedText}>Only Owners and BD/AM users can upload attachments.</p>
          )}

          {attachments.length ? (
            <div style={tableCard}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Name</th>
                    <th style={th}>Size</th>
                    <th style={th}>Level</th>
                    <th style={th}>Uploaded by</th>
                    <th style={th}>Date</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((attachment) => (
                    <tr key={attachment.id}>
                      <td style={td}>{attachment.originalName}</td>
                      <td style={td}>{formatBytes(attachment.sizeBytes)}</td>
                      <td style={td}>
                        <span style={badge}>{attachment.confidentialityLevel}</span>
                      </td>
                      <td style={td}>{attachment.uploadedBy?.email ?? '-'}</td>
                      <td style={td}>{formatDateTime(attachment.createdAt)}</td>
                      <td style={td}>
                        {attachment.canDownload ? (
                          <a href={`/api/attachments/${attachment.id}`} style={link}>
                            Download
                          </a>
                        ) : (
                          <div style={actionStack}>
                            <span style={locked}>Locked (NDA required)</span>
                            <a href={`/${org.slug}/intents/${intentId}/nda`} style={link}>
                              Review NDA
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={mutedText}>No attachments yet.</p>
          )}
        </div>
      </div>
    </OrgShell>
  );
}

const panel: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-2)',
  boxShadow: 'var(--shadow)',
  padding: '1.5rem',
};

const headerRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  flexWrap: 'wrap',
  marginBottom: '1rem',
};

const headerTitle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.6rem',
  fontWeight: 750,
  color: 'var(--text)',
};

const headerSubtitle: React.CSSProperties = {
  margin: '0.25rem 0 0',
  color: 'var(--muted)',
};

const actionBar: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const primaryButton: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.65rem 1.1rem',
  borderRadius: '999px',
  border: '1px solid var(--navy)',
  background: 'linear-gradient(135deg, var(--navy), var(--ocean))',
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'none',
  minWidth: '98px',
  textAlign: 'center',
};

const placeholderBox: React.CSSProperties = {
  padding: '1rem 1.1rem',
  borderRadius: 'var(--radius)',
  border: '1px dashed var(--border)',
  background: 'var(--surface-2)',
};

const placeholderTitle: React.CSSProperties = { margin: 0, fontWeight: 700, color: 'var(--text)' };
const placeholderBody: React.CSSProperties = { margin: '0.35rem 0 0', color: 'var(--muted)' };

const section: React.CSSProperties = {
  marginTop: '1.6rem',
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
};

const sectionTitle: React.CSSProperties = { margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' };
const sectionSubtitle: React.CSSProperties = { margin: '0.25rem 0 0', color: 'var(--muted)' };

const uploadForm: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '1rem',
};

const fileInput: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '0.45rem 0.6rem',
  background: 'var(--surface)',
  color: 'var(--text)',
};

const select: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '0.45rem 0.6rem',
  background: 'var(--surface)',
  color: 'var(--text)',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--danger)',
  fontSize: '0.9rem',
};

const mutedText: React.CSSProperties = {
  margin: 0,
  color: 'var(--muted)',
};

const tableCard: React.CSSProperties = {
  borderRadius: 'var(--radius)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  overflow: 'hidden',
};

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontSize: '0.9rem',
  color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
};

const td: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  fontSize: '0.95rem',
  color: 'var(--text)',
};

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '0.2rem 0.6rem',
  borderRadius: '999px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  fontSize: '0.8rem',
  fontWeight: 650,
  color: 'var(--text)',
};

const link: React.CSSProperties = {
  color: 'var(--text)',
  fontWeight: 650,
  textDecoration: 'none',
};

const locked: React.CSSProperties = {
  color: 'var(--danger)',
  fontWeight: 650,
};

const actionStack: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
};

const formatBytes = (value: number) => {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const getServerSideProps: GetServerSideProps<IntentDetailProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  const attachments = await fetchIntentAttachments(ctx.req.headers.cookie, intentId);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
      attachments,
    },
  };
};
