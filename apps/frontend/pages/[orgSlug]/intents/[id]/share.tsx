
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import OrgShell from '../../../../components/OrgShell';
import { getXNavItems } from '../../../../lib/org-nav';
import { requireOrgContext, type OrgInfo, type OrgUser } from '../../../../lib/org-context';
import {
  createShareLink,
  listShareLinks,
  revokeShareLink,
  type ShareLink,
} from '../../../../lib/share-links';
import { useEffect, useState } from 'react';
import { formatDateTime } from '../../../../lib/date-format';

type IntentTabProps = {
  user: OrgUser;
  org: OrgInfo;
  intentId: string;
  links: ShareLink[];
};

export default function Share({ user, org, intentId, links: initialLinks }: IntentTabProps) {
  const [links, setLinks] = useState(initialLinks);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(`share:url:${intentId}`);
    if (stored) {
      setShareUrl(stored);
    }
    // Always refresh list client-side to ensure we show history with session cookie.
    listShareLinks(undefined, intentId).then((items) => setLinks(items));
  }, [intentId]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await createShareLink(undefined, intentId);
      if (!res) {
        setError('Failed to create share link');
        return;
      }
      const shareUrl = `${window.location.origin}/share/intent/${res.token}`;
      setShareUrl(shareUrl);
      window.localStorage.setItem(`share:url:${intentId}`, shareUrl);
      const refreshed = await listShareLinks(undefined, intentId);
      setLinks(refreshed);
    } catch {
      setError('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    const ok = await revokeShareLink(undefined, intentId, id);
    if (!ok) {
      setError('Failed to revoke link');
      return;
    }
    const refreshed = await listShareLinks(undefined, intentId);
    setLinks(refreshed);
  };

  return (
    <OrgShell
      user={user}
      org={org}
      title="Share"
      subtitle="Generate and manage L1 share links."
      navItems={getXNavItems(org.slug, 'intents')}
    >
      <Head>
        <title>{org.name} - Share</title>
      </Head>
      <div style={cardStyle}>
        <p style={{ marginTop: 0, fontWeight: 600 }}>Generate share link (L1-only)</p>
        <p style={{ margin: '0 0 1rem', color: '#4b5c6b' }}>
          Default TTL: 14 days. Creating a new link revokes the previous one.
        </p>
        <button style={primaryButton} onClick={handleCreate} disabled={creating}>
          {creating ? 'Generating...' : 'Generate share link'}
        </button>
        {error ? <p style={errorStyle}>{error}</p> : null}
        {shareUrl ? (
          <div style={tokenBox}>
            <div style={labelStyle}>Share URL</div>
            <code style={tokenValue}>{shareUrl}</code>
          </div>
        ) : links.length === 0 ? (
          <p style={mutedStyle}>Share URL was not created yet.</p>
        ) : null}
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Share links</h3>
        {links.length ? (
          <div style={tableCardStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Expires</th>
                  <th style={thStyle}>Accesses</th>
                  <th style={thStyle}>Last access</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const revoked = Boolean(link.revokedAt);
                  const expired = new Date(link.expiresAt).getTime() < Date.now();
                  const status = revoked ? 'Revoked' : expired ? 'Expired' : 'Active';
                  return (
                    <tr key={link.id}>
                      <td style={tdStyle}>{formatDateTime(link.createdAt)}</td>
                      <td style={tdStyle}>{formatDateTime(link.expiresAt)}</td>
                      <td style={tdStyle}>{link.accessCount}</td>
                      <td style={tdStyle}>{link.lastAccessAt ? formatDateTime(link.lastAccessAt) : '-'}</td>
                      <td style={tdStyle}>{status}</td>
                      <td style={tdStyle}>
                        {!revoked && !expired ? (
                          <button style={textButton} onClick={() => handleRevoke(link.id)}>
                            Revoke
                          </button>
                        ) : (
                          <span style={mutedStyle}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={mutedStyle}>Share URL was not created yet.</p>
        )}
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

const primaryButton = {
  borderRadius: '999px',
  border: 'none',
  padding: '0.55rem 1.1rem',
  background: '#0f2536',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const textButton = {
  border: 'none',
  background: 'none',
  color: '#b42318',
  fontWeight: 600,
  cursor: 'pointer',
};

const tokenBox = {
  marginTop: '1rem',
  padding: '0.75rem 0.9rem',
  borderRadius: '10px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: '#fff',
  wordBreak: 'break-all' as const,
};

const tokenValue = {
  display: 'block',
  marginTop: '0.35rem',
};

const errorStyle = {
  marginTop: '0.75rem',
  color: '#b42318',
  fontWeight: 600,
};

const sectionStyle = {
  marginTop: '2rem',
};

const sectionTitleStyle = {
  margin: '0 0 1rem',
  fontSize: '1.1rem',
};

const tableCardStyle = {
  borderRadius: '12px',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  background: '#fff',
  overflow: 'hidden',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const thStyle = {
  textAlign: 'left' as const,
  padding: '0.75rem 1rem',
  fontSize: '0.85rem',
  color: '#6b7785',
  borderBottom: '1px solid rgba(15, 37, 54, 0.12)',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid rgba(15, 37, 54, 0.08)',
  fontSize: '0.95rem',
};

const labelStyle = {
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: '#6b7785',
};

const mutedStyle = {
  margin: 0,
  color: '#6b7785',
};

export const getServerSideProps: GetServerSideProps<IntentTabProps> = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const intentId = typeof ctx.params?.id === 'string' ? ctx.params.id : 'intent';
  const links = await listShareLinks(ctx.req.headers.cookie, intentId);
  return {
    props: {
      user: result.context!.user,
      org: result.context!.org,
      intentId,
      links,
    },
  };
};
