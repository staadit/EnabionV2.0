import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../components/OrgShell';
import { getYNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { fetchIntentAttachments, type IntentAttachment } from '../../../lib/org-attachments';

type IncomingIntentDetailProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  attachments: IntentAttachment[];
};

export default function IncomingIntentDetail({
  user,
  org,
  intentId,
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
        <p style={{ marginTop: 0, fontWeight: 600 }}>Detail placeholder</p>
        <p style={{ margin: 0 }}>
          This page will show the intent summary, NDA gate, and response actions.
        </p>
      </div>

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
                    <td style={tdStyle}>{formatBytes(attachment.sizeBytes)}</td>
                    <td style={tdStyle}>
                      <span style={badgeStyle}>{attachment.confidentialityLevel}</span>
                    </td>
                    <td style={tdStyle}>{formatDate(attachment.createdAt)}</td>
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

const formatDate = (value: string) => {
  if (!value) return '-';
  return value.slice(0, 10);
};

export const getServerSideProps: GetServerSideProps<IncomingIntentDetailProps> = async (ctx) => {
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
