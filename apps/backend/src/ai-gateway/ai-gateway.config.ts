type RateLimitBackend = 'postgres' | 'memory';

export type AiGatewayRateLimitConfig = {
  tenantRpm: number;
  userRpm: number;
  useCaseRpm: Record<string, number>;
  backend: RateLimitBackend;
  cleanupIntervalMs: number;
  retentionHours: number;
};

export type AiGatewayConfig = {
  openaiApiKey: string;
  openaiOrgId?: string;
  openaiProjectId?: string;
  defaultModel: string;
  allowedModels: string[];
  maxOutputTokens: number;
  maxInputChars: number;
  timeoutMs: number;
  defaultTemperature: number;
  rateLimit: AiGatewayRateLimitConfig;
};

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseJsonMap(value: string | undefined): Record<string, number> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const entries = Object.entries(parsed).filter(
      ([, v]) => typeof v === 'number' && Number.isFinite(v),
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function loadAiGatewayConfig(): AiGatewayConfig {
  const env = process.env.NODE_ENV;
  const openaiApiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!openaiApiKey && env !== 'test') {
    throw new Error('OPENAI_API_KEY is required for AI Gateway');
  }

  const defaultModel = (process.env.AI_GATEWAY_DEFAULT_MODEL || 'gpt-4o-mini').trim();
  if (!defaultModel && env !== 'test') {
    throw new Error('AI_GATEWAY_DEFAULT_MODEL is required for AI Gateway');
  }

  const allowList = (process.env.AI_GATEWAY_ALLOWED_MODELS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedModels = allowList.length > 0 ? allowList : defaultModel ? [defaultModel] : [];

  const backendEnv = (process.env.AI_GATEWAY_RL_BACKEND || '').trim().toLowerCase();
  const backend: RateLimitBackend =
    backendEnv === 'memory' || env === 'test' ? 'memory' : 'postgres';

  return {
    openaiApiKey,
    openaiOrgId: process.env.OPENAI_ORG_ID || undefined,
    openaiProjectId: process.env.OPENAI_PROJECT_ID || undefined,
    defaultModel,
    allowedModels,
    maxOutputTokens: parseNumber(process.env.AI_GATEWAY_MAX_OUTPUT_TOKENS, 1024),
    maxInputChars: parseNumber(process.env.AI_GATEWAY_MAX_INPUT_CHARS, 12000),
    timeoutMs: parseNumber(process.env.AI_GATEWAY_TIMEOUT_MS, 15000),
    defaultTemperature: parseNumber(process.env.AI_GATEWAY_DEFAULT_TEMPERATURE, 0.4),
    rateLimit: {
      tenantRpm: parseNumber(process.env.AI_GATEWAY_RL_TENANT_RPM, 60),
      userRpm: parseNumber(process.env.AI_GATEWAY_RL_USER_RPM, 30),
      useCaseRpm: parseJsonMap(process.env.AI_GATEWAY_RL_USECASE_RPM),
      backend,
      cleanupIntervalMs: parseNumber(process.env.AI_GATEWAY_RL_CLEANUP_INTERVAL_MS, 60 * 60 * 1000),
      retentionHours: parseNumber(process.env.AI_GATEWAY_RL_RETENTION_HOURS, 24),
    },
  };
}
