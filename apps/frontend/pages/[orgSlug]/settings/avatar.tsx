import Head from 'next/head';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import SettingsLayout from '../../../components/SettingsLayout';
import { getAdminLabels } from '../../../lib/admin-i18n';
import { getAvatarLabels } from '../../../lib/avatar-i18n';
import { getAdminContext, type AdminContext } from '../../../lib/admin-server';

type OrgAvatarProfile = {
  markets: string[];
  industries: string[];
  clientTypes: string[];
  servicePortfolio: string[];
  techStack: string[];
  excludedSectors: string[];
  constraints: Record<string, any>;
};

type AvatarSettingsProps = {
  user: AdminContext['user'];
  org: AdminContext['org'];
  profile: OrgAvatarProfile;
};

export default function AvatarSettings({ user, org, profile }: AvatarSettingsProps) {
  const labels = getAdminLabels(org.defaultLanguage);
  const avatarLabels = getAvatarLabels(org.defaultLanguage);
  const isReadOnly = user.role === 'Viewer';

  const [markets, setMarkets] = useState(toTagString(profile.markets));
  const [industries, setIndustries] = useState(toTagString(profile.industries));
  const [clientTypes, setClientTypes] = useState(toTagString(profile.clientTypes));
  const [servicePortfolio, setServicePortfolio] = useState(toTagString(profile.servicePortfolio));
  const [techStack, setTechStack] = useState(toTagString(profile.techStack));
  const [excludedSectors, setExcludedSectors] = useState(toTagString(profile.excludedSectors));
  const [preferredLanguages, setPreferredLanguages] = useState(
    toTagString(profile.constraints?.languages ?? []),
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (isReadOnly) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch('/api/org/avatar-profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          markets: parseTags(markets),
          industries: parseTags(industries),
          clientTypes: parseTags(clientTypes),
          servicePortfolio: parseTags(servicePortfolio),
          techStack: parseTags(techStack),
          excludedSectors: parseTags(excludedSectors),
          constraints: { languages: parseTags(preferredLanguages) },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Request failed.');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? 'Request failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout user={user} org={org} active="avatar" labels={labels}>
      <Head>
        <title>
          {labels.settingsTitle} - {labels.navAvatar}
        </title>
      </Head>

      <h2 style={{ marginTop: 0 }}>{avatarLabels.orgProfileTitle}</h2>
      <p style={mutedStyle}>{avatarLabels.orgProfileHint}</p>
      {isReadOnly ? <p style={warningStyle}>{avatarLabels.orgProfileReadonly}</p> : null}

      <div style={gridStyle}>
        <Field
          label={avatarLabels.profileFields.markets}
          value={markets}
          onChange={setMarkets}
          disabled={isReadOnly}
          placeholder={avatarLabels.tagsPlaceholder}
        />
        <Field
          label={avatarLabels.profileFields.industries}
          value={industries}
          onChange={setIndustries}
          disabled={isReadOnly}
          placeholder={avatarLabels.tagsPlaceholder}
        />
        <Field
          label={avatarLabels.profileFields.clientTypes}
          value={clientTypes}
          onChange={setClientTypes}
          disabled={isReadOnly}
          placeholder={avatarLabels.tagsPlaceholder}
        />
        <Field
          label={avatarLabels.profileFields.servicePortfolio}
          value={servicePortfolio}
          onChange={setServicePortfolio}
          disabled={isReadOnly}
          placeholder={avatarLabels.tagsPlaceholder}
        />
        <Field
          label={avatarLabels.profileFields.techStack}
          value={techStack}
          onChange={setTechStack}
          disabled={isReadOnly}
          placeholder={avatarLabels.tagsPlaceholder}
        />
        <Field
          label={avatarLabels.profileFields.excludedSectors}
          value={excludedSectors}
          onChange={setExcludedSectors}
          disabled={isReadOnly}
          placeholder={avatarLabels.tagsPlaceholder}
        />
        <Field
          label={avatarLabels.profileFields.preferredLanguages}
          value={preferredLanguages}
          onChange={setPreferredLanguages}
          disabled={isReadOnly}
          placeholder={avatarLabels.tagsPlaceholder}
        />
      </div>

      {error ? <p style={errorStyle}>{labels.commonErrorPrefix} {error}</p> : null}
      {success ? <p style={successStyle}>{avatarLabels.orgProfileSaved}</p> : null}

      <button
        type="button"
        style={primaryButtonStyle}
        onClick={handleSave}
        disabled={saving || isReadOnly}
      >
        {saving ? labels.commonSaving : avatarLabels.orgProfileSave}
      </button>
    </SettingsLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
        disabled={disabled}
        placeholder={placeholder}
      />
    </label>
  );
}

const gridStyle = {
  display: 'grid',
  gap: '1rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  marginBottom: '1.5rem',
};

const fieldStyle = {
  display: 'grid',
  gap: '0.4rem',
};

const labelStyle = {
  fontWeight: 600,
  fontSize: '0.85rem',
};

const inputStyle = {
  padding: '0.6rem 0.75rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
};

const primaryButtonStyle = {
  padding: '0.7rem 1.1rem',
  borderRadius: '10px',
  border: '1px solid var(--navy)',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};

const mutedStyle = {
  color: 'var(--muted)',
};

const warningStyle = {
  color: 'var(--warning, #d97706)',
  fontWeight: 600,
};

const successStyle = {
  color: 'var(--success, #16a34a)',
  fontWeight: 600,
};

const errorStyle = {
  color: 'var(--danger)',
  fontWeight: 600,
};

const toTagString = (items: string[]) => items.join(', ');

const parseTags = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const getServerSideProps: GetServerSideProps<AvatarSettingsProps> = async (ctx) => {
  const result = await getAdminContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/v1/org/avatar-profile`, {
    headers: { cookie: result.context!.cookie },
  });
  const data = res.ok ? await res.json() : {};
  const profile = data?.profile;

  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      profile: {
        markets: Array.isArray(profile?.markets) ? profile.markets : [],
        industries: Array.isArray(profile?.industries) ? profile.industries : [],
        clientTypes: Array.isArray(profile?.clientTypes) ? profile.clientTypes : [],
        servicePortfolio: Array.isArray(profile?.servicePortfolio) ? profile.servicePortfolio : [],
        techStack: Array.isArray(profile?.techStack) ? profile.techStack : [],
        excludedSectors: Array.isArray(profile?.excludedSectors) ? profile.excludedSectors : [],
        constraints: profile?.constraints ?? {},
      },
    },
  };
};
