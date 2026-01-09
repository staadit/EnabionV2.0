import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import SettingsLayout from '../../../components/SettingsLayout';
import { getAdminLabels } from '../../../lib/admin-i18n';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../../lib/admin-server';

type NdaSettingsProps = {
  user: AdminUser;
  org: AdminOrg;
};

export default function NdaSettings({ user, org }: NdaSettingsProps) {
  const labels = getAdminLabels(org.defaultLanguage);

  return (
    <SettingsLayout user={user} org={org} active="nda" labels={labels}>
      <Head>
        <title>{labels.settingsTitle} - {labels.navNda}</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>Mutual NDA</h2>
      <p style={{ color: '#4b4f54' }}>
        This page will handle NDA acceptance, typed name and role, and status history. For now it
        is a placeholder for R1.0 routing.
      </p>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Status</p>
        <p style={{ margin: 0 }}>No NDA accepted yet.</p>
      </div>
    </SettingsLayout>
  );
}

const cardStyle = {
  marginTop: '1.5rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed rgba(15, 37, 54, 0.2)',
  background: 'rgba(15, 37, 54, 0.04)',
};

export const getServerSideProps: GetServerSideProps<NdaSettingsProps> = async (ctx) => {
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
