import { createHash } from 'node:crypto';
import type { AiGatewayRequest } from './ai-gateway.types';

export type RedactedGatewayMeta = {
  messageCount: number;
  totalChars: number;
  contentHash?: string;
  inputClass: 'L1' | 'L2';
  containsL2: boolean;
};

function hashSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function redactForLogs(request: AiGatewayRequest): RedactedGatewayMeta {
  const messageCount = request.messages.length;
  const totalChars = request.messages.reduce((sum, msg) => sum + msg.content.length, 0);
  const joined = request.messages.map((msg) => msg.content).join('\n');
  const contentHash = joined ? hashSha256(joined) : undefined;
  return {
    messageCount,
    totalChars,
    contentHash,
    inputClass: request.inputClass,
    containsL2: request.containsL2 ?? false,
  };
}
