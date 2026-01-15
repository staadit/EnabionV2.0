import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useMemo, useState } from 'react';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
};

type CoachSuggestion = {
  id: string;
  kind: 'missing_info' | 'question' | 'risk' | 'rewrite' | 'summary';
  title: string;
  l1Text?: string | null;
  evidenceRef?: string | null;
  status: 'ISSUED' | 'ACCEPTED' | 'REJECTED';
  proposedPatch?: { fields?: Record<string, string | null> } | null;
  appliedFields?: string[];
};

const COACH_TASKS = ['intent_gap_detection', 'clarifying_questions', 'summary_internal'];
const KIND_ORDER: CoachSuggestion['kind'][] = [
  'missing_info',
  'question',
  'risk',
  'summary',
  'rewrite',
];
const KIND_LABELS: Record<CoachSuggestion['kind'], string> = {
  missing_info: 'Missing info',
  question: 'Questions',
  risk: 'Risks',
  rewrite: 'Rewrites',
  summary: 'Summaries',
};

export default function Coach({ user, org, intentId }: IntentTabProps) {
  const [running, setRunning] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachRunId, setCoachRunId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([]);
  const isViewer = user.role === 'Viewer';

  const groupedSuggestions = useMemo(
    () =>
      KIND_ORDER.map((kind) => ({
        kind,
        items: suggestions.filter((item) => item.kind === kind),
      })).filter((group) => group.items.length > 0),
    [suggestions],
  );

  const runCoach = async () => {
    if (running || isViewer) return;
    setRunning(true);
    setMessage(null);
    setError(null);
    setCoachRunId(null);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/intents/${intentId}/coach/suggest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requestedLanguage: org.defaultLanguage ?? 'EN',
          tasks: COACH_TASKS,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(readApiError(data) || 'Intent Coach failed');
      }
      setCoachRunId(data?.coachRunId ?? null);
      if (Array.isArray(data?.suggestions)) {
        setSuggestions(data.suggestions);
        setMessage(
          `Intent Coach generated ${data.suggestions.length} suggestion${
            data.suggestions.length === 1 ? '' : 's'
          }.`,
        );
      } else {
        setMessage('No suggestions returned.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Intent Coach failed');
    } finally {
      setRunning(false);
    }
  };

  const updateSuggestion = (suggestionId: string, patch: Partial<CoachSuggestion>) => {
    setSuggestions((prev) =>
      prev.map((item) => (item.id === suggestionId ? { ...item, ...patch } : item)),
    );
  };

  const acceptSuggestion = async (suggestionId: string) => {
    if (pendingId || isViewer) return;
    setPendingId(suggestionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/intents/${intentId}/coach/suggestions/${suggestionId}/accept`,
        { method: 'POST', headers: { 'content-type': 'application/json' } },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(readApiError(data) || 'Failed to accept suggestion');
      }
      updateSuggestion(suggestionId, {
        status: data?.suggestion?.status ?? 'ACCEPTED',
        appliedFields: data?.appliedFields ?? [],
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to accept suggestion');
    } finally {
      setPendingId(null);
    }
  };

  const rejectSuggestion = async (suggestionId: string) => {
    if (pendingId || isViewer) return;
    setPendingId(suggestionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/intents/${intentId}/coach/suggestions/${suggestionId}/reject`,
        { method: 'POST', headers: { 'content-type': 'application/json' } },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(readApiError(data) || 'Failed to reject suggestion');
      }
      updateSuggestion(suggestionId, {
        status: data?.suggestion?.status ?? 'REJECTED',
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to reject suggestion');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <OrgShell
      user={user}
      org={org}
      title="Intent Coach"
      subtitle="Generate suggestions and clarify missing intent details."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Intent Coach</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Intent Coach</p>
        <p style={{ margin: 0 }}>Intent ID: {intentId}</p>
        {coachRunId ? <p style={metaStyle}>Run ID: {coachRunId}</p> : null}
      </div>
      <div style={actionRowStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={runCoach}
          disabled={isViewer || running}
        >
          {running ? 'Running...' : 'Run Intent Coach'}
        </button>
        {isViewer ? (
          <span style={helperStyle}>View-only access.</span>
        ) : (
          <span style={helperStyle}>Uses L1 intent fields only (no raw/pasted text).</span>
        )}
      </div>
      {message ? <p style={messageStyle}>{message}</p> : null}
      {groupedSuggestions.length ? (
        <div style={suggestionGridStyle}>
          {groupedSuggestions.map((group) => (
            <div key={group.kind} style={groupCardStyle}>
              <div style={groupTitleStyle}>{KIND_LABELS[group.kind]}</div>
              <div style={suggestionListStyle}>
                {group.items.map((item) => (
                  <div key={item.id} style={suggestionCardStyle}>
                    <div style={suggestionHeaderStyle}>
                      <span style={{ fontWeight: 600 }}>{item.title}</span>
                      <span style={statusBadgeStyle}>{item.status}</span>
                    </div>
                    {item.l1Text ? <p style={suggestionTextStyle}>{item.l1Text}</p> : null}
                    {item.evidenceRef ? (
                      <div style={suggestionMetaStyle}>Evidence: {item.evidenceRef}</div>
                    ) : null}
                    {item.proposedPatch?.fields ? (
                      <div style={suggestionMetaStyle}>
                        Patch: {formatPatchFields(item.proposedPatch.fields)}
                      </div>
                    ) : null}
                    {item.appliedFields && item.appliedFields.length > 0 ? (
                      <div style={suggestionMetaStyle}>
                        Applied fields: {item.appliedFields.join(', ')}
                      </div>
                    ) : null}
                    <div style={suggestionActionsStyle}>
                      <button
                        type="button"
                        style={acceptButtonStyle}
                        onClick={() => acceptSuggestion(item.id)}
                        disabled={
                          isViewer || pendingId !== null || item.status !== 'ISSUED' || running
                        }
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        style={rejectButtonStyle}
                        onClick={() => rejectSuggestion(item.id)}
                        disabled={
                          isViewer || pendingId !== null || item.status !== 'ISSUED' || running
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p style={errorStyle}>{error}</p> : null}
    </OrgShell>
  );
}

function readApiError(data: any) {
  if (!data) return null;
  if (Array.isArray(data?.message)) {
    return data.message.join('; ');
  }
  return data?.message || data?.error || null;
}

function formatPatchFields(fields: Record<string, string | null>) {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${value ?? 'null'}`)
    .join(', ');
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed var(--border)',
  background: 'var(--surface-2)',
};

const actionRowStyle = {
  marginTop: '1.25rem',
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'center',
};

const buttonStyle = {
  padding: '0.7rem 1.2rem',
  borderRadius: '12px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};

const helperStyle = {
  color: 'var(--muted)',
  fontSize: '0.9rem',
};

const messageStyle = {
  marginTop: '0.75rem',
  color: 'var(--text)',
};

const suggestionGridStyle = {
  marginTop: '1rem',
  display: 'grid',
  gap: '1rem',
};

const groupCardStyle = {
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  padding: '1rem',
};

const groupTitleStyle = {
  fontWeight: 600,
  marginBottom: '0.75rem',
};

const suggestionListStyle = {
  display: 'grid',
  gap: '0.75rem',
};

const suggestionCardStyle = {
  padding: '0.85rem 1rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
};

const suggestionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '0.75rem',
  alignItems: 'center',
};

const statusBadgeStyle = {
  background: 'var(--surface-2)',
  color: 'var(--muted)',
  borderRadius: '999px',
  padding: '0.15rem 0.6rem',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const suggestionTextStyle = {
  margin: '0.5rem 0 0',
  color: 'var(--text)',
};

const suggestionMetaStyle = {
  marginTop: '0.35rem',
  color: 'var(--muted)',
  fontSize: '0.85rem',
};

const suggestionActionsStyle = {
  marginTop: '0.75rem',
  display: 'flex',
  gap: '0.5rem',
};

const acceptButtonStyle = {
  padding: '0.45rem 0.9rem',
  borderRadius: '10px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};

const rejectButtonStyle = {
  padding: '0.45rem 0.9rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontWeight: 600,
  cursor: 'pointer',
};

const metaStyle = {
  margin: '0.35rem 0 0',
  color: 'var(--muted)',
  fontSize: '0.85rem',
};

const errorStyle = {
  marginTop: '0.75rem',
  color: 'var(--danger)',
};

export const getServerSideProps: GetServerSideProps<IntentTabProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
    },
  };
};
