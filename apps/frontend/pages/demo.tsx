import type React from 'react';

export default function DemoPage() {
  return (
    <main style={wrap}>
      <h1>Demo</h1>
      <p>Content coming soon.</p>
      <a href="/" style={link}>Back to home</a>
    </main>
  );
}

const wrap: React.CSSProperties = { maxWidth: 720, margin: '60px auto', padding: '0 16px', fontFamily: 'sans-serif' };
const link: React.CSSProperties = { color: 'var(--link)', textDecoration: 'underline' };
