import Head from 'next/head';
import type { GetServerSideProps } from 'next';

type ShareProps = {
  token: string;
};

export default function ShareIntent({ token }: ShareProps) {
  return (
    <main style={pageStyle}>
      <Head>
        <title>Shared Intent</title>
      </Head>
      <section style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>Shared intent</h1>
        <p style={{ color: '#4b4f54' }}>
          View-only access (L1 only). Token: <code>{token}</code>
        </p>
        <p style={{ marginBottom: 0 }}>
          This page will render the L1 summary and prompt sign-in for full access.
        </p>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: '100vh',
  padding: '3rem 1.5rem',
  fontFamily: '"Space Grotesk", "IBM Plex Sans", "Noto Sans", sans-serif',
  background: 'radial-gradient(120% 120% at 10% 0%, #f6e1c7 0%, #edf2f0 45%, #d2e4ef 100%)',
  color: '#1b1d1f',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
};

const cardStyle = {
  maxWidth: '680px',
  width: '100%',
  background: '#ffffff',
  borderRadius: '20px',
  padding: '2rem',
  border: '1px solid rgba(15, 37, 54, 0.12)',
  boxShadow: '0 18px 36px rgba(15, 37, 54, 0.08)',
};

export const getServerSideProps: GetServerSideProps<ShareProps> = async (ctx) => {
  const token = typeof ctx.params?.token === 'string' ? ctx.params.token : 'share';
  return {
    props: {
      token,
    },
  };
};
