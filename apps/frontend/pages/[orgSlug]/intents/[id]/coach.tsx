import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
};

type CoachField = 'goal' | 'context' | 'scope' | 'kpi' | 'risks';
type CoachSuggestionKind = 'missing_info' | 'question' | 'risk' | 'rewrite' | 'summary';

type CoachSuggestion = {
  id: string;
  kind: CoachSuggestionKind;
  title: string;
  l1Text?: string | null;
  evidenceRef?: string | null;
  status: 'ISSUED' | 'ACCEPTED' | 'REJECTED';
  proposedPatch?: { fields?: Record<string, string | null> } | null;
  appliedFields?: string[];
  actionable?: boolean;
  targetField?: string | null;
};

type CoachHistoryItem = {
  id: string;
  createdAt: string;
  summaryItems: string[];
};

const COACH_FIELDS: CoachField[] = ['goal', 'context', 'scope', 'kpi', 'risks'];

const COACH_FIELD_LABELS: Record<CoachField, string> = {
  goal: 'Goal',
  context: 'Context',
  scope: 'Scope',
  kpi: 'KPIs',
  risks: 'Risks',
};

const SUGGESTION_KIND_ORDER: CoachSuggestionKind[] = [
  'missing_info',
  'question',
  'risk',
  'rewrite',
  'summary',
];

const SUGGESTION_KIND_LABELS: Record<CoachSuggestionKind, string> = {
  missing_info: 'Missing information',
  question: 'Clarifying questions',
  risk: 'Risks',
  rewrite: 'Rewrite suggestions',
  summary: 'Summary',
};

export default function Coach({ user, org, intentId }: IntentTabProps) {
  const [running, setRunning] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachRunId, setCoachRunId] = useState<string | null>(null);
  const [summaryItems, setSummaryItems] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([]);
  const [instructions, setInstructions] = useState('');
  const [focusFields, setFocusFields] = useState<CoachField[]>([]);
  const [summarySelected, setSummarySelected] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [historyPopupText, setHistoryPopupText] = useState<string | null>(null);
  const [rerunSuggestionId, setRerunSuggestionId] = useState<string | null>(null);
  const isViewer = user.role === 'Viewer';

  const groupedSuggestions = useMemo(() => {
    const order = new Map(COACH_FIELDS.map((field, index) => [field, index]));
    const groups = new Map<CoachSuggestionKind, CoachSuggestion[]>();
    for (const suggestion of suggestions) {
      const kind = suggestion.kind ?? 'rewrite';
      const bucket = groups.get(kind);
      if (bucket) {
        bucket.push(suggestion);
      } else {
        groups.set(kind, [suggestion]);
      }
    }

    const orderedGroups: { kind: CoachSuggestionKind; items: CoachSuggestion[] }[] = [];
    for (const kind of SUGGESTION_KIND_ORDER) {
      const items = groups.get(kind);
      if (!items || items.length === 0) continue;
      const sorted =
        kind === 'rewrite'
          ? [...items].sort((a, b) => {
              const aIndex = a.targetField
                ? order.get(a.targetField as CoachField) ?? 999
                : 999;
              const bIndex = b.targetField
                ? order.get(b.targetField as CoachField) ?? 999
                : 999;
              return aIndex - bIndex;
            })
          : items;
      orderedGroups.push({ kind, items: sorted });
    }
    return orderedGroups;
  }, [suggestions]);

  const hasRun = summaryItems.length > 0 || suggestions.length > 0 || coachRunId !== null;

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/intents/${intentId}/coach/history`);
        const data = await res.json();
        if (!active) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setHasHistory(items.length > 0);
      } catch {
        if (active) {
          setHasHistory(false);
        }
      }
    };
    loadHistory();
    return () => {
      active = false;
    };
  }, [intentId]);

  const runCoach = async (payload?: {
    instructions?: string;
    focusFields?: CoachField[];
    includeSummary?: boolean;
    replaceField?: CoachField | null;
  }) => {
    if (running || isViewer) return;
    const includeSummary = payload?.includeSummary ?? true;
    const replaceField = payload?.replaceField ?? null;
    const shouldReset = !replaceField;
    setRunning(true);
    setMessage(null);
    setError(null);
    setCoachRunId(null);
    if (shouldReset) {
      if (includeSummary) {
        setSummaryItems([]);
      }
      setSuggestions([]);
    }
    try {
      const body: Record<string, unknown> = {
        requestedLanguage: org.defaultLanguage ?? 'EN',
      };
      if (payload?.instructions) {
        body.instructions = payload.instructions;
      }
      if (payload?.focusFields && payload.focusFields.length > 0) {
        body.focusFields = payload.focusFields;
      }
      const res = await fetch(`/api/intents/${intentId}/coach/suggest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(readApiError(data) || 'Intent Coach failed');
      }
      setCoachRunId(data?.coachRunId ?? null);
      const summaryBlock = Array.isArray(data?.summaryBlock) ? data.summaryBlock : [];
      if (includeSummary) {
        setSummaryItems(summaryBlock);
      }
      if (Array.isArray(data?.suggestions)) {
        if (replaceField) {
          setSuggestions((prev) => {
            const filtered = prev.filter((item) => item.targetField !== replaceField);
            return [...filtered, ...data.suggestions];
          });
        } else {
          setSuggestions(data.suggestions);
        }
        setMessage(
          `Intent Coach generated ${data.suggestions.length} suggestion${
            data.suggestions.length === 1 ? '' : 's'
          }.`,
        );
      } else {
        setMessage('No suggestions returned.');
      }
      setHasHistory(true);
    } catch (err: any) {
      setError(err?.message ?? 'Intent Coach failed');
    } finally {
      setRunning(false);
    }
  };

  const showHistory = async () => {
    if (historyLoading) return;
    setHistoryLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intents/${intentId}/coach/history`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(readApiError(data) || 'Failed to load history');
      }
      const items = Array.isArray(data?.items)
        ? (data.items as CoachHistoryItem[])
        : ([] as CoachHistoryItem[]);
      setHasHistory(items.length > 0);
      if (typeof window === 'undefined') {
        return;
      }
      if (!items.length) {
        window.alert('No history yet.');
        return;
      }
      const historyText = items
        .map((item) => {
          const createdAt = new Date(item.createdAt).toLocaleString();
          const lines = Array.isArray(item.summaryItems) ? item.summaryItems : [];
          const summaryText = lines.length ? lines.map((line) => `- ${line}`).join('\n') : '- (empty)';
          return `${createdAt}\n${summaryText}`;
        })
        .join('\n\n');
      setHistoryPopupText(historyText);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleFocusField = (field: CoachField) => {
    setFocusFields((prev) =>
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field],
    );
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

  const askCoachAgain = async (suggestion: CoachSuggestion) => {
    if (running || isViewer) return;
    const targetField =
      suggestion.targetField && COACH_FIELDS.includes(suggestion.targetField as CoachField)
        ? (suggestion.targetField as CoachField)
        : null;
    if (!targetField) {
      setError('Missing target field for suggestion.');
      return;
    }
    const trimmedInstructions = instructions.trim();
    setRerunSuggestionId(suggestion.id);
    try {
      await runCoach({
        instructions: trimmedInstructions ? trimmedInstructions : undefined,
        focusFields: [targetField],
        includeSummary: false,
        replaceField: targetField,
      });
    } finally {
      setRerunSuggestionId(null);
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
      </div>
      <div style={actionRowStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => runCoach()}
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
      <div style={blockGridStyle}>
        <div style={blockCardStyle}>
          <div style={blockHeaderStyle}>
            <div>
              <p style={blockTitleStyle}>Summary and observations</p>
              {coachRunId ? <p style={metaStyle}>Run ID: {coachRunId}</p> : null}
            </div>
            {hasHistory ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={showHistory}
                disabled={historyLoading}
              >
                {historyLoading ? 'Loading...' : 'Last sugestions'}
              </button>
            ) : null}
          </div>
          {summaryItems.length ? (
            <ul style={summaryListStyle}>
              {summaryItems.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p style={placeholderStyle}>Run Intent Coach to see the summary.</p>
          )}
        </div>
        <div style={blockCardStyle}>
          <div style={blockHeaderStyle}>
            <p style={blockTitleStyle}>Suggestions</p>
          </div>
          {groupedSuggestions.length ? (
            <div style={suggestionGroupListStyle}>
              {groupedSuggestions.map((group) => (
                <div key={group.kind}>
                  <p style={suggestionGroupTitleStyle}>
                    {SUGGESTION_KIND_LABELS[group.kind]}
                  </p>
                  <div style={suggestionListStyle}>
                    {group.items.map((item) => {
                      const actionable = item.actionable !== false;
                      const isRerunActive = running && rerunSuggestionId === item.id;
                      const canRerun =
                        item.kind === 'rewrite' &&
                        typeof item.targetField === 'string' &&
                        COACH_FIELDS.includes(item.targetField as CoachField);
                      return (
                        <div key={item.id} style={suggestionCardStyle}>
                          <div style={suggestionHeaderStyle}>
                            <span style={{ fontWeight: 600 }}>{item.title}</span>
                            <div style={statusColumnStyle}>
                              <span style={statusBadgeStyle}>{item.status}</span>
                              {!actionable ? (
                                <span style={statusNoteStyle}>
                                  {item.kind === 'rewrite'
                                    ? 'No change suggested'
                                    : 'Manual follow-up'}
                                </span>
                              ) : null}
                            </div>
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
                          {item.status === 'ISSUED' ? (
                            <div style={suggestionActionsStyle}>
                              <button
                                type="button"
                                style={acceptButtonStyle}
                                onClick={() => acceptSuggestion(item.id)}
                                disabled={
                                  isViewer ||
                                  pendingId !== null ||
                                  item.status !== 'ISSUED' ||
                                  running
                                }
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                style={rejectButtonStyle}
                                onClick={() => rejectSuggestion(item.id)}
                                disabled={
                                  isViewer ||
                                  pendingId !== null ||
                                  item.status !== 'ISSUED' ||
                                  running
                                }
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}
                          {item.status === 'REJECTED' && canRerun ? (
                            <div style={suggestionActionsStyle}>
                              <button
                                type="button"
                                style={secondaryButtonStyle}
                                onClick={() => askCoachAgain(item)}
                                disabled={isViewer || running}
                              >
                                {isRerunActive ? 'Running...' : 'Ask Intent Coach again'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={placeholderStyle}>Run Intent Coach to see suggestions.</p>
          )}
        </div>
        {hasRun ? (
          <div style={blockCardStyle}>
            <div style={blockHeaderStyle}>
              <p style={blockTitleStyle}>Ask Intent Coach</p>
            </div>
            <textarea
              style={textAreaStyle}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Add instructions for the next Coach run."
              rows={4}
            />
            <div style={checkboxGridStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={summarySelected}
                  onChange={() => setSummarySelected((prev) => !prev)}
                />
                <span>Summary</span>
              </label>
              {COACH_FIELDS.map((field) => (
                <label key={field} style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={focusFields.includes(field)}
                    onChange={() => toggleFocusField(field)}
                  />
                  <span>{COACH_FIELD_LABELS[field]}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                const trimmedInstructions = instructions.trim();
                runCoach({
                  instructions: trimmedInstructions ? trimmedInstructions : undefined,
                  focusFields,
                  includeSummary: summarySelected,
                });
              }}
              disabled={isViewer || running}
            >
              Ask Intent Coach
            </button>
          </div>
        ) : null}
      </div>
      {error ? <p style={errorStyle}>{error}</p> : null}
      {historyPopupText ? (
        <div style={modalOverlayStyle} onClick={() => setHistoryPopupText(null)}>
          <div
            style={modalStyle}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div style={modalHeaderStyle}>
              <p style={modalTitleStyle}>Intent Coach history</p>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => setHistoryPopupText(null)}
              >
                Close
              </button>
            </div>
            <pre style={modalBodyStyle}>{historyPopupText}</pre>
          </div>
        </div>
      ) : null}
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

const secondaryButtonStyle = {
  padding: '0.5rem 1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
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

const blockGridStyle = {
  marginTop: '1rem',
  display: 'grid',
  gap: '1rem',
};

const blockCardStyle = {
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  padding: '1rem',
};

const blockHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap' as const,
};

const blockTitleStyle = {
  fontWeight: 600,
  margin: 0,
};

const summaryListStyle = {
  margin: '0.75rem 0 0',
  paddingLeft: '1.25rem',
};

const placeholderStyle = {
  marginTop: '0.75rem',
  color: 'var(--muted)',
};

const suggestionListStyle = {
  display: 'grid',
  gap: '0.75rem',
  marginTop: '0.75rem',
};

const suggestionGroupListStyle = {
  display: 'grid',
  gap: '1rem',
  marginTop: '0.75rem',
};

const suggestionGroupTitleStyle = {
  margin: 0,
  fontWeight: 600,
  color: 'var(--text)',
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

const statusColumnStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-end',
  gap: '0.2rem',
};

const statusNoteStyle = {
  fontSize: '0.7rem',
  color: 'var(--muted)',
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

const textAreaStyle = {
  marginTop: '0.75rem',
  width: '100%',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  padding: '0.75rem',
  background: 'var(--surface-2)',
  color: 'var(--text)',
};

const checkboxGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '0.5rem',
  margin: '0.75rem 0',
};

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  color: 'var(--text)',
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

const modalOverlayStyle = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(15, 23, 42, 0.55)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '1rem',
  zIndex: 40,
};

const modalStyle = {
  width: 'min(980px, 95vw)',
  maxHeight: '85vh',
  overflow: 'hidden',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)',
  display: 'flex',
  flexDirection: 'column' as const,
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.9rem 1rem',
  borderBottom: '1px solid var(--border)',
};

const modalTitleStyle = {
  margin: 0,
  fontWeight: 600,
};

const modalBodyStyle = {
  margin: 0,
  padding: '1rem',
  whiteSpace: 'pre-wrap' as const,
  wordBreak: 'break-word' as const,
  overflow: 'auto',
  color: 'var(--text)',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  lineHeight: 1.45,
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

