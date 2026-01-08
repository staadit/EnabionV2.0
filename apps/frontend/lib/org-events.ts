export type OrgEvent = {
  id: string;
  type: string;
  occurredAt: string;
  subjectType?: string | null;
  subjectId?: string | null;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

export async function fetchOrgEvents(
  cookie: string,
  options?: { limit?: number; type?: string; subjectId?: string },
): Promise<OrgEvent[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.type) params.set('type', options.type);
  if (options?.subjectId) params.set('subjectId', options.subjectId);

  const url = `${BACKEND_BASE}/events${params.toString() ? `?${params}` : ''}`;

  try {
    const res = await fetch(url, { headers: { cookie } });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((row) => ({
      id: String(row.id ?? ''),
      type: String(row.type ?? ''),
      occurredAt: String(row.occurredAt ?? ''),
      subjectType: row.subjectType ?? null,
      subjectId: row.subjectId ?? null,
    }));
  } catch {
    return [];
  }
}
