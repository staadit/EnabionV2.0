# Minimal R1.0 Event Protocol (BCOS Hard Contract) — v1.0

Status: **HARD CONTRACT** (R1.0)  
Owner: **CTO/COO (Mieszko)**  
Audience: Backend, Frontend, AI Gateway, Data/Analytics  
Last updated: **2025-12-15 (CET)**

---

## 0) Why this exists

Enabion R1.0 is *protocol-driven*. The Event Protocol is the **runtime contract** between:
- product actions (UI / API / email ingestion),
- AI Gateway (Avatars),
- audit & confidentiality controls,
- telemetry/metrics (funnel + drop-offs),
- future Data Models (R2.0+).

If we implement features without enforcing this protocol, we will ship UI flows that are not measurable, not auditable, and not evolvable.

**Non-negotiable rule:** every *state-changing* operation MUST emit a validated event.

---

## 1) Scope and non-scope

### In scope (R1.0)
- Canonical **event envelope** (required fields + meaning).
- Canonical **event type catalogue** (minimum set for R1.0).
- Minimal **payload schemas** (what must be present to support audit + AI + analytics).
- Versioning, idempotency and correlation rules.
- Confidentiality rules (L1/L2 + NDA Layer 1 gating) applied to event payloads.
- Enforcement requirements (backend runtime validation + tests).

### Out of scope (R1.0)
- Streaming/event bus, distributed consumers, CQRS projections (can be added later).
- Full TrustGraph / disputes / Deliver & Expand event families (R2.0+).

---

## 2) Canonical event envelope (schemaVersion = 1)

All events MUST conform to this envelope. Fields are required unless explicitly marked optional.

```json
{
  "eventId": "ulid-or-uuid",
  "schemaVersion": 1,
  "type": "INTENT_CREATED",
  "occurredAt": "2025-12-15T10:30:00.000Z",
  "recordedAt": "2025-12-15T10:30:00.123Z",

  "orgId": "org_ulid",
  "actorUserId": "user_ulid | null",
  "actorOrgId": "org_ulid | null",

  "subjectType": "INTENT | NDA | ORG | USER | CONTACT | ENGAGEMENT | TRUSTSCORE_SNAPSHOT",
  "subjectId": "ulid",

  "lifecycleStep": "CLARIFY | MATCH_ALIGN | COMMIT_ASSURE",
  "pipelineStage": "NEW | CLARIFY | MATCH | COMMIT | WON | LOST",

  "channel": "ui | api | email_forward | email_reply | system",
  "correlationId": "ulid-or-request-id-or-email-thread-id",
  "payload": { "payloadVersion": 1 }
}
```

### Field semantics
- **eventId**: globally unique. ULID preferred (sortable), UUID acceptable.
- **occurredAt**: when user/system action logically happened.
- **recordedAt**: when we persisted the event.
- **orgId**: tenant boundary. MUST be present on *every* event.
- **actorUserId**: null allowed for `system` events (cron, ingestion).
- **actorOrgId**: required only for **cross-org** events (X↔Y invite/response).
- **subjectType/subjectId**: “what this event is about”.
- **lifecycleStep/pipelineStage**: required for funnel/analytics. If unknown, derive from current state.
- **correlationId**: mandatory to connect related actions (request id, email thread id, invite token id, etc.).

---

## 3) Confidentiality rules (Model 1, R1.0)

### 3.1 No NDA, no L2 in payload
If NDA Layer 1 is not accepted, events MUST NOT contain L2 data in payload.
Instead:
- store **L1-safe excerpts**, or
- store **references** (entity IDs) that are gated server-side.

### 3.2 Minimal leakage principle
Event payload should contain only what is required to:
- audit “what happened” and “who did it”,
- enable AI summarisation / suggestions *within allowed confidentiality*,
- compute telemetry.

Avoid embedding:
- raw client email bodies beyond what’s needed for parsing/traceability,
- full attachments.

---

## 4) R1.0 event types — minimum catalogue

This is the **minimum set**. You may add more, but you MUST NOT rename or repurpose these.

### 4.1 Intent core
1) **INTENT_CREATED** *(required)*  
   Payload (min):
   - `intentId`
   - `title`
   - `language` (PL/DE/NL/EN/unknown)
   - `confidentialityLevel` (L1/L2)
   - `source` (manual|paste|email)
2) **INTENT_UPDATED** *(required)*  
   Payload (min):
   - `intentId`
   - `changedFields[]`
   - `changeSummary` (L1-safe)
3) **INTENT_PIPELINE_STAGE_CHANGED** *(required if pipeline exists in UI)*  
   Payload (min):
   - `intentId`
   - `fromStage`, `toStage`

### 4.2 NDA / confidentiality
4) **NDA_PRESENTED** *(recommended)*  
   Payload: `ndaId`, `ndaLayer` (=1), `counterpartyOrgId` (optional)
5) **NDA_ACCEPTED** *(required)*  
   Payload: `ndaId`, `ndaLayer` (=1), `acceptedByUserId`, `acceptedAt`
6) **CONFIDENTIALITY_LEVEL_CHANGED** *(required when L1/L2 toggles exist)*  
   Payload: `intentId`, `fromLevel`, `toLevel`

### 4.3 Avatars (AI)
7) **AVATAR_SUGGESTION_ISSUED** *(required)*  
   Payload (min):
   - `intentId`
   - `avatarType` (SYSTEM|ORG_X|INTENT_COACH)
   - `suggestionId`
   - `suggestionKind` (missing_info|risk|question|rewrite|summary)
   - `suggestionL1Text` (safe excerpt) OR `suggestionRef` (gated)
8) **AVATAR_SUGGESTION_ACCEPTED** *(required)*  
   Payload: `suggestionId`, `intentId`, `appliedFields[]`
9) **AVATAR_SUGGESTION_REJECTED** *(required)*  
   Payload: `suggestionId`, `intentId`, `reasonCode` (optional)
10) **AVATAR_FEEDBACK_RECORDED** *(required if feedback UI exists)*  
    Payload: `avatarType`, `intentId`, `rating`, `freeText` (L1-safe)

### 4.4 Matching + invite/response + commit
11) **MATCH_LIST_CREATED** *(required)*  
    Payload: `intentId`, `matchListId`, `algorithmVersion`, `topCandidates[]` (ids only)
12) **PARTNER_INVITED** *(required if Y invite exists)*  
    Payload: `intentId`, `partnerOrgId`, `inviteId`, `accessLevel` (L1-only for share link)
13) **PARTNER_RESPONSE_RECEIVED** *(required if responses exist)*  
    Payload: `intentId`, `partnerOrgId`, `responseId`, `goNoGo`, `ownerUserId` (if set), `attachmentCount`
14) **COMMIT_DECISION_TAKEN** *(required)*  
    Payload: `intentId`, `decision` (commit|no_commit), `selectedPartnerOrgId` (optional)

### 4.5 Email intake (required only if Email → Intent is shipped)
15) **EMAIL_RECEIVED**  
    Payload: `messageId`, `threadId`, `from`, `subject`, `language`
16) **EMAIL_THREAD_MAPPED_TO_INTENT**  
    Payload: `threadId`, `intentId`
17) **EMAIL_APPLIED_AS_INTENT_UPDATE**  
    Payload: `intentId`, `messageId`, `updatedFields[]`

### 4.6 TrustScore (required only if TrustScore UI is shipped in R1.0)
18) **TRUSTSCORE_SNAPSHOT_CREATED**  
    Payload: `orgId`, `score`, `factors[]`, `computedAt`, `algorithmVersion`

---

## 5) Versioning rules

- **schemaVersion** changes only when the *envelope* changes.
- Each payload MUST include `payloadVersion` and MUST be backward-readable for the whole of R1.0.
- Never reuse an event type name with different meaning. Add a new type instead.

---

## 6) Idempotency and correlation

### 6.1 Idempotency
- The event store MUST enforce uniqueness of `(eventId)` (or `(orgId, eventId)`).
- Email-driven flows MUST additionally ensure idempotency per `messageId`.

### 6.2 Correlation
- Every request MUST generate a `correlationId`.
- Email flows SHOULD use `threadId` as correlationId (or embed it in correlationId).

---

## 7) Enforcement requirements (hard)

### 7.1 Backend must validate
- Provide a single `emitEvent()` helper that:
  1) validates envelope + payload schema (runtime),
  2) persists event,
  3) returns eventId,
  4) fails the request (400/500) if validation fails.

### 7.2 Tests must enforce the contract
Minimum test suite:
- Contract tests for each event type payload schema.
- Integration test: “create Intent” emits `INTENT_CREATED`.
- Tenant isolation test: user from org A cannot read events of org B.
- NDA gate test: L2 payload blocked before NDA acceptance.

---

## 8) Storage (event store baseline)

Minimum DB approach (Postgres):
- `events` table with JSONB payload, indexed by `orgId`, `subjectId`, `type`, `occurredAt`.
- Append-only; updates are not allowed (except rare migration via admin job, logged separately).

---

## 9) Practical mapping to R1.0 work

This protocol is authored as a doc, but it becomes real only when:
- Event store exists (G1),
- UI + API use it everywhere,
- Telemetry dashboard queries the event log (G8 readiness).

