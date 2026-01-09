import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../lib/require-platform-admin';

type TelemetryProps = {
  user: PlatformAdminUser;
};

export default function PlatformAdminTelemetry({ user }: TelemetryProps) {
  return (
    <PlatformAdminLayout user={user} active="telemetry">
      <Head>
        <title>Platform Admin - Telemetry</title>
      </Head>
      <h2 style={{ marginTop: 0 }}>Telemetry</h2>
      <p style={{ color: '#4b4f54' }}>
        Cross-tenant metrics for pilot health and event throughput.
      </p>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Dashboard placeholder</p>
        <p style={{ margin: 0 }}>
          This page will aggregate metrics from the event store and logs.
        </p>
      </div>
    </PlatformAdminLayout>
  );
}

const cardStyle = {
  marginTop: '1.5rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed rgba(15, 37, 54, 0.2)',
  background: 'rgba(15, 37, 54, 0.04)',
};

export const getServerSideProps: GetServerSideProps<TelemetryProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  return {
    props: {
      user: result.context!.user,
    },
  };
};
