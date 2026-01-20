import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import OrgShell from '../../../components/OrgShell';
import { getYNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { formatDateTime } from '../../../lib/date-format';
import {
  fetchIncomingIntents,
  type IncomingIntentListItem,
} from '../../../lib/intent-redaction';

type IncomingIntentsProps = {
  user: OrgUser;
  org: OrgInfo;
  intents: IncomingIntentListItem[];
};

export default function IncomingIntents({ user, org, intents }: IncomingIntentsProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      eyebrow="Y Portal"
      title="Incoming Intents"
      subtitle="List of intents shared with your organization."
      navItems={getYNavItems(org.slug, 'inbox')}
    >
      <Head>
        <title>{org.name} - Incoming Intents</title>
      </Head>

      <div style={tableCardStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Client</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Deadline</th>
              <th style={thStyle}>Level</th>
              <th style={thStyle}>Role</th>
            </tr>
          </thead>
          <tbody>
            {intents.length ? (
              intents.map((intent) => {
                const isLocked =
                  intent.confidentialityLevel === 'L2' &&
                  intent.ndaGate?.canViewL2 === false;
                const title = intent.title ?? intent.intentName ?? 'Intent';
                return (
                  <tr key={intent.intentId}>
                    <td style={tdStyle}>
                      <Link
                        href={`/${org.slug}/incoming-intents/${intent.intentId}`}
                        style={linkStyle}
                      >
                        {title}
                      </Link>
                    </td>
                    <td style={tdStyle}>{intent.clientOrgName ?? '-'}</td>
                    <td style={tdStyle}>{intent.status}</td>
                    <td style={tdStyle}>
                      {intent.deadlineAt ? formatDateTime(intent.deadlineAt) : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle}>{intent.confidentialityLevel}</span>
                      {isLocked ? <span style={lockBadgeStyle}>Locked</span> : null}
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle}>{intent.recipientRole}</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td style={emptyStyle} colSpan={6}>
                  No incoming intents shared yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={calloutStyle}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          Complete your provider profile to improve matching.
        </p>
        <Link href={`/${org.slug}/settings/org`} style={calloutLinkStyle}>
          Go to organization settings
        </Link>
      </div>
    </OrgShell>
  );
}

const tableCardStyle = {
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow)',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  fontSize: '0.95rem',
  color: 'var(--text)',
  verticalAlign: 'top' as const,
};

const emptyStyle = {
  padding: '1.5rem 1rem',
  textAlign: 'center' as const,
  color: 'var(--muted)',
};

const badgeStyle = {
  display: 'inline-flex',
  padding: '0.15rem 0.5rem',
  borderRadius: '999px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text)',
};

const lockBadgeStyle = {
  ...badgeStyle,
  marginLeft: '0.5rem',
  color: 'var(--danger)',
  borderColor: 'var(--danger-border)',
  background: 'var(--danger-bg)',
};

const linkStyle = {
  color: 'var(--text)',
  fontWeight: 600,
  textDecoration: 'none',
};

const calloutStyle = {
  marginTop: '1rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  display: 'grid',
  gap: '0.5rem',
};

const calloutLinkStyle = {
  color: 'var(--brand)',
  fontWeight: 600,
  textDecoration: 'none',
};

export const getServerSideProps: GetServerSideProps<IncomingIntentsProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intents = await fetchIncomingIntents(result.context!.cookie);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intents,
    },
  };
};
