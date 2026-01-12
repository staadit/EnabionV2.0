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
    <OrgShell
      user={user}
      org={org}
      title={`Intent ${intentId}`}
      subtitle="Detail view with overview, coach, matches, and NDA."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Intent {intentId}</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Detail placeholder</p>
        <p style={{ margin: 0 }}>
          Tabs, activity timeline, and matching UI will be added here.
        </p>
      </div>
      <div style={actionRowStyle}>
        <a href={`/${org.slug}/intents/${intentId}/export`} style={primaryButtonStyle}>
          Export (L1)
        </a>
        <a href={`/${org.slug}/intents/${intentId}/share`} style={ghostButtonStyle}>
          Share link
        </a>
        <a href={`/${org.slug}/intents/${intentId}/nda`} style={ghostButtonStyle}>
          NDA
        </a>
      </div>

      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>Attachments</h3>
            <p style={sectionSubtitleStyle}>Share files that belong to this intent.</p>
          </div>
        </div>

        {canUpload ? (
          <form onSubmit={onUpload} style={uploadFormStyle} encType="multipart/form-data">
            <input type="file" name="file" required style={fileInputStyle} />
            <select name="confidentiality" defaultValue="L1" style={selectStyle}>
              <option value="L1">L1 (No NDA)</option>
              <option value="L2">L2 (NDA required)</option>
            </select>
            <button type="submit" style={primaryButtonStyle} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            {uploadError ? <span style={errorStyle}>{uploadError}</span> : null}
          </form>
        ) : (
          <p style={mutedStyle}>Only Owners and BD/AM users can upload attachments.</p>
        )}

        {attachments.length ? (
          <div style={tableCardStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Level</th>
                  <th style={thStyle}>Uploaded by</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map((attachment) => (
                  <tr key={attachment.id}>
                    <td style={tdStyle}>{attachment.originalName}</td>
                    <td style={tdStyle}>{formatBytes(attachment.sizeBytes)}</td>
                    <td style={tdStyle}>
                      <span style={badgeStyle}>{attachment.confidentialityLevel}</span>
                    </td>
                    <td style={tdStyle}>{attachment.uploadedBy?.email ?? '-'}</td>
                    <td style={tdStyle}>{formatDateTime(attachment.createdAt)}</td>
                    <td style={tdStyle}>
                      {attachment.canDownload ? (
                        <a href={`/api/attachments/${attachment.id}`} style={linkStyle}>
                          Download
                        </a>
                      ) : (
                        <div style={actionStackStyle}>
                          <span style={lockedStyle}>Locked (NDA required)</span>
                          <a href={`/${org.slug}/intents/${intentId}/nda`} style={linkStyle}>
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
          <p style={mutedStyle}>No attachments yet.</p>
        )}
      </div>
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed rgba(15, 37, 54, 0.2)',
  background: 'rgba(15, 37, 54, 0.04)',
};

const sectionStyle = {
  marginTop: '2rem',
};

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: '1.1rem',
};

const sectionSubtitleStyle = {
  margin: '0.25rem 0 0',
  color: '#4b5c6b',
};

const uploadFormStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '1rem',
};

const fileInputStyle = {
  border: '1px solid rgba(15, 37, 54, 0.2)',
  borderRadius: '8px',
  padding: '0.45rem 0.6rem',
  background: '#fff',
};

const selectStyle = {
  border: '1px solid rgba(15, 37, 54, 0.2)',
  borderRadius: '8px',
  padding: '0.45rem 0.6rem',
  background: '#fff',
};

const primaryButtonStyle = {
  borderRadius: '999px',
  border: 'none',
  padding: '0.5rem 1rem',
  background: '#0f2536',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle = {
  color: '#b42318',
  fontSize: '0.9rem',
};

const mutedStyle = {
  margin: 0,
  color: '#6b7785',
};

const actionRowStyle = {
  display: 'flex',
  gap: '0.75rem',
  marginTop: '1.25rem',
  flexWrap: 'wrap' as const,
};

const ghostButtonStyle = {
  display: 'inline-block',
  padding: '0.5rem 1rem',
  borderRadius: '999px',
  background: '#eef2f6',
  color: '#0f2536',
  fontWeight: 600,
  textDecoration: 'none',
};

const tableCardStyle = {
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: '#fff',
  overflow: 'hidden',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  color: '#6b7785',
  borderBottom: '1px solid rgba(15, 37, 54, 0.12)',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.08)',
  fontSize: '0.95rem',
};

const badgeStyle = {
  display: 'inline-flex',
  padding: '0.15rem 0.5rem',
  borderRadius: '999px',
  background: 'rgba(15, 37, 54, 0.08)',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const linkStyle = {
  color: '#0f2536',
  fontWeight: 600,
  textDecoration: 'none',
};

const lockedStyle = {
  color: '#b42318',
  fontWeight: 600,
};

const actionStackStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
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
