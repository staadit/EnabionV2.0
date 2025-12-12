import Head from 'next/head';
import React from 'react';

export default function Home() {
  return (
    <>
      <Head>
        <title>Enabion R1.0 – Skeleton</title>
      </Head>
      <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Enabion R1.0 – Intent & Pre-Sales OS (skeleton)</h1>
        <p>Frontend is running. Backend healthcheck expected at http://localhost:4000/health.</p>
      </main>
    </>
  );
}
