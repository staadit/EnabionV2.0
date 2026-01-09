import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../lib/require-platform-admin';
import { formatDateTime } from '../../lib/date-format';

type EventRow = {
  orgId: string;
  orgName?: string;
  orgSlug?: string;
  type: string;
  occurredAt: string;
  subjectType: string;
  subjectId: string;
  channel: string;
  correlationId: string;
  payload: unknown;
};

type EventsProps = {
  user: PlatformAdminUser;
  filters: {
    orgId: string;
    subjectId: string;
    type: string;
    from: string;
    to: string;
    limit: string;
  };
  events: EventRow[];
  error?: string | null;
};

export default function EventsPage({ user, filters, events, error }: EventsProps) {
  return (
    <PlatformAdminLayout user={user} active="events">
      <Head>
        <title>Platform Admin - Events</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>Events explorer</h2>
      <form method="GET" style={formStyle}>
        <label style={labelStyle}>
          Org ID
          <input name="orgId" defaultValue={filters.orgId} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Subject ID
          <input name="subjectId" defaultValue={filters.subjectId} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Type
          <input name="type" defaultValue={filters.type} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          From
          <input name="from" defaultValue={filters.from} style={inputStyle} placeholder="2026-01-07T00:00:00Z" />
        </label>
        <label style={labelStyle}>
          To
          <input name="to" defaultValue={filters.to} style={inputStyle} placeholder="2026-01-07T23:59:59Z" />
        </label>
        <label style={labelStyle}>
          Limit
          <input name="limit" defaultValue={filters.limit} style={inputStyle} type="number" min={1} max={200} />
        </label>
        <button type="submit" style={buttonStyle}>
          Query
        </button>
      </form>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {events.length ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {events.map((event) => (
            <div key={`${event.correlationId}-${event.occurredAt}`} style={cardStyle}>
              <div style={cardHeaderStyle}>
                <div>
                  <p style={metaLabelStyle}>Type</p>
                  <p style={metaValueStyle}>{event.type}</p>
                </div>
                <div>
                  <p style={metaLabelStyle}>Org</p>
                  <p style={metaValueStyle}>{event.orgName || event.orgId}</p>
                </div>
                <div>
                  <p style={metaLabelStyle}>Occurred</p>
                  <p style={metaValueStyle}>{formatDateTime(event.occurredAt)}</p>
                </div>
              </div>
              <p style={metaSubStyle}>
                Subject: {event.subjectType} {event.subjectId}
              </p>
              <p style={metaSubStyle}>Channel: {event.channel}</p>
              <p style={metaSubStyle}>Correlation: {event.correlationId}</p>
              <pre style={payloadStyle}>{JSON.stringify(event.payload, null, 2)}</pre>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: '1rem' }}>No events loaded yet.</p>
      )}
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<EventsProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const filters = {
    orgId: typeof ctx.query.orgId === 'string' ? ctx.query.orgId : '',
    subjectId: typeof ctx.query.subjectId === 'string' ? ctx.query.subjectId : '',
    type: typeof ctx.query.type === 'string' ? ctx.query.type : '',
    from: typeof ctx.query.from === 'string' ? ctx.query.from : '',
    to: typeof ctx.query.to === 'string' ? ctx.query.to : '',
    limit: typeof ctx.query.limit === 'string' ? ctx.query.limit : '50',
  };

  const hasFilter = Boolean(filters.orgId || filters.subjectId || filters.type);
  if (!hasFilter) {
    return {
      props: {
        user: result.context!.user,
        filters,
        events: [],
        error: 'Provide orgId, subjectId, or type to query events.',
      },
    };
  }

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/platform-admin/events?${params.toString()}`, {
    headers: { cookie: result.context!.cookie },
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      props: {
        user: result.context!.user,
        filters,
        events: [],
        error: data?.message || 'Request failed.',
      },
    };
  }

  return {
    props: {
      user: result.context!.user,
      filters,
      events: data.events || [],
    },
  };
};

const formStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem',
  marginBottom: '1rem',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.35rem',
  fontWeight: 600,
};

const inputStyle = {
  padding: '0.5rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
};

const buttonStyle = {
  padding: '0.6rem 0.9rem',
  borderRadius: '8px',
  border: 'none',
  background: '#1c6e5a',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
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
