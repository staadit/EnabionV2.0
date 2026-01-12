import type React from 'react';

export default function SecurityPage() {
  return (
    <main style={wrap}>
      <h1>Security</h1>
      <p>Content coming soon.</p>
      <a href="/" style={link}>Back to home</a>
    </main>
  );
}

const wrap: React.CSSProperties = { maxWidth: 720, margin: '60px auto', padding: '0 16px', fontFamily: 'sans-serif' };
const link: React.CSSProperties = { color: '#126E82', textDecoration: 'underline' };
