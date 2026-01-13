
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../../components/OrgShell';
import { getYNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';

type IncomingTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
};

export default function IncomingRespond({ user, org, intentId }: IncomingTabProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      eyebrow="Y Portal"
      title="Respond"
      subtitle="Send your response and attachments."
      navItems={getYNavItems(org.slug, 'inbox')}
    >
      <Head>
        <title>{org.name} - Respond</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Respond placeholder</p>
        <p style={{ margin: 0 }}>Intent ID: {intentId}</p>
      </div>
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed var(--border)',
  background: 'var(--surface-2)',
};

export const getServerSideProps: GetServerSideProps<IncomingTabProps> = async (ctx) => {
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
