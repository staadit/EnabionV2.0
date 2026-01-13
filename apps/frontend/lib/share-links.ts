export type ShareLink = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revokedByUserId?: string | null;
  accessCount: number;
  lastAccessAt?: string | null;
};

const BACKEND_BASE = '';

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
    const headers: Record<string, string> = {};
    const fetchInit: RequestInit = {};
    if (cookie) {
      headers.cookie = cookie;
    } else {
      fetchInit.credentials = 'include';
    }
    const res = await fetch(
      `${BACKEND_BASE}/api/intents/${encodeURIComponent(intentId)}/share-links`,
      { headers, ...fetchInit },
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
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const fetchInit: RequestInit = { method: 'POST', headers };
    if (cookie) {
      headers.cookie = cookie;
    } else {
      fetchInit.credentials = 'include';
    }
    const res = await fetch(
      `${BACKEND_BASE}/api/intents/${encodeURIComponent(intentId)}/share-links`,
      { ...fetchInit, body: '{}' },
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
    const headers: Record<string, string> = {};
    const fetchInit: RequestInit = { method: 'POST', headers };
    if (cookie) {
      headers.cookie = cookie;
    } else {
      fetchInit.credentials = 'include';
    }
    const res = await fetch(
      `${BACKEND_BASE}/api/intents/${encodeURIComponent(intentId)}/share-links/${encodeURIComponent(shareLinkId)}/revoke`,
      fetchInit,
    );
    return res.ok;
  } catch {
    return false;
  }
}
