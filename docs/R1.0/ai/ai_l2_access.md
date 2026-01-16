# R1.0 AI L2 access

## Overview

AI requests default to L1-only, even if the Intent contains L2 data. L2 content
is allowed only when Mutual NDA is accepted and the intent-level toggle is
explicitly enabled.

## Backend policy

- resolveAiDataAccess({ orgId, intentId, actorUserId }) is the single source of truth.
- requestedDataLevel must be provided by callers ("L1" or "L2").
- requestedDataLevel="L2" is blocked unless NDA is accepted and the toggle is on.
- L2 requests require intentId for enforcement.

## Intent toggle

### PATCH /intents/:intentId/ai-access

Request body:

```json
{
  "allowL2": true,
  "channel": "ui"
}
```

Response:

```json
{
  "intent": {
    "id": "intent-id",
    "aiAllowL2": true,
    "aiAllowL2SetAt": "2026-01-16T12:30:00.000Z",
    "aiAllowL2SetByUserId": "user-id"
  }
}
```

## Redaction

PII redaction is applied both before sending prompts to the provider and after
receiving responses. R1.0 redacts:

- emails
- phone numbers
- IBAN
- PESEL
- NIP
- SSN

## Events

- INTENT_AI_ACCESS_UPDATED is emitted when the toggle changes.
- AI_L2_USED is emitted for each L2 request (metadata only, no prompt text).

## UI

- Intent view shows AI data level (L1 default).
- L2 toggle is disabled until Mutual NDA is accepted.
- Coach requests include requestedDataLevel based on the toggle.
