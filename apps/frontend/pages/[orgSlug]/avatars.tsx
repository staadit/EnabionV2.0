import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../components/OrgShell';
import { getXNavItems } from '../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../lib/org-context';

type AvatarsProps = {
  user: OrgUser;
  org: OrgInfo;
};

export default function Avatars({ user, org }: AvatarsProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title="Avatars"
      subtitle="Intent Coach and system guidance."
      navItems={getXNavItems(org.slug, 'avatars')}
    >
      <Head>
        <title>{org.name} - Avatars</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Avatar workspace placeholder</p>
        <p style={{ margin: 0 }}>
          This page will host the Intent Coach workspace and avatar messages.
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

export const getServerSideProps: GetServerSideProps<AvatarsProps> = async (ctx) => {
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
