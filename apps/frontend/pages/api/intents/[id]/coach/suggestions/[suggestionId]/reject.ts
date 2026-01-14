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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const intentId = typeof req.query.id === 'string' ? req.query.id : null;
  const suggestionId =
    typeof req.query.suggestionId === 'string' ? req.query.suggestionId : null;
  if (!intentId || !suggestionId) {
    res.status(400).json({ error: 'Missing intent or suggestion id' });
    return;
  }

  const backendRes = await fetch(
    `${BACKEND_BASE}/intents/${encodeURIComponent(intentId)}/coach/suggestions/${encodeURIComponent(
      suggestionId,
    )}/reject`,
    {
      method: 'POST',
      headers: {
        cookie: req.headers.cookie ?? '',
        'content-type': 'application/json',
      },
      body: JSON.stringify(req.body ?? {}),
    },
  );

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
