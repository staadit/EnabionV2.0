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

  const { userId } = req.query;
  if (!userId || Array.isArray(userId)) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const backendRes = await fetch(
    `${BACKEND_BASE}/v1/org/members/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
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
