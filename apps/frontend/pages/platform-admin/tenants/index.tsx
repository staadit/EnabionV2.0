import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../../lib/require-platform-admin';
import { formatDateTime } from '../../../lib/date-format';

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  userCount: number;
  intentCount: number;
};

type TenantsProps = {
  user: PlatformAdminUser;
  tenants: TenantRow[];
  q: string;
  limit: number;
  nextCursor?: string | null;
};

export default function TenantsPage({ user, tenants, q, limit, nextCursor }: TenantsProps) {
  const nextHref = nextCursor
    ? `/platform-admin/tenants?q=${encodeURIComponent(q)}&limit=${limit}&cursor=${encodeURIComponent(nextCursor)}`
    : null;

  return (
    <PlatformAdminLayout user={user} active="tenants">
      <Head>
        <title>Platform Admin - Tenants</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>Tenants</h2>
      <form method="GET" style={formStyle}>
        <label style={labelStyle}>
          Search
          <input name="q" defaultValue={q} style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Limit
          <input name="limit" defaultValue={limit} style={inputStyle} type="number" min={1} max={200} />
        </label>
        <button type="submit" style={buttonStyle}>
          Apply
        </button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Slug</th>
              <th style={thStyle}>Tenant ID</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Users</th>
              <th style={thStyle}>Intents</th>
              <th style={thStyle}>Created</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td style={tdStyle}>
                  <Link href={`/platform-admin/tenants/${tenant.id}`} style={linkStyle}>
                    {tenant.name}
                  </Link>
                </td>
                <td style={tdStyle}>{tenant.slug}</td>
                <td style={tdStyle}>{tenant.id}</td>
                <td style={tdStyle}>{tenant.status}</td>
                <td style={tdStyle}>{tenant.userCount}</td>
                <td style={tdStyle}>{tenant.intentCount}</td>
                <td style={tdStyle}>{formatDateTime(tenant.createdAt)}</td>
              </tr>
            ))}
            {!tenants.length ? (
              <tr>
                <td style={tdStyle} colSpan={7}>
                  No tenants found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {nextHref ? (
        <div style={{ marginTop: '1rem' }}>
          <Link href={nextHref} style={linkStyle}>
            Next page
          </Link>
        </div>
      ) : null}
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<TenantsProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }

  const q = typeof ctx.query.q === 'string' ? ctx.query.q : '';
  const limit = typeof ctx.query.limit === 'string' ? Number(ctx.query.limit) || 50 : 50;
  const cursor = typeof ctx.query.cursor === 'string' ? ctx.query.cursor : '';

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (limit) params.set('limit', String(limit));
  if (cursor) params.set('cursor', cursor);

  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/platform-admin/tenants?${params.toString()}`, {
    headers: { cookie: result.context!.cookie },
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      props: {
        user: result.context!.user,
        tenants: [],
        q,
        limit,
        nextCursor: null,
      },
    };
  }

  return {
    props: {
      user: result.context!.user,
      tenants: data.tenants || [],
      q,
      limit,
      nextCursor: data.nextCursor || null,
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
  border: '1px solid rgba(15, 37, 54, 0.2)',
};

const buttonStyle = {
  padding: '0.6rem 0.9rem',
  borderRadius: '8px',
  border: 'none',
  background: '#1c6e5a',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '0.95rem',
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.12)',
};

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.08)',
};

const linkStyle = {
  color: '#1c6e5a',
  textDecoration: 'none',
  fontWeight: 600,
};
