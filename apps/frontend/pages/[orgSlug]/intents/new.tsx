import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useState, type FormEvent } from 'react';
import OrgShell from '../../../components/OrgShell';
import { getXNavItems } from '../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../lib/org-context';

type NewIntentProps = {
  user: OrgUser;
  org: OrgInfo;
};

type IntentFormState = {
  goal: string;
  title: string;
  sourceTextRaw: string;
  context: string;
  scope: string;
  kpi: string;
  risks: string;
  deadline: string;
};

type IntentMode = 'manual' | 'paste';

export default function NewIntent({ user, org }: NewIntentProps) {
  const router = useRouter();
  const [mode, setMode] = useState<IntentMode>('manual');
  const [form, setForm] = useState<IntentFormState>({
    goal: '',
    title: '',
    sourceTextRaw: '',
    context: '',
    scope: '',
    kpi: '',
    risks: '',
    deadline: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isViewer = user.role === 'Viewer';

  const updateField = (key: keyof IntentFormState) => (event: any) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const normalizeOptional = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isViewer || loading) return;

    const isPaste = mode === 'paste';
    const goal = form.goal.trim();
    const sourceTextRaw = form.sourceTextRaw;
    const sourceTextTrimmed = sourceTextRaw.trim();

    if (isPaste) {
      if (!sourceTextTrimmed) {
        setError('Paste text is required.');
        return;
      }
    } else if (goal.length < 3) {
      setError('Goal must be at least 3 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    let payload: Record<string, unknown>;
    if (isPaste) {
      payload = {
        sourceTextRaw,
        title: normalizeOptional(form.title),
      };
    } else {
      const deadlineAt = form.deadline
        ? new Date(form.deadline).toISOString()
        : null;
      payload = {
        goal,
        context: normalizeOptional(form.context),
        scope: normalizeOptional(form.scope),
        kpi: normalizeOptional(form.kpi),
        risks: normalizeOptional(form.risks),
        deadlineAt,
      };
    }

    try {
      const res = await fetch('/api/intents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = Array.isArray(data?.message) ? data.message.join('; ') : data?.message;
        throw new Error(message || data?.error || 'Intent creation failed');
      }

      const intentId = data?.intent?.id || data?.id;
      const destination = intentId
        ? isPaste
          ? `/${org.slug}/intents/${intentId}/coach`
          : `/${org.slug}/intents/${intentId}`
        : `/${org.slug}/pipeline`;
      await router.push(destination);
    } catch (err: any) {
      setError(err?.message ?? 'Intent creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <OrgShell
      user={user}
      org={org}
      title="Create Intent"
      subtitle="Start from scratch or paste an email/RFP."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - New Intent</title>
      </Head>
      <form onSubmit={onSubmit} style={formStyle} noValidate>
        {isViewer ? (
          <div style={noticeStyle}>
            You have view-only access. Ask an Owner or BD/AM to create an intent.
          </div>
        ) : null}

        <div style={modeRowStyle}>
          <button
            type="button"
            style={{ ...modeButtonStyle, ...(mode === 'manual' ? modeActiveStyle : {}) }}
            onClick={() => setMode('manual')}
          >
            From scratch
          </button>
          <button
            type="button"
            style={{ ...modeButtonStyle, ...(mode === 'paste' ? modeActiveStyle : {}) }}
            onClick={() => setMode('paste')}
          >
            Paste email/RFP
          </button>
        </div>

        {mode === 'paste' ? (
          <>
            <label style={labelStyle}>
              Paste email/RFP text *
              <textarea
                value={form.sourceTextRaw}
                onChange={updateField('sourceTextRaw')}
                style={textAreaStyle}
                rows={8}
                placeholder="Paste the email or RFP text here."
                disabled={isViewer || loading}
              />
            </label>
            <label style={labelStyle}>
              Title (optional)
              <input
                type="text"
                value={form.title}
                onChange={updateField('title')}
                style={inputStyle}
                placeholder="Intent title override"
                disabled={isViewer || loading}
              />
            </label>
            <p style={helperStyle}>
              We store the raw text so Intent Coach can structure it. Raw text is not sent in
              event payloads.
            </p>
          </>
        ) : (
          <>
            <label style={labelStyle}>
              Goal *
              <textarea
                value={form.goal}
                onChange={updateField('goal')}
                style={textAreaStyle}
                rows={3}
                placeholder="What is the core intent goal?"
                disabled={isViewer || loading}
              />
            </label>

            <label style={labelStyle}>
              Context
              <textarea
                value={form.context}
                onChange={updateField('context')}
                style={textAreaStyle}
                rows={3}
                placeholder="Background, stakeholders, and constraints."
                disabled={isViewer || loading}
              />
            </label>

            <label style={labelStyle}>
              Scope
              <textarea
                value={form.scope}
                onChange={updateField('scope')}
                style={textAreaStyle}
                rows={3}
                placeholder="In/out of scope details."
                disabled={isViewer || loading}
              />
            </label>

            <label style={labelStyle}>
              KPI
              <textarea
                value={form.kpi}
                onChange={updateField('kpi')}
                style={textAreaStyle}
                rows={2}
                placeholder="Success metrics or KPIs."
                disabled={isViewer || loading}
              />
            </label>

            <label style={labelStyle}>
              Risks
              <textarea
                value={form.risks}
                onChange={updateField('risks')}
                style={textAreaStyle}
                rows={2}
                placeholder="Delivery, budget, or timeline risks."
                disabled={isViewer || loading}
              />
            </label>

            <label style={labelStyle}>
              Deadline
              <input
                type="date"
                value={form.deadline}
                onChange={updateField('deadline')}
                style={inputStyle}
                disabled={isViewer || loading}
              />
            </label>
          </>
        )}

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={buttonRowStyle}>
          <button type="submit" style={buttonStyle} disabled={isViewer || loading}>
            {loading ? 'Creating...' : 'Create Intent'}
          </button>
          <button
            type="button"
            style={ghostButtonStyle}
            onClick={() => router.push(`/${org.slug}/intents`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </OrgShell>
  );
}

const formStyle = {
  display: 'grid',
  gap: '1.2rem',
};

const modeRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
};

const modeButtonStyle = {
  padding: '0.5rem 1rem',
  borderRadius: '999px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  background: 'rgba(255, 255, 255, 0.7)',
  fontWeight: 600,
  cursor: 'pointer',
};

const modeActiveStyle = {
  background: '#0f3a4b',
  color: '#fff',
  borderColor: '#0f3a4b',
};

const labelStyle = {
  display: 'grid',
  gap: '0.5rem',
  fontWeight: 600,
  color: '#1f2933',
};

const textAreaStyle = {
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  padding: '0.75rem 0.9rem',
  fontSize: '0.95rem',
  resize: 'vertical' as const,
};

const inputStyle = {
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  padding: '0.65rem 0.9rem',
  fontSize: '0.95rem',
};

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'center',
};

const buttonStyle = {
  padding: '0.75rem 1.4rem',
  borderRadius: '12px',
  border: 'none',
  background: '#0f3a4b',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostButtonStyle = {
  padding: '0.7rem 1.3rem',
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  background: 'transparent',
  color: '#0f3a4b',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle = {
  color: '#b42318',
  margin: 0,
};

const noticeStyle = {
  padding: '0.9rem 1rem',
  borderRadius: '12px',
  background: 'rgba(15, 37, 54, 0.06)',
  border: '1px solid rgba(15, 37, 54, 0.18)',
  color: '#1f2933',
};

const helperStyle = {
  margin: 0,
  color: '#4b4f54',
  fontSize: '0.9rem',
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
