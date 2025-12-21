import Head from 'next/head';
import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function ResetConfirm() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof router.query.token === 'string') {
      setToken(router.query.token);
    }
  }, [router.query.token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setError(null);

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
        <p style={subtitleStyle}>Paste your reset token and choose a new password.</p>

        {status === 'done' ? (
          <div style={successStyle}>
            <p>Password updated. You can sign in now.</p>
            <Link style={linkStyle} href="/login">
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ marginTop: '2rem' }}>
            <label style={labelStyle}>
              Reset token
              <input
                type="text"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste token"
                required
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, marginTop: '1rem' }}>
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 12 characters"
                required
                minLength={12}
                style={inputStyle}
              />
            </label>

            {error ? <p style={errorStyle}>{error}</p> : null}

            <button type="submit" style={buttonStyle} disabled={status === 'loading'}>
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
  background:
    'radial-gradient(120% 120% at 0% 0%, #f4d3b4 0%, #f6efe6 45%, #d4e5de 100%)',
  fontFamily: '"Space Grotesk", "IBM Plex Sans", "Noto Sans", sans-serif',
  color: '#1c1c1a',
};

const cardStyle: CSSProperties = {
  width: 'min(460px, 100%)',
  background: 'rgba(255, 255, 255, 0.92)',
  borderRadius: '20px',
  padding: '2.5rem',
  boxShadow: '0 18px 40px rgba(13, 32, 44, 0.2)',
  border: '1px solid rgba(15, 37, 54, 0.08)',
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.35rem 0.85rem',
  borderRadius: '999px',
  background: '#10334a',
  color: '#fff',
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
  color: '#4b4f54',
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
  border: '1px solid rgba(15, 37, 54, 0.2)',
  background: '#fff',
  fontSize: '1rem',
};

const buttonStyle: CSSProperties = {
  marginTop: '1.5rem',
  width: '100%',
  padding: '0.9rem 1rem',
  borderRadius: '12px',
  border: 'none',
  background: '#1a6355',
  color: '#fff',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle: CSSProperties = {
  marginTop: '1rem',
  color: '#b42318',
};

const successStyle: CSSProperties = {
  marginTop: '2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  color: '#1c1c1a',
};

const linkStyle: CSSProperties = {
  color: '#10334a',
  fontWeight: 600,
  textDecoration: 'none',
};
