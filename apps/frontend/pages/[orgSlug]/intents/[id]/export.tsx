
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';
import { formatDateTime } from '../../../../lib/date-format';
import { fetchIntentExport, type ExportIntentPayload } from '../../../../lib/intent-redaction';

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  exportPayload: ExportIntentPayload | null;
};

export default function Export({ user, org, exportPayload }: IntentTabProps) {
  return (
    <OrgShell
      user={user}
      org={org}
      title="Export"
      subtitle="Generate Markdown or PDF export."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Export</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>L1 export</p>
        <p style={{ margin: 0, color: '#4b5c6b' }}>
          Exported content is L1-only in R1.0. L2 details remain locked.
        </p>
      </div>

      {!exportPayload ? (
        <p style={errorStyle}>Unable to load export data.</p>
      ) : (
        <>
          <div style={detailGridStyle}>
            <div>
              <div style={labelStyle}>Title</div>
              <div style={valueStyle}>{exportPayload.intent.title ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Client</div>
              <div style={valueStyle}>{exportPayload.intent.client ?? '-'}</div>
            </div>
            <div>
              <div style={labelStyle}>Stage</div>
              <div style={valueStyle}>{exportPayload.intent.stage}</div>
            </div>
            <div>
              <div style={labelStyle}>Last activity</div>
              <div style={valueStyle}>
                {formatDateTime(exportPayload.intent.lastActivityAt)}
              </div>
            </div>
          </div>
          {exportPayload.intent.l2Redacted ? (
            <p style={mutedStyle}>L2 content omitted from export.</p>
          ) : null}
          <div style={markdownCardStyle}>
            <div style={labelStyle}>Markdown preview</div>
            <pre style={markdownStyle}>{exportPayload.markdown}</pre>
          </div>
        </>
      )}
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed rgba(15, 37, 54, 0.2)',
  background: 'rgba(15, 37, 54, 0.04)',
};

const errorStyle = {
  color: '#b42318',
  fontWeight: 600,
};

const detailGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '1rem',
  marginTop: '1.5rem',
};

const labelStyle = {
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#6b7785',
};

const valueStyle = {
  marginTop: '0.35rem',
  fontWeight: 600,
};

const mutedStyle = {
  marginTop: '1rem',
  color: '#6b7785',
};

const markdownCardStyle = {
  marginTop: '1.5rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: '#fff',
};

const markdownStyle = {
  marginTop: '0.5rem',
  whiteSpace: 'pre-wrap' as const,
  fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
  fontSize: '0.85rem',
};

export const getServerSideProps: GetServerSideProps<IntentTabProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  const exportPayload = await fetchIntentExport(result.context!.cookie, intentId);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
      exportPayload,
    },
  };
};
