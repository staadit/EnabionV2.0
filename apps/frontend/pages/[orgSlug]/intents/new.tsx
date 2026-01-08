import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';

type NewIntentProps = {
  user: OrgUser;
  org: OrgInfo;
};

export default function NewIntent({ user, org }: NewIntentProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title="Create Intent"
      subtitle="Paste an email or start from a blank intent."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - New Intent</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Draft flow placeholder</p>
        <p style={{ margin: 0 }}>
          This page will host the paste/email form, mode selector, and intent creation flow.
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

export const getServerSideProps: GetServerSideProps<NewIntentProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
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
