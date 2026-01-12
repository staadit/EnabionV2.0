import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.BACKEND_URL || 'http://backend:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const intentId = req.query.id;
  if (typeof intentId !== 'string') {
    res.status(400).json({ error: 'Missing intent id' });
    return;
  }
  const target = `${BACKEND}/v1/intents/${encodeURIComponent(intentId)}/share-links`;
  try {
    const backendRes = await fetch(target, {
      method: req.method,
      headers: {
        cookie: req.headers.cookie || '',
        'content-type': 'application/json',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined,
    });
    const text = await backendRes.text();
    res.status(backendRes.status);
    const contentType = backendRes.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: 'Share link proxy failed' });
  }
}
