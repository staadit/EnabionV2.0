import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { fetchOrgIntents, type OrgIntent } from '../../../lib/org-intents';
import { getAvatarLabels, type AvatarLabels } from '../../../lib/avatar-i18n';

type OnboardingState = {
  id: string;
  currentStep: string | null;
  completedSteps: string[];
  completedAt?: string | null;
};

type Dashboard = {
  pipelineSummary: {
    total: number;
    byStage: Record<string, number>;
  };
  selectedIntentGovernance?: {
    intentId: string;
    stage: string;
    missingFields: string[];
    ndaAccepted: boolean;
  } | null;
  suggestions: AvatarSuggestion[];
};

type AvatarSuggestion = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  kind: string;
  subjectType?: string | null;
  subjectId?: string | null;
  intentId?: string | null;
  ctas?: Array<{ id: string; type?: string; targetId?: string }>;
  metadata?: Record<string, any>;
};

type SystemAvatarProps = {
  user: OrgUser;
  org: OrgInfo;
  intents: OrgIntent[];
};

const ONBOARDING_STEPS = ['how_it_works', 'nda', 'first_intent', 'use_avatars'] as const;

export default function SystemAvatar({ user, org, intents }: SystemAvatarProps) {
  const router = useRouter();
  const labels = getAvatarLabels(org.defaultLanguage);
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [selectedIntentId, setSelectedIntentId] = useState<string | null>(
    intents[0]?.id ?? null,
  );

  const stageCounts = useMemo(() => dashboard?.pipelineSummary?.byStage ?? {}, [dashboard]);

  useEffect(() => {
    let active = true;
    setOnboardingLoading(true);
    fetch('/api/avatars/system/onboarding-state')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setOnboarding(data?.state ?? null);
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (!active) return;
        setOnboardingLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setDashboardLoading(true);
    const params = new URLSearchParams();
    if (selectedIntentId) params.set('intentId', selectedIntentId);
    fetch(`/api/avatars/system/dashboard${params.toString() ? `?${params}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setDashboard(data ?? null);
      })
      .catch(() => {
        if (!active) return;
        setDashboard(null);
      })
      .finally(() => {
        if (!active) return;
        setDashboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedIntentId]);

  const handleStepAction = async (stepId: string, action: 'complete' | 'skip') => {
    const res = await fetch('/api/avatars/system/onboarding-state', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stepId, action }),
    });
    const data = await res.json();
    setOnboarding(data?.state ?? null);
  };

  const handleCta = async (cta: { type?: string; targetId?: string }) => {
    switch (cta.type) {
      case 'create_intent':
        await router.push(`/${org.slug}/intents/new`);
        return;
      case 'open_intent':
        if (cta.targetId) {
          await router.push(`/${org.slug}/intents/${cta.targetId}`);
        }
        return;
      case 'open_intent_coach':
        if (cta.targetId) {
          await router.push(`/${org.slug}/intents/${cta.targetId}/coach`);
        }
        return;
      case 'open_nda_settings':
        await router.push(`/${org.slug}/settings/nda`);
        return;
      default:
        return;
    }
  };

  const missingFields = dashboard?.selectedIntentGovernance?.missingFields ?? [];
  const ndaAccepted = dashboard?.selectedIntentGovernance?.ndaAccepted ?? false;
  const isOnboardingComplete = Boolean(onboarding?.completedAt);

  return (
    <OrgShell
      user={user}
      org={org}
      title={labels.systemTitle}
      subtitle={labels.systemSubtitle}
      navItems={getXNavItems(org.slug, 'avatars')}
    >
      <Head>
        <title>{org.name} - {labels.systemTitle}</title>
      </Head>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={sectionTitleStyle}>{labels.onboardingTitle}</h3>
          {isOnboardingComplete ? (
            <span style={badgeStyle}>{labels.onboardingComplete}</span>
          ) : null}
        </div>
        {onboardingLoading ? (
          <p style={mutedStyle}>{labels.loadingLabel}</p>
        ) : (
          <div style={stepGridStyle}>
            {ONBOARDING_STEPS.map((stepId) => {
              const title = labels.onboardingStepTitles[stepId] ?? stepId;
              const body = labels.onboardingStepBodies[stepId] ?? '';
              const completed = onboarding?.completedSteps?.includes(stepId) ?? false;
              return (
                <div key={stepId} style={stepCardStyle}>
                  <div style={stepHeaderStyle}>
                    <h4 style={stepTitleStyle}>{title}</h4>
                    <span style={completed ? badgeSuccessStyle : badgeGhostStyle}>
                      {completed ? labels.stepStatusDone : labels.stepStatusStep}
                    </span>
                  </div>
                  <p style={stepBodyStyle}>{body}</p>
                  <div style={stepActionsStyle}>
                    <button
                      type="button"
                      style={primaryButtonStyle}
                      onClick={() => handleStepAction(stepId, 'complete')}
                      disabled={completed}
                    >
                      {labels.onboardingStepComplete}
                    </button>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => handleStepAction(stepId, 'skip')}
                      disabled={completed}
                    >
                      {labels.onboardingStepSkip}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>{labels.pipelineTitle}</h3>
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>{labels.pipelineTotalLabel}</div>
            <div style={summaryValueStyle}>{dashboard?.pipelineSummary?.total ?? 0}</div>
          </div>
          {Object.entries(labels.stageLabels).map(([stage, label]) => (
            <div key={stage} style={summaryCardStyle}>
              <div style={summaryLabelStyle}>{label}</div>
              <div style={summaryValueStyle}>{stageCounts[stage] ?? 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>{labels.readinessTitle}</h3>
        <div style={readinessHeaderStyle}>
          <label htmlFor="intent-select" style={labelStyle}>
            {labels.intentLabel}
          </label>
          <select
            id="intent-select"
            style={selectStyle}
            value={selectedIntentId ?? ''}
            onChange={(event) => setSelectedIntentId(event.target.value || null)}
          >
            <option value="">{labels.selectPlaceholder}</option>
            {intents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title || item.goal || item.intentName || item.id}
              </option>
            ))}
          </select>
        </div>
        {dashboardLoading ? (
          <p style={mutedStyle}>{labels.loadingLabel}</p>
        ) : !selectedIntentId ? (
          <p style={mutedStyle}>{labels.readinessEmpty}</p>
        ) : (
          <div style={readinessGridStyle}>
            <div style={readinessCardStyle}>
              <div style={summaryLabelStyle}>{labels.missingFieldsLabel}</div>
              {missingFields.length ? (
                <ul style={listStyle}>
                  {missingFields.map((field) => (
                    <li key={field}>{labels.fieldLabels[field] ?? field}</li>
                  ))}
                </ul>
              ) : (
                <p style={mutedStyle}>{labels.emptyValue}</p>
              )}
            </div>
            <div style={readinessCardStyle}>
              <div style={summaryLabelStyle}>{labels.ndaStatusLabel}</div>
              <div style={summaryValueStyle}>
                {ndaAccepted ? labels.ndaStatusAccepted : labels.ndaStatusMissing}
              </div>
            </div>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>{labels.suggestionsTitle}</h3>
        {dashboardLoading ? (
          <p style={mutedStyle}>{labels.loadingLabel}</p>
        ) : dashboard?.suggestions?.length ? (
          <div style={suggestionGridStyle}>
            {dashboard.suggestions.map((suggestion) => {
              const missing = Array.isArray(suggestion.metadata?.missingFields)
                ? suggestion.metadata.missingFields
                : [];
              const copy = resolveSuggestionCopy(suggestion, labels);
              return (
                <div key={suggestion.id} style={suggestionCardStyle}>
                  <div style={stepHeaderStyle}>
                    <h4 style={stepTitleStyle}>{copy.title}</h4>
                    <span style={badgeGhostStyle}>
                      {labels.suggestionKindLabels[suggestion.kind] ?? suggestion.kind}
                    </span>
                  </div>
                  {copy.body ? <p style={stepBodyStyle}>{copy.body}</p> : null}
                  {missing.length ? (
                    <div style={missingListStyle}>
                      {missing.map((field) => (
                        <span key={field} style={missingBadgeStyle}>
                          {labels.fieldLabels[field] ?? field}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {suggestion.ctas?.length ? (
                    <div style={stepActionsStyle}>
                      {suggestion.ctas.map((cta) => (
                        <button
                          key={cta.id}
                          type="button"
                          style={secondaryButtonStyle}
                          onClick={() => handleCta(cta)}
                        >
                          {labels.ctaLabels[cta.type || ''] ?? cta.type ?? labels.ctaFallback}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={mutedStyle}>{labels.suggestionsEmpty}</p>
        )}
      </section>
    </OrgShell>
  );
}

const resolveSuggestionCopy = (suggestion: AvatarSuggestion, labels: AvatarLabels) => {
  if (suggestion.kind === 'missing_info') {
    return {
      title: labels.systemSuggestionMissingInfoTitle,
      body: labels.systemSuggestionMissingInfoBody,
    };
  }

  if (suggestion.kind === 'next_step') {
    const action = typeof suggestion.metadata?.action === 'string' ? suggestion.metadata.action : '';
    if (action === 'create_intent') {
      return {
        title: labels.systemSuggestionCreateIntentTitle,
        body: labels.systemSuggestionCreateIntentBody,
      };
    }
    if (action === 'open_intent_coach') {
      return {
        title: labels.systemSuggestionIntentCoachTitle,
        body: labels.systemSuggestionIntentCoachBody,
      };
    }
    if (action === 'open_nda_settings') {
      return {
        title: labels.systemSuggestionSignNdaTitle,
        body: labels.systemSuggestionSignNdaBody,
      };
    }
  }

  return {
    title: suggestion.title,
    body: suggestion.body ?? '',
  };
};

const sectionStyle = {
  marginBottom: '2rem',
};

const sectionHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: '1.1rem',
};

const mutedStyle = {
  color: 'var(--muted)',
};

const badgeStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  padding: '0.25rem 0.5rem',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 600,
};

const badgeSuccessStyle = {
  ...badgeStyle,
  borderColor: 'rgba(56, 161, 105, 0.4)',
  background: 'rgba(56, 161, 105, 0.15)',
};

const badgeGhostStyle = {
  ...badgeStyle,
  background: 'transparent',
};

const stepGridStyle = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

const stepCardStyle = {
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  padding: '1rem',
  display: 'grid',
  gap: '0.6rem',
};

const stepHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '0.75rem',
};

const stepTitleStyle = {
  margin: 0,
  fontSize: '1rem',
};

const stepBodyStyle = {
  margin: 0,
  color: 'var(--muted)',
  fontSize: '0.9rem',
};

const stepActionsStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.5rem',
};

const primaryButtonStyle = {
  padding: '0.45rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid var(--navy)',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  padding: '0.45rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontWeight: 600,
  cursor: 'pointer',
};

const summaryGridStyle = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
};

const summaryCardStyle = {
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  padding: '0.85rem',
};

const summaryLabelStyle = {
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  fontSize: '0.7rem',
  color: 'var(--muted2)',
};

const summaryValueStyle = {
  fontSize: '1.2rem',
  fontWeight: 700,
};

const readinessHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginBottom: '1rem',
};

const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: 600,
};

const selectStyle = {
  padding: '0.45rem 0.6rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
};

const readinessGridStyle = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
};

const readinessCardStyle = {
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  padding: '0.85rem',
};

const listStyle = {
  margin: '0.5rem 0 0 1rem',
  padding: 0,
  color: 'var(--text)',
  display: 'grid',
  gap: '0.25rem',
};

const suggestionGridStyle = {
  display: 'grid',
  gap: '0.75rem',
};

const suggestionCardStyle = {
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  padding: '1rem',
  display: 'grid',
  gap: '0.65rem',
};

const missingListStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.4rem',
};

const missingBadgeStyle = {
  background: 'rgba(255, 170, 70, 0.15)',
  border: '1px solid rgba(255, 170, 70, 0.4)',
  borderRadius: '999px',
  padding: '0.2rem 0.6rem',
  fontSize: '0.75rem',
};

export const getServerSideProps: GetServerSideProps<SystemAvatarProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const intents = await fetchOrgIntents(result.context!.cookie, { limit: 50 });

  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intents: intents.items,
    },
  };
};
