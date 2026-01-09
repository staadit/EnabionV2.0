import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';

type IntentDetailProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
};

export default function IntentDetail({ user, org, intentId }: IntentDetailProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title={`Intent ${intentId}`}
      subtitle="Detail view with overview, coach, matches, and NDA."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Intent {intentId}</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Detail placeholder</p>
        <p style={{ margin: 0 }}>
          Tabs, activity timeline, and matching UI will be added here.
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

export const getServerSideProps: GetServerSideProps<IntentDetailProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
    },
  };
};
