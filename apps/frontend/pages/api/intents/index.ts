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
    const addParam = (key: string, value: string | string[] | undefined) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string' && item.trim()) {
            params.append(key, item);
          }
        });
        return;
      }
      if (typeof value === 'string' && value.trim()) {
        params.append(key, value);
      }
    };

    addParam('stage', typeof req.query.stage === 'string' ? req.query.stage : undefined);
    addParam('status', req.query.status as string | string[] | undefined);
    addParam('status', req.query['status[]'] as string | string[] | undefined);
    addParam('ownerId', typeof req.query.ownerId === 'string' ? req.query.ownerId : undefined);
    addParam('language', typeof req.query.language === 'string' ? req.query.language : undefined);
    addParam('from', typeof req.query.from === 'string' ? req.query.from : undefined);
    addParam('to', typeof req.query.to === 'string' ? req.query.to : undefined);
    addParam('q', typeof req.query.q === 'string' ? req.query.q : undefined);
    addParam('sort', typeof req.query.sort === 'string' ? req.query.sort : undefined);
    addParam('order', typeof req.query.order === 'string' ? req.query.order : undefined);
    addParam('cursor', typeof req.query.cursor === 'string' ? req.query.cursor : undefined);
    addParam('limit', typeof req.query.limit === 'string' ? req.query.limit : undefined);
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
