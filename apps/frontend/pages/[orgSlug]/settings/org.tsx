import Head from 'next/head';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import SettingsLayout from '../../../components/SettingsLayout';
import { getAdminLabels } from '../../../lib/admin-i18n';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../../lib/admin-server';
import { isReservedOrgSlug } from '../../../lib/reserved-slugs';
import { formatDateTime } from '../../../lib/date-format';

type TrustScoreSnapshot = {
  scoreOverall: number;
  statusLabel: string;
  explanationPublic: string[];
  algorithmVersion: string;
  computedAt: string;
};

type OrgSettingsProps = {
  user: AdminUser;
  org: AdminOrg;
  trustScore: TrustScoreSnapshot | null;
};

const PROVIDER_LANGUAGE_OPTIONS = ['EN', 'PL', 'DE', 'NL'] as const;
const PROVIDER_BUDGET_BUCKETS = [
  'UNKNOWN',
  'LT_10K',
  'EUR_10K_50K',
  'EUR_50K_150K',
  'EUR_150K_500K',
  'GT_500K',
] as const;
const PROVIDER_TEAM_SIZE_BUCKETS = [
  'UNKNOWN',
  'SOLO',
  'TEAM_2_10',
  'TEAM_11_50',
  'TEAM_51_200',
  'TEAM_201_PLUS',
] as const;
const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

function parseError(payload: any) {
  const message = Array.isArray(payload?.message)
    ? payload.message.join('; ')
    : payload?.message || payload?.error;
  return message || '';
}

function normalizeCsvInput(value: string, mode: 'upper' | 'lower') {
  const parts = value.split(',');
  const output: string[] = [];
  const seen = new Set<string>();
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return;
    }
    const next = mode === 'upper' ? trimmed.toUpperCase() : trimmed.toLowerCase();
    if (!seen.has(next)) {
      output.push(next);
      seen.add(next);
    }
  });
  return output;
}

function formatBudgetBucket(value: string) {
  switch (value) {
    case 'LT_10K':
      return '< EUR 10k';
    case 'EUR_10K_50K':
      return 'EUR 10k-50k';
    case 'EUR_50K_150K':
      return 'EUR 50k-150k';
    case 'EUR_150K_500K':
      return 'EUR 150k-500k';
    case 'GT_500K':
      return '> EUR 500k';
    default:
      return 'Unknown';
  }
}

function formatTeamSizeBucket(value: string) {
  switch (value) {
    case 'SOLO':
      return 'Solo';
    case 'TEAM_2_10':
      return 'Team 2-10';
    case 'TEAM_11_50':
      return 'Team 11-50';
    case 'TEAM_51_200':
      return 'Team 51-200';
    case 'TEAM_201_PLUS':
      return 'Team 201+';
    default:
      return 'Unknown';
  }
}

export default function OrgSettings({ user, org, trustScore: initialTrustScore }: OrgSettingsProps) {
  const [currentOrg, setCurrentOrg] = useState(org);
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [providerLanguages, setProviderLanguages] = useState<string[]>(
    org.providerLanguages ?? [],
  );
  const [providerRegions, setProviderRegions] = useState(
    (org.providerRegions ?? []).join(', '),
  );
  const [providerTags, setProviderTags] = useState((org.providerTags ?? []).join(', '));
  const [providerBudgetBucket, setProviderBudgetBucket] = useState(
    org.providerBudgetBucket ?? 'UNKNOWN',
  );
  const [providerTeamSizeBucket, setProviderTeamSizeBucket] = useState(
    org.providerTeamSizeBucket ?? 'UNKNOWN',
  );
  const [trustScore, setTrustScore] = useState<TrustScoreSnapshot | null>(
    initialTrustScore,
  );
  const [trustScoreError, setTrustScoreError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const labels = getAdminLabels(currentOrg.defaultLanguage);
  const slugValue = slug.trim().toLowerCase();
  const slugChanged = slugValue !== currentOrg.slug;
  const slugValid =
    !slugChanged ||
    (slugValue.length >= 3 &&
      slugValue.length <= 9 &&
      /^[a-z0-9]{3,6}(?:-[0-9]{1,2})?$/.test(slugValue) &&
      !isReservedOrgSlug(slugValue));

  const toggleProviderLanguage = (language: string) => {
    setProviderLanguages((prev) => {
      if (prev.includes(language)) {
        return prev.filter((item) => item !== language);
      }
      return [...prev, language];
    });
  };

  const refreshTrustScore = async () => {
    setTrustScoreError(null);
    try {
      const res = await fetch('/api/org/trust-score');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(parseError(data) || labels.commonRequestFailed);
      }
      setTrustScore((data?.trustScore as TrustScoreSnapshot) ?? null);
    } catch (err: any) {
      setTrustScoreError(err?.message ?? labels.commonRequestFailed);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: {
        name: string;
        slug?: string;
        providerLanguages: string[];
        providerRegions: string[];
        providerTags: string[];
        providerBudgetBucket: string;
        providerTeamSizeBucket: string;
      } = {
        name: name.trim(),
        providerLanguages,
        providerRegions: normalizeCsvInput(providerRegions, 'upper'),
        providerTags: normalizeCsvInput(providerTags, 'lower'),
        providerBudgetBucket,
        providerTeamSizeBucket,
      };
      if (slugChanged) {
        payload.slug = slugValue;
      }
      const res = await fetch('/api/org/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(parseError(data) || labels.commonRequestFailed);
      }
      setCurrentOrg(data.org);
      setName(data.org.name);
      setSlug(data.org.slug);
      setProviderLanguages(data.org.providerLanguages ?? []);
      setProviderRegions((data.org.providerRegions ?? []).join(', '));
      setProviderTags((data.org.providerTags ?? []).join(', '));
      setProviderBudgetBucket(data.org.providerBudgetBucket ?? 'UNKNOWN');
      setProviderTeamSizeBucket(data.org.providerTeamSizeBucket ?? 'UNKNOWN');
      await refreshTrustScore();
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? labels.commonRequestFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout user={user} org={currentOrg} active="org" labels={labels}>
      <Head>
        <title>{labels.settingsTitle} - {labels.navOrg}</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>{labels.orgTitle}</h2>

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '560px' }}>
        <label style={labelStyle}>
          {labels.orgNameLabel}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={inputStyle}
            placeholder="Enabion"
          />
        </label>

        <label style={labelStyle}>
          {labels.orgSlugLabel}
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            style={inputStyle}
            placeholder="ab1234"
            maxLength={9}
          />
          <span style={hintStyle}>{labels.orgSlugHint}</span>
        </label>

        {currentOrg.inboundEmailAddress ? (
          <div>
            <div style={labelStyle}>{labels.orgInboundLabel}</div>
            <div style={pillStyle}>{currentOrg.inboundEmailAddress}</div>
          </div>
        ) : null}

        <div style={sectionStyle}>
          <h3 style={{ margin: 0 }}>{labels.orgProviderTitle}</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={labelStyle}>
              {labels.orgProviderLanguagesLabel}
              <div style={checkboxGroupStyle}>
                {PROVIDER_LANGUAGE_OPTIONS.map((language) => (
                  <label key={language} style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={providerLanguages.includes(language)}
                      onChange={() => toggleProviderLanguage(language)}
                    />
                    <span>{language}</span>
                  </label>
                ))}
              </div>
            </div>

            <label style={labelStyle}>
              {labels.orgProviderRegionsLabel}
              <input
                value={providerRegions}
                onChange={(event) => setProviderRegions(event.target.value)}
                style={inputStyle}
                placeholder="PL, DE, NL"
              />
              <span style={hintStyle}>{labels.orgProviderRegionsHint}</span>
            </label>

            <label style={labelStyle}>
              {labels.orgProviderTagsLabel}
              <input
                value={providerTags}
                onChange={(event) => setProviderTags(event.target.value)}
                style={inputStyle}
                placeholder="ai, cybersecurity, fintech"
              />
              <span style={hintStyle}>{labels.orgProviderTagsHint}</span>
            </label>

            <label style={labelStyle}>
              {labels.orgProviderBudgetLabel}
              <select
                value={providerBudgetBucket}
                onChange={(event) => setProviderBudgetBucket(event.target.value)}
                style={selectStyle}
              >
                {PROVIDER_BUDGET_BUCKETS.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {formatBudgetBucket(bucket)}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              {labels.orgProviderTeamSizeLabel}
              <select
                value={providerTeamSizeBucket}
                onChange={(event) => setProviderTeamSizeBucket(event.target.value)}
                style={selectStyle}
              >
                {PROVIDER_TEAM_SIZE_BUCKETS.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {formatTeamSizeBucket(bucket)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={trustScoreHeaderStyle}>
            <h3 style={{ margin: 0 }}>{labels.orgTrustScoreTitle}</h3>
            {trustScore ? (
              <span style={trustScoreBadgeStyle}>{trustScore.statusLabel}</span>
            ) : null}
          </div>
          <div style={trustScoreValueStyle}>
            {trustScore ? Math.round(trustScore.scoreOverall) : '--'}
          </div>
          {trustScore?.explanationPublic?.length ? (
            <ul style={trustScoreListStyle}>
              {trustScore.explanationPublic.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p style={hintStyle}>{labels.orgTrustScoreEmpty}</p>
          )}
          {trustScore ? (
            <div style={trustScoreMetaStyle}>
              {labels.orgTrustScoreUpdatedLabel} {formatDateTime(trustScore.computedAt)} ·{' '}
              {trustScore.algorithmVersion}
            </div>
          ) : null}
          {trustScoreError ? (
            <p style={errorStyle}>{labels.commonErrorPrefix} {trustScoreError}</p>
          ) : null}
        </div>

        {error ? <p style={errorStyle}>{labels.commonErrorPrefix} {error}</p> : null}
        {success ? <p style={successStyle}>{labels.orgSaved}</p> : null}

        <button
          type="button"
          style={{ ...buttonStyle, opacity: saving || !slugValid ? 0.6 : 1 }}
          disabled={saving || !slugValid}
          onClick={onSave}
        >
          {saving ? labels.commonSaving : labels.orgSave}
        </button>
      </div>
    </SettingsLayout>
  );
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.6rem',
  fontWeight: 600,
  color: 'var(--text)',
};

const sectionStyle = {
  display: 'grid',
  gap: '1rem',
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
};

const trustScoreHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  flexWrap: 'wrap' as const,
};

const trustScoreBadgeStyle = {
  padding: '0.3rem 0.7rem',
  borderRadius: '999px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--text)',
};

const trustScoreValueStyle = {
  fontSize: '2rem',
  fontWeight: 700,
  marginTop: '0.5rem',
};

const trustScoreListStyle = {
  margin: '0.75rem 0 0',
  paddingLeft: '1.2rem',
  color: 'var(--text)',
};

const trustScoreMetaStyle = {
  marginTop: '0.75rem',
  color: 'var(--muted)',
  fontSize: '0.85rem',
};

const inputStyle = {
  borderRadius: '12px',
  padding: '0.85rem 1rem',
  border: '1px solid var(--border)',
  fontSize: '1rem',
  background: 'var(--surface)',
  color: 'var(--text)',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
};

const hintStyle = {
  fontSize: '0.85rem',
  color: 'var(--muted)',
};

const checkboxGroupStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
};

const checkboxLabelStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontWeight: 500,
  color: 'var(--text)',
};

const buttonStyle = {
  marginTop: '0.5rem',
  padding: '0.9rem 1.1rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: 'var(--shadow)',
};

const errorStyle = {
  color: 'var(--danger)',
  margin: 0,
};

const successStyle = {
  color: 'var(--success)',
  margin: 0,
};

const pillStyle = {
  display: 'inline-flex',
  padding: '0.5rem 0.75rem',
  borderRadius: '999px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  fontWeight: 600,
  color: 'var(--text)',
};

export const getServerSideProps: GetServerSideProps<OrgSettingsProps> = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const trustScore = await fetchTrustScore(result.context!.cookie);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      trustScore,
    },
  };
};

async function fetchTrustScore(cookie?: string): Promise<TrustScoreSnapshot | null> {
  const res = await fetch(`${BACKEND_BASE}/v1/org/trust-score`, {
    headers: { cookie: cookie ?? '' },
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (!data || typeof data !== 'object') {
    return null;
  }
  const trustScore = (data as { trustScore?: TrustScoreSnapshot | null }).trustScore ?? null;
  return trustScore && typeof trustScore === 'object' ? trustScore : null;
}
