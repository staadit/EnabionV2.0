import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

function toJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || 'Unexpected response' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const headers: Record<string, string> = { cookie: req.headers.cookie ?? '' };
  if (req.method === 'POST') {
    headers['content-type'] = 'application/json';
  }

  const backendRes = await fetch(`${BACKEND_BASE}/platform-admin/nda`, {
    method: req.method,
    headers,
    body: req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined,
  });

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
