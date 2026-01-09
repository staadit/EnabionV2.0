import Head from 'next/head';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import SettingsLayout from '../../../components/SettingsLayout';
import { getAdminLabels } from '../../../lib/admin-i18n';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../../lib/admin-server';

type PreferencesProps = {
  user: AdminUser;
  org: AdminOrg;
};

function parseError(payload: any) {
  const message = Array.isArray(payload?.message)
    ? payload.message.join('; ')
    : payload?.message || payload?.error;
  return message || '';
}

export default function PreferencesSettings({ user, org }: PreferencesProps) {
  const [currentOrg, setCurrentOrg] = useState(org);
  const [defaultLanguage, setDefaultLanguage] = useState(org.defaultLanguage || 'EN');
  const [policyAiEnabled, setPolicyAiEnabled] = useState(org.policyAiEnabled);
  const [policyShareLinksEnabled, setPolicyShareLinksEnabled] = useState(org.policyShareLinksEnabled);
  const [policyEmailIngestEnabled, setPolicyEmailIngestEnabled] = useState(org.policyEmailIngestEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const labels = getAdminLabels(defaultLanguage || currentOrg.defaultLanguage);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/org/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          defaultLanguage,
          policyAiEnabled,
          policyShareLinksEnabled,
          policyEmailIngestEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(parseError(data) || labels.commonRequestFailed);
      }
      setCurrentOrg(data.org);
      setDefaultLanguage(data.org.defaultLanguage);
      setPolicyAiEnabled(data.org.policyAiEnabled);
      setPolicyShareLinksEnabled(data.org.policyShareLinksEnabled);
      setPolicyEmailIngestEnabled(data.org.policyEmailIngestEnabled);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? labels.commonRequestFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsLayout user={user} org={currentOrg} active="preferences" labels={labels}>
      <Head>
        <title>{labels.settingsTitle} - {labels.navPreferences}</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>{labels.preferencesTitle}</h2>
      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '560px' }}>
        <label style={labelStyle}>
          {labels.preferencesLanguageLabel}
          <select
            value={defaultLanguage}
            onChange={(event) => setDefaultLanguage(event.target.value)}
            style={selectStyle}
          >
            <option value="EN">EN</option>
            <option value="PL">PL</option>
            <option value="DE">DE</option>
            <option value="NL">NL</option>
          </select>
        </label>

        <label style={toggleStyle}>
          <input
            type="checkbox"
            checked={policyAiEnabled}
            onChange={(event) => setPolicyAiEnabled(event.target.checked)}
          />
          {labels.preferencesAiLabel}
        </label>

        <label style={toggleStyle}>
          <input
            type="checkbox"
            checked={policyShareLinksEnabled}
            onChange={(event) => setPolicyShareLinksEnabled(event.target.checked)}
          />
          {labels.preferencesShareLabel}
        </label>

        <label style={toggleStyle}>
          <input
            type="checkbox"
            checked={policyEmailIngestEnabled}
            onChange={(event) => setPolicyEmailIngestEnabled(event.target.checked)}
          />
          {labels.preferencesEmailLabel}
        </label>

        {error ? <p style={errorStyle}>{labels.commonErrorPrefix} {error}</p> : null}
        {success ? <p style={successStyle}>{labels.orgSaved}</p> : null}

        <button
          type="button"
          style={{ ...buttonStyle, opacity: saving ? 0.7 : 1 }}
          disabled={saving}
          onClick={onSave}
        >
          {saving ? labels.commonSaving : labels.preferencesSave}
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
};

const selectStyle = {
  padding: '0.6rem 0.75rem',
  borderRadius: '10px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
};

const toggleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontWeight: 600,
};

const buttonStyle = {
  marginTop: '0.5rem',
  padding: '0.9rem 1.1rem',
  borderRadius: '12px',
  border: 'none',
  background: '#e4572e',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle = {
  color: '#b42318',
  margin: 0,
};

const successStyle = {
  color: '#157f3b',
  margin: 0,
};

export const getServerSideProps: GetServerSideProps<PreferencesProps> = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
    },
  };
};
