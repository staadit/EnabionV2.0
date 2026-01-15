# R1.0 Intent Coach flow

## Overview

Intent Coach generates a summary block plus field-level suggestions for an Intent
using L1 fields only. It supports accept/reject decisions and emits
AVATAR_SUGGESTION_* events.

The UI is structured into three blocks:

1) Summary and observations (stored in history, no accept/reject).
2) Field suggestions (accept/reject per field).
3) Follow-up instructions + field focus for a new run.

## Endpoints

### POST /intents/:intentId/coach/suggest

Request body (optional):

```json
{
  "requestedLanguage": "EN",
  "instructions": "Focus on KPIs and scope only.",
  "focusFields": ["kpi", "scope"]
}
```

Response:

```json
{
  "coachRunId": "01J...",
  "intentId": "intentId",
  "summaryBlock": [
    "Short summary bullet.",
    "Observation or risk."
  ],
  "suggestions": [
    {
      "id": "uuid",
      "kind": "rewrite",
      "title": "KPIs",
      "l1Text": "Add KPI targets with numeric thresholds.",
      "evidenceRef": "ai:intent_structuring",
      "status": "ISSUED",
      "actionable": true,
      "targetField": "kpi",
      "proposedPatch": { "fields": { "kpi": "..." } }
    }
  ]
}
```

### GET /intents/:intentId/coach/history

Returns chronological history of summary blocks.

Response:

```json
{
  "intentId": "intentId",
  "items": [
    {
      "id": "01J...",
      "createdAt": "2026-01-23T09:00:00.000Z",
      "summaryItems": ["Bullet 1", "Bullet 2"]
    }
  ]
}
```

### POST /intents/:intentId/coach/suggestions/:suggestionId/accept

Marks the suggestion as ACCEPTED. If a proposedPatch is present, applies it to the
Intent and emits INTENT_UPDATED.

Response:

```json
{
  "suggestion": { "id": "uuid", "status": "ACCEPTED" },
  "appliedFields": ["goal", "scope"]
}
```

### POST /intents/:intentId/coach/suggestions/:suggestionId/reject

Request body (optional):

```json
{ "reasonCode": "NOT_RELEVANT" }
```

Response:

```json
{
  "suggestion": { "id": "uuid", "status": "REJECTED" }
}
```

## Suggestion model

Suggestions are stored in the AvatarSuggestion table:

- kind: rewrite
- targetField: goal | context | scope | kpi | risks
- actionable: true when a patch exists, false for "Jest ok, brak zmian"
- l1Text: short, safe summary of the suggestion
- evidenceRef: safe reference (field name or heuristic)
- proposedPatch: optional JSON with fields to apply
- status: ISSUED | ACCEPTED | REJECTED

Summary history is stored in IntentCoachRun:

- summaryItems: array of bullet points (L1-safe)
- instructions: optional user input for that run
- focusFields: optional field list for that run

## Data boundary

R1.0 uses L1 fields only. Any L2 content (raw pasted text) is blocked by the AI
Gateway and must not be sent to the provider.

## Events

The flow emits:

- AVATAR_SUGGESTION_ISSUED
- AVATAR_SUGGESTION_ACCEPTED
- AVATAR_SUGGESTION_REJECTED

Payloads include metadata only and never include raw prompt content.
