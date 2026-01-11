import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'node:stream';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

function buildBackendUrl(id: string, req: NextApiRequest) {
  const params = new URLSearchParams();
  ['asInline'].forEach((key) => {
    const value = req.query[key];
    if (typeof value === 'string') {
      params.append(key, value);
    }
  });
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `${BACKEND_BASE}/v1/attachments/${encodeURIComponent(id)}${suffix}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: 'Attachment id is required' });
    return;
  }

  const backendUrl = buildBackendUrl(id, req);
  const headers: Record<string, string> = {};
  if (req.headers.cookie) {
    headers.cookie = req.headers.cookie;
  }
  const backendRes = await fetch(backendUrl, { headers });
  const contentType = backendRes.headers.get('content-type') || '';

  // JSON path (signed URL / metadata)
  if (contentType.includes('application/json')) {
    const data = await backendRes.json();
    if (data.signedUrl) {
      if (data.expiresAt) {
        res.setHeader('X-Signed-Url-Expires-At', data.expiresAt);
      }
      res.status(307).setHeader('Location', data.signedUrl);
      res.end();
      return;
    }
    res.status(backendRes.status).json(data);
    return;
  }

  // Stream path (local driver or encrypted blobs)
  res.status(backendRes.status);
  ['content-type', 'content-disposition', 'content-length'].forEach((header) => {
    const value = backendRes.headers.get(header);
    if (value) {
      res.setHeader(header, value);
    }
  });

  const body = backendRes.body;
  if (!body) {
    res.end();
    return;
  }
  const nodeStream = typeof (body as any).pipe === 'function' ? (body as any) : Readable.fromWeb(body as any);
  nodeStream.pipe(res);
}
