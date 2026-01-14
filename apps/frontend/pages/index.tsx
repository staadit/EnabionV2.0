import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// CSS copied 1:1 from mockup (light/dark themes, layout, tokens)
const css = `
html,body{height:100%;}
body{
  margin:0;
  font-family: var(--sans);
  color: var(--text);
  background:
    radial-gradient(1100px 520px at 16% 0%, var(--heroGlow1), transparent 55%),
    radial-gradient(900px 520px at 86% 6%, var(--heroGlow2), transparent 60%),
    radial-gradient(700px 520px at 60% 100%, var(--heroGlow3), transparent 56%),
    linear-gradient(180deg, var(--bg), var(--bg2));
  letter-spacing: .1px;
}
a{color:inherit; text-decoration:none;}
.wrap{max-width:1180px; margin:0 auto; padding:22px 16px 64px;}
.mono{font-family:var(--mono);}
.muted{color:var(--muted);}
.muted2{color:var(--muted2);}
.small{font-size:12px; color:var(--muted2);}
.pill{
  display:inline-flex; align-items:center; gap:8px;
  padding:7px 10px; border-radius:999px;
  border:1px solid var(--border);
  background: var(--chip);
  font-size:12px; color:var(--muted);
  white-space:nowrap;
}
.dot{width:9px; height:9px; border-radius:999px; background:var(--muted2);}
.dot.ocean{background:var(--ocean);}
.dot.green{background:var(--green);}
.dot.gold{background:var(--gold);}

/* NAV */
.nav{
  display:flex; align-items:center; justify-content:space-between;
  gap:14px; padding:10px 12px;
  border:1px solid var(--border);
  background: linear-gradient(180deg, var(--card), var(--card2));
  border-radius: var(--r2);
  box-shadow: var(--shadow2);
  position: sticky;
  top: 10px;
  backdrop-filter: blur(10px);
  z-index: 10;
}
.brand{display:flex; align-items:center; gap:10px; min-width:220px;}
.mark{
  width:32px; height:32px; border-radius:12px;
  background: linear-gradient(135deg, var(--ocean), var(--green));
  box-shadow: var(--shadow-2);
  position:relative;
}
.mark:after{
  content:"";
  position:absolute; inset:8px;
  border-radius:10px;
  background: var(--gold);
  box-shadow: 0 0 0 1px var(--border);
}
.brandName{font-weight:780; letter-spacing:.3px;}
.navLinks{display:none; gap:14px; flex-wrap:wrap; align-items:center; justify-content:center;}
.navLinks a{font-size:13px; color:var(--muted); padding:6px 8px; border-radius:10px;}
.navLinks a:hover{background:var(--chip); color:var(--text);}
@media (min-width: 980px){
  .navLinks{display:flex;}
}

.navActions{display:flex; gap:10px; align-items:center; justify-content:flex-end; flex-wrap:wrap;}
.btn{
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  padding:10px 12px;
  border-radius: 14px;
  border:1px solid var(--border);
  background: var(--chip);
  color: var(--text);
  font-size:13px;
  cursor:pointer;
  user-select:none;
}
.btn:hover{filter: brightness(1.03);}
.btn:active{transform: translateY(0.5px);}
.btnPrimary{
  border-color: var(--border);
  background: var(--gradient-primary);
  color: var(--text-on-brand);
  box-shadow: var(--shadow);
}
.btnGhost{background:transparent;}
.btnSmall{padding:8px 10px; border-radius: 12px; font-size:12px;}
.themeToggle{
  display:inline-flex; align-items:center; gap:8px;
  padding:8px 10px; border-radius: 999px;
  border:1px solid var(--border);
  background: transparent;
  color: var(--muted);
  cursor:pointer;
  font-size:12px;
}

/* HERO */
.hero{
  margin-top:18px;
  padding:22px;
  border:1px solid var(--border);
  background: linear-gradient(180deg, var(--card), var(--card2));
  border-radius: var(--r2);
  box-shadow: var(--shadow);
  overflow:hidden;
}
.heroGrid{
  display:grid;
  grid-template-columns: 1fr;
  gap:16px;
  align-items: start;
}
@media (min-width: 980px){
  .heroGrid{grid-template-columns: 1.15fr .85fr;}
}
h1{
  margin:0;
  font-size: 34px;
  line-height: 1.08;
  letter-spacing: -0.2px;
}
.lead{
  margin:10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--muted);
  max-width: 58ch;
}
.heroPills{margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;}
.heroCtas{margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;}
.heroNote{margin-top:10px; font-size:12px; color:var(--muted2);}

/* DEMO CARD */
.demo{
  border:1px solid var(--border);
  background: var(--demo);
  border-radius: var(--r2);
  box-shadow: var(--shadow2);
  padding:14px;
}
.demoHead{display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px;}
.demoTitle{margin:0; font-size:13px; font-weight:760;}
.kbd{
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
  border:1px solid var(--border);
  background: var(--surface-2);
  padding:2px 6px;
  border-radius: 8px;
}
.ta{
  width:100%;
  min-height: 148px;
  resize: vertical;
  padding:10px 11px;
  border-radius: 14px;
  border:1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font-size: 12px;
  line-height:1.45;
  outline: none;
  font-family: var(--sans);
}
.demoActions{display:flex; gap:10px; flex-wrap:wrap; margin-top:10px;}
.out{
  margin-top:10px;
  padding:10px;
  border-radius: 14px;
  border:1px dashed var(--border);
  background: var(--surface-2);
  font-size:12px;
  color: var(--muted);
  display:none;
}
.out b{color: var(--text);}

/* SECTIONS */
.section{
  margin-top: 16px;
  padding: 18px;
  border:1px solid var(--border);
  background: linear-gradient(180deg, var(--card), var(--card2));
  border-radius: var(--r2);
  box-shadow: var(--shadow2);
}
.sectionHead{
  display:flex; align-items:flex-end; justify-content:space-between; gap:12px; flex-wrap:wrap;
  margin-bottom: 10px;
}
.sectionTitle{margin:0; font-size:14px; font-weight:800; letter-spacing:.2px;}
.sectionDesc{margin:0; font-size:12px; color: var(--muted2);}

.grid3{
  display:grid;
  grid-template-columns:1fr;
  gap:12px;
}
@media (min-width: 860px){
  .grid3{grid-template-columns: repeat(3, 1fr);}
}
.card{
  border:1px solid var(--border);
  background: var(--surface-2);
  border-radius: 18px;
  padding: 12px;
  min-height: 118px;
}
.card h3{margin:0 0 6px; font-size:13px; font-weight:780;}
.card p{margin:0; font-size:12.5px; color:var(--muted); line-height:1.5;}

/* STEP STRIP */
.steps{
  display:grid;
  grid-template-columns: 1fr;
  gap:10px;
}
@media (min-width: 860px){
  .steps{grid-template-columns: repeat(4, 1fr);}
}
.step{
  border:1px solid var(--border);
  background: var(--surface-2);
  border-radius: 18px;
  padding: 12px;
  position: relative;
  overflow:hidden;
}
.step .n{
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted2);
  margin-bottom: 8px;
}
.step .t{margin:0 0 6px; font-size:13px; font-weight:820;}
.step .d{margin:0; font-size:12.5px; color: var(--muted); line-height:1.45;}
.step:before{
  content:"";
  position:absolute;
  right:-30px; top:-30px;
  width:90px; height:90px;
  background: radial-gradient(circle at 30% 30%, var(--bg-gradient-3), transparent 62%);
  transform: rotate(10deg);
}

/* TRUST BAR */
.trustRow{
  display:grid;
  grid-template-columns:1fr;
  gap:10px;
  margin-top: 10px;
}
@media (min-width: 860px){
  .trustRow{grid-template-columns: 1.2fr .8fr;}
}
.list{
  margin:8px 0 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.5;
}
.list li{margin:4px 0;}
.badge{
  display:inline-flex; align-items:center; gap:8px;
  padding:7px 10px;
  border-radius: 14px;
  border:1px solid var(--border);
  background: var(--chip);
  font-size: 12px;
  color: var(--muted);
  margin-right:8px;
  margin-top:8px;
  white-space: nowrap;
}
.badge strong{color: var(--text);}
.ctaBand{
  margin-top: 16px;
  padding: 16px;
  border-radius: var(--r2);
  border:1px solid var(--border);
  background: linear-gradient(135deg, var(--bg-gradient-1), var(--bg-gradient-2));
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  flex-wrap:wrap;
}
.ctaBand h2{margin:0; font-size:16px; font-weight:860;}
.ctaBand p{margin:4px 0 0; font-size:12.5px; color:var(--muted);}

/* FOOTER */
.footer{
  margin-top: 18px;
  padding: 14px 4px 0;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  flex-wrap:wrap;
  color: var(--muted2);
  font-size: 12px;
}
.footer a{color: var(--muted2); text-decoration: underline; text-underline-offset: 3px;}
`;

export default function LandingPage() {
  const defaultEmail = `Subject: Mobile App MVP — Retail Loyalty (DE)

Hi, we need a mobile app MVP for loyalty sign-ups across ~120 stores.
Timeline: 3 months. Region: DE/PL. We can start next month.
Please advise scope, risks, and a realistic plan.

Thanks,
Client X`;

  const [themeLabel, setThemeLabel] = useState('Light');
  const [emailText, setEmailText] = useState(defaultEmail);
  const [showOutput, setShowOutput] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme');
    const stored = (() => {
      try {
        return localStorage.getItem('enabion_theme');
      } catch {
        return null;
      }
    })();
    const initial = stored || current || 'light';
    applyTheme(initial === 'light' || initial === 'dark' ? initial : 'light');
  }, []);

  const applyTheme = (t: string) => {
    const theme = t === 'light' || t === 'dark' ? t : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('enabion_theme', theme);
    } catch {
      /* ignore */
    }
    setThemeLabel(theme.charAt(0).toUpperCase() + theme.slice(1));
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(current);
  };

  return (
    <>
      <Head>
        <title>Enabion — Intent & Pre-Sales OS</title>
        <meta
          name="description"
          content="Turn a client email into a structured Intent. Clarify, Match, and Commit with trust-first workflows (L1/L2/L3 + Mutual NDA)."
        />
      </Head>

      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="wrap">
        {/* NAV */}
        <header className="nav" role="navigation" aria-label="Top navigation">
          <div className="brand">
            <div className="mark" aria-hidden="true" />
            <div>
              <div className="brandName">Enabion</div>
              <div className="small">Intent &amp; Pre-Sales OS</div>
            </div>
          </div>

          <nav className="navLinks" aria-label="Primary">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#trust">Trust & Security</a>
            <a href="#pricing">Pricing</a>
            <a href="#docs">Docs</a>
          </nav>

          <div className="navActions">
            <button className="themeToggle" onClick={toggleTheme} aria-label="Toggle theme">
              <span className="dot gold" aria-hidden="true" />
              <span id="themeLabel">{themeLabel}</span>
            </button>
            <Link className="btn btnGhost btnSmall" href="/login">
              Sign in
            </Link>
            <Link className="btn btnPrimary btnSmall" href="/signup">
              Create account
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section className="hero" id="product" aria-label="Hero">
          <div className="heroGrid">
            <div>
              <div className="pill">
                <span className="dot ocean" />
                R1.0 MVP
              </div>
              <h1 style={{ marginTop: 10 }}>
                Turn a client email into a structured <span style={{ color: 'var(--gold)' }}>Intent</span> — fast.
              </h1>
              <p className="lead">
                Enabion is a trust-first Collaboration OS for pre-sales and partnerships.
                Standardize Clarify → Match → Commit, share safely in <b>L1</b>, unlock details in <b>L2</b> after Mutual
                NDA.
              </p>

              <div className="heroPills" aria-label="Highlights">
                <span className="pill">
                  <span className="dot green" />
                  <b style={{ color: 'var(--text)' }}>No-NDA Zone</b> for L1
                </span>
                <span className="pill">
                  <span className="dot gold" />
                  <b style={{ color: 'var(--text)' }}>Mutual NDA</b> for L2
                </span>
                <span className="pill">
                  <span className="dot ocean" />
                  <b style={{ color: 'var(--text)' }}>Platform of platforms</b>
                </span>
              </div>

              <div className="heroCtas">
                <Link className="btn btnPrimary" href="/signup">
                  Start with your next client email
                </Link>
                <a className="btn" href="#how">
                  See how it works
                </a>
                <Link className="btn btnGhost" href="/demo">
                  Book a demo
                </Link>
              </div>

              <div className="heroNote">
                Designed for BD/AM teams in firms X (software/consulting). Y flow is minimal in R1.0; expanded in R2+.
              </div>
            </div>

            <aside className="demo" aria-label="Mini demo">
              <div className="demoHead">
                <h2 className="demoTitle">Mini-demo: paste an email</h2>
                <div>
                  <span className="kbd">Ctrl</span> <span className="kbd">Enter</span>
                </div>
              </div>

              <textarea
                className="ta"
                value={emailText}
                aria-label="Email input"
                onChange={(e) => setEmailText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') setShowOutput(true);
                }}
              />

              <div className="demoActions">
                <button className="btn btnPrimary" type="button" onClick={() => setShowOutput(true)}>
                  Generate Intent (mock)
                </button>
                <button
                  className="btn btnGhost"
                  type="button"
                  onClick={() => {
                    setEmailText(defaultEmail);
                    setShowOutput(false);
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="out" style={{ display: showOutput ? 'block' : 'none' }} aria-live="polite">
                <div>
                  <b>Intent (mock)</b>
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Goal: mobile MVP to increase loyalty sign-ups and repeat purchases
                  <br />
                  Missing: budget range, POS integration constraints, consent/GDPR specifics
                  <br />
                  Suggested stage: <b>CLARIFY</b> → shortlist partners after 3 answers
                </div>
              </div>

              <div className="small" style={{ marginTop: 8 }}>
                In product: this creates <span className="mono">INTENT_CREATED</span> and logs Avatar suggestions.
              </div>
            </aside>
          </div>
        </section>

        {/* SECTIONS */}
        <Section id="problem" title="Why Enabion" desc="Less chaos, faster decisions, better trust.">
          <div className="grid3">
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
          <div className="steps">
            <Step n="Step 1" t="Paste → Intent" d="Turn a raw email/RFP into a structured Intent: goal, context, scope, KPIs, risks." />
            <Step n="Step 2" t="Clarify" d="Avatar highlights missing information and drafts precise questions to remove ambiguity." />
            <Step n="Step 3" t="Match (beta)" d="Rule-based matching by industry, tech, region, language and budget range — transparent rationale." />
            <Step n="Step 4" t="Commit" d="Decide “go / no-go”, share L1 links, export summaries, and unlock L2 via Mutual NDA when needed." />
          </div>

          <div style={{ marginTop: 12 }}>
            <Badge>
              <span className="dot ocean" />
              <strong>Pipeline:</strong>&nbsp;New → Clarify → Match → Commit → Won/Lost
            </Badge>
            <Badge>
              <span className="dot green" />
              <strong>Org roles:</strong>&nbsp;Owner · Contributor · Viewer
            </Badge>
            <Badge>
              <span className="dot gold" />
              <strong>Exports:</strong>&nbsp;PDF/Markdown (L1)
            </Badge>
          </div>
        </Section>

        <Section id="trust" title="Trust & Confidentiality" desc="Simple language: L1/L2/L3 + NDA layers.">
          <div className="trustRow">
            <div className="card">
              <h3>Confidentiality levels</h3>
              <ul className="list">
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
              <div className="small" style={{ marginTop: 8 }}>
                Principle: Your data, your control — our trust layer.
              </div>
            </div>

            <div className="card">
              <h3>Mutual NDA (R1.0)</h3>
              <p className="muted" style={{ margin: 0 }}>
                Accept once during onboarding. When both orgs accepted, L2 becomes available for that collaboration.
              </p>
              <div style={{ marginTop: 10 }}>
                <span className="pill">
                  <span className="dot gold" />
                  NDA Layer 1
                </span>
                <span className="pill">
                  <span className="dot ocean" />
                  Audit events
                </span>
              </div>
              <div className="small" style={{ marginTop: 10 }}>
                Later: Custom NDA FastTrack + external signature integrations (R2+).
              </div>
            </div>
          </div>
        </Section>

        <Section title="What you get in the MVP" desc="Built for daily BD/AM execution — not a one-off marketplace.">
          <div className="grid3">
            <Card title="Intent Coach">
              Structured brief generation with missing fields & risk prompts. Suggestions are logged and traceable.
            </Card>
            <Card title="Pre-sales Pipeline">
              Move deals through a shared workflow and keep ownership, deadlines and next steps visible.
            </Card>
            <Card title="Share L1 safely">
              Send view-only links (L1) to clients and partners without exposing confidential information.
            </Card>
            <Card title="Exports">
              Generate PDF/Markdown summaries for stakeholders who are not in the platform yet.
            </Card>
            <Card title="Integrations-first">
              Designed to sit above your stack (email/Teams/CRM) — not replace everything on day 1.
            </Card>
            <Card title="Org readiness">
              R1.1 adds Central Org Dashboard + multi-seat operations for teams and management.
            </Card>
          </div>
        </Section>

        <Section id="pricing" title="Pricing" desc="Simple seat-based plans for early customers (details in demo).">
          <div className="grid3">
            <Card title="Beta">For early adopters validating the workflow. Includes core Intent + pipeline + exports.</Card>
            <Card title="Team">Multi-seat collaboration (R1.1). Shared ownership, dashboard, and basic analytics.</Card>
            <Card title="Enterprise (later)">Shielded/Sovereign data models and compliance options for regulated environments (R4+).</Card>
          </div>
        </Section>

        <section className="ctaBand" aria-label="Final CTA">
          <div>
            <h2>Start with your next client email.</h2>
            <p>Turn vague messages into a structured Intent in minutes — and keep trust under control.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn btnPrimary" href="/signup">
              Create account
            </Link>
            <Link className="btn" href="/login">
              Sign in
            </Link>
            <Link className="btn btnGhost" href="/demo">
              Book a demo
            </Link>
          </div>
        </section>

        <footer className="footer" id="docs" aria-label="Footer">
          <div>
            <div>
              <b>Enabion</b> <span className="muted2">— Trust-first Collaboration OS</span>
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              © {year} Enabion. All rights reserved.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/security">Security</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="#docs">Docs</a>
            <Link href="/contact">Contact</Link>
          </div>
        </footer>
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
    <section className="section" id={id} aria-label={title}>
      <div className="sectionHead">
        <h2 className="sectionTitle">{title}</h2>
        <p className="sectionDesc">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="step">
      <div className="n">{n}</div>
      <div className="t">{t}</div>
      <p className="d">{d}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}
