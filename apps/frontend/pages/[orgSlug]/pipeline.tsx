import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { useRouter } from 'next/router';
import OrgShell from '../../components/OrgShell';
import { getXNavItems } from '../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../lib/org-context';
import { fetchOrgIntents, type OrgIntent } from '../../lib/org-intents';
import { formatDateTime } from '../../lib/date-format';
import { getAvatarLabels } from '../../lib/avatar-i18n';

const colors = {
  surface: 'var(--surface)',
  surface2: 'var(--surface-2)',
  border: 'var(--border)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  muted2: 'var(--muted-2)',
};

type PipelineProps = {
  user: OrgUser;
  org: OrgInfo;
  intents: OrgIntent[];
};

type OrgQualification = {
  fitBand: string;
  priority: string;
  reasons: string[];
  status: string;
  suggestionId?: string | null;
};

const STAGE_ORDER = ['NEW', 'CLARIFY', 'MATCH', 'COMMIT', 'LOST', 'WON'] as const;
type PipelineStage = (typeof STAGE_ORDER)[number];

const STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: 'New',
  CLARIFY: 'Clarify',
  MATCH: 'Match',
  COMMIT: 'Commit',
  LOST: 'Lost',
  WON: 'Won',
};

const STAGE_SET = new Set<PipelineStage>(STAGE_ORDER);

const isPipelineStage = (value: string): value is PipelineStage =>
  STAGE_SET.has(value as PipelineStage);

export default function Pipeline({ user, org, intents }: PipelineProps) {
  const router = useRouter();
  const labels = getAvatarLabels(org.defaultLanguage);
  const isViewer = user.role === 'Viewer';
  const [board, setBoard] = useState(() => groupIntents(intents));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<Record<string, OrgQualification>>({});

  useEffect(() => {
    setBoard(groupIntents(intents));
  }, [intents]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const entries = await Promise.all(
        intents.map(async (intent) => {
          try {
            const res = await fetch('/api/avatars/org/qualify-intent', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ intentId: intent.id, channel: 'ui' }),
            });
            if (!res.ok) {
              return [intent.id, null] as const;
            }
            const data = await res.json();
            const qualification = data?.qualification;
            const suggestion = data?.suggestion;
            if (!qualification) {
              return [intent.id, null] as const;
            }
            return [
              intent.id,
              {
                fitBand: String(qualification.fitBand ?? ''),
                priority: String(qualification.priority ?? ''),
                reasons: Array.isArray(qualification.reasons) ? qualification.reasons : [],
                status: String(suggestion?.status ?? 'ISSUED'),
                suggestionId: suggestion?.id ?? null,
              },
            ] as const;
          } catch {
            return [intent.id, null] as const;
          }
        }),
      );
      if (!active) return;
      setQualifications((prev) => {
        const next = { ...prev };
        entries.forEach(([id, entry]) => {
          if (entry) {
            next[id] = entry;
          }
        });
        return next;
      });
    };
    if (intents.length) {
      void load();
    }
    return () => {
      active = false;
    };
  }, [intents]);

  const totals = useMemo(() => {
    return STAGE_ORDER.reduce((acc, stage) => {
      acc[stage] = board[stage].length;
      return acc;
    }, {} as Record<PipelineStage, number>);
  }, [board]);

  const handleDragStart = (intentId: string) => (event: DragEvent<HTMLDivElement>) => {
    if (isViewer) return;
    event.dataTransfer.setData('text/plain', intentId);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(intentId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDrop = (stage: PipelineStage) => async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isViewer) return;

    const intentId = event.dataTransfer.getData('text/plain') || draggingId;
    if (!intentId) return;
    const located = findIntent(board, intentId);
    if (!located) return;
    if (located.stage === stage) return;

    const optimistic = moveIntent(board, located.intent, located.stage, stage);
    setBoard(optimistic);
    setSavingId(intentId);
    setError(null);

    try {
      const res = await fetch(`/api/intents/${intentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pipelineStage: stage }),
      });
      if (!res.ok) {
        throw new Error('Failed to update pipeline stage');
      }
    } catch (err) {
      setBoard(board);
      setError('Failed to update pipeline stage. Try again.');
    } finally {
      setSavingId(null);
      setDraggingId(null);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isViewer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const openIntent = (intentId: string) => {
    void router.push(`/${org.slug}/intents/${intentId}`);
  };

  const handleDecision = async (intentId: string, decision: 'accept' | 'reject') => {
    const entry = qualifications[intentId];
    if (!entry?.suggestionId) return;
    const note =
      decision === 'reject' ? window.prompt(labels.notePrompt, '')?.trim() : undefined;
    const res = await fetch(`/api/avatars/suggestions/${entry.suggestionId}/${decision}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) return;
    setQualifications((prev) => ({
      ...prev,
      [intentId]: {
        ...entry,
        status: decision === 'accept' ? 'ACCEPTED' : 'REJECTED',
      },
    }));
  };

  return (
    <OrgShell
      user={user}
      org={org}
      title="Pipeline"
      subtitle="Drag intents across stages to track progress."
      navItems={getXNavItems(org.slug, 'pipeline')}
    >
      <Head>
        <title>{org.name} - Pipeline</title>
      </Head>

      {error ? (
        <div style={errorBannerStyle} role="alert">
          <span>{error}</span>
          <button type="button" style={errorDismissStyle} onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div style={boardStyle}>
        {STAGE_ORDER.map((stage) => (
          <section key={stage} style={columnStyle}>
            <div style={columnHeaderStyle}>
              <span style={columnTitleStyle}>{STAGE_LABELS[stage]}</span>
              <span style={columnCountStyle}>{totals[stage]}</span>
            </div>
            <div
              style={columnBodyStyle}
              onDragOver={handleDragOver}
              onDrop={handleDrop(stage)}
            >
              {board[stage].length ? (
                board[stage].map((intent) => (
                  <div
                    key={intent.id}
                    role="button"
                    tabIndex={0}
                    draggable={!isViewer}
                    onDragStart={handleDragStart(intent.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => openIntent(intent.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openIntent(intent.id);
                      }
                    }}
                    style={{
                      ...cardStyle,
                      ...(draggingId === intent.id ? draggingStyle : null),
                      ...(isViewer ? viewerCardStyle : null),
                    }}
                  >
                    <div style={cardTitleStyle}>
                      {intent.title || intent.goal || 'Untitled intent'}
                    </div>
                    <div style={cardMetaStyle}>
                      {intent.client || 'Client not set'}
                    </div>
                    <div style={cardFooterStyle}>
                      <span>{intent.owner?.email || 'Unassigned'}</span>
                      <span style={activityLabelStyle}>Last activity</span>
                      <span style={activityValueStyle}>
                        {formatDateTime(intent.lastActivityAt)}
                      </span>
                    </div>
                    {qualifications[intent.id] ? (
                      <div style={qualificationRowStyle}>
                        <span style={qualBadgeStyle}>
                          {labels.fitLabel}:{' '}
                          {labels.fitBands[qualifications[intent.id].fitBand] ??
                            qualifications[intent.id].fitBand}
                        </span>
                        <span style={qualBadgeStyle}>
                          {labels.priorityLabel}:{' '}
                          {labels.priorities[qualifications[intent.id].priority] ??
                            qualifications[intent.id].priority}
                        </span>
                        {qualifications[intent.id].status === 'ISSUED' && !isViewer ? (
                          <div style={qualActionStyle}>
                            <button
                              type="button"
                              style={qualButtonStyle}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDecision(intent.id, 'accept');
                              }}
                            >
                              {labels.acceptLabel}
                            </button>
                            <button
                              type="button"
                              style={qualButtonStyle}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleDecision(intent.id, 'reject');
                              }}
                            >
                              {labels.rejectLabel}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {savingId === intent.id ? (
                      <div style={savingBadgeStyle}>Saving...</div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div style={emptyColumnStyle}>No intents in this stage</div>
              )}
            </div>
          </section>
        ))}
      </div>
    </OrgShell>
  );
}

const boardStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
};

const columnStyle = {
  background: colors.surface,
  borderRadius: '16px',
  border: `1px solid ${colors.border}`,
  display: 'flex',
  flexDirection: 'column' as const,
  minHeight: '320px',
  boxShadow: 'var(--shadow)',
};

const columnHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  borderBottom: `1px solid ${colors.border}`,
};

const columnTitleStyle = {
  fontWeight: 700,
  fontSize: '0.95rem',
  color: colors.text,
};

const columnCountStyle = {
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontSize: '0.75rem',
  padding: '0.2rem 0.5rem',
  borderRadius: '999px',
  boxShadow: 'var(--shadow)',
};

const columnBodyStyle = {
  padding: '0.85rem',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.75rem',
  flex: 1,
};

const cardStyle = {
  background: colors.surface2,
  borderRadius: '12px',
  border: `1px solid ${colors.border}`,
  padding: '0.75rem 0.85rem',
  cursor: 'pointer',
  display: 'grid',
  gap: '0.35rem',
  boxShadow: 'var(--shadow)',
  transition: 'transform 0.15s ease',
  color: colors.text,
};

const viewerCardStyle = {
  cursor: 'default',
};

const draggingStyle = {
  opacity: 0.6,
  transform: 'scale(0.98)',
};

const cardTitleStyle = {
  fontWeight: 600,
  fontSize: '0.95rem',
  color: colors.text,
};

const cardMetaStyle = {
  color: colors.muted,
  fontSize: '0.8rem',
};

const cardFooterStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.2rem',
  color: colors.muted2,
  fontSize: '0.75rem',
};

const activityLabelStyle = {
  fontSize: '0.65rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: colors.muted2,
};

const activityValueStyle = {
  color: colors.text,
};

const emptyColumnStyle = {
  color: colors.muted,
  fontSize: '0.85rem',
  padding: '0.5rem',
  borderRadius: '10px',
  border: `1px dashed ${colors.border}`,
  textAlign: 'center' as const,
  background: colors.surface2,
};

const errorBannerStyle = {
  background: 'var(--surface-2)',
  color: colors.text,
  border: `1px solid ${colors.border}`,
  borderRadius: '12px',
  padding: '0.75rem 1rem',
  marginBottom: '1rem',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '1rem',
};

const errorDismissStyle = {
  background: 'transparent',
  border: 'none',
  color: colors.text,
  fontWeight: 600,
  cursor: 'pointer',
};

const savingBadgeStyle = {
  fontSize: '0.7rem',
  color: colors.text,
  fontWeight: 600,
};

const qualificationRowStyle = {
  marginTop: '0.5rem',
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.4rem',
  alignItems: 'center',
};

const qualBadgeStyle = {
  background: 'rgba(56, 161, 105, 0.12)',
  border: '1px solid rgba(56, 161, 105, 0.35)',
  borderRadius: '999px',
  padding: '0.2rem 0.55rem',
  fontSize: '0.7rem',
  fontWeight: 600,
};

const qualActionStyle = {
  display: 'flex',
  gap: '0.35rem',
};

const qualButtonStyle = {
  padding: '0.2rem 0.55rem',
  borderRadius: '8px',
  border: `1px solid ${colors.border}`,
  background: colors.surface,
  color: colors.text,
  fontWeight: 600,
  fontSize: '0.7rem',
  cursor: 'pointer',
};

const sortByActivity = (items: OrgIntent[]) => {
  return [...items].sort((a, b) => {
    const left = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
    const right = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
    return right - left;
  });
};

const normalizeStage = (intent: OrgIntent): PipelineStage => {
  const raw = (intent.stage || intent.status || 'NEW').toUpperCase();
  if (isPipelineStage(raw)) {
    return raw;
  }
  return 'NEW';
};

const groupIntents = (intents: OrgIntent[]) => {
  const base = STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = [];
    return acc;
  }, {} as Record<PipelineStage, OrgIntent[]>);

  intents.forEach((intent) => {
    const stage = normalizeStage(intent);
    base[stage].push(intent);
  });

  STAGE_ORDER.forEach((stage) => {
    base[stage] = sortByActivity(base[stage]);
  });

  return base;
};

const findIntent = (board: Record<PipelineStage, OrgIntent[]>, intentId: string) => {
  for (const stage of STAGE_ORDER) {
    const intent = board[stage].find((item) => item.id === intentId);
    if (intent) {
      return { intent, stage };
    }
  }
  return null;
};

const moveIntent = (
  board: Record<PipelineStage, OrgIntent[]>,
  intent: OrgIntent,
  fromStage: PipelineStage,
  toStage: PipelineStage,
) => {
  const now = new Date().toISOString();
  const updated = {
    ...intent,
    stage: toStage,
    status: toStage,
    lastActivityAt: now,
  };
  return {
    ...board,
    [fromStage]: board[fromStage].filter((item) => item.id !== intent.id),
    [toStage]: [updated, ...board[toStage]],
  };
};

export const getServerSideProps: GetServerSideProps<PipelineProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const { items } = await fetchOrgIntents(result.context!.cookie, {
    status: STAGE_ORDER as unknown as string[],
    limit: 100,
  });

  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intents: items,
    },
  };
};
