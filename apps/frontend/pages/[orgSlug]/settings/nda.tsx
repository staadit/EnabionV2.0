import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import SettingsLayout from '../../../components/SettingsLayout';
import NdaAcceptancePanel from '../../../components/NdaAcceptancePanel';
import { getAdminLabels } from '../../../lib/admin-i18n';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../../lib/admin-server';
import { fetchNdaCurrent, fetchNdaStatus, type NdaCurrent, type NdaStatus } from '../../../lib/org-nda';

type NdaSettingsProps = {
  user: AdminUser;
  org: AdminOrg;
  ndaCurrent: NdaCurrent | null;
  ndaStatus: NdaStatus | null;
};

export default function NdaSettings({ user, org, ndaCurrent, ndaStatus }: NdaSettingsProps) {
  const labels = getAdminLabels(org.defaultLanguage);

  return (
    <SettingsLayout user={user} org={org} active="nda" labels={labels}>
      <Head>
        <title>
          {labels.settingsTitle} - {labels.navNda}
        </title>
      </Head>

      <h2 style={{ marginTop: 0 }}>Mutual NDA</h2>
      {ndaCurrent ? (
        <NdaAcceptancePanel
          current={ndaCurrent}
          status={ndaStatus ?? undefined}
          defaultLanguage={org.defaultLanguage}
        />
      ) : (
        <p style={{ color: 'var(--danger)' }}>Unable to load NDA content.</p>
      )}
    </SettingsLayout>
  );
}

export const getServerSideProps: GetServerSideProps<NdaSettingsProps> = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const cookie = result.context!.cookie;
  const ndaCurrent = await fetchNdaCurrent(cookie, result.context!.org.defaultLanguage);
  const ndaStatus = await fetchNdaStatus(cookie);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      ndaCurrent,
      ndaStatus,
    },
  };
};
