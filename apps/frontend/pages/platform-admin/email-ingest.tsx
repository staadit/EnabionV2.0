import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import PlatformAdminLayout from '../../components/PlatformAdminLayout';
import { requirePlatformAdmin, type PlatformAdminUser } from '../../lib/require-platform-admin';

type EmailIngestProps = {
  user: PlatformAdminUser;
};

export default function EmailIngestPage({ user }: EmailIngestProps) {
  return (
    <PlatformAdminLayout user={user} active="email">
      <Head>
        <title>Platform Admin - Email ingest</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>Email ingest monitor</h2>
      <p style={{ color: '#4b4f54' }}>
        G4/G5 pipeline monitoring will appear here once email ingest jobs are available.
      </p>
    </PlatformAdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<EmailIngestProps> = async (ctx) => {
  const result = await requirePlatformAdmin(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  return { props: { user: result.context!.user } };
};
