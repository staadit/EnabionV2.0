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
            ? `Last update: ${vpsLoad.timestamp}
Host: ${vpsLoad.hostname}
Uptime (s): ${vpsLoad.uptimeSeconds}
Load avg (1/5/15): ${vpsLoad.loadAvg.map((n) => n.toFixed(2)).join(', ')}
Mem free/total (MB): ${(vpsLoad.mem.free / 1024 / 1024).toFixed(0)} / ${(vpsLoad.mem.total / 1024 / 1024).toFixed(0)}`
            : 'Loading...'}
        </pre>
      </main>
    </>
  );
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
