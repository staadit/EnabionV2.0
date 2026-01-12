import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/router';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { fetchOrgIntents, type OrgIntent } from '../../../lib/org-intents';
import { fetchOrgMembers, type OrgMemberOption } from '../../../lib/org-members';
import { formatDateTime } from '../../../lib/date-format';

const colors = {
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  border: 'var(--border)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  muted2: 'var(--muted-2)',
  ocean: 'var(--ocean)',
  green: 'var(--green)',
};

type IntentFilters = {
  q: string;
  status: string[];
  ownerId: string;
  language: string;
  from: string;
  to: string;
};

type IntentsIndexProps = {
  user: OrgUser;
  org: OrgInfo;
  intents: OrgIntent[];
  members: OrgMemberOption[];
  filters: IntentFilters;
};

const STATUS_OPTIONS = ['NEW', 'CLARIFY', 'MATCH', 'COMMIT', 'WON', 'LOST'];
const LANGUAGE_OPTIONS = ['EN', 'PL', 'DE', 'NL'];

export default function IntentsIndex({
  user,
  org,
  intents,
  members,
  filters: initialFilters,
}: IntentsIndexProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<IntentFilters>(initialFilters);
  const isViewer = user.role === 'Viewer';

  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const datePreset = useMemo(() => resolvePreset(filters.from, filters.to), [
    filters.from,
    filters.to,
  ]);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.status.length ||
      filters.ownerId ||
      filters.language ||
      filters.from ||
      filters.to,
  );

  const applyFilters = (next: IntentFilters) => {
    const query: Record<string, string | string[]> = {
      orgSlug: org.slug,
    };
    if (next.q) query.q = next.q;
    if (next.status.length) query.status = next.status;
    if (next.ownerId) query.ownerId = next.ownerId;
    if (next.language) query.language = next.language;
    if (next.from) query.from = next.from;
    if (next.to) query.to = next.to;
    void router.push({ pathname: router.pathname, query });
  };

  const onSubmitFilters = (event: FormEvent) => {
    event.preventDefault();
    applyFilters(filters);
  };

  const clearFilters = () => {
    void router.push(`/${org.slug}/intents`);
  };

  const onPresetChange = (value: string) => {
    if (value === 'any') {
      setFilters((prev) => ({ ...prev, from: '', to: '' }));
      return;
    }
    if (value === 'last7') {
      setFilters((prev) => ({ ...prev, from: daysAgo(7), to: today() }));
      return;
    }
    if (value === 'last30') {
      setFilters((prev) => ({ ...prev, from: daysAgo(30), to: today() }));
      return;
    }
    if (value === 'last90') {
      setFilters((prev) => ({ ...prev, from: daysAgo(90), to: today() }));
      return;
    }
  };

  const onStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
    setFilters((prev) => ({ ...prev, status: selected }));
  };

  const goToIntent = (intentId: string) => {
    void router.push(`/${org.slug}/intents/${intentId}`);
  };

  return (
    <OrgShell
      user={user}
      org={org}
      title="Intents"
      subtitle="List and manage intents for this organization."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Intents</title>
      </Head>

      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Intents</h2>
          <p style={subtitleStyle}>Track active intents and filter by activity.</p>
        </div>
        {!isViewer ? (
          <Link href={`/${org.slug}/intents/new`} style={primaryButtonStyle}>
            New Intent
          </Link>
        ) : null}
      </div>

      <form onSubmit={onSubmitFilters} style={filtersCardStyle}>
        <div style={filtersGridStyle}>
          <label style={fieldStyle}>
            Search
            <input
              type="search"
              value={filters.q}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, q: event.target.value }))
              }
              placeholder="Search title or client"
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Status
            <select
              multiple
              value={filters.status}
              onChange={onStatusChange}
              style={{ ...inputStyle, height: '110px' }}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Owner
            <select
              value={filters.ownerId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, ownerId: event.target.value }))
              }
              style={inputStyle}
            >
              <option value="">Any</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.email}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Language
            <select
              value={filters.language}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, language: event.target.value }))
              }
              style={inputStyle}
            >
              <option value="">Any</option>
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Date range
            <select
              value={datePreset}
              onChange={(event) => onPresetChange(event.target.value)}
              style={inputStyle}
            >
              <option value="any">Any</option>
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="last90">Last 90 days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label style={fieldStyle}>
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, from: event.target.value }))
              }
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, to: event.target.value }))
              }
              style={inputStyle}
            />
          </label>
        </div>
        <div style={filterActionsStyle}>
          <button type="submit" style={primaryButtonStyle}>
            Apply filters
          </button>
          {hasActiveFilters ? (
            <button type="button" style={ghostButtonStyle} onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}
        </div>
      </form>

      {intents.length ? (
        <div style={tableCardStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Owner</th>
                <th style={thStyle}>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((intent) => (
                <tr
                  key={intent.id}
                  style={rowStyle}
                  onClick={() => goToIntent(intent.id)}
                >
                  <td style={tdStyle}>
                    <div style={titleCellStyle}>
                      <span style={{ fontWeight: 600 }}>
                        {intent.title || intent.goal || 'Untitled intent'}
                      </span>
                      <span style={metaTextStyle}>{intent.id}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>{intent.client || 'Not set'}</td>
                  <td style={tdStyle}>{intent.status || intent.stage}</td>
                  <td style={tdStyle}>{intent.owner?.email || 'Unassigned'}</td>
                  <td style={tdStyle}>{formatDate(intent.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : hasActiveFilters ? (
        <div style={emptyStateStyle}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>No results match filters</p>
          <p style={{ marginTop: 0 }}>Try clearing or adjusting the filters.</p>
          <button type="button" style={ghostButtonStyle} onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div style={emptyStateStyle}>
          <p style={{ marginTop: 0, fontWeight: 600 }}>No intents yet</p>
          <p style={{ marginTop: 0 }}>Create your first intent to start tracking work.</p>
          {!isViewer ? (
            <Link href={`/${org.slug}/intents/new`} style={primaryButtonStyle}>
              New Intent
            </Link>
          ) : null}
        </div>
      )}
    </OrgShell>
  );
}

const headerStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  justifyContent: 'space-between',
  gap: '1rem',
  alignItems: 'center',
};

const titleStyle = {
  margin: 0,
  fontSize: '1.6rem',
  color: colors.text,
};

const subtitleStyle = {
  margin: '0.35rem 0 0',
  color: colors.muted,
};

const filtersCardStyle = {
  marginTop: '1.5rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: `1px solid ${colors.border}`,
  background: colors.surface2,
  display: 'grid',
  gap: '1rem',
  boxShadow: 'var(--shadow)',
};

const filtersGridStyle = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const fieldStyle = {
  display: 'grid',
  gap: '0.45rem',
  fontWeight: 600,
  color: colors.text,
};

const inputStyle = {
  borderRadius: '10px',
  border: `1px solid ${colors.border}`,
  padding: '0.55rem 0.7rem',
  fontSize: '0.9rem',
  background: colors.surface,
  color: colors.text,
};

const filterActionsStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
};

const primaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.6rem 1.1rem',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: 600,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'linear-gradient(135deg, var(--ocean), var(--green))',
  color: '#fff',
  cursor: 'pointer',
  boxShadow: 'var(--shadow)',
};

const ghostButtonStyle = {
  padding: '0.6rem 1.1rem',
  borderRadius: '10px',
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.text,
  fontWeight: 600,
  cursor: 'pointer',
};

const tableCardStyle = {
  marginTop: '1.5rem',
  borderRadius: '12px',
  border: `1px solid ${colors.border}`,
  overflow: 'hidden',
  background: colors.surface2,
  boxShadow: 'var(--shadow)',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem 1rem',
  borderBottom: `1px solid ${colors.border}`,
  color: colors.muted,
  fontSize: '0.85rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const tdStyle = {
  padding: '0.9rem 1rem',
  borderBottom: `1px solid ${colors.border}`,
  fontSize: '0.95rem',
  color: colors.text,
};

const rowStyle = {
  cursor: 'pointer',
};

const titleCellStyle = {
  display: 'grid',
  gap: '0.2rem',
};

const metaTextStyle = {
  color: colors.muted2,
  fontSize: '0.75rem',
};

const emptyStateStyle = {
  marginTop: '1.5rem',
  padding: '1.25rem',
  borderRadius: '12px',
  border: `1px dashed ${colors.border}`,
  background: colors.surface,
  display: 'grid',
  gap: '0.5rem',
  color: colors.text,
};

const formatDate = (value?: string | null) => formatDateTime(value);

const today = () => new Date().toISOString().slice(0, 10);

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const resolvePreset = (from: string, to: string) => {
  if (!from && !to) return 'any';
  const todayValue = today();
  if (to && to !== todayValue) return 'custom';
  if (from === daysAgo(7)) return 'last7';
  if (from === daysAgo(30)) return 'last30';
  if (from === daysAgo(90)) return 'last90';
  return 'custom';
};

const parseQueryString = (value: string | string[] | undefined) => {
  if (!value) return '';
  if (Array.isArray(value)) return value[0] ?? '';
  return value;
};

const parseQueryArray = (value: string | string[] | undefined) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeDateInput = (value: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

export const getServerSideProps: GetServerSideProps<IntentsIndexProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const q = parseQueryString(ctx.query.q as string | string[] | undefined);
  const status = parseQueryArray(
    (ctx.query.status ?? ctx.query['status[]']) as string | string[] | undefined,
  );
  const ownerId = parseQueryString(ctx.query.ownerId as string | string[] | undefined);
  const language = parseQueryString(ctx.query.language as string | string[] | undefined);
  const from = normalizeDateInput(
    parseQueryString(ctx.query.from as string | string[] | undefined),
  );
  const to = normalizeDateInput(
    parseQueryString(ctx.query.to as string | string[] | undefined),
  );

  const { items } = await fetchOrgIntents(result.context!.cookie, {
    q: q || undefined,
    status: status.length ? status : undefined,
    ownerId: ownerId || undefined,
    language: language || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: 50,
  });

  const members = await fetchOrgMembers(result.context!.cookie);

  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intents: items,
      members,
      filters: {
        q: q || '',
        status,
        ownerId: ownerId || '',
        language: language || '',
        from,
        to,
      },
    },
  };
};
