import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';

type HomeProps = {
  user: {
    id: string;
    email: string;
    orgId: string;
    role: string;
    isPlatformAdmin: boolean;
  };
  orgSlug: string | null;
  backendHealth: string | null;
  backendError: string | null;
  apiHealth: string | null;
  apiError: string | null;
  vpsHealth: string | null;
  vpsError: string | null;
  prodFrontendHealth: string | null;
  prodFrontendError: string | null;
  prodBackendHealth: string | null;
  prodBackendError: string | null;
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
  user,
  orgSlug,
  backendHealth,
  backendError,
  apiHealth,
  apiError,
  vpsHealth,
  vpsError,
  prodFrontendHealth,
  prodFrontendError,
  prodBackendHealth,
  prodBackendError,
}: HomeProps) {
  const settingsHref = orgSlug ? `/${orgSlug}/settings/org` : '/settings/org';
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
    const id = setInterval(fetchLoad, 30 * 60 * 1000);
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
      <main style={{ padding: '2rem', fontFamily: '"Space Grotesk", "IBM Plex Sans", "Noto Sans", sans-serif' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>Enabion R1.0 - Intent & Pre-Sales OS (skeleton)</h1>
            <p style={{ marginTop: '0.5rem', color: '#52565c' }}>
              Signed in as {user.email} - {user.role}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user.role === 'Owner' ? (
              <Link
                href={settingsHref}
                style={{ ...buttonStyle('#1c6e5a'), border: 'none', cursor: 'pointer' }}
              >
                Settings
              </Link>
            ) : null}
            {user.isPlatformAdmin ? (
              <Link
                href="/platform-admin"
                style={{ ...buttonStyle('#8b2a2a'), border: 'none', cursor: 'pointer' }}
              >
                Platform Admin
              </Link>
            ) : null}
            <button
              type="button"
              style={{ ...buttonStyle('#0f3a4b'), border: 'none', cursor: 'pointer' }}
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
            >
              Sign out
            </button>
          </div>
        </div>

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
          {loadError ? `Error: ${loadError}` : vpsLoad ? formatLoadSummary(vpsLoad) : 'Loading...'}
        </pre>

        <section style={{ marginTop: '2rem' }}>
          <h2>Dev &lt;-&gt; Pilot controls and status</h2>
          <p>
            Szybkie wejscia do operacji. Pilot uruchamiamy manualnie na VPS (tag/branch), dev dziala stale. Status pokazuje health oraz sciezki volume (ktory katalog jest podpiety w kontenerze).
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={boxStyle}>
              <h3 style={{ marginTop: 0 }}>Pilot (prod)</h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Pilot uruchamiamy manualnie na VPS (tag/branch). Szczegoly w runbooku.
              </p>
              <p style={{ marginBottom: '0.25rem' }}>Start pilot (manual):</p>
              <code style={{ display: 'block', marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {'cd /srv/enabion/prod/repo\n'}
                {'git fetch --all --tags\n'}
                {'git checkout r1.0-rc.<n>\n'}
                {'COMPOSE_PROJECT_NAME=enabion_pilot docker compose -f infra/docker-compose.prod.pilot.yml up -d --build'}
              </code>
              <p style={{ marginBottom: '0.25rem' }}>Stop pilot (manual):</p>
              <code style={{ display: 'block', marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {'COMPOSE_PROJECT_NAME=enabion_pilot docker compose -f infra/docker-compose.prod.pilot.yml down'}
              </code>
              <p style={{ marginBottom: '0.25rem' }}>
                Runbook:{' '}
                <a
                  href="https://github.com/staadit/EnabionV2.0/blob/dev/docs/R1.0/R1.0_Pilot_Operations_Runbook_v1.1.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  R1.0 Pilot Operations Runbook
                </a>
              </p>
              <p style={{ marginBottom: '0.25rem' }}>Volumes (pilot):</p>
              <code style={{ display: 'block', marginBottom: '0.5rem' }}>
                {'/srv/enabion/_volumes/pilot/{postgres,blobstore}'}
              </code>
              <p style={{ marginBottom: '0.25rem' }}>Sprawdz aktywny mount w kontenerze:</p>
              <code style={{ display: 'block' }}>
                {'COMPOSE_PROJECT_NAME=enabion_pilot docker inspect enabion_pilot-backend-1 --format "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}"'}
              </code>
            </div>

            <div style={boxStyle}>
              <h3 style={{ marginTop: 0 }}>Dev</h3>
              <p style={{ marginBottom: '0.75rem' }}>
                Dev jest zawsze-on.
              </p>
              <p style={{ marginBottom: '0.25rem' }}>Volumes (dev):</p>
              <code style={{ display: 'block', marginBottom: '0.5rem' }}>
                {'/srv/enabion/_volumes/prod/{postgres,blobstore}'}
              </code>
              <p style={{ marginBottom: '0.25rem' }}>Sprawdz aktywny mount w kontenerze:</p>
              <code style={{ display: 'block' }}>
                {'docker inspect infra-backend-1 --format "{{range .Mounts}}{{.Source}} -> {{.Destination}}{{println}}{{end}}"'}
              </code>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p>Prod backend health (`https://api.enabion.com/health`):</p>
              <pre style={boxStyle}>
                {prodBackendError ? `Error: ${prodBackendError}` : prodBackendHealth ?? 'No response'}
              </pre>
            </div>
            <div>
              <p>Prod frontend health (`https://enabion.com/api/health`):</p>
              <pre style={boxStyle}>
                {prodFrontendError ? `Error: ${prodFrontendError}` : prodFrontendHealth ?? 'No response'}
              </pre>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function buttonStyle(bg: string) {
  return {
    display: 'inline-block',
    padding: '0.75rem 1.25rem',
    color: '#fff',
    background: bg,
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: 600,
  } as const;
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
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!parts.length) parts.push(`${seconds}s`);
  return parts.join(' ');
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({ req }) => {
  const backendBase = process.env.BACKEND_URL || 'http://backend:4000';
  let user: HomeProps['user'] | null = null;
  let orgSlug: string | null = null;
  try {
    const authRes = await fetch(`${backendBase}/auth/me`, {
      headers: { cookie: req.headers.cookie ?? '' },
    });

    if (!authRes.ok) {
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      };
    }

    const authData = await authRes.json();
    user = authData?.user || null;
    orgSlug = authData?.user?.orgSlug ?? null;
  } catch {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  if (!user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  if (user.role === 'Owner' && !orgSlug) {
    try {
      const orgRes = await fetch(`${backendBase}/v1/org/me`, {
        headers: { cookie: req.headers.cookie ?? '' },
      });
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        orgSlug = orgData?.org?.slug ?? null;
      }
    } catch {
      orgSlug = null;
    }
  }

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
  const prodFrontend = await fetchText('https://enabion.com/api/health');
  const prodBackend = await fetchText('https://api.enabion.com/health');

  return {
    props: {
      user,
      orgSlug,
      backendHealth: backend.text,
      backendError: backend.error,
      apiHealth: api.text,
      apiError: api.error,
      vpsHealth: vps.text,
      vpsError: vps.error,
      prodFrontendHealth: prodFrontend.text,
      prodFrontendError: prodFrontend.error,
      prodBackendHealth: prodBackend.text,
      prodBackendError: prodBackend.error,
    },
  };
};
