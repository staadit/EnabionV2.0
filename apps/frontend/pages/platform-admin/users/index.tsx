import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../../lib/require-platform-admin';

type UserResult = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string | null;
  deactivatedAt?: string | null;
  org: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
};

type UsersSearchProps = {
  user: PlatformAdminUser;
  email: string;
  userId: string;
  result: UserResult | null;
  error?: string | null;
};

export default function UsersSearchPage({ user, email, userId, result, error }: UsersSearchProps) {
  const hasQuery = Boolean(email || userId);
  return (
    <PlatformAdminLayout user={user} active="users">
      <Head>
        <title>Platform Admin - Users</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>User search</h2>
      <form method="GET" style={formStyle}>
        <label style={labelStyle}>
          Email
          <input name="email" defaultValue={email} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          User ID
          <input name="userId" defaultValue={userId} style={inputStyle} />
        </label>
        <button type="submit" style={buttonStyle}>
          Search
        </button>
      </form>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {result ? (
        <div style={cardStyle}>
          <p style={metaLabelStyle}>User</p>
          <p style={metaValueStyle}>
            <Link href={`/platform-admin/users/${result.id}`} style={linkStyle}>
              {result.email}
            </Link>
          </p>
          <p style={metaSubStyle}>Role: {result.role}</p>
          <p style={metaSubStyle}>Status: {result.deactivatedAt ? 'Deactivated' : 'Active'}</p>
          <p style={metaSubStyle}>Org: {result.org.name} ({result.org.slug})</p>
        </div>
      ) : (
        <p style={{ marginTop: '1rem' }}>{hasQuery ? 'No user found.' : 'No user selected.'}</p>
      )}
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<UsersSearchProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const email = typeof ctx.query.email === 'string' ? ctx.query.email : '';
  const userId = typeof ctx.query.userId === 'string' ? ctx.query.userId : '';

  if (!email && !userId) {
    return {
      props: {
        user: result.context!.user,
        email,
        userId,
        result: null,
      },
    };
  }

  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (userId) params.set('userId', userId);

  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/platform-admin/users/search?${params.toString()}`, {
    headers: { cookie: result.context!.cookie },
  });

  if (!res.ok) {
    return {
      props: {
        user: result.context!.user,
        email,
        userId,
        result: null,
        error: 'User not found.',
      },
    };
  }

  const data = await res.json();
  return {
    props: {
      user: result.context!.user,
      email,
      userId,
      result: data.user || null,
    },
  };
};

const formStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'flex-end',
  marginBottom: '1rem',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.35rem',
  fontWeight: 600,
};

const inputStyle = {
  padding: '0.5rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
};

const buttonStyle = {
  padding: '0.6rem 0.9rem',
  borderRadius: '8px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  boxShadow: 'var(--shadow)',
  fontWeight: 600,
  cursor: 'pointer',
};

const cardStyle = {
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
};

const metaLabelStyle = {
  margin: 0,
  color: 'var(--muted-2)',
  fontSize: '0.8rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const metaValueStyle = {
  margin: '0.4rem 0 0.2rem',
  fontWeight: 600,
};

const metaSubStyle = {
  margin: 0,
  color: 'var(--muted)',
};

const linkStyle = {
  color: 'var(--green)',
  textDecoration: 'none',
  fontWeight: 600,
};

const errorStyle = {
  color: 'var(--danger)',
};
