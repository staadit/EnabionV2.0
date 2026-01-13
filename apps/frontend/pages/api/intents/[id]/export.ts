import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND = process.env.BACKEND_URL || 'http://backend:4000';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const intentId = req.query.id;
  const format = typeof req.query.format === 'string' ? req.query.format : 'md';
  if (typeof intentId !== 'string') {
    res.status(400).json({ error: 'Missing intent id' });
    return;
  }
  const target = `${BACKEND}/v1/intents/${encodeURIComponent(intentId)}/export?format=${encodeURIComponent(format)}`;
  try {
    const backendRes = await fetch(target, {
      method: 'GET',
      headers: { cookie: req.headers.cookie || '' },
    });
    const buffer = Buffer.from(await backendRes.arrayBuffer());
    res.status(backendRes.status);
    const contentType = backendRes.headers.get('content-type');
    const contentDisposition = backendRes.headers.get('content-disposition');
    if (contentType) res.setHeader('content-type', contentType);
    if (contentDisposition) res.setHeader('content-disposition', contentDisposition);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Export proxy failed' });
  }
}
