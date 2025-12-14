import Head from 'next/head';
import type { GetServerSideProps } from 'next';

type HomeProps = {
  backendHealth: string | null;
  backendError: string | null;
  apiHealth: string | null;
  apiError: string | null;
  vpsHealth: string | null;
  vpsError: string | null;
};

export default function Home({
  backendHealth,
  backendError,
  apiHealth,
  apiError,
  vpsHealth,
  vpsError,
}: HomeProps) {
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
