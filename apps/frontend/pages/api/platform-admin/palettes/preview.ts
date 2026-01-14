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
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const backendRes = await fetch(`${BACKEND_BASE}/platform-admin/palettes/preview`, {
    method: 'DELETE',
    headers: { cookie: req.headers.cookie ?? '' },
  });

  const setCookie = backendRes.headers.get('set-cookie');
  if (setCookie) {
    res.setHeader('Set-Cookie', setCookie);
  }

  const text = await backendRes.text();
  res.status(backendRes.status).json(toJson(text));
}
