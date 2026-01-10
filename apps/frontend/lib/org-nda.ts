export type NdaCurrent = {
  ndaVersion: string;
  enHashSha256: string;
  enMarkdown: string;
  summaryMarkdown: string;
};

export type NdaAcceptance = {
  id: string;
  ndaVersion: string;
  enHashSha256: string;
  acceptedAt: string;
  acceptedByUserId: string;
  language: string;
  channel: string;
  typedName: string;
  typedRole: string;
  counterpartyOrgId?: string;
};

export type NdaStatus = {
  accepted: boolean;
  acceptance?: NdaAcceptance;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

export async function fetchNdaCurrent(
  cookie: string | undefined,
  language?: string,
): Promise<NdaCurrent | null> {
  const params = new URLSearchParams();
  if (language) params.set('lang', language);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BACKEND_BASE}/v1/nda/mutual/current${suffix}`, {
    headers: { cookie: cookie ?? '' },
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function fetchNdaStatus(
  cookie: string | undefined,
  counterpartyOrgId?: string,
): Promise<NdaStatus | null> {
  const params = new URLSearchParams();
  if (counterpartyOrgId) params.set('counterpartyOrgId', counterpartyOrgId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BACKEND_BASE}/v1/nda/mutual/status${suffix}`, {
    headers: { cookie: cookie ?? '' },
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}
