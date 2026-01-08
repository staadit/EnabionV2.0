import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../components/OrgShell';
import { getXNavItems } from '../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../lib/org-context';
import { fetchOrgEvents, type OrgEvent } from '../../lib/org-events';

type PipelineProps = {
  user: OrgUser;
  org: OrgInfo;
  events: OrgEvent[];
};

export default function Pipeline({ user, org, events }: PipelineProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title="Pipeline"
      subtitle="Kanban view of the intent stages."
      navItems={getXNavItems(org.slug, 'pipeline')}
    >
      <Head>
        <title>{org.name} - Pipeline</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Pipeline placeholder</p>
        <p style={{ margin: 0 }}>
          This page will render the stage board and stage change actions.
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
                  {event.subjectId ? ` - ${event.subjectId}` : ''} {event.occurredAt}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: '#4b4f54' }}>No events yet.</p>
        )}
      </section>
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
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.35rem',
};

const metaStyle = {
  color: '#4b4f54',
  fontSize: '0.85rem',
};

export const getServerSideProps: GetServerSideProps<PipelineProps> = async (ctx) => {
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
