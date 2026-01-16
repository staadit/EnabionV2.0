# R1.0 Intent Coach flow

## Overview

Intent Coach generates a summary block plus suggestions for an Intent using L1
fields only. Suggestions include rewrites, missing information, clarifying
questions, and risk flags. It supports accept/reject decisions and emits
AVATAR_SUGGESTION_* events.

The UI is structured into three blocks:

1) Summary and observations (stored in history, no accept/reject).
2) Suggestions (rewrites, missing info, questions, risks; accept/reject per item).
3) Follow-up instructions + field focus for a new run.

## Endpoints

### POST /intents/:intentId/coach/suggest

Request body (optional):

```json
{
  "requestedLanguage": "EN",
  "tasks": ["intent_gap_detection", "clarifying_questions", "summary_internal"],
  "instructions": "Focus on KPIs and scope only.",
  "focusFields": ["kpi", "scope"],
  "mode": "suggestion_only",
  "channel": "ui"
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
      "kind": "missing_info",
      "title": "Missing KPIs",
      "l1Text": "Add success metrics or measurable outcomes.",
      "evidenceRef": "field:kpi empty",
      "status": "ISSUED",
      "actionable": false,
      "targetField": "kpi"
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

Request body (optional):

```json
{
  "rating": 5,
  "sentiment": "UP",
  "reasonCode": "HELPFUL_STRUCTURING",
  "commentL1": "Clear and actionable."
}
```

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
{
  "rating": 2,
  "sentiment": "DOWN",
  "reasonCode": "NOT_RELEVANT",
  "commentL1": "Missing key constraints."
}
```

Response:

```json
{
  "suggestion": { "id": "uuid", "status": "REJECTED" }
}
```

## Suggestion model

Suggestions are stored in the AvatarSuggestion table:

- kind: missing_info | question | risk | rewrite | summary
- targetField: goal | context | scope | kpi | risks | deadlineAt | client (optional)
- actionable: true when a patch exists, false for non-applying suggestions
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

If the Intent does not have enough L1 data, the API returns 422 with
`INSUFFICIENT_L1_DATA` and does not call the AI Gateway.

Feedback comments are L1-only, capped at 280 characters, and stripped if they
look like names/emails/phones.

## Events

The flow emits:

- AVATAR_SUGGESTION_ISSUED
- AVATAR_SUGGESTION_ACCEPTED
- AVATAR_SUGGESTION_REJECTED
- AVATAR_SUGGESTION_FEEDBACK

Payloads include metadata only and never include raw prompt content.
