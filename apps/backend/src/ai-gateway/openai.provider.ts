import { Injectable } from '@nestjs/common';
import type { AiGatewayMessage } from './ai-gateway.types';
import type { AiGatewayConfig } from './ai-gateway.config';

type OpenAiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type OpenAiResult = {
  text: string;
  model: string;
  usage?: OpenAiUsage;
};

export class OpenAiProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
    public readonly errorClass: string,
  ) {
    super(message);
  }
}

@Injectable()
export class OpenAiProvider {
  constructor(private readonly config: AiGatewayConfig) {}

  async generateText(input: {
    model: string;
    messages: AiGatewayMessage[];
    maxOutputTokens: number;
    temperature: number;
  }): Promise<OpenAiResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.openaiApiKey}`,
          'Content-Type': 'application/json',
          ...(this.config.openaiOrgId ? { 'OpenAI-Organization': this.config.openaiOrgId } : {}),
          ...(this.config.openaiProjectId ? { 'OpenAI-Project': this.config.openaiProjectId } : {}),
        },
        body: JSON.stringify({
          model: input.model,
          input: input.messages,
          max_output_tokens: input.maxOutputTokens,
          temperature: input.temperature,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const status = res.status;
        const errorClass =
          status === 401 || status === 403
            ? 'OPENAI_AUTH'
            : status === 429
              ? 'OPENAI_RATE_LIMIT'
              : `OPENAI_HTTP_${status}`;
        throw new OpenAiProviderError(`OpenAI HTTP ${status}`, status, errorClass);
      }

      const data = await res.json();
      const output = Array.isArray(data.output) ? data.output : [];
      const text = output
        .flatMap((msg: any) => (Array.isArray(msg?.content) ? msg.content : []))
        .filter((content: any) => content?.type === 'output_text')
        .map((content: any) => String(content?.text ?? ''))
        .join('');

      const usage = data.usage
        ? {
            inputTokens: data.usage.input_tokens ?? undefined,
            outputTokens: data.usage.output_tokens ?? undefined,
            totalTokens: data.usage.total_tokens ?? undefined,
          }
        : undefined;

      return {
        text,
        model: data.model || input.model,
        usage,
      };
    } catch (err: any) {
      if (err instanceof OpenAiProviderError) {
        throw err;
      }
      if (err?.name === 'AbortError') {
        throw new OpenAiProviderError('OpenAI timeout', null, 'OPENAI_TIMEOUT');
      }
      throw new OpenAiProviderError('OpenAI network error', null, 'OPENAI_NETWORK');
    } finally {
      clearTimeout(timeout);
    }
  }
}
