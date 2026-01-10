import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../../lib/admin-server';

type OpsTelemetryProps = {
  user: AdminUser;
  org: AdminOrg;
};

export default function OpsTelemetry({ user, org }: OpsTelemetryProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title="Ops Telemetry"
      subtitle="Org-level metrics derived from the event store."
      navItems={getXNavItems(org.slug, 'ops')}
    >
      <Head>
        <title>{org.name} - Ops Telemetry</title>
      </Head>
      <div style={actionsStyle}>
        <Link href={`/${org.slug}/events`} style={actionButtonStyle}>
          Events log
        </Link>
      </div>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Metrics placeholder</p>
        <p style={{ margin: 0 }}>
          This page will show funnel counts, error rates, and latency metrics for the org.
        </p>
      </div>
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed rgba(15, 37, 54, 0.2)',
  background: 'rgba(15, 37, 54, 0.04)',
};

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: '1rem',
};

const actionButtonStyle = {
  padding: '0.6rem 1rem',
  borderRadius: '10px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  background: '#ffffff',
  color: '#0f3a4b',
  fontWeight: 600,
  textDecoration: 'none',
};

export const getServerSideProps: GetServerSideProps<OpsTelemetryProps> = async (ctx) => {
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
