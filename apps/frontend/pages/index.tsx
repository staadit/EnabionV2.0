import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ThemeSwitcher } from '../components/theme/ThemeSwitcher';
import { setTheme } from '../lib/theme';

const defaultEmail = `Subject: Mobile App MVP — Retail Loyalty (DE)

Hi, we need a mobile app MVP for loyalty sign-ups across ~120 stores.
Timeline: 3 months. Region: DE/PL. We can start next month.
Please advise scope, risks, and a realistic plan.

Thanks,
Client X`;

export default function LandingPage() {
  const [emailText, setEmailText] = useState(defaultEmail);
  const [showOutput, setShowOutput] = useState(false);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
    // Default landing to light if no preference is set.
    try {
      const stored = localStorage.getItem('enabion_theme');
      if (!stored) {
        setTheme('light');
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <>
      <Head>
        <title>Enabion — Intent &amp; Pre-Sales OS</title>
        <meta
          name="description"
          content="Turn a client email into a structured Intent. Clarify, Match, and Commit with trust-first workflows (L1/L2/L3 + Mutual NDA)."
        />
      </Head>
      <div style={wrap}>
        <header style={nav}>
          <div style={brand}>
            <div style={mark} aria-hidden="true" />
            <div>
              <div style={brandName}>Enabion</div>
              <div style={small}>Intent &amp; Pre-Sales OS</div>
            </div>
          </div>

          <nav className="navLinks" style={navLinks} aria-label="Primary">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#trust">Trust &amp; Security</a>
            <a href="#pricing">Pricing</a>
            <a href="#docs">Docs</a>
          </nav>

          <div style={navActions}>
            <ThemeSwitcher compact />
            <Link href="/login" style={{ ...btn, ...btnGhost, ...btnSmall }}>
              Sign in
            </Link>
            <Link href="/signup" style={{ ...btn, ...btnPrimary, ...btnSmall }}>
              Create account
            </Link>
          </div>
        </header>

        <section style={hero} id="product" aria-label="Hero">
          <div className="heroGrid" style={heroGrid}>
            <div>
              <div style={pill}>
                <span style={{ ...dot, ...dotOcean }} />
                R1.0 MVP
              </div>
              <h1 style={{ marginTop: 10 }}>
                Turn a client email into a structured <span style={{ color: 'var(--gold)' }}>Intent</span> — fast.
              </h1>
              <p style={lead}>
                Enabion is a trust-first Collaboration OS for pre-sales and partnerships. Standardize Clarify → Match →
                Commit, share safely in <b>L1</b>, unlock details in <b>L2</b> after Mutual NDA.
              </p>

              <div style={pillRow} aria-label="Highlights">
                <span style={pill}>
                  <span style={{ ...dot, ...dotGreen }} />
                  <b style={{ color: 'var(--text)' }}>No-NDA Zone</b> for L1
                </span>
                <span style={pill}>
                  <span style={{ ...dot, ...dotGold }} />
                  <b style={{ color: 'var(--text)' }}>Mutual NDA</b> for L2
                </span>
                <span style={pill}>
                  <span style={{ ...dot, ...dotOcean }} />
                  <b style={{ color: 'var(--text)' }}>Platform of platforms</b>
                </span>
              </div>

              <div style={heroCtas}>
                <Link href="/signup" style={{ ...btn, ...btnPrimary }}>
                  Start with your next client email
                </Link>
                <a href="#how" style={btn}>
                  See how it works
                </a>
                <Link href="/demo" style={{ ...btn, ...btnGhost }}>
                  Book a demo
                </Link>
              </div>

              <div style={heroNote}>
                Designed for BD/AM teams. Y flow minimal in R1.0; expanded in R2+.
              </div>
            </div>

            <aside style={demo} aria-label="Mini demo">
              <div style={demoHead}>
                <h2 style={demoTitle}>Mini-demo: paste an email</h2>
                <div>
                  <span style={kbd}>Ctrl</span> <span style={kbd}>Enter</span>
                </div>
              </div>

              <textarea
                style={ta}
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                aria-label="Email input"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') setShowOutput(true);
                }}
              />

              <div style={demoActions}>
                <button type="button" style={{ ...btn, ...btnPrimary }} onClick={() => setShowOutput(true)}>
                  Generate Intent (mock)
                </button>
                <button
                  type="button"
                  style={{ ...btn, ...btnGhost }}
                  onClick={() => {
                    setEmailText(defaultEmail);
                    setShowOutput(false);
                  }}
                >
                  Reset
                </button>
              </div>

              {showOutput ? (
                <div style={out} aria-live="polite">
                  <div>
                    <b>Intent (mock)</b>
                  </div>
                  <div style={{ ...smallText, marginTop: 6 }}>
                    Goal: mobile MVP to increase loyalty sign-ups and repeat purchases
                    <br />
                    Missing: budget range, POS integration constraints, consent/GDPR specifics
                    <br />
                    Suggested stage: <b>CLARIFY</b> → shortlist partners after 3 answers
                  </div>
                </div>
              ) : null}

              <div style={{ ...smallText, marginTop: 8 }}>
                In product: this creates <span style={mono}>INTENT_CREATED</span> and logs Avatar suggestions.
              </div>
            </aside>
          </div>
        </section>

        <Section id="problem" title="Why Enabion" desc="Less chaos, faster decisions, better trust.">
          <div className="grid3" style={grid3}>
            <Card title="Collaboration chaos">
              Emails, docs, chats, spreadsheets. No single source of truth for what the client actually wants.
            </Card>
            <Card title="Slow pre-sales">
              Too many iterations to clarify scope, KPI and risks. Decisions drift, owners change, context gets lost.
            </Card>
            <Card title="Trust is missing">
              NDA is ad-hoc, confidentiality is unclear, and partner selection lacks a transparent trust layer.
            </Card>
          </div>
        </Section>

        <Section id="how" title="How it works (R1.0)" desc="A narrow, sharp MVP: Intent → Clarify → Match → Commit.">
          <div className="steps" style={steps}>
            <Step n="Step 1" t="Paste → Intent" d="Turn a raw email/RFP into a structured Intent: goal, context, scope, KPIs, risks." />
            <Step n="Step 2" t="Clarify" d="Avatar highlights missing information and drafts precise questions to remove ambiguity." />
            <Step n="Step 3" t="Match (beta)" d="Rule-based matching by industry, tech, region, language and budget range — transparent rationale." />
            <Step n="Step 4" t="Commit" d="Decide “go / no-go”, share L1 links, export summaries, and unlock L2 via Mutual NDA when needed." />
          </div>
          <div style={{ marginTop: 12 }}>
            <Badge>
              <span style={{ ...dot, ...dotOcean }} />
              <strong>Pipeline:</strong>&nbsp;New → Clarify → Match → Commit → Won/Lost
            </Badge>
            <Badge>
              <span style={{ ...dot, ...dotGreen }} />
              <strong>Org roles:</strong>&nbsp;Owner · Contributor · Viewer
            </Badge>
            <Badge>
              <span style={{ ...dot, ...dotGold }} />
              <strong>Exports:</strong>&nbsp;PDF/Markdown (L1)
            </Badge>
          </div>
        </Section>

        <Section id="trust" title="Trust & Confidentiality" desc="Simple language: L1/L2/L3 + NDA layers.">
          <div className="trustRow" style={trustRow}>
            <div style={card}>
              <h3 style={cardTitle}>Confidentiality levels</h3>
              <ul style={list}>
                <li>
                  <b>L1</b> — safe to share without NDA (No-NDA Zone).
                </li>
                <li>
                  <b>L2</b> — confidential details shared after Mutual NDA (one ecosystem NDA).
                </li>
                <li>
                  <b>L3</b> — deep confidential (placeholder in MVP; expanded later).
                </li>
              </ul>
              <div style={{ ...smallText, marginTop: 8 }}>Principle: Your data, your control — our trust layer.</div>
            </div>
            <div style={card}>
              <h3 style={cardTitle}>Mutual NDA (R1.0)</h3>
              <p style={{ ...muted, margin: 0 }}>
                Accept once during onboarding. When both orgs accepted, L2 becomes available for that collaboration.
              </p>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={pill}>
                  <span style={{ ...dot, ...dotGold }} />
                  NDA Layer 1
                </span>
                <span style={pill}>
                  <span style={{ ...dot, ...dotOcean }} />
                  Audit events
                </span>
              </div>
              <div style={{ ...smallText, marginTop: 10 }}>
                Later: Custom NDA FastTrack + external signature integrations (R2+).
              </div>
            </div>
          </div>
        </Section>

        <Section title="What you get in the MVP" desc="Built for daily BD/AM execution — not a one-off marketplace.">
          <div className="grid3" style={grid3}>
            <Card title="Intent Coach">Structured brief generation with missing fields & risk prompts. Suggestions are logged and traceable.</Card>
            <Card title="Pre-sales Pipeline">Move deals through a shared workflow and keep ownership, deadlines and next steps visible.</Card>
            <Card title="Share L1 safely">Send view-only links (L1) to clients and partners without exposing confidential information.</Card>
            <Card title="Exports">Generate PDF/Markdown summaries for stakeholders who are not in the platform yet.</Card>
            <Card title="Integrations-first">Designed to sit above your stack (email/Teams/CRM) — not replace everything on day 1.</Card>
            <Card title="Org readiness">R1.1 adds Central Org Dashboard + multi-seat operations for teams and management.</Card>
          </div>
        </Section>

        <Section id="pricing" title="Pricing" desc="Simple seat-based plans for early customers (details in demo).">
          <div className="grid3" style={grid3}>
            <Card title="Beta">For early adopters validating the workflow. Includes core Intent + pipeline + exports.</Card>
            <Card title="Team">Multi-seat collaboration (R1.1). Shared ownership, dashboard, and basic analytics.</Card>
            <Card title="Enterprise (later)">Shielded/Sovereign data models and compliance options for regulated environments (R4+).</Card>
          </div>
        </Section>

        <section style={ctaBand} aria-label="Final CTA">
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 860 }}>Start with your next client email.</h2>
            <p style={{ ...muted, margin: '4px 0 0' }}>
              Turn vague messages into a structured Intent in minutes — and keep trust under control.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ ...btn, ...btnPrimary }}>
              Create account
            </Link>
            <Link href="/login" style={btn}>
              Sign in
            </Link>
            <Link href="/demo" style={{ ...btn, ...btnGhost }}>
              Book a demo
            </Link>
          </div>
        </section>

        <footer style={footer} id="docs" aria-label="Footer">
          <div>
            <div>
              <b>Enabion</b> <span style={muted2}>— Trust-first Collaboration OS</span>
            </div>
            <div style={{ ...smallText, marginTop: 6 }}>
              © {year ?? '2026'} Enabion. All rights reserved.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/security">Security</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </footer>
        <GlobalMediaStyles />
      </div>
    </>
  );
}

function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section" id={id} aria-label={title} style={section}>
      <div style={sectionHead}>
        <h2 style={sectionTitle}>{title}</h2>
        <p style={sectionDesc}>{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <h3 style={cardTitle}>{title}</h3>
      <p style={cardBody}>{children}</p>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div style={step}>
      <div style={stepN}>{n}</div>
      <div style={stepT}>{t}</div>
      <p style={stepD}>{d}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span style={badge}>{children}</span>;
}

const wrap: React.CSSProperties = {
  maxWidth: '1180px',
  margin: '0 auto',
  padding: '22px 16px 64px',
};

const nav: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
  padding: '10px 12px',
  border: '1px solid var(--border)',
  background: 'linear-gradient(180deg, var(--surface), var(--surface-2))',
  borderRadius: 'var(--radius-2)',
  boxShadow: 'var(--shadow)',
  position: 'sticky',
  top: 10,
  backdropFilter: 'blur(10px)',
  zIndex: 10,
};

const brand: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 };
const mark: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 12,
  background: 'linear-gradient(135deg, var(--ocean), var(--green))',
  boxShadow: '0 14px 28px rgba(0,0,0,.22)',
  position: 'relative',
};
const brandName: React.CSSProperties = { fontWeight: 780, letterSpacing: 0.3 };
const small: React.CSSProperties = { fontSize: 12, color: 'var(--muted2)' };

const navLinks: React.CSSProperties = {
  display: 'none',
  gap: 14,
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
};

const navActions: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' };

const btn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 13,
  cursor: 'pointer',
  userSelect: 'none',
  textDecoration: 'none',
};
const btnPrimary: React.CSSProperties = {
  borderColor: 'rgba(255,255,255,.14)',
  background: 'linear-gradient(135deg, var(--ocean), var(--green))',
  color: 'rgba(255,255,255,.95)',
};
const btnGhost: React.CSSProperties = { background: 'transparent' };
const btnSmall: React.CSSProperties = { padding: '8px 10px', borderRadius: 12, fontSize: 12 };

const hero: React.CSSProperties = {
  marginTop: 18,
  padding: 22,
  border: '1px solid var(--border)',
  background: 'linear-gradient(180deg, var(--surface), var(--surface-2))',
  borderRadius: 'var(--radius-2)',
  boxShadow: 'var(--shadow)',
  overflow: 'hidden',
};
const heroGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 16,
  alignItems: 'start',
};

const lead: React.CSSProperties = { margin: '10px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--muted)', maxWidth: '58ch' };
const heroCtas: React.CSSProperties = { marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' };
const heroNote: React.CSSProperties = { marginTop: 10, fontSize: 12, color: 'var(--muted2)' };
const pillRow: React.CSSProperties = { marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' };

const pill: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontSize: 12,
  color: 'var(--muted)',
  whiteSpace: 'nowrap',
};
const dot: React.CSSProperties = { width: 9, height: 9, borderRadius: 999, background: 'var(--muted2)' };
const dotOcean: React.CSSProperties = { background: 'var(--ocean)' };
const dotGreen: React.CSSProperties = { background: 'var(--green)' };
const dotGold: React.CSSProperties = { background: 'var(--gold)' };

const demo: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  borderRadius: 'var(--radius-2)',
  boxShadow: 'var(--shadow)',
  padding: 14,
};
const demoHead: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' };
const demoTitle: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 760 };
const kbd: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  color: 'var(--muted)',
  border: '1px solid var(--border)',
  background: 'rgba(0,0,0,.10)',
  padding: '2px 6px',
  borderRadius: 8,
};
const ta: React.CSSProperties = {
  width: '100%',
  minHeight: 148,
  resize: 'vertical',
  padding: '10px 11px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'rgba(0,0,0,.10)',
  color: 'var(--text)',
  fontSize: 12,
  lineHeight: 1.45,
  outline: 'none',
  fontFamily: 'var(--sans)',
};
const demoActions: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 };
const out: React.CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 14,
  border: '1px dashed var(--border)',
  background: 'rgba(0,0,0,.08)',
  fontSize: 12,
  color: 'var(--muted)',
};

const section: React.CSSProperties = {
  marginTop: 16,
  padding: 18,
  border: '1px solid var(--border)',
  background: 'linear-gradient(180deg, var(--surface), var(--surface-2))',
  borderRadius: 'var(--radius-2)',
  boxShadow: 'var(--shadow)',
};
const sectionHead: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
  marginBottom: 10,
};
const sectionTitle: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: 0.2 };
const sectionDesc: React.CSSProperties = { margin: 0, fontSize: 12, color: 'var(--muted2)' };

const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr', gap: 12 };

const card: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  borderRadius: 18,
  padding: 12,
  minHeight: 118,
  boxShadow: 'var(--shadow2)',
};
const cardTitle: React.CSSProperties = { margin: '0 0 6px', fontSize: 13, fontWeight: 780 };
const cardBody: React.CSSProperties = { margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 };

const steps: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr', gap: 10 };
const step: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  borderRadius: 18,
  padding: 12,
  position: 'relative',
  overflow: 'hidden',
};
const stepN: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted2)', marginBottom: 8 };
const stepT: React.CSSProperties = { margin: '0 0 6px', fontSize: 13, fontWeight: 820 };
const stepD: React.CSSProperties = { margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 };

const badge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  borderRadius: 14,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontSize: 12,
  color: 'var(--muted)',
  marginRight: 8,
  marginTop: 8,
  whiteSpace: 'nowrap',
};

const trustRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 10 };
const list: React.CSSProperties = { margin: '8px 0 0', paddingLeft: 18, color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.5 };

const ctaBand: React.CSSProperties = {
  marginTop: 16,
  padding: 16,
  borderRadius: 'var(--radius-2)',
  border: '1px solid rgba(255,255,255,.16)',
  background: 'linear-gradient(135deg, rgba(18,110,130,.22), rgba(56,161,105,.18))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const footer: React.CSSProperties = {
  marginTop: 18,
  padding: '14px 4px 0',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 14,
  flexWrap: 'wrap',
  color: 'var(--muted2)',
  fontSize: 12,
};

const smallText: React.CSSProperties = { fontSize: 12, color: 'var(--muted2)' };
const muted: React.CSSProperties = { color: 'var(--muted)' };
const muted2: React.CSSProperties = { color: 'var(--muted2)' };
const mono: React.CSSProperties = { fontFamily: 'var(--mono)' };

// Responsive tweaks
const mediaStyles = `
@media (min-width: 860px) {
  .grid3 { grid-template-columns: repeat(3, 1fr); }
  .steps { grid-template-columns: repeat(4, 1fr); }
  .trustRow { grid-template-columns: 1.2fr .8fr; }
}
@media (min-width: 980px) {
  .navLinks { display: flex !important; }
  .heroGrid { grid-template-columns: 1.15fr .85fr; }
}
`;

export function GlobalMediaStyles() {
  return <style jsx global>{mediaStyles}</style>;
}
