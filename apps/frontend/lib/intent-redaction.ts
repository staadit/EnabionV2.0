export type IntentRedactionView = {
  id: string;
  title: string | null;
  goal: string;
  client: string | null;
  stage: string;
  language: string;
  lastActivityAt: string;
  sourceTextRaw: string | null;
  hasL2: boolean;
  l2Redacted: boolean;
  ndaRequired: boolean;
};

export type AttachmentRedactionView = {
  id: string;
  originalName: string;
  sizeBytes: number;
  confidentialityLevel: string;
  createdAt: string;
  canDownload: boolean;
};

export type ShareIntentPayload = {
  intent: IntentRedactionView;
  attachments: AttachmentRedactionView[];
};

export type ExportIntentPayload = {
  intent: IntentRedactionView;
  markdown: string;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchShareIntent(token: string): Promise<ShareIntentPayload | null> {
  if (!token) return null;
  const url = `${BACKEND_BASE}/v1/share/${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await readJson<ShareIntentPayload>(res);
  } catch {
    return null;
  }
}

export async function fetchIncomingIntent(
  cookie: string | undefined,
  intentId: string,
): Promise<ShareIntentPayload | null> {
  if (!intentId) return null;
  const url = `${BACKEND_BASE}/v1/incoming-intents/${encodeURIComponent(intentId)}`;
  try {
    const res = await fetch(url, { headers: { cookie: cookie ?? '' } });
    if (!res.ok) return null;
    return await readJson<ShareIntentPayload>(res);
  } catch {
    return null;
  }
}

export async function fetchIntentExport(
  cookie: string | undefined,
  intentId: string,
): Promise<ExportIntentPayload | null> {
  if (!intentId) return null;
  const url = `${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/export`;
  try {
    const res = await fetch(url, { headers: { cookie: cookie ?? '' } });
    if (!res.ok) return null;
    return await readJson<ExportIntentPayload>(res);
  } catch {
    return null;
  }
}
