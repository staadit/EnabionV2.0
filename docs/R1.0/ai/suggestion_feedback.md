# R1.0 Suggestion feedback

## Overview

Suggestion feedback captures user reactions to avatar suggestions. Feedback is
optional and is stored for analytics and model iteration. The feedback flow is
attached to suggestion accept/reject in Intent Coach.

## Data model

AvatarSuggestionFeedback:

- orgId, intentId, suggestionId
- userId (optional)
- decision: ACCEPTED | REJECTED
- rating: 1-5 (optional)
- sentiment: UP | DOWN | NEUTRAL (optional)
- reasonCode: HELPFUL_STRUCTURING | TOO_GENERIC | INCORRECT_ASSUMPTION | MISSING_CONTEXT | NOT_RELEVANT | ALREADY_KNOWN | OTHER (optional)
- commentL1: optional free text (max 280 chars, L1-only)
- createdAt

## Endpoints

Feedback is submitted alongside the decision:

### POST /intents/:intentId/coach/suggestions/:suggestionId/accept

```json
{
  "rating": 5,
  "sentiment": "UP",
  "reasonCode": "HELPFUL_STRUCTURING",
  "commentL1": "Clear and actionable."
}
```

### POST /intents/:intentId/coach/suggestions/:suggestionId/reject

```json
{
  "rating": 2,
  "sentiment": "DOWN",
  "reasonCode": "NOT_RELEVANT",
  "commentL1": "Missing key constraints."
}
```

## Data boundary

- Feedback is L1-only.
- commentL1 is trimmed to 280 characters.
- Comments that look like names/emails/phones are stripped before storage.

## Events

When feedback is provided, the backend emits AVATAR_SUGGESTION_FEEDBACK:

```json
{
  "orgId": "orgId",
  "intentId": "intentId",
  "suggestionId": "uuid",
  "avatarType": "INTENT_COACH",
  "suggestionKind": "missing_info",
  "decision": "ACCEPTED",
  "rating": 5,
  "sentiment": "UP",
  "reasonCode": "HELPFUL_STRUCTURING",
  "commentL1": "Clear and actionable."
}
```
