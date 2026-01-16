import type { AiGatewayMessage } from './ai-gateway.types';

export type RedactionSummary = {
  email: number;
  phone: number;
  iban: number;
  pesel: number;
  nip: number;
  ssn: number;
};

export type RedactionResult = {
  redactedText: string;
  summary: RedactionSummary;
  applied: boolean;
};

const REDACTION_VERSION = 'v1';

const DEFAULT_SUMMARY: RedactionSummary = {
  email: 0,
  phone: 0,
  iban: 0,
  pesel: 0,
  nip: 0,
  ssn: 0,
};

type PatternSpec = {
  key: keyof RedactionSummary;
  regex: RegExp;
  placeholder: string;
};

const PATTERNS: PatternSpec[] = [
  {
    key: 'email',
    regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    placeholder: '[REDACTED_EMAIL]',
  },
  {
    key: 'iban',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
    placeholder: '[REDACTED_IBAN]',
  },
  {
    key: 'pesel',
    regex: /\b\d{11}\b/g,
    placeholder: '[REDACTED_PESEL]',
  },
  {
    key: 'nip',
    regex: /\b\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}\b/g,
    placeholder: '[REDACTED_NIP]',
  },
  {
    key: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    placeholder: '[REDACTED_SSN]',
  },
  {
    key: 'phone',
    regex: /\+?\d[\d\s().-]{6,}\d/g,
    placeholder: '[REDACTED_PHONE]',
  },
];

function mergeSummary(target: RedactionSummary, source: RedactionSummary) {
  for (const key of Object.keys(target) as Array<keyof RedactionSummary>) {
    target[key] += source[key];
  }
}

function applyPattern(text: string, pattern: PatternSpec): { text: string; count: number } {
  const matches = [...text.matchAll(pattern.regex)];
  const count = matches.length;
  if (count === 0) {
    return { text, count };
  }
  return {
    text: text.replace(pattern.regex, pattern.placeholder),
    count,
  };
}

function redactText(text: string): RedactionResult {
  let output = text;
  const summary: RedactionSummary = { ...DEFAULT_SUMMARY };
  let applied = false;

  for (const pattern of PATTERNS) {
    const result = applyPattern(output, pattern);
    output = result.text;
    if (result.count > 0) {
      summary[pattern.key] += result.count;
      applied = true;
    }
  }

  return { redactedText: output, summary, applied };
}

export class PiiRedactionService {
  getVersion() {
    return REDACTION_VERSION;
  }

  redactInputMessages(messages: AiGatewayMessage[]) {
    const summary: RedactionSummary = { ...DEFAULT_SUMMARY };
    let applied = false;
    const redactedMessages = messages.map((message) => {
      const result = redactText(message.content);
      mergeSummary(summary, result.summary);
      if (result.applied) applied = true;
      return { ...message, content: result.redactedText };
    });
    return { messages: redactedMessages, summary, applied };
  }

  redactOutputText(text: string) {
    return redactText(text);
  }
}
