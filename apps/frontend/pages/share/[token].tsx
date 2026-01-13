import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { formatDateTime } from '../../lib/date-format';
import {
  fetchShareIntent,
  type AttachmentRedactionView,
  type IntentRedactionView,
} from '../../lib/intent-redaction';

type ShareProps = {
  intent: IntentRedactionView | null;
  attachments: AttachmentRedactionView[];
  expiresAt?: string | null;
  error?: string | null;
};

export default function ShareIntent({ intent, attachments, expiresAt, error }: ShareProps) {
  return (
    <main style={pageStyle}>
      <Head>
        <title>Shared Intent</title>
      </Head>
      <section style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Shared intent</h1>
        <p style={mutedTextStyle}>View-only access (L1 only).</p>
        {error ? <p style={errorTextStyle}>{error}</p> : null}
        {!intent ? (
          <p style={{ marginBottom: 0 }}>Share link is invalid or expired.</p>
        ) : (
          <>
            <div style={detailGridStyle}>
              <div>
                <div style={labelStyle}>Title</div>
                <div style={valueStyle}>{intent.title ?? '-'}</div>
              </div>
              <div>
                <div style={labelStyle}>Client</div>
                <div style={valueStyle}>{intent.client ?? '-'}</div>
              </div>
              <div>
                <div style={labelStyle}>Stage</div>
                <div style={valueStyle}>{intent.stage}</div>
              </div>
              <div>
                <div style={labelStyle}>Last activity</div>
                <div style={valueStyle}>{formatDateTime(intent.lastActivityAt)}</div>
              </div>
              {expiresAt ? (
                <div>
                  <div style={labelStyle}>Expires</div>
                  <div style={valueStyle}>{formatDateTime(expiresAt)}</div>
                </div>
              ) : null}
            </div>
            <div style={summaryStyle}>
              <div style={labelStyle}>Summary</div>
              <div style={summaryTextStyle}>{intent.goal || '-'}</div>
            </div>
            {intent.l2Redacted ? (
              <div style={lockedCardStyle}>
                <strong>L2 details locked</strong>
                <p style={lockedTextStyle}>
                  Mutual NDA acceptance is required to view source text and L2 attachments.
                </p>
                <p style={{ margin: 0 }}>
                  <a href="/login" style={linkStyle}>Sign in</a> to request access.
                </p>
              </div>
            ) : null}
          </>
        )}
      </section>

      {intent ? (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Attachments</h3>
          {attachments.length ? (
            <div style={tableCardStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Size</th>
                    <th style={thStyle}>Level</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((attachment) => (
                    <tr key={attachment.id}>
                      <td style={tdStyle}>{attachment.originalName}</td>
                      <td style={tdStyle}>
                        {attachment.sizeBytes ? formatBytes(attachment.sizeBytes) : '-'}
                      </td>
                      <td style={tdStyle}>
                        <span style={badgeStyle}>{attachment.confidentialityLevel}</span>
                      </td>
                      <td style={tdStyle}>{formatDateTime(attachment.createdAt)}</td>
                      <td style={tdStyle}>
                        <span style={lockedStyle}>Sign in to download</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={mutedTextStyle}>No attachments shared yet.</p>
          )}
        </section>
      ) : null}
    </main>
  );
}

const pageStyle = {
  minHeight: '100vh',
  padding: '3rem 1.5rem',
  fontFamily: '"Space Grotesk", "IBM Plex Sans", "Noto Sans", sans-serif',
  background: 'transparent',
  color: 'var(--text)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column' as const,
  gap: '2rem',
};

const cardStyle = {
  maxWidth: '680px',
  width: '100%',
  background: 'var(--surface)',
  borderRadius: '20px',
  padding: '2rem',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-2)',
};

const mutedTextStyle = {
  color: 'var(--muted)',
};

const errorTextStyle = {
  color: 'var(--danger)',
  fontWeight: 600,
};

const detailGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '1rem',
  marginTop: '1.5rem',
};

const labelStyle = {
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--muted-2)',
};

const valueStyle = {
  marginTop: '0.35rem',
  fontWeight: 600,
};

const summaryStyle = {
  marginTop: '1.5rem',
};

const summaryTextStyle = {
  marginTop: '0.5rem',
  fontSize: '0.95rem',
  color: 'var(--text)',
};

const lockedCardStyle = {
  marginTop: '1.5rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--danger-border)',
  background: 'var(--danger-bg)',
};

const lockedTextStyle = {
  margin: '0.4rem 0 0.6rem',
  color: 'var(--danger)',
};

const linkStyle = {
  color: 'var(--link)',
  fontWeight: 600,
  textDecoration: 'none',
};

const sectionStyle = {
  maxWidth: '680px',
  width: '100%',
  marginTop: '2rem',
};

const sectionTitleStyle = {
  margin: '0 0 1rem',
  fontSize: '1.1rem',
};

const tableCardStyle = {
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
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
  color: 'var(--muted-2)',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  fontSize: '0.95rem',
};

const badgeStyle = {
  display: 'inline-flex',
  padding: '0.15rem 0.5rem',
  borderRadius: '999px',
  background: 'var(--surface-2)',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const lockedStyle = {
  color: 'var(--danger)',
  fontWeight: 600,
};

const formatBytes = (value: number) => {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const getServerSideProps: GetServerSideProps<ShareProps> = async (ctx) => {
  const token = typeof ctx.params?.token === 'string' ? ctx.params.token : 'share';
  const payload = await fetchShareIntent(token);
  return {
    props: {
      intent: payload?.intent ?? null,
      attachments: payload?.attachments ?? [],
      expiresAt: (payload as any)?.share?.expiresAt ?? null,
      error: payload ? null : 'Unable to load shared intent.',
    },
  };
};
