
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useState } from 'react';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';
import { formatDateTime } from '../../../../lib/date-format';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';
const FACTOR_ORDER = ['language', 'tech', 'industry', 'region', 'budget'] as const;
const FACTOR_LABELS: Record<(typeof FACTOR_ORDER)[number], string> = {
  language: 'Language',
  tech: 'Tech',
  industry: 'Industry',
  region: 'Region',
  budget: 'Budget',
};

type MatchFactor = (typeof FACTOR_ORDER)[number];

type FactorBreakdown = {
  weight: number;
  normalizedScore: number;
  contribution: number;
  matched: string[];
  notes: string;
  compared?: { intent: string[]; org: string[] };
};

type MatchCandidate = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  totalScore: number;
  breakdown: Record<MatchFactor, FactorBreakdown>;
};

type MatchList = {
  matchListId: string;
  intentId: string;
  algorithmVersion: string;
  generatedAt: string;
  candidates: MatchCandidate[];
};

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  initialMatchList: MatchList | null;
};

export default function Matches({ user, org, intentId, initialMatchList }: IntentTabProps) {
  const [matchList, setMatchList] = useState<MatchList | null>(initialMatchList);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});

  const handleRunMatching = async () => {
    setError(null);
    setIsRunning(true);
    try {
      const res = await fetch(`/api/intents/${encodeURIComponent(intentId)}/matches/run`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Unable to run matching.');
        return;
      }
      const nextMatchList = data?.matchList ?? null;
      setMatchList(nextMatchList);
      setFeedbackState({});
    } catch {
      setError('Unable to run matching.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleFeedback = async (candidateOrgId: string, rating: 'up' | 'down') => {
    if (!matchList) return;
    setError(null);
    setFeedbackPending((prev) => ({ ...prev, [candidateOrgId]: true }));
    try {
      const res = await fetch(
        `/api/intents/${encodeURIComponent(intentId)}/matches/${encodeURIComponent(
          matchList.matchListId,
        )}/feedback`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ candidateOrgId, rating }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Unable to record feedback.');
        return;
      }
      setFeedbackState((prev) => ({ ...prev, [candidateOrgId]: rating }));
    } catch {
      setError('Unable to record feedback.');
    } finally {
      setFeedbackPending((prev) => ({ ...prev, [candidateOrgId]: false }));
    }
  };

  const candidates = matchList?.candidates ?? [];

  return (
    <OrgShell
      user={user}
      org={org}
      title="Matches"
      subtitle="Matching shortlist for this intent."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Matches</title>
      </Head>

      <div style={headerCardStyle}>
        <div>
          <div style={headerLabelStyle}>Latest match list</div>
          <div style={headerValueStyle}>
            {matchList ? `${candidates.length} candidates` : 'No match list yet'}
          </div>
          {matchList ? (
            <div style={headerMetaStyle}>
              Generated {formatDateTime(matchList.generatedAt)} | Algorithm {matchList.algorithmVersion}
            </div>
          ) : (
            <div style={headerMetaStyle}>Run matching to generate a shortlist.</div>
          )}
        </div>
        <button
          type="button"
          style={{ ...primaryButtonStyle, ...(isRunning ? disabledButtonStyle : {}) }}
          onClick={handleRunMatching}
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : 'Run matching'}
        </button>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      {matchList && candidates.length > 0 ? (
        <div style={listStyle}>
          {candidates.map((candidate) => {
            const feedback = feedbackState[candidate.orgId];
            const pending = feedbackPending[candidate.orgId];
            return (
              <div key={candidate.orgId} style={candidateCardStyle}>
                <div style={candidateHeaderStyle}>
                  <div>
                    <div style={candidateNameStyle}>{candidate.orgName}</div>
                    <div style={candidateSlugStyle}>{candidate.orgSlug}</div>
                  </div>
                  <div style={candidateScoreStyle}>{formatScore(candidate.totalScore)}</div>
                </div>

                <details style={detailsStyle}>
                  <summary style={summaryStyle}>Why this match?</summary>
                  <div style={breakdownGridStyle}>
                    {FACTOR_ORDER.map((factor) => {
                      const breakdown = candidate.breakdown?.[factor];
                      if (!breakdown) return null;
                      const matched = Array.isArray(breakdown.matched) ? breakdown.matched : [];
                      return (
                        <div key={factor} style={breakdownCardStyle}>
                          <div style={breakdownHeaderStyle}>
                            <span style={breakdownLabelStyle}>{FACTOR_LABELS[factor]}</span>
                            <span style={breakdownScoreStyle}>
                              +{formatScore(breakdown.contribution)}
                            </span>
                          </div>
                          <div style={breakdownMetaStyle}>
                            Weight {breakdown.weight} • Score {formatScore(breakdown.normalizedScore)}
                          </div>
                          <div style={breakdownNotesStyle}>{breakdown.notes}</div>
                          <div style={breakdownMatchStyle}>
                            Matched: {matched.length ? matched.join(', ') : 'None'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>

                <div style={feedbackRowStyle}>
                  <div style={feedbackLabelStyle}>Feedback</div>
                  <div style={feedbackButtonsStyle}>
                    <button
                      type="button"
                      style={feedbackButtonStyle(feedback === 'up', pending)}
                      onClick={() => handleFeedback(candidate.orgId, 'up')}
                      disabled={pending}
                    >
                      Thumb up
                    </button>
                    <button
                      type="button"
                      style={feedbackButtonStyle(feedback === 'down', pending)}
                      onClick={() => handleFeedback(candidate.orgId, 'down')}
                      disabled={pending}
                    >
                      Thumb down
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={emptyStateStyle}>No matches yet for this intent.</div>
      )}
    </OrgShell>
  );
}

export const getServerSideProps: GetServerSideProps<IntentTabProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  const cookie = result.context!.cookie;
  const initialMatchList = await fetchLatestMatchList(cookie, intentId);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
      initialMatchList,
    },
  };
};

async function fetchLatestMatchList(
  cookie: string | undefined,
  intentId: string,
): Promise<MatchList | null> {
  const res = await fetch(`${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/matches`, {
    headers: { cookie: cookie ?? '' },
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (!data || typeof data !== 'object') {
    return null;
  }
  const matchList = (data as { matchList?: MatchList | null }).matchList ?? null;
  return matchList && typeof matchList === 'object' ? matchList : null;
}

const headerCardStyle = {
  padding: '1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  boxShadow: 'var(--shadow)',
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  marginBottom: '1.5rem',
};

const headerLabelStyle = {
  fontSize: '0.8rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--muted)',
};

const headerValueStyle = {
  fontSize: '1.35rem',
  fontWeight: 700,
  marginTop: '0.2rem',
};

const headerMetaStyle = {
  marginTop: '0.35rem',
  color: 'var(--muted)',
  fontSize: '0.9rem',
};

const primaryButtonStyle = {
  border: 'none',
  borderRadius: '999px',
  padding: '0.65rem 1.4rem',
  fontWeight: 700,
  cursor: 'pointer',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
};

const disabledButtonStyle = {
  opacity: 0.6,
  cursor: 'not-allowed',
};

const errorStyle = {
  padding: '0.8rem 1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  marginBottom: '1rem',
};

const listStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1.25rem',
};

const candidateCardStyle = {
  padding: '1.25rem',
  borderRadius: '14px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  boxShadow: 'var(--shadow)',
};

const candidateHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  flexWrap: 'wrap' as const,
};

const candidateNameStyle = {
  fontSize: '1.1rem',
  fontWeight: 700,
};

const candidateSlugStyle = {
  fontSize: '0.85rem',
  color: 'var(--muted)',
};

const candidateScoreStyle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  padding: '0.4rem 0.8rem',
  borderRadius: '999px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
};

const detailsStyle = {
  marginTop: '1rem',
};

const summaryStyle = {
  cursor: 'pointer',
  fontWeight: 600,
};

const breakdownGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0.75rem',
  marginTop: '0.75rem',
};

const breakdownCardStyle = {
  border: '1px solid var(--border)',
  borderRadius: '12px',
  padding: '0.75rem',
  background: 'var(--surface)',
};

const breakdownHeaderStyle = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '0.5rem',
};

const breakdownLabelStyle = {
  fontWeight: 700,
};

const breakdownScoreStyle = {
  fontWeight: 700,
  color: 'var(--muted)',
};

const breakdownMetaStyle = {
  marginTop: '0.25rem',
  fontSize: '0.85rem',
  color: 'var(--muted)',
};

const breakdownNotesStyle = {
  marginTop: '0.35rem',
  fontSize: '0.85rem',
};

const breakdownMatchStyle = {
  marginTop: '0.35rem',
  fontSize: '0.8rem',
  color: 'var(--muted)',
};

const feedbackRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  marginTop: '1rem',
  flexWrap: 'wrap' as const,
};

const feedbackLabelStyle = {
  fontSize: '0.85rem',
  color: 'var(--muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const feedbackButtonsStyle = {
  display: 'flex',
  gap: '0.5rem',
};

const feedbackButtonStyle = (isActive: boolean, isPending = false) => ({
  padding: '0.45rem 0.9rem',
  borderRadius: '999px',
  border: '1px solid var(--border)',
  background: isActive ? 'var(--gradient-primary)' : 'var(--surface)',
  color: isActive ? 'var(--text-on-brand)' : 'var(--text)',
  fontWeight: 600,
  cursor: isPending ? 'not-allowed' : 'pointer',
  opacity: isPending ? 0.6 : 1,
});

const emptyStateStyle = {
  padding: '1.5rem',
  borderRadius: '12px',
  border: '1px dashed var(--border)',
  color: 'var(--muted)',
  textAlign: 'center' as const,
};

const formatScore = (value: number) => {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(1);
};
