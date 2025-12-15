import Head from 'next/head';
import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';

type HomeProps = {
  backendHealth: string | null;
  backendError: string | null;
  apiHealth: string | null;
  apiError: string | null;
  vpsHealth: string | null;
  vpsError: string | null;
};

type VpsLoad = {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  loadAvg: number[];
  mem: { total: number; free: number };
  hostname: string;
};

export default function Home({
  backendHealth,
  backendError,
  apiHealth,
  apiError,
  vpsHealth,
  vpsError,
}: HomeProps) {
  const [vpsLoad, setVpsLoad] = useState<VpsLoad | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoad = async () => {
      try {
        const res = await fetch('/api/vps-load');
        const data = (await res.json()) as VpsLoad;
        setVpsLoad(data);
        setLoadError(null);
      } catch (err: any) {
        setLoadError(err?.message ?? 'Unknown error');
      }
    };
    fetchLoad();
    const id = setInterval(fetchLoad, 30 * 60 * 1000); // every 30 minutes
    return () => clearInterval(id);
  }, []);

  const boxStyle = {
    background: '#f5f5f5',
    padding: '1rem',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap' as const,
  };

  return (
    <>
      <Head>
        <title>Enabion R1.0 - Skeleton</title>
      </Head>
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Enabion R1.0 - Intent & Pre-Sales OS (skeleton)</h1>

        <p>Backend health (proxying <code>http://localhost:4000/health</code>):</p>
        <pre style={boxStyle}>
          {backendError ? `Error: ${backendError}` : backendHealth ?? 'No response'}
        </pre>

        <p style={{ marginTop: '1.5rem' }}>API health (frontend route /api/health):</p>
        <pre style={boxStyle}>{apiError ? `Error: ${apiError}` : apiHealth ?? 'No response'}</pre>

        <p style={{ marginTop: '1.5rem' }}>VPS health (frontend route /api/vps-health):</p>
        <pre style={boxStyle}>{vpsError ? `Error: ${vpsError}` : vpsHealth ?? 'No response'}</pre>

        <p style={{ marginTop: '1.5rem' }}>VPS load (auto-refresh co 30 min):</p>
        <pre style={boxStyle}>
          {loadError
            ? `Error: ${loadError}`
            : vpsLoad
            ? formatLoadSummary(vpsLoad)
            : 'Loading...'}
        </pre>
      </main>
    </>
  );
}

function formatLoadSummary(load: VpsLoad) {
  const totalMb = load.mem.total / 1024 / 1024;
  const freeMb = load.mem.free / 1024 / 1024;
  const usedMb = totalMb - freeMb;
  const [l1, l5, l15] = load.loadAvg.map((n) => n.toFixed(2));
  const uptime = formatUptime(load.uptimeSeconds);
  return [
    `Last update: ${load.timestamp}`,
    `Host: ${load.hostname}`,
    `Uptime: ${uptime}`,
    `Load avg (1/5/15): ${l1}/${l5}/${l15}`,
    `RAM: ${usedMb.toFixed(1)} GiB used, ${freeMb.toFixed(1)} GiB free (total ${totalMb.toFixed(1)} GiB)`,
  ].join('\n');
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  const fetchText = async (url: string) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      return { text, error: null };
    } catch (err: any) {
      return { text: null, error: err?.message ?? 'Unknown error' };
    }
  };

  const backend = await fetchText('http://backend:4000/health');
  const api = await fetchText('http://localhost:3000/api/health');
  const vps = await fetchText('http://localhost:3000/api/vps-health');

  return {
    props: {
      backendHealth: backend.text,
      backendError: backend.error,
      apiHealth: api.text,
      apiError: api.error,
      vpsHealth: vps.text,
      vpsError: vps.error,
    },
  };
};
