import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../../lib/require-platform-admin';

type UserDetailProps = {
  user: PlatformAdminUser;
  detail: {
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
  activeSessions: number;
};

export default function UserDetailPage({ user, detail, activeSessions }: UserDetailProps) {
  return (
    <PlatformAdminLayout user={user} active="users">
      <Head>
        <title>Platform Admin - User {detail.email}</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>{detail.email}</h2>
      <div style={metaGridStyle}>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>User ID</p>
          <p style={metaValueStyle}>{detail.id}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Role</p>
          <p style={metaValueStyle}>{detail.role}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Status</p>
          <p style={metaValueStyle}>{detail.deactivatedAt ? 'Deactivated' : 'Active'}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Active sessions</p>
          <p style={metaValueStyle}>{activeSessions}</p>
        </div>
        <div style={metaCardStyle}>
          <p style={metaLabelStyle}>Org</p>
          <p style={metaValueStyle}>
            <Link href={`/platform-admin/tenants/${detail.org.id}`} style={linkStyle}>
              {detail.org.name}
            </Link>
          </p>
          <p style={metaSubStyle}>{detail.org.slug}</p>
        </div>
      </div>
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<UserDetailProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const userId = ctx.params?.id as string;
  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/platform-admin/users/${userId}`, {
    headers: { cookie: result.context!.cookie },
  });

  if (!res.ok) {
    return { redirect: { destination: '/platform-admin/users', permanent: false } };
  }

  const data = await res.json();
  return {
    props: {
      user: result.context!.user,
      detail: data.user,
      activeSessions: data.activeSessions ?? 0,
    },
  };
};

const metaGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem',
};

const metaCardStyle = {
  padding: '0.9rem',
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
  margin: 0,
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
