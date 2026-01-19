import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import OrgShell from '../../components/OrgShell';
import { getXNavItems } from '../../lib/org-nav';
import { formatDateTime } from '../../lib/date-format';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../lib/org-context';
import { getAvatarLabels } from '../../lib/avatar-i18n';

type AvatarsProps = {
  user: OrgUser;
  org: OrgInfo;
  events: AiGatewayEvent[];
  error?: string | null;
};

type AiGatewayEvent = {
  id: string;
  type: string;
  occurredAt: string;
  subjectId: string;
  payload: {
    useCase?: string;
    model?: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
    latencyMs?: number | null;
    errorClass?: string;
  };
};

export default function Avatars({ user, org, events, error }: AvatarsProps) {
  const labels = getAvatarLabels(org.defaultLanguage);
  return (
    <OrgShell
      user={user}
      org={org}
      title={labels.avatarsTitle}
      subtitle={labels.avatarsSubtitle}
      navItems={getXNavItems(org.slug, 'avatars')}
    >
      <Head>
        <title>{org.name} - {labels.avatarsTitle}</title>
      </Head>
      <div style={cardGridStyle}>
        <div style={heroCardStyle}>
          <p style={heroTitleStyle}>{labels.systemCardTitle}</p>
          <p style={heroBodyStyle}>{labels.systemCardBody}</p>
          <Link href={`/${org.slug}/avatars/system`} style={buttonStyle}>
            {labels.systemCardCta}
          </Link>
        </div>
        <div style={heroCardStyle}>
          <p style={heroTitleStyle}>{labels.orgCardTitle}</p>
          <p style={heroBodyStyle}>{labels.orgCardBody}</p>
          <Link href={`/${org.slug}/avatars/org`} style={buttonStyle}>
            {labels.orgCardCta}
          </Link>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>{labels.aiGatewayTitle}</h3>
        {error ? <p style={errorStyle}>{labels.aiGatewayErrorMessage}</p> : null}
        {events.length ? (
          <div style={eventListStyle}>
            {events.map((event) => (
              <div key={event.id} style={eventCardStyle}>
                <div style={eventHeaderStyle}>
                  <div>
                    <p style={metaLabelStyle}>{labels.aiGatewayTypeLabel}</p>
                    <p style={metaValueStyle}>{event.type}</p>
                  </div>
                  <div>
                    <p style={metaLabelStyle}>{labels.aiGatewayOccurredLabel}</p>
                    <p style={metaValueStyle}>{formatDateTime(event.occurredAt)}</p>
                  </div>
                  <div>
                    <p style={metaLabelStyle}>{labels.aiGatewayUseCaseLabel}</p>
                    <p style={metaValueStyle}>{event.payload.useCase ?? '-'}</p>
                  </div>
                  <div>
                    <p style={metaLabelStyle}>{labels.aiGatewayModelLabel}</p>
                    <p style={metaValueStyle}>{event.payload.model ?? '-'}</p>
                  </div>
                </div>
                <div style={eventMetaRowStyle}>
                  {event.payload.totalTokens !== null && event.payload.totalTokens !== undefined ? (
                    <span style={metaSubStyle}>
                      {labels.aiGatewayTokensLabel}: {event.payload.inputTokens ?? 0}/
                      {event.payload.outputTokens ?? 0} ({labels.aiGatewayTotalLabel}{' '}
                      {event.payload.totalTokens ?? 0})
                    </span>
                  ) : null}
                  {event.payload.latencyMs !== null && event.payload.latencyMs !== undefined ? (
                    <span style={metaSubStyle}>
                      {labels.aiGatewayLatencyLabel}: {event.payload.latencyMs}ms
                    </span>
                  ) : null}
                  {event.payload.errorClass ? (
                    <span style={metaSubStyle}>
                      {labels.aiGatewayErrorLabel}: {event.payload.errorClass}
                    </span>
                  ) : null}
                  {event.subjectId ? (
                    <span style={metaSubStyle}>
                      {labels.aiGatewayRequestIdLabel}: {event.subjectId}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ marginTop: '0.5rem' }}>{labels.aiGatewayEmpty}</p>
        )}
      </div>
    </OrgShell>
  );
}

const colors = {
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  border: 'var(--border)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  muted2: 'var(--muted-2)',
};

const cardGridStyle = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
};

const heroCardStyle = {
  padding: '1.1rem 1.25rem',
  borderRadius: '12px',
  border: `1px solid ${colors.border}`,
  background: colors.surface2,
  display: 'grid',
  gap: '0.75rem',
  boxShadow: 'var(--shadow)',
};

const heroTitleStyle = {
  marginTop: 0,
  marginBottom: 0,
  fontWeight: 700,
};

const heroBodyStyle = {
  margin: 0,
  color: colors.muted,
};

const buttonStyle = {
  padding: '0.65rem 1.1rem',
  borderRadius: '10px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  textDecoration: 'none',
};

const sectionStyle = {
  marginTop: '1.5rem',
};

const sectionTitleStyle = {
  margin: '0 0 0.75rem 0',
};

const eventListStyle = {
  display: 'grid',
  gap: '0.75rem',
};

const eventCardStyle = {
  padding: '1rem',
  borderRadius: '12px',
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  boxShadow: 'var(--shadow)',
};

const eventHeaderStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '0.5rem',
  marginBottom: '0.5rem',
};

const eventMetaRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
};

const metaLabelStyle = {
  margin: 0,
  color: colors.muted,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const metaValueStyle = {
  margin: 0,
  fontWeight: 600,
  color: colors.text,
};

const metaSubStyle = {
  margin: 0,
  color: colors.muted2,
  fontSize: '0.85rem',
};

const errorStyle = {
  color: 'var(--danger)',
  margin: '0.5rem 0 0 0',
};

export const getServerSideProps: GetServerSideProps<AvatarsProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
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
      ? data
          .filter((row) => String(row.type ?? '').startsWith('AI_GATEWAY_'))
          .map((row) => ({
            id: String(row.id ?? ''),
            type: String(row.type ?? ''),
            occurredAt: String(row.occurredAt ?? ''),
            subjectId: String(row.subjectId ?? ''),
            payload: {
              useCase: row.payload?.useCase ? String(row.payload.useCase) : undefined,
              model: row.payload?.model ? String(row.payload.model) : undefined,
              inputTokens:
                typeof row.payload?.inputTokens === 'number' ? row.payload.inputTokens : null,
              outputTokens:
                typeof row.payload?.outputTokens === 'number' ? row.payload.outputTokens : null,
              totalTokens:
                typeof row.payload?.totalTokens === 'number' ? row.payload.totalTokens : null,
              latencyMs:
                typeof row.payload?.latencyMs === 'number' ? row.payload.latencyMs : null,
              errorClass: row.payload?.errorClass ? String(row.payload.errorClass) : undefined,
            },
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
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      events: [],
    },
  };
};
