export type ShareLink = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revokedByUserId?: string | null;
  accessCount: number;
  lastAccessAt?: string | null;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listShareLinks(
  cookie: string | undefined,
  intentId: string,
): Promise<ShareLink[]> {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/share-links`,
      { headers: { cookie: cookie ?? '' } },
    );
    if (!res.ok) return [];
    const data = await readJson<{ items?: ShareLink[] }>(res);
    return data?.items ?? [];
  } catch {
    return [];
  }
}

export async function createShareLink(
  cookie: string | undefined,
  intentId: string,
): Promise<{ token: string; shareUrl: string; expiresAt: string } | null> {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/share-links`,
      {
        method: 'POST',
        headers: { cookie: cookie ?? '', 'content-type': 'application/json' },
        body: '{}',
      },
    );
    if (!res.ok) return null;
    return await readJson(res);
  } catch {
    return null;
  }
}

export async function revokeShareLink(
  cookie: string | undefined,
  intentId: string,
  shareLinkId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/share-links/${encodeURIComponent(shareLinkId)}/revoke`,
      { method: 'POST', headers: { cookie: cookie ?? '' } },
    );
    return res.ok;
  } catch {
    return false;
  }
}
