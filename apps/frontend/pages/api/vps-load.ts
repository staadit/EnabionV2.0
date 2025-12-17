import os from 'os';
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const now = new Date().toISOString();
  res.status(200).json({
    status: 'ok',
    timestamp: now,
    uptimeSeconds: os.uptime(),
    loadAvg: os.loadavg(), // 1, 5, 15 minute averages
    mem: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    hostname: os.hostname(),
  });
}
