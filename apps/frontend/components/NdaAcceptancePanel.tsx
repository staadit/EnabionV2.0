import { useState, type FormEvent } from 'react';
import { formatDateTime } from '../lib/date-format';
import type { NdaCurrent, NdaStatus } from '../lib/org-nda';

type NdaAcceptancePanelProps = {
  current: NdaCurrent;
  status?: NdaStatus | null;
  defaultLanguage: string;
};

const LANGUAGE_OPTIONS = ['EN', 'PL', 'DE', 'NL'];

export default function NdaAcceptancePanel({
  current,
  status,
  defaultLanguage,
}: NdaAcceptancePanelProps) {
  const [language, setLanguage] = useState(defaultLanguage || 'EN');
  const [typedName, setTypedName] = useState('');
  const [typedRole, setTypedRole] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepted = status?.accepted === true;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/nda/mutual/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          typedName,
          typedRole,
          language,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'Acceptance failed');
      } else {
        window.location.reload();
      }
    } catch {
      setError('Acceptance failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <h3 style={titleStyle}>Mutual NDA</h3>
          <p style={subtitleStyle}>
            EN is the source of truth. If there is any conflict, the EN version prevails.
          </p>
        </div>
        <div style={badgeRowStyle}>
          <span style={badgeStyle}>Version: {current.ndaVersion}</span>
          <span style={badgeStyle}>Hash: {current.enHashSha256.slice(0, 12)}...</span>
        </div>
      </div>

      <div style={summaryStyle}>{current.summaryMarkdown}</div>

      <details style={detailsStyle}>
        <summary style={summaryToggleStyle}>View full EN NDA</summary>
        <div style={markdownStyle}>{current.enMarkdown}</div>
      </details>

      {accepted ? (
        <div style={acceptedStyle}>
          <p style={{ margin: 0, fontWeight: 600 }}>Accepted</p>
          <p style={acceptedMetaStyle}>
            {status?.acceptance?.typedName} ({status?.acceptance?.typedRole}) ·{' '}
            {status?.acceptance?.acceptedAt
              ? formatDateTime(status.acceptance.acceptedAt)
              : ''}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={formStyle}>
          <div style={fieldGridStyle}>
            <label style={fieldStyle}>
              Typed name
              <input
                style={inputStyle}
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                required
              />
            </label>
            <label style={fieldStyle}>
              Typed role
              <input
                style={inputStyle}
                value={typedRole}
                onChange={(event) => setTypedRole(event.target.value)}
                required
              />
            </label>
            <label style={fieldStyle}>
              Language
              <select
                style={inputStyle}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={checkboxStyle}>
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              required
            />
            <span>I have read and agree to the Mutual NDA.</span>
          </label>

          <div style={actionsStyle}>
            <button type="submit" style={primaryButtonStyle} disabled={submitting || !acknowledged}>
              {submitting ? 'Submitting...' : 'Accept'}
            </button>
            {error ? <span style={errorStyle}>{error}</span> : null}
          </div>
        </form>
      )}
    </div>
  );
}

const panelStyle = {
  borderRadius: '16px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  padding: '1.5rem',
  background: '#fff',
};

const headerStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  justifyContent: 'space-between',
  gap: '1rem',
  alignItems: 'flex-start',
};

const titleStyle = {
  marginTop: 0,
  marginBottom: '0.25rem',
  fontSize: '1.2rem',
};

const subtitleStyle = {
  margin: 0,
  color: '#4b5c6b',
};

const badgeRowStyle = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap' as const,
};

const badgeStyle = {
  padding: '0.2rem 0.6rem',
  borderRadius: '999px',
  border: '1px solid rgba(15, 37, 54, 0.15)',
  fontSize: '0.75rem',
  color: '#0f3a4b',
  background: 'rgba(15, 58, 75, 0.06)',
};

const summaryStyle = {
  marginTop: '1rem',
  padding: '1rem',
  borderRadius: '12px',
  background: 'rgba(15, 37, 54, 0.04)',
  whiteSpace: 'pre-wrap' as const,
  lineHeight: 1.5,
};

const detailsStyle = {
  marginTop: '1rem',
};

const summaryToggleStyle = {
  cursor: 'pointer',
  fontWeight: 600,
  color: '#1c6e5a',
};

const markdownStyle = {
  marginTop: '0.75rem',
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: '#fff',
  whiteSpace: 'pre-wrap' as const,
  lineHeight: 1.5,
};

const formStyle = {
  marginTop: '1.25rem',
};

const fieldGridStyle = {
  display: 'grid',
  gap: '0.75rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.35rem',
  fontWeight: 600,
  color: '#1f2933',
};

const inputStyle = {
  padding: '0.55rem 0.7rem',
  borderRadius: '10px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
};

const checkboxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  marginTop: '1rem',
  fontWeight: 600,
};

const actionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  marginTop: '1rem',
};

const primaryButtonStyle = {
  borderRadius: '999px',
  border: 'none',
  padding: '0.6rem 1.3rem',
  background: '#0f3a4b',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle = {
  color: '#b42318',
  fontWeight: 600,
};

const acceptedStyle = {
  marginTop: '1rem',
  padding: '0.8rem 1rem',
  borderRadius: '12px',
  border: '1px solid rgba(16, 185, 129, 0.4)',
  background: 'rgba(16, 185, 129, 0.08)',
};

const acceptedMetaStyle = {
  margin: 0,
  color: '#0f3a4b',
};
