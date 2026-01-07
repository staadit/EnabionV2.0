import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import PlatformAdminLayout from '../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../lib/require-platform-admin';

type PlatformAdminHomeProps = {
  user: PlatformAdminUser;
};

export default function PlatformAdminHome({ user }: PlatformAdminHomeProps) {
  return (
    <PlatformAdminLayout user={user} active="home">
      <Head>
        <title>Platform Admin</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>Quick access</h2>
      <div style={gridStyle}>
        <Link href="/platform-admin/tenants" style={cardStyle}>
          <h3 style={cardTitleStyle}>Tenants</h3>
          <p style={cardBodyStyle}>Search by name, slug, or tenantId.</p>
        </Link>
        <Link href="/platform-admin/users" style={cardStyle}>
          <h3 style={cardTitleStyle}>Users</h3>
          <p style={cardBodyStyle}>Lookup by email or userId.</p>
        </Link>
        <Link href="/platform-admin/events" style={cardStyle}>
          <h3 style={cardTitleStyle}>Events</h3>
          <p style={cardBodyStyle}>Cross-tenant event explorer with redaction.</p>
        </Link>
        <Link href="/platform-admin/email-ingest" style={cardStyle}>
          <h3 style={cardTitleStyle}>Email ingest</h3>
          <p style={cardBodyStyle}>Monitor inbound pipeline status.</p>
        </Link>
      </div>
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<PlatformAdminHomeProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  return { props: { user: result.context!.user } };
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1rem',
};

const cardStyle = {
  display: 'block',
  padding: '1.2rem',
  borderRadius: '14px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  textDecoration: 'none',
  color: '#1b1d1f',
  background: 'rgba(245, 245, 245, 0.7)',
};

const cardTitleStyle = {
  marginTop: 0,
  marginBottom: '0.5rem',
};

const cardBodyStyle = {
  margin: 0,
  color: '#4b4f54',
};
