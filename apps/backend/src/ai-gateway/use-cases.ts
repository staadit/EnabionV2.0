export const AI_GATEWAY_USE_CASES = [
  'intent_structuring',
  'intent_gap_detection',
  'clarifying_questions',
  'fit_scoring',
  'summary_internal',
  'help_explanation',
] as const;

export type AiGatewayUseCase = (typeof AI_GATEWAY_USE_CASES)[number];

const useCaseSet = new Set<string>(AI_GATEWAY_USE_CASES as readonly string[]);

const AI_GATEWAY_USE_CASE_ALIASES: Record<string, AiGatewayUseCase> = {};

export function normalizeUseCase(value: string): AiGatewayUseCase {
  const trimmed = value.trim();
  if (useCaseSet.has(trimmed)) {
    return trimmed as AiGatewayUseCase;
  }
  const lower = trimmed.toLowerCase();
  if (useCaseSet.has(lower)) {
    return lower as AiGatewayUseCase;
  }
  const alias =
    AI_GATEWAY_USE_CASE_ALIASES[trimmed] ||
    AI_GATEWAY_USE_CASE_ALIASES[lower] ||
    AI_GATEWAY_USE_CASE_ALIASES[trimmed.toUpperCase()];
  if (alias) {
    return alias;
  }
  throw new Error(`Unsupported useCase: ${value}`);
}
