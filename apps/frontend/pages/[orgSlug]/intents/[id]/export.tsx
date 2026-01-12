import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
};

const BACKEND_PUBLIC =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'https://api.dev.enabion.com';

export default function Export({ user, org, intentId }: IntentTabProps) {
  const base = `${BACKEND_PUBLIC}/v1/intents/${encodeURIComponent(intentId)}/export`;
  const mkLink = (format: string) => `${base}?format=${format}`;

  return (
    <OrgShell
      user={user}
      org={org}
      title="Export"
      subtitle="Download L1-only exports (Markdown, PDF, DOCX)."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Export</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>L1 export</p>
        <p style={{ margin: 0, color: '#4b5c6b' }}>
          Exported content is L1-only in R1.0. L2 details remain locked by design.
        </p>
      </div>
      <div style={buttonRow}>
        <a style={primaryButton} href={mkLink('md')}>
          Download Markdown (L1)
        </a>
        <a style={ghostButton} href={mkLink('pdf')}>
          Download PDF (L1)
        </a>
        <a style={ghostButton} href={mkLink('docx')}>
          Download DOCX (L1)
        </a>
      </div>
      <p style={mutedStyle}>
        Exports are generated server-side from the redacted (L1-only) model. Confidential L2 details are
        omitted.
      </p>
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed rgba(15, 37, 54, 0.2)',
  background: 'rgba(15, 37, 54, 0.04)',
};

const mutedStyle = {
  marginTop: '1rem',
  color: '#6b7785',
};

const buttonRow = {
  display: 'flex',
  gap: '0.75rem',
  marginTop: '1.25rem',
  flexWrap: 'wrap' as const,
};

const primaryButton = {
  display: 'inline-block',
  padding: '0.65rem 1.1rem',
  borderRadius: '999px',
  background: '#0f2536',
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'none',
};

const ghostButton = {
  display: 'inline-block',
  padding: '0.65rem 1.1rem',
  borderRadius: '999px',
  background: '#eef2f6',
  color: '#0f2536',
  fontWeight: 700,
  textDecoration: 'none',
};

export const getServerSideProps: GetServerSideProps<IntentTabProps> = async (ctx) => {
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
