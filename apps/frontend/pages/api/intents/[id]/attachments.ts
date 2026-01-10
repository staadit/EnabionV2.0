import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

export const config = {
  api: {
    bodyParser: false,
  },
};

function toJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || 'Unexpected response' };
  }
}

function buildBackendUrl(intentId: string, req: NextApiRequest) {
  const params = new URLSearchParams();
  const suffix = params.toString() ? `?${params}` : '';
  return `${BACKEND_BASE}/v1/intents/${encodeURIComponent(intentId)}/attachments${suffix}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    res.status(400).json({ error: 'Intent id is required' });
    return;
  }

  const url = buildBackendUrl(id, req);
  const headers: Record<string, string> = {};
  if (req.headers.cookie) {
    headers.cookie = req.headers.cookie;
  }
  if (req.method === 'POST') {
    if (req.headers['content-type']) {
      headers['content-type'] = String(req.headers['content-type']);
    }
    if (req.headers['content-length']) {
      headers['content-length'] = String(req.headers['content-length']);
    }
  }

  const init: any = {
    method: req.method,
    headers,
    body: req.method === 'POST' ? req : undefined,
  };
  if (req.method === 'POST') {
    init.duplex = 'half';
  }
  const backendRes = await fetch(url, init);

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
