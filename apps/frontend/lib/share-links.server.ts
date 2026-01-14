import type { ShareLink } from './share-links';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listShareLinksServer(
  cookie: string | undefined,
  intentId: string,
): Promise<ShareLink[]> {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/share-links`,
      {
        headers: { cookie: cookie ?? '' },
      },
    );
    if (!res.ok) return [];
    const data = await readJson<{ items?: ShareLink[] }>(res);
    return data?.items ?? [];
  } catch {
    return [];
  }
}
