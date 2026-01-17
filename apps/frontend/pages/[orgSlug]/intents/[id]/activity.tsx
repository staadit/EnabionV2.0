import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import type { ChangeEvent } from 'react';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';
import { fetchOrgMembers, type OrgMemberOption } from '../../../../lib/org-members';
import { formatDateTime } from '../../../../lib/date-format';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';
const PER_PAGE_OPTIONS = [10, 50, 100];
const EVENT_TYPE_OPTIONS = [
  'INTENT_CREATED',
  'INTENT_UPDATED',
  'INTENT_PIPELINE_STAGE_CHANGED',
  'NDA_PRESENTED',
  'NDA_ACCEPTED',
  'CONFIDENTIALITY_LEVEL_CHANGED',
  'AVATAR_SUGGESTION_ISSUED',
  'AVATAR_SUGGESTION_ACCEPTED',
  'AVATAR_SUGGESTION_REJECTED',
  'AVATAR_SUGGESTION_FEEDBACK',
  'AVATAR_FEEDBACK_RECORDED',
  'MATCH_LIST_CREATED',
  'PARTNER_INVITED',
  'PARTNER_RESPONSE_RECEIVED',
  'COMMIT_DECISION_TAKEN',
  'EMAIL_RECEIVED',
  'EMAIL_THREAD_MAPPED_TO_INTENT',
  'EMAIL_APPLIED_AS_INTENT_UPDATE',
  'EMAIL_SENT',
  'EMAIL_FAILED',
  'TRUSTSCORE_SNAPSHOT_CREATED',
  'INTENT_VIEWED',
  'INTENT_SHARED_LINK_VIEWED',
  'EXPORT_GENERATED',
  'ATTACHMENT_UPLOADED',
  'ATTACHMENT_DOWNLOADED',
  'ATTACHMENT_DELETED',
  'ATTACHMENT_CONFIDENTIALITY_CHANGED',
  'USER_SIGNED_UP',
  'USER_LOGGED_IN',
  'USER_LOGGED_OUT',
  'USER_PASSWORD_RESET_REQUESTED',
  'USER_PASSWORD_RESET_COMPLETED',
  'ORG_PROFILE_UPDATED',
  'ORG_MEMBER_ROLE_CHANGED',
  'ORG_MEMBER_DEACTIVATED',
  'ORG_PREFERENCES_UPDATED',
  'PLATFORM_ADMIN_AUDIT',
];

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  events: IntentEvent[];
  members: OrgMemberOption[];
  typeFilter: string | null;
  page: number;
  perPage: number;
  hasNext: boolean;
};

type IntentEvent = {
  id: string;
  type: string;
  occurredAt: string;
  actorUserId?: string | null;
  payload?: Record<string, any> | null;
};

export default function Activity({
  user,
  org,
  intentId,
  events,
  members,
  typeFilter,
  page,
  perPage,
  hasNext,
}: IntentTabProps) {
  const router = useRouter();
  const hasPrev = page > 1;
  const timelineItems = buildTimeline(events, members);

  const handleTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextType = event.target.value || null;
    router.push(buildActivityHref(org.slug, intentId, {
      type: nextType,
      perPage,
      page: 1,
    }));
  };

  const handlePerPageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPerPage = Number(event.target.value);
    router.push(buildActivityHref(org.slug, intentId, {
      type: typeFilter,
      perPage: Number.isNaN(nextPerPage) ? perPage : nextPerPage,
      page: 1,
    }));
  };

  return (
    <OrgShell
      user={user}
      org={org}
      title="Activity"
      subtitle="Event timeline for this intent."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Activity</title>
      </Head>

      <div style={filterCardStyle}>
        <div style={filterRowStyle}>
          <div style={filterGroupStyle}>
            <label style={filterLabelStyle} htmlFor="eventType">
              Event type
            </label>
            <select
              id="eventType"
              style={selectStyle}
              value={typeFilter ?? ''}
              onChange={handleTypeChange}
            >
              <option value="">All types</option>
              {EVENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div style={filterGroupStyle}>
            <label style={filterLabelStyle} htmlFor="perPage">
              Per page
            </label>
            <select id="perPage" style={selectStyle} value={perPage} onChange={handlePerPageChange}>
              {PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div style={filterHintStyle}>Sorted by newest first.</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={summaryRowStyle}>
          <div style={summaryTextStyle}>
            Showing {events.length} {events.length === 1 ? 'event' : 'events'}
          </div>
          <div style={pagerStyle}>
            {hasPrev ? (
              <Link
                style={pagerButtonStyle}
                href={buildActivityHref(org.slug, intentId, {
                  type: typeFilter,
                  perPage,
                  page: page - 1,
                })}
              >
                Previous
              </Link>
            ) : (
              <span style={pagerDisabledStyle}>Previous</span>
            )}
            <span style={pagerPageStyle}>Page {page}</span>
            {hasNext ? (
              <Link
                style={pagerButtonStyle}
                href={buildActivityHref(org.slug, intentId, {
                  type: typeFilter,
                  perPage,
                  page: page + 1,
                })}
              >
                Next
              </Link>
            ) : (
              <span style={pagerDisabledStyle}>Next</span>
            )}
          </div>
        </div>

        {timelineItems.length ? (
          <div style={timelineStyle}>
            {timelineItems.map((item) => (
              <div key={item.id} style={timelineItemStyle}>
                <div style={{ ...timelineDotStyle, ...(item.color ? { background: item.color } : {}) }} />
                <div>
                  <div style={timelineTextStyle}>{item.text}</div>
                  <div style={timelineMetaStyle}>{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={emptyStateStyle}>No activity events yet for this intent.</div>
        )}
      </div>
    </OrgShell>
  );
}

type TimelineItem = {
  id: string;
  text: string;
  meta: string;
  color?: string;
};

function buildTimeline(events: IntentEvent[], members: OrgMemberOption[]): TimelineItem[] {
  return events.map((event) => {
    const note = formatEventNote(event);
    const text = note ? `${event.type} ${note}` : event.type;
    const meta = formatEventMeta(event, members);
    return {
      id: event.id,
      text,
      meta,
      color: resolveEventColor(event.type),
    };
  });
}

function formatEventNote(event: IntentEvent) {
  const payload = event.payload ?? {};
  if (event.type === 'INTENT_UPDATED') {
    return payload.changeSummary ? `- ${payload.changeSummary}` : '- Edited fields saved';
  }
  if (event.type === 'EXPORT_GENERATED') {
    if (payload.format) {
      return `(L1) - ${String(payload.format).toUpperCase()}`;
    }
    return '(L1) - Export';
  }
  if (event.type === 'ATTACHMENT_UPLOADED') {
    if (payload.filename) {
      return `- ${payload.filename}`;
    }
    return '- Attachment uploaded';
  }
  if (event.type === 'INTENT_CREATED') {
    if (payload.source) {
      return `- Source: ${String(payload.source).toUpperCase()}`;
    }
    return '- Source: PASTE';
  }
  if (event.type === 'ATTACHMENT_DELETED') {
    if (payload.filename) {
      return `- Deleted ${payload.filename}`;
    }
    return '- Attachment deleted';
  }
  if (event.type === 'ATTACHMENT_CONFIDENTIALITY_CHANGED') {
    if (payload.fromLevel && payload.toLevel) {
      return `- ${payload.fromLevel} -> ${payload.toLevel}`;
    }
    return '- Confidentiality updated';
  }
  if (event.type === 'INTENT_PIPELINE_STAGE_CHANGED') {
    if (payload.toStage) {
      return `- Moved to ${payload.toStage}`;
    }
    return '- Stage changed';
  }
  if (event.type === 'INTENT_SHARED_LINK_VIEWED') {
    return '- Share link viewed';
  }
  return '';
}

function formatEventMeta(event: IntentEvent, members: OrgMemberOption[]) {
  const when = formatDateTime(event.occurredAt);
  if (!event.actorUserId) {
    return when;
  }
  const actor = members.find((member) => member.id === event.actorUserId);
  return actor ? `${when} - by ${actor.email}` : when;
}

function resolveEventColor(type: string) {
  if (type === 'INTENT_UPDATED') {
    return 'var(--green)';
  }
  if (type === 'EXPORT_GENERATED') {
    return 'var(--ocean)';
  }
  if (type === 'ATTACHMENT_UPLOADED') {
    return 'var(--gold)';
  }
  return undefined;
}

function buildActivityHref(
  orgSlug: string,
  intentId: string,
  input: { type?: string | null; perPage: number; page: number },
) {
  const params = new URLSearchParams();
  if (input.type) {
    params.set('type', input.type);
  }
  if (input.perPage && input.perPage !== 50) {
    params.set('limit', String(input.perPage));
  }
  if (input.page && input.page > 1) {
    params.set('page', String(input.page));
  }
  const query = params.toString();
  const base = `/${orgSlug}/intents/${intentId}/activity`;
  return query ? `${base}?${query}` : base;
}

async function fetchIntentEventsPage(
  cookie: string | undefined,
  intentId: string,
  type: string | null,
  limit: number,
  offset: number,
): Promise<IntentEvent[]> {
  const params = new URLSearchParams({ subjectId: intentId, limit: String(limit) });
  if (type) {
    params.set('type', type);
  }
  if (offset > 0) {
    params.set('offset', String(offset));
  }
  const res = await fetch(`${BACKEND_BASE}/events?${params.toString()}`, {
    headers: { cookie: cookie ?? '' },
  });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as Array<Record<string, any>>;
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((row) => ({
    id: String(row.id ?? row.eventId ?? ''),
    type: String(row.type ?? ''),
    occurredAt: String(row.occurredAt ?? row.recordedAt ?? ''),
    actorUserId: row.actorUserId ?? null,
    payload: typeof row.payload === 'object' && row.payload !== null ? row.payload : null,
  }));
}

export const getServerSideProps: GetServerSideProps<IntentTabProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  const typeParam = typeof ctx.query.type === 'string' ? ctx.query.type : '';
  const limitParam = typeof ctx.query.limit === 'string' ? Number(ctx.query.limit) : 50;
  const pageParam = typeof ctx.query.page === 'string' ? Number(ctx.query.page) : 1;

  const perPage = PER_PAGE_OPTIONS.includes(limitParam) ? limitParam : 50;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const typeFilter = EVENT_TYPE_OPTIONS.includes(typeParam) ? typeParam : '';
  const offset = (page - 1) * perPage;

  const cookie = result.context!.cookie;
  const [eventsData, members] = await Promise.all([
    fetchIntentEventsPage(cookie, intentId, typeFilter || null, perPage + 1, offset),
    fetchOrgMembers(cookie),
  ]);

  const hasNext = eventsData.length > perPage;
  const events = eventsData.slice(0, perPage);

  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
      events,
      members,
      typeFilter: typeFilter || null,
      page,
      perPage,
      hasNext,
    },
  };
};

const cardStyle = {
  padding: '1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  boxShadow: 'var(--shadow)',
};

const filterCardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  boxShadow: 'var(--shadow)',
  marginBottom: '1.25rem',
};

const filterRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '1rem',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
};

const filterGroupStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.35rem',
};

const filterLabelStyle = {
  fontSize: '0.8rem',
  color: 'var(--muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const selectStyle = {
  padding: '0.55rem 0.75rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  minWidth: '200px',
};

const filterHintStyle = {
  fontSize: '0.85rem',
  color: 'var(--muted)',
};

const summaryRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  marginBottom: '1rem',
};

const summaryTextStyle = {
  fontWeight: 600,
};

const pagerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
};

const pagerButtonStyle = {
  padding: '0.5rem 0.9rem',
  borderRadius: '999px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  textDecoration: 'none',
  fontWeight: 600,
};

const pagerDisabledStyle = {
  padding: '0.5rem 0.9rem',
  borderRadius: '999px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--muted)',
  fontWeight: 600,
};

const pagerPageStyle = {
  fontSize: '0.9rem',
  color: 'var(--muted)',
};

const timelineStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1rem',
};

const timelineItemStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid var(--border)',
};

const timelineDotStyle = {
  width: '10px',
  height: '10px',
  borderRadius: '999px',
  background: 'var(--muted)',
  marginTop: '0.4rem',
};

const timelineTextStyle = {
  fontWeight: 600,
};

const timelineMetaStyle = {
  marginTop: '0.3rem',
  fontSize: '0.85rem',
  color: 'var(--muted)',
};

const emptyStateStyle = {
  padding: '1.5rem',
  borderRadius: '12px',
  border: '1px dashed var(--border)',
  color: 'var(--muted)',
  textAlign: 'center' as const,
};
