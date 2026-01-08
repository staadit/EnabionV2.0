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
  let url = `${BACKEND_BASE}/intents`;
  let body: string | undefined;

  if (req.method === 'GET') {
    const params = new URLSearchParams();
    if (typeof req.query.stage === 'string') {
      params.set('stage', req.query.stage);
    }
    if (typeof req.query.limit === 'string') {
      params.set('limit', req.query.limit);
    }
    url = params.toString() ? `${url}?${params}` : url;
  } else {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(req.body ?? {});
  }

  const backendRes = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
