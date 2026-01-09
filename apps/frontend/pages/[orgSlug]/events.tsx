import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../components/OrgShell';
import { getXNavItems } from '../../lib/org-nav';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../lib/admin-server';

type OrgEvent = {
  id: string;
  type: string;
  occurredAt: string;
  subjectType: string;
  subjectId: string;
  channel: string;
  correlationId: string;
  payload: unknown;
};

type EventsLogProps = {
  user: AdminUser;
  org: AdminOrg;
  events: OrgEvent[];
  error?: string | null;
};

export default function EventsLog({ user, org, events, error }: EventsLogProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title="Events log"
      subtitle="Latest 50 events for this org."
      navItems={getXNavItems(org.slug, 'ops')}
    >
      <Head>
        <title>{org.name} - Events log</title>
      </Head>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {events.length ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {events.map((event) => (
            <div key={`${event.id}-${event.occurredAt}`} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <p style={metaLabelStyle}>Type</p>
                  <p style={metaValueStyle}>{event.type}</p>
                </div>
                <div>
                  <p style={metaLabelStyle}>Occurred</p>
                  <p style={metaValueStyle}>{new Date(event.occurredAt).toISOString()}</p>
                </div>
                <div>
                  <p style={metaLabelStyle}>Subject</p>
                  <p style={metaValueStyle}>
                    {event.subjectType} {event.subjectId}
                  </p>
                </div>
              </div>
              <p style={metaSubStyle}>Channel: {event.channel}</p>
              <p style={metaSubStyle}>Correlation: {event.correlationId}</p>
              <pre style={payloadStyle}>{JSON.stringify(event.payload, null, 2)}</pre>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: '1rem' }}>No events loaded yet.</p>
      )}
    </OrgShell>
  );
}

export const getServerSideProps: GetServerSideProps<EventsLogProps> = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  try {
    const res = await fetch(`${backendBase}/events?limit=50`, {
      headers: { cookie: result.context!.cookie },
    });
    if (!res.ok) {
      return {
        props: {
          user: result.context!.user,
          org: result.context!.org,
          events: [],
          error: 'Request failed.',
        },
      };
    }
    const data = await res.json();
    const events = Array.isArray(data)
      ? data.map((row) => ({
          id: String(row.id ?? ''),
          type: String(row.type ?? ''),
          occurredAt: String(row.occurredAt ?? ''),
          subjectType: String(row.subjectType ?? ''),
          subjectId: String(row.subjectId ?? ''),
          channel: String(row.channel ?? ''),
          correlationId: String(row.correlationId ?? ''),
          payload: row.payload ?? null,
        }))
      : [];

    return {
      props: {
        user: result.context!.user,
        org: result.context!.org,
        events,
      },
    };
  } catch {
    return {
      props: {
        user: result.context!.user,
        org: result.context!.org,
        events: [],
        error: 'Failed to load events.',
      },
    };
  }
};

const cardStyle = {
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: 'rgba(248, 248, 248, 0.8)',
};

const cardHeaderStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '0.5rem',
  marginBottom: '0.5rem',
};

const metaLabelStyle = {
  margin: 0,
  color: '#6a6f76',
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const metaValueStyle = {
  margin: 0,
  fontWeight: 600,
};

const metaSubStyle = {
  margin: 0,
  color: '#4b4f54',
};

const payloadStyle = {
  marginTop: '0.75rem',
  padding: '0.75rem',
  borderRadius: '8px',
  background: '#0f1720',
  color: '#f8fafc',
  fontSize: '0.8rem',
  overflowX: 'auto' as const,
};

const errorStyle = {
  color: '#b42318',
};
