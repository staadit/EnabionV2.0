import Head from 'next/head';
import { useState, type FormEvent, type CSSProperties } from 'react';
import Link from 'next/link';

export default function ResetRequest() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    setDebugToken(null);

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data?.message) ? data.message.join('; ') : data?.message;
        throw new Error(message || data?.error || 'Reset request failed');
      }

      if (data?.resetToken) {
        setDebugToken(data.resetToken);
      }
      setStatus('sent');
    } catch (err: any) {
      setError(err?.message ?? 'Reset request failed');
      setStatus('idle');
    }
  };

  return (
    <div style={shellStyle}>
      <Head>
        <title>Reset Password</title>
      </Head>

      <main style={{ ...cardStyle, animation: 'panelIn 480ms ease' }}>
        <div style={badgeStyle}>Enabion R1.0</div>
        <h1 style={titleStyle}>Reset password</h1>
        <p style={subtitleStyle}>We will send a reset link to your email address.</p>

        {status === 'sent' ? (
          <div style={successStyle}>
            <p>Check your inbox for the reset link.</p>
            {debugToken ? (
              <div style={debugStyle}>
                <p style={{ margin: 0 }}>Debug token:</p>
                <code style={codeStyle}>{debugToken}</code>
              </div>
            ) : null}
            <Link style={linkStyle} href="/login">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ marginTop: '2rem' }}>
            <label style={labelStyle}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
                style={inputStyle}
              />
            </label>

            {error ? <p style={errorStyle}>{error}</p> : null}

            <button type="submit" style={buttonStyle} disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}
      </main>

      <style jsx global>{`
        @keyframes panelIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

const shellStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: 'transparent',
  fontFamily: '"Space Grotesk", "IBM Plex Sans", "Noto Sans", sans-serif',
  color: 'var(--text)',
};

const cardStyle: CSSProperties = {
  width: 'min(440px, 100%)',
  background: 'var(--surface)',
  borderRadius: '20px',
  padding: '2.5rem',
  boxShadow: 'var(--shadow-2)',
  border: '1px solid var(--border)',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.35rem 0.85rem',
  borderRadius: '999px',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontSize: '0.75rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const titleStyle: CSSProperties = {
  marginTop: '1.2rem',
  fontSize: '2rem',
  lineHeight: 1.1,
};

const subtitleStyle: CSSProperties = {
  marginTop: '0.6rem',
  color: 'var(--muted)',
};

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: '0.95rem',
  gap: '0.5rem',
};

const inputStyle: CSSProperties = {
  borderRadius: '12px',
  padding: '0.85rem 1rem',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: '1rem',
};

const buttonStyle: CSSProperties = {
  marginTop: '1.5rem',
  width: '100%',
  padding: '0.9rem 1rem',
  borderRadius: '12px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle: CSSProperties = {
  marginTop: '1rem',
  color: 'var(--danger)',
};

const successStyle: CSSProperties = {
  marginTop: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  color: 'var(--text)',
};

const debugStyle: CSSProperties = {
  background: 'var(--surface-2)',
  padding: '0.75rem',
  borderRadius: '12px',
  fontSize: '0.9rem',
};

const codeStyle: CSSProperties = {
  display: 'block',
  marginTop: '0.5rem',
  wordBreak: 'break-all',
};

const linkStyle: CSSProperties = {
  color: 'var(--link)',
  fontWeight: 600,
  textDecoration: 'none',
};
