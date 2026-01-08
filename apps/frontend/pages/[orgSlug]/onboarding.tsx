import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../components/OrgShell';
import { getXNavItems } from '../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../lib/org-context';

type OnboardingProps = {
  user: OrgUser;
  org: OrgInfo;
};

export default function Onboarding({ user, org }: OnboardingProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title="Onboarding"
      subtitle="System Avatar guidance for L1/L2 and NDA basics."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Onboarding</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Onboarding placeholder</p>
        <p style={{ margin: 0 }}>
          This page will host the System Avatar onboarding conversation and next steps.
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

export const getServerSideProps: GetServerSideProps<OnboardingProps> = async (ctx) => {
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
