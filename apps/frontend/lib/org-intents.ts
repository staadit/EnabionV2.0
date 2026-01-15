export type OrgIntent = {
  id: string;
  intentName?: string | null;
  shortId?: string | null;
  goal: string;
  title?: string | null;
  client?: string | null;
  status?: string | null;
  stage: string;
  ownerUserId?: string | null;
  owner?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
  language?: string | null;
  lastActivityAt?: string | null;
  source?: string | null;
  deadlineAt?: string | null;
  createdAt?: string | null;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

export async function fetchOrgIntents(
  cookie: string,
  options?: {
    stage?: string;
    status?: string[];
    ownerId?: string;
    language?: string;
    q?: string;
    from?: string;
    to?: string;
    sort?: string;
    order?: string;
    cursor?: string;
    limit?: number;
  },
): Promise<{ items: OrgIntent[]; nextCursor?: string | null }> {
  const params = new URLSearchParams();
  if (options?.stage) params.set('stage', options.stage);
  if (options?.status?.length) {
    options.status.forEach((value) => params.append('status', value));
  }
  if (options?.ownerId) params.set('ownerId', options.ownerId);
  if (options?.language) params.set('language', options.language);
  if (options?.q) params.set('q', options.q);
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.order) params.set('order', options.order);
  if (options?.cursor) params.set('cursor', options.cursor);
  if (options?.limit) params.set('limit', String(options.limit));

  const url = `${BACKEND_BASE}/intents${params.toString() ? `?${params}` : ''}`;

  try {
    const res = await fetch(url, { headers: { cookie } });
    if (!res.ok) {
      return { items: [] };
    }
    const data = await res.json();
    const intents = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.intents)
        ? data.intents
        : Array.isArray(data)
          ? data
          : [];
    if (!Array.isArray(intents)) {
      return { items: [] };
    }
    const items = intents.map((row) => ({
      id: String(row.id ?? ''),
      intentName: row.intentName ?? null,
      shortId: row.shortId ?? null,
      goal: String(row.goal ?? ''),
      title: row.title ?? null,
      client: row.client ?? null,
      status: row.status ?? row.stage ?? null,
      stage: String(row.stage ?? row.status ?? ''),
      ownerUserId: row.ownerUserId ?? null,
      owner: row.owner
        ? {
            id: String(row.owner.id ?? ''),
            email: String(row.owner.email ?? ''),
            name: row.owner.name ?? null,
          }
        : null,
      language: row.language ?? null,
      lastActivityAt: row.lastActivityAt ?? null,
      source: row.source ?? null,
      deadlineAt: row.deadlineAt ?? null,
      createdAt: row.createdAt ?? null,
    }));
    return { items, nextCursor: data?.nextCursor ?? null };
  } catch {
    return { items: [] };
  }
}
