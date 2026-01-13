import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../components/OrgShell';
import { getYNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { fetchOrgEvents, type OrgEvent } from '../../../lib/org-events';
import { formatDateTime } from '../../../lib/date-format';

type IncomingIntentsProps = {
  user: OrgUser;
  org: OrgInfo;
  events: OrgEvent[];
};

export default function IncomingIntents({ user, org, events }: IncomingIntentsProps) {
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
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Inbox placeholder</p>
        <p style={{ margin: 0 }}>
          This page will list incoming intents and their response status.
        </p>
      </div>

      <section style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>Recent events</h3>
        {events.length ? (
          <ul style={listStyle}>
            {events.map((event) => (
                <li key={event.id} style={listItemStyle}>
                  <span style={{ fontWeight: 600 }}>{event.type}</span>
                  <span style={metaStyle}>
                    {event.subjectId ? ` - ${event.subjectId}` : ''} {formatDateTime(event.occurredAt)}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)' }}>No events yet.</p>
        )}
      </section>
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed var(--border)',
  background: 'var(--surface-2)',
  boxShadow: 'var(--shadow)',
};

const sectionStyle = {
  marginTop: '2rem',
};

const listStyle = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: '0.75rem',
};

const listItemStyle = {
  padding: '0.75rem 1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.35rem',
};

const metaStyle = {
  color: 'var(--muted)',
  fontSize: '0.85rem',
};

export const getServerSideProps: GetServerSideProps<IncomingIntentsProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const events = await fetchOrgEvents(result.context!.cookie, { limit: 8 });
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      events,
    },
  };
};
