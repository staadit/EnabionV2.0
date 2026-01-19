import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';
import { getAvatarLabels } from '../../../lib/avatar-i18n';

type OrgAvatarProps = {
  user: OrgUser;
  org: OrgInfo;
};

export default function OrgAvatar({ user, org }: OrgAvatarProps) {
  const labels = getAvatarLabels(org.defaultLanguage);
  return (
    <OrgShell
      user={user}
      org={org}
      title={labels.orgCardTitle}
      subtitle={labels.orgCardBody}
      navItems={getXNavItems(org.slug, 'avatars')}
    >
      <Head>
        <title>{org.name} - {labels.orgCardTitle}</title>
      </Head>

      <div style={cardStyle}>
        <p style={{ marginTop: 0 }}>{labels.orgPageIntro}</p>
        <div style={actionsStyle}>
          <Link href={`/${org.slug}/settings/avatar`} style={buttonStyle}>
            {labels.orgPageProfileCta}
          </Link>
          <Link href={`/${org.slug}/pipeline`} style={ghostButtonStyle}>
            {labels.orgPagePipelineCta}
          </Link>
        </div>
      </div>
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  boxShadow: 'var(--shadow)',
};

const actionsStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  marginTop: '1rem',
};

const buttonStyle = {
  padding: '0.65rem 1.1rem',
  borderRadius: '10px',
  border: '1px solid var(--navy)',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  textDecoration: 'none',
};

const ghostButtonStyle = {
  padding: '0.65rem 1.1rem',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontWeight: 600,
  textDecoration: 'none',
};

export const getServerSideProps: GetServerSideProps<OrgAvatarProps> = async (ctx) => {
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
