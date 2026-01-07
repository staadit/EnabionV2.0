import Head from 'next/head';
import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import SettingsLayout from '../../components/SettingsLayout';
import { getAdminLabels } from '../../lib/admin-i18n';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../lib/admin-server';

type OrgSettingsProps = {
  user: AdminUser;
  org: AdminOrg;
};

function parseError(payload: any) {
  const message = Array.isArray(payload?.message)
    ? payload.message.join('; ')
    : payload?.message || payload?.error;
  return message || '';
}

export default function OrgSettings({ user, org }: OrgSettingsProps) {
  const [currentOrg, setCurrentOrg] = useState(org);
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const labels = getAdminLabels(currentOrg.defaultLanguage);
  const slugValue = slug.trim().toLowerCase();
  const slugValid =
    slugValue.length >= 3 &&
    slugValue.length <= 40 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/org/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slugValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(parseError(data) || labels.commonRequestFailed);
      }
      setCurrentOrg(data.org);
      setName(data.org.name);
      setSlug(data.org.slug);
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
        <title>{labels.settingsTitle} • {labels.navOrg}</title>
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
            placeholder="enabion"
          />
          <span style={hintStyle}>{labels.orgSlugHint}</span>
        </label>

        {currentOrg.inboundEmailAddress ? (
          <div>
            <div style={labelStyle}>{labels.orgInboundLabel}</div>
            <div style={pillStyle}>{currentOrg.inboundEmailAddress}</div>
          </div>
        ) : null}

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
  color: '#1f2933',
};

const inputStyle = {
  borderRadius: '12px',
  padding: '0.85rem 1rem',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  fontSize: '1rem',
};

const hintStyle = {
  fontSize: '0.85rem',
  color: '#6a6f76',
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

const pillStyle = {
  display: 'inline-flex',
  padding: '0.5rem 0.75rem',
  borderRadius: '999px',
  background: 'rgba(15, 37, 54, 0.08)',
  fontWeight: 600,
};

export const getServerSideProps: GetServerSideProps<OrgSettingsProps> = async (ctx) => {
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
