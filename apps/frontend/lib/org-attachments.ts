export type IntentAttachment = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hex: string;
  confidentialityLevel: string;
  createdAt: string;
  uploadedBy?: { id: string; email: string; name?: string | null } | null;
  canDownload: boolean;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

export async function fetchIntentAttachments(
  cookie: string | undefined,
  intentId: string,
): Promise<IntentAttachment[]> {
  const url = `${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/attachments`;
  try {
    const res = await fetch(url, { headers: { cookie: cookie ?? '' } });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const items: Array<Record<string, any>> = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : [];
    return items.map((row) => ({
      id: String(row.id ?? ''),
      originalName: String(row.originalName ?? row.filename ?? 'attachment'),
      mimeType: String(row.mimeType ?? 'application/octet-stream'),
      sizeBytes: Number(row.sizeBytes ?? 0),
      sha256Hex: String(row.sha256Hex ?? ''),
      confidentialityLevel: String(row.confidentialityLevel ?? 'L1'),
      createdAt: String(row.createdAt ?? ''),
      uploadedBy: row.uploadedBy
        ? {
            id: String(row.uploadedBy.id ?? ''),
            email: String(row.uploadedBy.email ?? ''),
            name: row.uploadedBy.name ?? null,
          }
        : null,
      canDownload: Boolean(row.canDownload),
    }));
  } catch {
    return [];
  }
}
