import type { IncomingMessage } from 'http';

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

const PALETTE_TOKEN_KEYS = [
  'brand-ocean',
  'brand-green',
  'brand-gold',
  'brand-navy',
  'accent-1',
  'accent-2',
  'accent-3',
  'danger',
  'success',
  'warning',
  'info',
] as const;

type PaletteTokenKey = (typeof PALETTE_TOKEN_KEYS)[number];

export type PaletteTokens = Record<PaletteTokenKey, string>;

export const DEFAULT_PALETTE: PaletteTokens = {
  'brand-ocean': '#126E82',
  'brand-green': '#38A169',
  'brand-gold': '#FDBA45',
  'brand-navy': '#0B2239',
  'accent-1': '#126E82',
  'accent-2': '#38A169',
  'accent-3': '#FDBA45',
  danger: '#F87171',
  success: '#2F9E44',
  warning: '#F59F00',
  info: '#228BE6',
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function normalizeTokens(input: unknown, base: PaletteTokens = DEFAULT_PALETTE): PaletteTokens {
  const output: PaletteTokens = { ...base };
  if (!input || typeof input !== 'object') {
    return output;
  }
  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    if (!PALETTE_TOKEN_KEYS.includes(rawKey as PaletteTokenKey)) {
      continue;
    }
    if (typeof rawValue !== 'string') {
      continue;
    }
    const value = rawValue.trim();
    if (!HEX_COLOR_RE.test(value)) {
      continue;
    }
    output[rawKey as PaletteTokenKey] = value;
  }
  return output;
}

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function buildPaletteStyle(tokens: PaletteTokens): string {
  const resolved = normalizeTokens(tokens);
  const accent1 = resolved['accent-1'];
  const accent2 = resolved['accent-2'];
  const accent3 = resolved['accent-3'];

  const darkGradients = {
    g1: rgba(accent1, 0.3),
    g2: rgba(accent2, 0.22),
    g3: rgba(accent3, 0.12),
  };

  const lightGradients = {
    g1: rgba(accent1, 0.1),
    g2: rgba(accent2, 0.1),
    g3: rgba(accent3, 0.08),
  };

  return [
    ':root{',
    `--brand-ocean:${resolved['brand-ocean']};`,
    `--brand-green:${resolved['brand-green']};`,
    `--brand-gold:${resolved['brand-gold']};`,
    `--brand-navy:${resolved['brand-navy']};`,
    `--accent-1:${resolved['accent-1']};`,
    `--accent-2:${resolved['accent-2']};`,
    `--accent-3:${resolved['accent-3']};`,
    `--danger:${resolved.danger};`,
    `--success:${resolved.success};`,
    `--warning:${resolved.warning};`,
    `--info:${resolved.info};`,
    `--danger-bg:${rgba(resolved.danger, 0.12)};`,
    `--danger-border:${rgba(resolved.danger, 0.35)};`,
    `--success-bg:${rgba(resolved.success, 0.12)};`,
    `--success-border:${rgba(resolved.success, 0.35)};`,
    '--ocean:var(--brand-ocean);',
    '--green:var(--brand-green);',
    '--gold:var(--brand-gold);',
    '--navy:var(--brand-navy);',
    '}',
    `html[data-theme="dark"]{--bg-gradient-1:${darkGradients.g1};--bg-gradient-2:${darkGradients.g2};--bg-gradient-3:${darkGradients.g3};}`,
    `html[data-theme="light"]{--bg-gradient-1:${lightGradients.g1};--bg-gradient-2:${lightGradients.g2};--bg-gradient-3:${lightGradients.g3};}`,
  ].join('');
}

export function extractShareToken(url?: string | null) {
  if (!url) return undefined;
  const match = url.match(/^\/share(?:\/intent)?\/([^/?#]+)/i);
  return match?.[1];
}

export async function resolvePalette(req?: IncomingMessage) {
  const shareToken = extractShareToken(req?.url);
  const url = new URL('/v1/theme', BACKEND_BASE);
  if (shareToken) {
    url.searchParams.set('shareToken', shareToken);
  }
  try {
    const res = await fetch(url.toString(), {
      headers: { cookie: req?.headers.cookie ?? '' },
    });
    if (!res.ok) {
      return { tokens: DEFAULT_PALETTE, slug: undefined };
    }
    const data = await res.json();
    const tokens = normalizeTokens(data?.tokens);
    return { tokens, slug: data?.slug as string | undefined };
  } catch {
    return { tokens: DEFAULT_PALETTE, slug: undefined };
  }
}
