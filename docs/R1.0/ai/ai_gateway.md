# R1.0 AI Gateway

This document describes the backend AI Gateway used by server-side Avatar flows.

## Purpose

- Centralize all LLM calls through a single service.
- Enforce guardrails (allowlist, limits, redaction).
- Emit AI_GATEWAY_* events with metadata only.

## Environment variables

- OPENAI_API_KEY
- OPENAI_ORG_ID (optional)
- OPENAI_PROJECT_ID (optional)
- AI_GATEWAY_DEFAULT_MODEL
- AI_GATEWAY_ALLOWED_MODELS (comma-separated)
- AI_GATEWAY_MAX_OUTPUT_TOKENS
- AI_GATEWAY_MAX_INPUT_CHARS
- AI_GATEWAY_TIMEOUT_MS
- AI_GATEWAY_DEFAULT_TEMPERATURE
- AI_GATEWAY_RL_TENANT_RPM
- AI_GATEWAY_RL_USER_RPM
- AI_GATEWAY_RL_USECASE_RPM (JSON map)
- AI_GATEWAY_RL_BACKEND (postgres|memory)
- AI_GATEWAY_RL_CLEANUP_INTERVAL_MS
- AI_GATEWAY_RL_RETENTION_HOURS
- LOG_LEVEL
- LOG_PRETTY

## Use cases (canonical)

Values must match the AI_Gateway_Avatars_R1.0_Spec.md task_type list:

- intent_structuring
- intent_gap_detection
- clarifying_questions
- fit_scoring
- summary_internal
- help_explanation

## Calling the gateway

Use AiGatewayService.generateText() from backend code. The request must include
inputClass plus requestedDataLevel to enforce the L1/L2 boundary.

```ts
const result = await aiGateway.generateText({
  tenantId: orgId,
  userId,
  intentId,
  useCase: 'intent_gap_detection',
  messages: [
    { role: 'system', content: 'Identify missing fields.' },
    { role: 'user', content: 'Goal: Launch R1.0' },
  ],
  requestedDataLevel: 'L1',
  inputClass: 'L1',
  containsL2: false,
});
```

## Guardrails

- Only models in AI_GATEWAY_ALLOWED_MODELS are accepted.
- inputClass and containsL2 must match the actual data classification.
- requestedDataLevel=L1 blocks any L2 content in the request.
- requestedDataLevel=L2 requires NDA + explicit intent-level toggle (backend-enforced).
- Requests over AI_GATEWAY_MAX_INPUT_CHARS are rejected.
- Rate limits are enforced per tenant/user/useCase.
- PII is redacted before sending to the provider and after receiving the response.

## Events

The gateway emits:

- AI_GATEWAY_REQUESTED
- AI_GATEWAY_SUCCEEDED
- AI_GATEWAY_FAILED
- AI_GATEWAY_BLOCKED_POLICY
- AI_GATEWAY_RATE_LIMITED
- AI_L2_USED

Payloads include metadata only (no prompt/body).
