import Head from 'next/head';
import type { GetServerSideProps } from 'next';

type HomeProps = {
  health: string | null;
  error: string | null;
};

export default function Home({ health, error }: HomeProps) {
  return (
    <>
      <Head>
        <title>Enabion R1.0 – Skeleton</title>
      </Head>
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Enabion R1.0 – Intent & Pre-Sales OS (skeleton)</h1>
        <p>Backend health (proxying <code>http://localhost:4000/health</code>):</p>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error ? `Error: ${error}` : health ?? 'No response'}
        </pre>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  try {
    const res = await fetch('http://backend:4000/health');
    const text = await res.text();
    return { props: { health: text, error: null } };
  } catch (err: any) {
    return { props: { health: null, error: err?.message ?? 'Unknown error' } };
  }
};
