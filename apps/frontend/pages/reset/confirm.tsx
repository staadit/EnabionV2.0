import Head from 'next/head';
import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ResetConfirm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof router.query.token === 'string') {
      setToken(router.query.token);
    }
  }, [router.query.token]);

  const tokenMissing = router.isReady && !token;
  const passwordTooShort = password.length > 0 && password.length < 12;
  const confirmTooShort = confirmPassword.length > 0 && confirmPassword.length < 12;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = !tokenMissing && !passwordTooShort && !confirmTooShort && !passwordsMismatch;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Reset link is missing or invalid.');
      return;
    }

    if (password.length < 12 || confirmPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = Array.isArray(data?.message) ? data.message.join('; ') : data?.message;
        throw new Error(message || data?.error || 'Reset confirmation failed');
      }

      setStatus('done');
    } catch (err: any) {
      setError(err?.message ?? 'Reset confirmation failed');
      setStatus('idle');
    }
  };

  return (
    <div style={shellStyle}>
      <Head>
        <title>Set New Password</title>
      </Head>

      <main style={{ ...cardStyle, animation: 'panelIn 480ms ease' }}>
        <div style={badgeStyle}>Enabion R1.0</div>
        <h1 style={titleStyle}>Set a new password</h1>
        <p style={subtitleStyle}>Choose a new password for your account.</p>

        {status === 'done' ? (
          <div style={successStyle}>
            <p>Password updated. You can sign in now.</p>
            <Link style={linkStyle} href="/login">
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ marginTop: '2rem' }}>
            {tokenMissing ? <p style={errorStyle}>Reset link is missing or invalid.</p> : null}

            <label style={labelStyle}>
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 12 characters"
                required
                minLength={12}
                autoComplete="new-password"
                style={inputStyle}
              />
            </label>
            {passwordTooShort ? (
              <p style={inlineErrorStyle}>Password must be at least 12 characters.</p>
            ) : null}

            <label style={{ ...labelStyle, marginTop: '1rem' }}>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                required
                minLength={12}
                autoComplete="new-password"
                style={inputStyle}
              />
            </label>
            {confirmTooShort ? (
              <p style={inlineErrorStyle}>Password must be at least 12 characters.</p>
            ) : passwordsMismatch ? (
              <p style={inlineErrorStyle}>Passwords do not match.</p>
            ) : null}

            {error ? <p style={errorStyle}>{error}</p> : null}

            <button type="submit" style={buttonStyle} disabled={status === 'loading' || !canSubmit}>
              {status === 'loading' ? 'Updating...' : 'Update password'}
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
  width: 'min(460px, 100%)',
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

const inlineErrorStyle: CSSProperties = {
  marginTop: '0.4rem',
  color: 'var(--danger)',
  fontSize: '0.85rem',
};

const successStyle: CSSProperties = {
  marginTop: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  color: 'var(--text)',
};

const linkStyle: CSSProperties = {
  color: 'var(--link)',
  fontWeight: 600,
  textDecoration: 'none',
};
