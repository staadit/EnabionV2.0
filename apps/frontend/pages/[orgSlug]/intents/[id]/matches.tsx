
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
const FEEDBACK_ACTIONS = ['SHORTLIST', 'HIDE', 'NOT_RELEVANT'] as const;

type MatchFactor = (typeof FACTOR_ORDER)[number];
type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];
type FeedbackStatus = 'NEUTRAL' | 'SHORTLISTED' | 'HIDDEN' | 'NOT_RELEVANT';

type FactorBreakdown = {
  weight: number;
  normalizedScore: number;
  contribution: number;
  matched: string[];
  notes: string;
  compared?: { intent: string[]; org: string[] };
};

type TrustScoreSummary = {
  scoreOverall: number;
  statusLabel: string;
  computedAt: string;
};

type MatchCandidate = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  totalScore: number;
  breakdown: Record<MatchFactor, FactorBreakdown>;
  trustScore?: TrustScoreSummary;
  feedbackStatus?: FeedbackStatus;
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
  const [feedbackState, setFeedbackState] = useState<Record<string, FeedbackStatus>>(() =>
    buildFeedbackState(initialMatchList),
  );
  const [feedbackPending, setFeedbackPending] = useState<Record<string, boolean>>({});
  const [showHidden, setShowHidden] = useState(false);
  const [showNotRelevant, setShowNotRelevant] = useState(false);

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
      setFeedbackState(buildFeedbackState(nextMatchList));
    } catch {
      setError('Unable to run matching.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleFeedback = async (candidateOrgId: string, action: FeedbackAction) => {
    if (!matchList) return;
    setError(null);
    const previousStatus = feedbackState[candidateOrgId] ?? 'NEUTRAL';
    const nextStatus = mapActionToStatus(action);
    setFeedbackPending((prev) => ({ ...prev, [candidateOrgId]: true }));
    setFeedbackState((prev) => ({ ...prev, [candidateOrgId]: nextStatus }));
    try {
      const res = await fetch(
        `/api/intents/${encodeURIComponent(intentId)}/matches/${encodeURIComponent(
          matchList.matchListId,
        )}/feedback`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ candidateOrgId, action }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setFeedbackState((prev) => ({ ...prev, [candidateOrgId]: previousStatus }));
        setError(data?.error ?? 'Unable to record feedback.');
        return;
      }
    } catch {
      setFeedbackState((prev) => ({ ...prev, [candidateOrgId]: previousStatus }));
      setError('Unable to record feedback.');
    } finally {
      setFeedbackPending((prev) => ({ ...prev, [candidateOrgId]: false }));
    }
  };

  const candidates = matchList?.candidates ?? [];
  const shortlistedCandidates = candidates.filter(
    (candidate) => resolveCandidateStatus(candidate, feedbackState) === 'SHORTLISTED',
  );
  const hiddenCandidates = candidates.filter(
    (candidate) => resolveCandidateStatus(candidate, feedbackState) === 'HIDDEN',
  );
  const notRelevantCandidates = candidates.filter(
    (candidate) => resolveCandidateStatus(candidate, feedbackState) === 'NOT_RELEVANT',
  );
  const neutralCandidates = candidates.filter(
    (candidate) => resolveCandidateStatus(candidate, feedbackState) === 'NEUTRAL',
  );
  const visibleCandidates = [
    ...neutralCandidates,
    ...(showHidden ? hiddenCandidates : []),
    ...(showNotRelevant ? notRelevantCandidates : []),
  ];
  const hasHidden = hiddenCandidates.length > 0;
  const hasNotRelevant = notRelevantCandidates.length > 0;

  const renderCandidate = (candidate: MatchCandidate) => {
    const status = resolveCandidateStatus(candidate, feedbackState);
    const pending = feedbackPending[candidate.orgId];
    return (
      <div key={candidate.orgId} style={candidateCardStyle}>
        <div style={candidateHeaderStyle}>
          <div>
            <div style={candidateNameStyle}>{candidate.orgName}</div>
            <div style={candidateSlugStyle}>{candidate.orgSlug}</div>
          </div>
          <div style={candidateHeaderMetaStyle}>
            {status !== 'NEUTRAL' ? (
              <span style={statusBadgeStyle(status)}>{formatStatusLabel(status)}</span>
            ) : null}
            {candidate.trustScore ? (
              <div
                style={trustScorePillStyle}
                title={`${candidate.trustScore.statusLabel} · ${formatDateTime(
                  candidate.trustScore.computedAt,
                )}`}
              >
                <span style={trustScoreLabelStyle}>TrustScore</span>
                <span style={trustScoreValueStyle}>
                  {formatTrustScore(candidate.trustScore.scoreOverall)}
                </span>
              </div>
            ) : null}
            <div style={candidateScoreStyle}>{formatScore(candidate.totalScore)}</div>
          </div>
        </div>

        <details style={detailsStyle}>
          <summary style={summaryStyle}>Why this partner?</summary>
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
                    Weight {breakdown.weight}  Score {formatScore(breakdown.normalizedScore)}
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
              style={feedbackButtonStyle(status === 'SHORTLISTED', pending)}
              onClick={() => handleFeedback(candidate.orgId, 'SHORTLIST')}
              disabled={pending}
            >
              Shortlist
            </button>
            <button
              type="button"
              style={feedbackButtonStyle(status === 'HIDDEN', pending)}
              onClick={() => handleFeedback(candidate.orgId, 'HIDE')}
              disabled={pending}
            >
              Hide
            </button>
            <button
              type="button"
              style={feedbackButtonStyle(status === 'NOT_RELEVANT', pending)}
              onClick={() => handleFeedback(candidate.orgId, 'NOT_RELEVANT')}
              disabled={pending}
            >
              Not relevant
            </button>
          </div>
        </div>
      </div>
    );
  };

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
          {isRunning ? 'Running...' : matchList ? 'Refresh suggestions' : 'Run matching'}
        </button>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      {matchList && candidates.length > 0 ? (
        <div style={sectionStackStyle}>
          {shortlistedCandidates.length > 0 ? (
            <div>
              <div style={sectionHeaderStyle}>
                Shortlisted ({shortlistedCandidates.length})
              </div>
              <div style={listStyle}>{shortlistedCandidates.map(renderCandidate)}</div>
            </div>
          ) : null}

          {hasHidden || hasNotRelevant ? (
            <div style={filterBarStyle}>
              {hasHidden ? (
                <label style={filterToggleStyle}>
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(event) => setShowHidden(event.target.checked)}
                  />
                  <span>Show hidden ({hiddenCandidates.length})</span>
                </label>
              ) : null}
              {hasNotRelevant ? (
                <label style={filterToggleStyle}>
                  <input
                    type="checkbox"
                    checked={showNotRelevant}
                    onChange={(event) => setShowNotRelevant(event.target.checked)}
                  />
                  <span>Show not relevant ({notRelevantCandidates.length})</span>
                </label>
              ) : null}
            </div>
          ) : null}

          <div>
            <div style={sectionHeaderStyle}>Suggestions ({visibleCandidates.length})</div>
            {visibleCandidates.length > 0 ? (
              <div style={listStyle}>{visibleCandidates.map(renderCandidate)}</div>
            ) : (
              <div style={emptyStateStyle}>No visible matches for this intent.</div>
            )}
          </div>
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

const sectionStackStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1.5rem',
};

const sectionHeaderStyle = {
  fontSize: '0.85rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: '0.6rem',
  fontWeight: 700,
};

const filterBarStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '1rem',
  alignItems: 'center',
};

const filterToggleStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.85rem',
  color: 'var(--muted)',
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

const candidateHeaderMetaStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
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

const trustScorePillStyle = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: '0.35rem',
  padding: '0.35rem 0.7rem',
  borderRadius: '999px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
};

const trustScoreLabelStyle = {
  fontSize: '0.65rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--muted)',
};

const trustScoreValueStyle = {
  fontWeight: 700,
};

const statusBadgeStyle = (status: FeedbackStatus) => {
  const color =
    status === 'SHORTLISTED' ? 'var(--green)' : status === 'HIDDEN' ? 'var(--muted)' : 'var(--danger)';
  return {
    padding: '0.25rem 0.6rem',
    borderRadius: '999px',
    border: `1px solid ${color}`,
    color,
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  };
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

const formatTrustScore = (value: number) => {
  if (!Number.isFinite(value)) return '-';
  return Math.round(value).toString();
};

const normalizeFeedbackStatus = (value: FeedbackStatus | string | undefined | null): FeedbackStatus => {
  const raw = String(value ?? '').toUpperCase();
  if (raw === 'SHORTLISTED') return 'SHORTLISTED';
  if (raw === 'HIDDEN') return 'HIDDEN';
  if (raw === 'NOT_RELEVANT') return 'NOT_RELEVANT';
  return 'NEUTRAL';
};

const buildFeedbackState = (matchList: MatchList | null): Record<string, FeedbackStatus> => {
  const state: Record<string, FeedbackStatus> = {};
  const candidates = matchList?.candidates ?? [];
  candidates.forEach((candidate) => {
    state[candidate.orgId] = normalizeFeedbackStatus(candidate.feedbackStatus);
  });
  return state;
};

const resolveCandidateStatus = (
  candidate: MatchCandidate,
  feedbackState: Record<string, FeedbackStatus>,
): FeedbackStatus => {
  const fromState = feedbackState[candidate.orgId];
  if (fromState) {
    return fromState;
  }
  return normalizeFeedbackStatus(candidate.feedbackStatus);
};

const mapActionToStatus = (action: FeedbackAction): FeedbackStatus => {
  if (action === 'SHORTLIST') return 'SHORTLISTED';
  if (action === 'HIDE') return 'HIDDEN';
  return 'NOT_RELEVANT';
};

const formatStatusLabel = (status: FeedbackStatus) => {
  if (status === 'SHORTLISTED') return 'Shortlisted';
  if (status === 'HIDDEN') return 'Hidden';
  if (status === 'NOT_RELEVANT') return 'Not relevant';
  return 'Neutral';
};
