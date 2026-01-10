import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../components/OrgShell';
import { getYNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { formatDateTime } from '../../../lib/date-format';
import {
  fetchIncomingIntent,
  type AttachmentRedactionView,
  type IntentRedactionView,
} from '../../../lib/intent-redaction';

type IncomingIntentDetailProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  intent: IntentRedactionView | null;
  attachments: AttachmentRedactionView[];
};

export default function IncomingIntentDetail({
  user,
  org,
  intentId,
  intent,
  attachments,
}: IncomingIntentDetailProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      eyebrow="Y Portal"
      title={`Incoming Intent ${intentId}`}
      subtitle="L1 details with NDA-gated L2 content."
      navItems={getYNavItems(org.slug, 'inbox')}
    >
      <Head>
        <title>{org.name} - Incoming Intent {intentId}</title>
      </Head>
      <div style={cardStyle}>
        {!intent ? (
          <p style={{ margin: 0, color: '#b42318' }}>Unable to load intent details.</p>
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
                  Mutual NDA acceptance is required to view the source text and L2 attachments.
                </p>
                <a
                  href={`/${org.slug}/incoming-intents/${intentId}/nda`}
                  style={linkStyle}
                >
                  Accept NDA
                </a>
              </div>
            ) : intent.sourceTextRaw ? (
              <div style={l2BlockStyle}>
                <div style={labelStyle}>Source text</div>
                <pre style={sourceTextStyle}>{intent.sourceTextRaw}</pre>
              </div>
            ) : null}
          </>
        )}
      </div>

      {intent ? (
        <div style={sectionStyle}>
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
                        {attachment.canDownload ? (
                          <a href={`/api/attachments/${attachment.id}`} style={linkStyle}>
                            Download
                          </a>
                        ) : (
                          <a
                            href={`/${org.slug}/incoming-intents/${intentId}/nda`}
                            style={lockedStyle}
                          >
                            Locked (Accept NDA)
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={mutedStyle}>No attachments shared yet.</p>
          )}
        </div>
      ) : null}
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed rgba(15, 37, 54, 0.2)',
  background: 'rgba(15, 37, 54, 0.04)',
};

const detailGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '1rem',
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
  marginTop: '1.25rem',
};

const summaryTextStyle = {
  marginTop: '0.5rem',
  fontSize: '0.95rem',
  color: '#1b1d1f',
};

const lockedCardStyle = {
  marginTop: '1.25rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid rgba(180, 35, 24, 0.3)',
  background: 'rgba(180, 35, 24, 0.08)',
};

const lockedTextStyle = {
  margin: '0.4rem 0 0.6rem',
  color: '#7a271a',
};

const l2BlockStyle = {
  marginTop: '1.25rem',
};

const sourceTextStyle = {
  marginTop: '0.5rem',
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: '#fff',
  whiteSpace: 'pre-wrap' as const,
  fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
  fontSize: '0.85rem',
};

const sectionStyle = {
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

const linkStyle = {
  color: '#0f2536',
  fontWeight: 600,
  textDecoration: 'none',
};

const lockedStyle = {
  color: '#b42318',
  fontWeight: 600,
  textDecoration: 'none',
};

const mutedStyle = {
  margin: 0,
  color: '#6b7785',
};

const formatBytes = (value: number) => {
  if (!value) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const getServerSideProps: GetServerSideProps<IncomingIntentDetailProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  const payload = await fetchIncomingIntent(result.context!.cookie, intentId);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
      intent: payload?.intent ?? null,
      attachments: payload?.attachments ?? [],
    },
  };
};
