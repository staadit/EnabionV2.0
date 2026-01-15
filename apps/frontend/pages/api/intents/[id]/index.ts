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
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    res.setHeader('Allow', 'GET, PATCH');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const intentId = req.query.id;
  if (!intentId || Array.isArray(intentId)) {
    res.status(400).json({ error: 'Intent id is required' });
    return;
  }

  const target =
    req.method === 'GET'
      ? `${BACKEND_BASE}/v1/intents/${intentId}`
      : `${BACKEND_BASE}/intents/${intentId}`;
  const headers: Record<string, string> = {
    cookie: req.headers.cookie ?? '',
  };
  if (req.method === 'PATCH') {
    headers['content-type'] = 'application/json';
  }
  const backendRes = await fetch(target, {
    method: req.method,
    headers,
    body: req.method === 'PATCH' ? JSON.stringify(req.body ?? {}) : undefined,
  });

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
