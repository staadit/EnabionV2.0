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

  const labels = getAdminLabels(org.defaultLanguage);

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

  return (
    <SettingsLayout user={user} org={org} active="members" labels={labels}>
      <Head>
        <title>{labels.settingsTitle} • {labels.navMembers}</title>
      </Head>

      <h2 style={{ marginTop: 0 }}>{labels.membersTitle}</h2>
      {error ? <p style={errorStyle}>{labels.commonErrorPrefix} {error}</p> : null}

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

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.12)',
};

const tdStyle = {
  padding: '0.75rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.08)',
};

const selectStyle = {
  padding: '0.4rem 0.6rem',
  borderRadius: '8px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
};

const ghostButtonStyle = {
  padding: '0.4rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid rgba(15, 37, 54, 0.2)',
  background: 'transparent',
  cursor: 'pointer',
};

const errorStyle = {
  color: '#b42318',
};

export const getServerSideProps: GetServerSideProps<MembersProps> = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const { user, org, cookie } = result.context!;
  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  const res = await fetch(`${backendBase}/v1/org/members`, {
    headers: { cookie },
  });
  if (!res.ok) {
    return { redirect: { destination: '/', permanent: false } };
  }
  const data = await res.json();
  return {
    props: {
      user,
      org,
      members: data.members || [],
    },
  };
};
