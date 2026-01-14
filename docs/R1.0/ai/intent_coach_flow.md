# R1.0 Intent Coach flow

## Overview

Intent Coach generates reviewable suggestions for an Intent using L1 fields only.
It supports accept/reject decisions and emits AVATAR_SUGGESTION_* events.

## Endpoints

### POST /intents/:intentId/coach/suggest

Request body (optional):

```json
{
  "requestedLanguage": "EN",
  "tasks": ["intent_gap_detection", "clarifying_questions", "summary_internal"]
}
```

Response:

```json
{
  "coachRunId": "01J...",
  "intentId": "intentId",
  "suggestions": [
    {
      "id": "uuid",
      "kind": "missing_info",
      "title": "Missing KPIs",
      "l1Text": "How will success be measured?",
      "evidenceRef": "field:kpi empty",
      "status": "ISSUED",
      "proposedPatch": null
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

- kind: missing_info | question | risk | rewrite | summary
- l1Text: short, safe summary of the suggestion
- evidenceRef: safe reference (field name or heuristic)
- proposedPatch: optional JSON with fields to apply
- status: ISSUED | ACCEPTED | REJECTED

## Data boundary

R1.0 uses L1 fields only. Any L2 content (raw pasted text) is blocked by the AI
Gateway and must not be sent to the provider.

## Events

The flow emits:

- AVATAR_SUGGESTION_ISSUED
- AVATAR_SUGGESTION_ACCEPTED
- AVATAR_SUGGESTION_REJECTED

Payloads include metadata only and never include raw prompt content.
