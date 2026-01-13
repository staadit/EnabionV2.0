export const PALETTE_TOKEN_KEYS = [
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

export type PaletteTokenKey = (typeof PALETTE_TOKEN_KEYS)[number];

export const DEFAULT_PALETTE: Record<PaletteTokenKey, string> = {
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

export function isHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim());
}

export function normalizeTokens(
  input: unknown,
  baseTokens: Record<PaletteTokenKey, string> = DEFAULT_PALETTE,
  options: { fillAccentsFromBrand?: boolean } = { fillAccentsFromBrand: true },
): Record<PaletteTokenKey, string> {
  const output: Record<PaletteTokenKey, string> = { ...baseTokens };

  if (input && typeof input === 'object') {
    for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
      if (!PALETTE_TOKEN_KEYS.includes(rawKey as PaletteTokenKey)) {
        throw new Error(`Unsupported token: ${rawKey}`);
      }
      if (typeof rawValue !== 'string') {
        throw new Error(`Token ${rawKey} must be a string`);
      }
      const value = rawValue.trim();
      if (!isHexColor(value)) {
        throw new Error(`Token ${rawKey} must be a hex color (#RRGGBB)`);
      }
      output[rawKey as PaletteTokenKey] = value;
    }
  } else if (input !== undefined && input !== null) {
    throw new Error('tokens must be an object');
  }

  if (!input || typeof input !== 'object') {
    return output;
  }

  if (options.fillAccentsFromBrand) {
    const tokenObj = input as Record<string, unknown>;
    if (!('accent-1' in tokenObj)) {
      output['accent-1'] = output['brand-ocean'];
    }
    if (!('accent-2' in tokenObj)) {
      output['accent-2'] = output['brand-green'];
    }
    if (!('accent-3' in tokenObj)) {
      output['accent-3'] = output['brand-gold'];
    }
  }

  return output;
}
