import Head from 'next/head';
import { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import SettingsLayout from '../../components/SettingsLayout';
import { getAdminLabels } from '../../lib/admin-i18n';
import { getOwnerContext, type AdminOrg, type AdminUser } from '../../lib/admin-server';

type Member = {
  id: string;
  email: string;
  role: string;
  deactivatedAt?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
};

type MembersProps = {
  user: AdminUser;
  org: AdminOrg;
  members: Member[];
};

function parseError(payload: any) {
  const message = Array.isArray(payload?.message)
    ? payload.message.join('; ')
    : payload?.message || payload?.error;
  return message || '';
}

export default function MembersSettings({ user, org, members: initial }: MembersProps) {
  const [members, setMembers] = useState<Member[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Viewer');
  const [adding, setAdding] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const labels = getAdminLabels(org.defaultLanguage);
  const trimmedEmail = newEmail.trim().toLowerCase();

  const activeOwners = useMemo(
    () => members.filter((m) => m.role === 'Owner' && !m.deactivatedAt).length,
    [members],
  );

  const updateMember = (updated: Member) => {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
  };

  const onRoleChange = async (memberId: string, role: string) => {
    setSavingId(memberId);
    setError(null);
    try {
      const res = await fetch(`/api/org/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(parseError(data) || labels.commonRequestFailed);
      }
      updateMember(data.member);
    } catch (err: any) {
      setError(err?.message ?? labels.commonRequestFailed);
    } finally {
      setSavingId(null);
    }
  };

  const onDeactivate = async (memberId: string) => {
    if (!window.confirm(labels.membersDeactivateConfirm)) {
      return;
    }
    setSavingId(memberId);
    setError(null);
    try {
      const res = await fetch(`/api/org/members/${memberId}/deactivate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(parseError(data) || labels.commonRequestFailed);
      }
      updateMember(data.member);
    } catch (err: any) {
      setError(err?.message ?? labels.commonRequestFailed);
    } finally {
      setSavingId(null);
    }
  };

  const onAddMember = async () => {
    if (!trimmedEmail) {
      return;
    }
    setAdding(true);
    setError(null);
    setAddSuccess(false);
    setResetLink(null);
    try {
      const res = await fetch('/api/org/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(parseError(data) || labels.commonRequestFailed);
      }
      if (data?.user) {
        setMembers((prev) => [...prev, data.user]);
      }
      setNewEmail('');
      setNewRole('Viewer');
      setAddSuccess(true);
      if (data?.resetToken && typeof window !== 'undefined') {
        setResetLink(`${window.location.origin}/reset/confirm?token=${data.resetToken}`);
      }
    } catch (err: any) {
      setError(err?.message ?? labels.commonRequestFailed);
    } finally {
      setAdding(false);
    }
  };

  return (
    <SettingsLayout user={user} org={org} active="members" labels={labels}>
      <Head>
        <title>{labels.settingsTitle} - {labels.navMembers}</title>
      </Head>

      <div style={headerRowStyle}>
        <h2 style={{ margin: 0 }}>{labels.membersTitle}</h2>
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => {
            setShowAdd(true);
            setAddSuccess(false);
            setResetLink(null);
            setError(null);
          }}
        >
          {labels.membersAdd}
        </button>
      </div>
      {error ? <p style={errorStyle}>{labels.commonErrorPrefix} {error}</p> : null}

      {showAdd ? (
        <div style={inviteCardStyle}>
          <div style={formRowStyle}>
            <label style={formLabelStyle}>
              {labels.membersEmail}
              <input
                type="email"
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  setAddSuccess(false);
                  setResetLink(null);
                }}
                style={inputStyle}
              />
            </label>

            <label style={formLabelStyle}>
              {labels.membersRole}
              <select
                value={newRole}
                onChange={(event) => {
                  setNewRole(event.target.value);
                  setAddSuccess(false);
                  setResetLink(null);
                }}
                style={selectStyle}
              >
                <option value="Owner">Owner</option>
                <option value="BD_AM">BD/AM</option>
                <option value="Viewer">Viewer</option>
              </select>
            </label>

            <div style={formActionsStyle}>
              <button
                type="button"
                style={{ ...primaryButtonStyle, opacity: trimmedEmail ? 1 : 0.6 }}
                disabled={!trimmedEmail || adding}
                onClick={onAddMember}
              >
                {adding ? labels.commonSaving : labels.membersAddSubmit}
              </button>
              <button
                type="button"
                style={ghostButtonStyle}
                onClick={() => {
                  setShowAdd(false);
                  setNewEmail('');
                  setNewRole('Viewer');
                  setAddSuccess(false);
                  setResetLink(null);
                }}
              >
                {labels.membersAddCancel}
              </button>
            </div>
          </div>

          {addSuccess ? <p style={successStyle}>{labels.membersAddSuccess}</p> : null}
          {resetLink ? (
            <div style={noteStyle}>
              <p style={noteLabelStyle}>{labels.membersResetLink}</p>
              <code style={codeStyle}>{resetLink}</code>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>{labels.membersEmail}</th>
              <th style={thStyle}>{labels.membersRole}</th>
              <th style={thStyle}>{labels.membersStatus}</th>
              <th style={thStyle}>{labels.membersActions}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isOwner = member.role === 'Owner';
              const isDeactivated = Boolean(member.deactivatedAt);
              const isLastOwner = isOwner && !isDeactivated && activeOwners <= 1;
              const isSelf = member.id === user.id;
              const disableRoleChange = isDeactivated || (isLastOwner && isSelf);
              const disableDeactivate = isDeactivated || isLastOwner;

              return (
                <tr key={member.id}>
                  <td style={tdStyle}>{member.email}</td>
                  <td style={tdStyle}>
                    <select
                      value={member.role}
                      onChange={(event) => onRoleChange(member.id, event.target.value)}
                      disabled={disableRoleChange || savingId === member.id}
                      style={selectStyle}
                      title={isLastOwner && isSelf ? labels.membersLastOwner : ''}
                    >
                      <option value="Owner">Owner</option>
                      <option value="BD_AM">BD/AM</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    {isDeactivated ? labels.membersDeactivated : labels.membersActive}
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={{
                        ...ghostButtonStyle,
                        opacity: disableDeactivate ? 0.5 : 1,
                      }}
                      disabled={disableDeactivate || savingId === member.id}
                      onClick={() => onDeactivate(member.id)}
                      title={isLastOwner ? labels.membersLastOwner : ''}
                    >
                      {labels.membersDeactivate}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SettingsLayout>
  );
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '0.95rem',
};

const headerRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  flexWrap: 'wrap' as const,
  marginBottom: '1rem',
};

const inviteCardStyle = {
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  marginBottom: '1.5rem',
};

const formRowStyle = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '0.75rem',
  alignItems: 'flex-end',
};

const formLabelStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '0.4rem',
  fontWeight: 600,
  flex: '1 1 220px',
};

const formActionsStyle = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap' as const,
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem',
  borderBottom: '1px solid var(--border)',
};

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid var(--border)',
};

const selectStyle = {
  padding: '0.4rem 0.6rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
};

const inputStyle = {
  padding: '0.5rem 0.65rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
};

const primaryButtonStyle = {
  padding: '0.55rem 0.9rem',
  borderRadius: '8px',
  border: 'none',
  background: 'var(--gradient-primary)',
  color: 'var(--text-on-brand)',
  boxShadow: 'var(--shadow)',
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostButtonStyle = {
  padding: '0.4rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  cursor: 'pointer',
};

const errorStyle = {
  color: 'var(--danger)',
};

const successStyle = {
  color: 'var(--success)',
  marginTop: '0.75rem',
  marginBottom: 0,
};

const noteStyle = {
  marginTop: '0.75rem',
  padding: '0.6rem 0.75rem',
  borderRadius: '10px',
  border: '1px dashed var(--border)',
  background: 'var(--surface)',
};

const noteLabelStyle = {
  margin: 0,
  fontSize: '0.85rem',
  color: 'var(--muted)',
};

const codeStyle = {
  display: 'block',
  marginTop: '0.35rem',
  fontSize: '0.85rem',
  wordBreak: 'break-all' as const,
};

export const getServerSideProps: GetServerSideProps<MembersProps> = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  return {
    redirect: {
      destination: `/${result.context!.org.slug}/settings/members`,
      permanent: false,
    },
  };
};
