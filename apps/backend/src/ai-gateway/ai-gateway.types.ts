import type { AiGatewayUseCase } from './use-cases';

export type AiGatewayMessageRole = 'system' | 'user' | 'assistant';

export type AiGatewayMessage = {
  role: AiGatewayMessageRole;
  content: string;
};

export type AiGatewayRequest = {
  tenantId: string;
  userId?: string | null;
  useCase: AiGatewayUseCase | string;
  model?: string | null;
  messages: AiGatewayMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
  requestId?: string;
  inputClass: 'L1' | 'L2';
  containsL2?: boolean;
};

export type AiGatewayUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiGatewayResponse = {
  text: string;
  model: string;
  provider: 'openai';
  usage?: AiGatewayUsage;
  latencyMs: number;
  requestId: string;
};
