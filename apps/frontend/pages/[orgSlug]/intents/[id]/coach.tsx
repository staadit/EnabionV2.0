
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useState } from 'react';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
};

export default function Coach({ user, org, intentId }: IntentTabProps) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [responseMeta, setResponseMeta] = useState<{
    model?: string;
    requestId?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isViewer = user.role === 'Viewer';

  const runCoach = async () => {
    if (running || isViewer) return;
    setRunning(true);
    setMessage(null);
    setResponseText(null);
    setResponseMeta(null);
    setError(null);
    try {
      const res = await fetch(`/api/intents/${intentId}/coach/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        const messageText = Array.isArray(data?.message)
          ? data.message.join('; ')
          : data?.message || data?.error;
        throw new Error(messageText || 'Intent Coach failed');
      }
      const status = data?.status ?? 'queued';
      if (status === 'not_implemented') {
        setMessage('Intent Coach is not implemented yet.');
      } else if (status === 'completed' && typeof data?.text === 'string') {
        setMessage('Intent Coach completed.');
        setResponseText(data.text);
        setResponseMeta({
          model: data?.model,
          requestId: data?.requestId,
        });
      } else {
        setMessage(`Intent Coach status: ${status}`);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Intent Coach failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <OrgShell
      user={user}
      org={org}
      title="Intent Coach"
      subtitle="Suggestions and clarifications for this intent."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Intent Coach</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Intent Coach</p>
        <p style={{ margin: 0 }}>Intent ID: {intentId}</p>
      </div>
      <div style={actionRowStyle}>
        <button
          type="button"
          style={buttonStyle}
          onClick={runCoach}
          disabled={isViewer || running}
        >
          {running ? 'Running...' : 'Run Intent Coach'}
        </button>
        {isViewer ? (
          <span style={helperStyle}>View-only access.</span>
        ) : (
          <span style={helperStyle}>Uses L1 intent fields only (no raw/pasted text).</span>
        )}
      </div>
      {message ? <p style={messageStyle}>{message}</p> : null}
      {responseText ? (
        <div style={responseStyle}>
          <div style={responseHeaderStyle}>
            <span style={{ fontWeight: 600 }}>Avatar response</span>
            {responseMeta?.model ? <span style={metaStyle}>Model: {responseMeta.model}</span> : null}
            {responseMeta?.requestId ? (
              <span style={metaStyle}>Request ID: {responseMeta.requestId}</span>
            ) : null}
          </div>
          <pre style={responseTextStyle}>{responseText}</pre>
        </div>
      ) : null}
      {error ? <p style={errorStyle}>{error}</p> : null}
    </OrgShell>
  );
}

const cardStyle = {
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px dashed var(--border)',
  background: 'var(--surface-2)',
};

const actionRowStyle = {
  marginTop: '1.25rem',
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'center',
};

const buttonStyle = {
  padding: '0.7rem 1.2rem',
  borderRadius: '12px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  fontWeight: 600,
  cursor: 'pointer',
};

const helperStyle = {
  color: 'var(--muted)',
  fontSize: '0.9rem',
};

const messageStyle = {
  marginTop: '0.75rem',
  color: 'var(--text)',
};

const responseStyle = {
  marginTop: '0.75rem',
  padding: '1rem 1.25rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-1)',
};

const responseHeaderStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'center',
  marginBottom: '0.75rem',
};

const metaStyle = {
  color: 'var(--muted)',
  fontSize: '0.85rem',
};

const responseTextStyle = {
  margin: 0,
  whiteSpace: 'pre-wrap' as const,
  color: 'var(--text)',
  fontFamily: 'inherit',
};

const errorStyle = {
  marginTop: '0.75rem',
  color: 'var(--danger)',
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
