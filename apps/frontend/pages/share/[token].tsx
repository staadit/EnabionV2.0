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
  error?: string | null;
};

export default function ShareIntent({ intent, attachments, error }: ShareProps) {
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
  background: 'radial-gradient(120% 120% at 10% 0%, #f6e1c7 0%, #edf2f0 45%, #d2e4ef 100%)',
  color: '#1b1d1f',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'column' as const,
  gap: '2rem',
};

const cardStyle = {
  maxWidth: '680px',
  width: '100%',
  background: '#ffffff',
  borderRadius: '20px',
  padding: '2rem',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  boxShadow: '0 18px 36px rgba(15, 37, 54, 0.08)',
};

const mutedTextStyle = {
  color: '#4b4f54',
};

const errorTextStyle = {
  color: '#b42318',
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
  color: '#6b7785',
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
  color: '#1b1d1f',
};

const lockedCardStyle = {
  marginTop: '1.5rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid rgba(180, 35, 24, 0.3)',
  background: 'rgba(180, 35, 24, 0.08)',
};

const lockedTextStyle = {
  margin: '0.4rem 0 0.6rem',
  color: '#7a271a',
};

const linkStyle = {
  color: '#0f2536',
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

const lockedStyle = {
  color: '#b42318',
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
      error: payload ? null : 'Unable to load shared intent.',
    },
  };
};
