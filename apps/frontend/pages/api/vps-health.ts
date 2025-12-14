import os from 'os';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'ok',
    hostname: os.hostname(),
    timestamp: new Date().toISOString(),
  });
}
