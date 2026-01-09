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
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const intentId = req.query.id;
  if (!intentId || Array.isArray(intentId)) {
    res.status(400).json({ error: 'Intent id is required' });
    return;
  }

  const backendRes = await fetch(`${BACKEND_BASE}/intents/${intentId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      cookie: req.headers.cookie ?? '',
    },
    body: JSON.stringify(req.body ?? {}),
  });

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
