
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../../components/OrgShell';
import NdaAcceptancePanel from '../../../../components/NdaAcceptancePanel';
import { getYNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';
import { fetchNdaCurrent, fetchNdaStatus, type NdaCurrent, type NdaStatus } from '../../../../lib/org-nda';

type IncomingTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  ndaCurrent: NdaCurrent | null;
  ndaStatus: NdaStatus | null;
};

export default function IncomingNda({
  user,
  org,
  intentId,
  ndaCurrent,
  ndaStatus,
}: IncomingTabProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      eyebrow="Y Portal"
      title="NDA"
      subtitle="Accept mutual NDA to unlock L2 content."
      navItems={getYNavItems(org.slug, 'inbox')}
    >
      <Head>
        <title>{org.name} - NDA</title>
      </Head>
      <p style={metaStyle}>Intent ID: {intentId}</p>
      {ndaCurrent ? (
        <NdaAcceptancePanel
          current={ndaCurrent}
          status={ndaStatus ?? undefined}
          defaultLanguage={org.defaultLanguage}
        />
      ) : (
        <p style={{ color: 'var(--danger)' }}>Unable to load NDA content.</p>
      )}
    </OrgShell>
  );
}

const metaStyle = {
  marginTop: 0,
  marginBottom: '1rem',
  color: 'var(--muted-2)',
};

export const getServerSideProps: GetServerSideProps<IncomingTabProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  const cookie = result.context!.cookie;
  const ndaCurrent = await fetchNdaCurrent(cookie, result.context!.org.defaultLanguage);
  const ndaStatus = await fetchNdaStatus(cookie);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
      ndaCurrent,
      ndaStatus,
    },
  };
};
