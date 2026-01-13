import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.BACKEND_URL || 'http://backend:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const intentId = req.query.id;
  const shareLinkId = req.query.shareLinkId;
  if (typeof intentId !== 'string' || typeof shareLinkId !== 'string') {
    res.status(400).json({ error: 'Missing ids' });
    return;
  }
  const target = `${BACKEND}/v1/intents/${encodeURIComponent(intentId)}/share-links/${encodeURIComponent(shareLinkId)}/revoke`;
  try {
    const backendRes = await fetch(target, {
      method: 'POST',
      headers: { cookie: req.headers.cookie || '' },
    });
    const text = await backendRes.text();
    res.status(backendRes.status);
    const contentType = backendRes.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: 'Revoke proxy failed' });
  }
}
