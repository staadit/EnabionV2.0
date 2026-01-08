export type OrgIntent = {
  id: string;
  goal: string;
  stage: string;
  deadlineAt?: string | null;
  createdAt?: string | null;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

export async function fetchOrgIntents(
  cookie: string,
  options?: { stage?: string; limit?: number },
): Promise<OrgIntent[]> {
  const params = new URLSearchParams();
  if (options?.stage) params.set('stage', options.stage);
  if (options?.limit) params.set('limit', String(options.limit));

  const url = `${BACKEND_BASE}/intents${params.toString() ? `?${params}` : ''}`;

  try {
    const res = await fetch(url, { headers: { cookie } });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const intents = Array.isArray(data?.intents) ? data.intents : data;
    if (!Array.isArray(intents)) {
      return [];
    }
    return intents.map((row) => ({
      id: String(row.id ?? ''),
      goal: String(row.goal ?? ''),
      stage: String(row.stage ?? ''),
      deadlineAt: row.deadlineAt ?? null,
      createdAt: row.createdAt ?? null,
    }));
  } catch {
    return [];
  }
}
