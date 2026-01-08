import Head from 'next/head';
import { useState, type FormEvent, type CSSProperties } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';

export default function Signup() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, orgName }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = Array.isArray(data?.message) ? data.message.join('; ') : data?.message;
        throw new Error(message || data?.error || 'Signup failed');
      }

      let destination = typeof data?.user?.orgSlug === 'string' && data.user.orgSlug
        ? `/${data.user.orgSlug}/intents`
        : null;

      if (!destination) {
        try {
          const meRes = await fetch('/api/auth/me');
          if (meRes.ok) {
            const meData = await meRes.json();
            const meSlug = meData?.user?.orgSlug;
            if (typeof meSlug === 'string' && meSlug) {
              destination = `/${meSlug}/intents`;
            }
          }
        } catch {
          // Ignore lookup errors and fall back to root.
        }
      }

      await router.push(destination || '/');
    } catch (err: any) {
      setError(err?.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={shellStyle}>
      <Head>
        <title>Create Enabion Account</title>
      </Head>

      <main style={{ ...cardStyle, animation: 'panelIn 480ms ease' }}>
        <div style={badgeStyle}>Enabion R1.0</div>
        <h1 style={titleStyle}>Create your org</h1>
        <p style={subtitleStyle}>Set up your workspace and start the pilot.</p>

        <form onSubmit={onSubmit} style={{ marginTop: '2rem' }}>
          <label style={labelStyle}>
            Organization name
            <input
              type="text"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Acme Ventures"
              required
              style={inputStyle}
            />
          </label>

          <label style={{ ...labelStyle, marginTop: '1rem' }}>
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

          <label style={{ ...labelStyle, marginTop: '1rem' }}>
            Password
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

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={footerStyle}>
          Already have access?{' '}
          <a style={linkStyle} href="/login">
            Sign in
          </a>
        </p>
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

const footerStyle: CSSProperties = {
  marginTop: '1.5rem',
  color: '#4b4f54',
  fontSize: '0.95rem',
};

const linkStyle: CSSProperties = {
  color: '#10334a',
  fontWeight: 600,
  textDecoration: 'none',
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  try {
    const res = await fetch(`${backendBase}/auth/me`, {
      headers: { cookie: req.headers.cookie ?? '' },
    });
    if (res.status === 200) {
      const data = await res.json();
      const slug = data?.user?.orgSlug;
      return {
        redirect: {
          destination: typeof slug === 'string' && slug ? `/${slug}/intents` : '/',
          permanent: false,
        },
      };
    }
  } catch {
    // Ignore backend errors and render signup form.
  }

  return { props: {} };
};
