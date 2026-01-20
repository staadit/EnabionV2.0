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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const intentId = typeof req.query.intentId === 'string' ? req.query.intentId : '';
  const params = new URLSearchParams();
  if (intentId) params.set('intentId', intentId);

  const backendRes = await fetch(
    `${BACKEND_BASE}/v1/avatars/system/dashboard${params.toString() ? `?${params}` : ''}`,
    {
      headers: { cookie: req.headers.cookie ?? '' },
    },
  );

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
