# AI Gateway & Avatars - Design & Guardrails (R1.0)

Status: Internal / M0  
Version: 0.1 (draft for R1.0)  
Date: 2025-12-10  
Owner: CTO (Mieszko2.0)  
Contributors: CEO, Dev Lead (Ewa)  

Related documents:
- Enabion - Playbook v2.3 (2025)  
- Enabion - Full implementation plan v0.4  
- [M0] MVP - Product Spec R1.0 (Issue #1)  
- [M0] BCOS Data & Event Model v1 (MVP) (Issue #2)  
- [M0] Architecture Overview - MVP (R1.0) (Issue #3)  
- [M0] Security & Privacy baseline - Model 1 (MVP) (Issue #5)  
- [M0] Mutual NDA (Layer 1) & L0/L1 product copy (Issue #6)  
- [M1] Integrations Playbook - email -> Intent (MVP) (Issue #8)  
- [M1] TrustScore & Trust Graph - Methodology v0 (Issue #10)  
- [M1] Definition of Done & dev standards (R1.0) (Issue #11)  

---

## 0. Scope & reading notes

This document defines how Avatars and the AI Gateway behave in **Release R1.0** of Enabion:

- which Avatars exist and are active in R1.0,
- what each Avatar is allowed to do (auto vs suggestion vs forbidden),
- how "I don't know / need more data" works,
- how all AI behaviour is logged (`AVATAR_SUGGESTION_*` events),
- how language handling, data boundaries and NDA levels influence Avatar behaviour,
- what minimal responsibilities the AI Gateway has in R1.0,
- high-level roadmap stubs for R1.1+.

This spec is part of the R1.0 product specification. In the codebase it should be referenced as:

- `docs/AI_Gateway_Avatars_R1.0_Spec.md` (standalone), and
- summarised / cross-linked from `docs/Phase1_MVP-Spec.md`.

### 0.1 In-scope (R1.0)

- Data model: **Model 1 - Standard** only.
- NDA layers: **Layer 0 (No-NDA Zone)** and **Layer 1 (Enabion Mutual NDA)**.
- Confidentiality: **L1 (public/matching)** and **L2 (confidential / NDA)**. L3 is UI-only placeholder.
- Avatars in production use:
  - **System Avatar**,
  - **Organisation Avatar X (light)**,
  - **Intent Coach / Brief Scanner**.
- Languages: **PL, DE, NL** plus **EN** as default/fallback.
- All Avatar actions confined to **pre-sales / Intent & pipeline** part of the lifecycle: Clarify -> Match -> Commit.

### 0.2 Out of scope (R1.0)

- Data Models 2-3 (Shielded/Sovereign).
- NDA Layers 2-3 (Custom NDA FastTrack, External NDA connectors).
- Project Avatars, User & Team Avatars, Deal Risk Advisor, Program Avatars (only referenced for future).
- Trust Rooms, Deliver / Expand features.
- Full ODR / Dispute Resolution.
- Full TrustGraph and EnableMark runtime logic (R3.0+).

---

## 1. Objectives & principles

### 1.1 Objectives

For R1.0 the Avatar & AI Gateway layer must:

1. Make **Intent creation and refinement radically easier** for BD/AM/PM on the X side, starting from messy emails / notes.
2. Provide **consistent, explainable AI behaviour** that can be trusted in pre-sales, even by cautious clients.
3. Respect **data ownership, confidentiality and NDA boundaries** by design.
4. Generate **structured logs** of AI assistance that can be used later for TrustScore, ODR and audits.
5. Be **language-aware** (PL/DE/NL + EN) and culturally neutral.

### 1.2 Design principles

1. **Agents-assisted, human-governed**

   - Avatars never make final, irreversible business decisions.
   - They propose; humans dispose. Everything is logged.

2. **"I don't know" is a first-class outcome**

   - If an Avatar does not have enough data or the question is out of scope, it must prefer:
     - asking for clarification, or
     - explicitly stating "I don't know / I am not allowed to decide"
   - rather than hallucinating.

3. **Log everything important once**

   - Every AI suggestion that can move a deal or project forward is logged as `AVATAR_SUGGESTION_*` with:
     - input reference,
     - model version,
     - suggestion type & confidence,
     - human decision and feedback.

4. **Minimal intrusion, maximal structure**

   - Avatars work with the user, not against them:
     - they never rewrite data silently,
     - they do not spam suggestions,
     - they offer clear, structured outputs that map to the BCOS data model.

5. **Single AI Gateway**

   - All Avatar calls to LLMs go through the **AI Gateway** service.
   - Avatar layer never talks directly to external model APIs.

---

## 2. Avatars in R1.0

### 2.1 Common definitions

- **Avatar type codes (for events & API)**
  - `system` - System Avatar
  - `org_x` - Organisation Avatar X (light)
  - `intent_coach` - Intent Coach / Brief Scanner
  - Reserved (not implemented in R1.0): `org_y`, `user`, `project`, `deal_risk`, `program`.

- **Context sources**
  - `org_profile` - Organisation profile (markets, services, languages, size).
  - `user_profile` - Role and preferences of the current user.
  - `intent` - Current Intent being created or edited.
  - `pipeline` - Minimal information about pipeline stage and status.
  - `playbook` - Static knowledge derived from the Enabion Playbook (BCOS, lifecycle, L1/L2/L3, NDA).
  - `settings` - Organisation config for languages, limits, etc.

#### 2.1.1 Pre-sales lifecycle focus

In R1.0 Avatars only operate in these lifecycle segments:

- **Clarify** - from raw email / idea to structured Intent.
- **Match & Align (light)** - optional suggestions about partner matching (if used).
- **Commit & Assure (light)** - reminders and structuring help around NDA and Commit decisions.

They do **not** operate in Deliver / Expand yet.

---

### 2.2 System Avatar

**Mission:** act as the guide and guard for the whole Enabion experience; explain concepts, nudge users through the standard lifecycle, and enforce basic governance constraints.

#### 2.2.1 Responsibilities (R1.0)

- Onboarding new organisations and users:
  - explain key concepts: Intent, CONNECT-POWER-GROW, 5-Step lifecycle, L1/L2/L3, NDA layers.
  - guide the user to create their first Intent (hand-off to Intent Coach for deep work).
- Explain "why" of the system:
  - answer "what does this screen mean", "what is TrustScore", "what is Mutual NDA", using Playbook-aligned language.
- Governance nudges:
  - remind users when they try to enter L2/L3 information without proper NDA in place.
  - highlight missing critical fields before moving an Intent to `Commit` stage.
- Safety:
  - respond "out of scope" when asked for detailed legal advice, tax advice, HR decisions, etc.
  - clarify AI limitations and boundaries when asked "can you sign for us / decide for us".

#### 2.2.2 Allowed actions (R1.0)

- **Auto:**
  - show inline help texts and tooltips.
  - open relevant sections of the Playbook-derived help.
  - propose next actions (e.g. "You probably want to send this clarified Intent to potential partners").

- **Suggestion-only (requires explicit user accept):**
  - generate checklists for "before you send this Intent to Y".
  - generate explanation blocks for internal communication (e.g. explaining L1/L2/L3 in plain language).

- **Forbidden:**
  - modifying Intent content directly.
  - changing pipeline stage.
  - sending emails or external messages.
  - altering NDA status or level of confidentiality.

---

### 2.3 Organisation Avatar X (light)

**Mission:** represent the strategy, preferences and constraints of a single X-organisation in pre-sales; help BD/AM decide which Intents are worth pursuing and how.

#### 2.3.1 Responsibilities (R1.0)

- Profile-based guidance:
  - interpret the org profile (markets, services, technologies, sectors).
  - suggest if an Intent is in or out of strategic focus.
- Lead qualification (light):
  - highlight Intents that fit the organisation well vs those that likely do not.
- Prioritisation hints:
  - propose priority tags (high/medium/low) based on strategic fit and capacity notes (if available).
- Tailored questions:
  - generate clarifying questions that reflect the organisation's language and typical concerns.

#### 2.3.2 Allowed actions (R1.0)

- **Auto:**
  - compute an internal `fit_score` for each Intent (0-1) and expose it as a suggestion/label.
  - pre-fill suggested tags / labels on an Intent (e.g. sector, type) - user may edit before saving.

- **Suggestion-only:**
  - propose "we should / should not engage" text for internal discussion.
  - propose first draft of internal notes for the Intent card.

- **Forbidden:**
  - changing Intent owner or responsible BD/AM.
  - setting final priority / commit decision.
  - contacting clients or partners directly.

#### 2.3.3 Data access (R1.0)

- Can access:
  - `org_profile` of its own organisation.
  - all Intents of this organisation (metadata + content).
  - pipeline status for those Intents.
- Cannot access:
  - any data from other organisations.
  - TrustGraph global data (only basic hints from TrustScore MVP as provided via API).

---

### 2.4 Intent Coach / Brief Scanner

**Mission:** transform chaotic source material (emails, RFPs, notes) into a **structured Intent**, detect gaps and risks, and prepare clarifying questions.

#### 2.4.1 Responsibilities (R1.0)

- Parsing inputs:
  - email body, subject, attachments (text-only in R1.0).
  - manual notes pasted by users.
- Building structured Intent:
  - goal, context, scope, assumptions, constraints, KPI, risks.
- Gap detection:
  - identify missing key fields (KPI, budget, timeline, stakeholder context, regulatory hints).
- Clarifying questions:
  - generate a concise list of questions to ask the client X (or internal stakeholders).
- Risk flagging (light):
  - flag obvious high-level risks (e.g. unrealistic timeline, unclear ownership, sector with heavy regulation).

#### 2.4.2 Allowed actions (R1.0)

- **Auto:**
  - create a **draft Intent** object from raw text, not yet committed to the database until the user confirms.
  - update a draft Intent with improved structure and wording during an editing session.

- **Suggestion-only:**
  - suggest edits to an existing Intent (show diffs / proposed changes).
  - propose list of clarifying questions to send to the client.
  - propose a short "Intent summary" for internal communication.

- **Forbidden:**
  - silently overwriting a saved Intent without explicit user confirmation.
  - assigning pipeline stage or commit decision.
  - making binding recommendations about partner choice (matching is outside of R1.0 for X in most flows).

#### 2.4.3 Data access (R1.0)

- Inputs:
  - full text of the email / note or RFP relevant to the Intent.
  - current draft of the Intent.
- Outputs:
  - structured Intent fields,
  - suggestions, questions and risk notes.

---

### 2.5 Avatar families out of scope in R1.0 (for completeness)

The following Avatar families are **not implemented** in R1.0 but are included for roadmap alignment:

- **Organisation Avatar Y** - mirrors Org Avatar X for vendors Y.
- **Project Avatar / Project Companion** - watches over execution in Deliver/Expand.
- **User & Team Avatars** - assistants for specific BD/AM/PM and teams.
- **Deal Risk Advisor** - analyses proposals vs risk policies, prior projects, regulations.
- **Program Avatars** - govern programmes spanning many projects and vendors.

Their behaviour will be defined separately for R2.0+.

---

## 3. Allowed actions matrix (R1.0)

The table below summarises which actions Avatars may perform automatically, which are suggestions only, and which are forbidden in R1.0.

| ID | Action category                                | Risk level | System Avatar | Org Avatar X | Intent Coach |
|----|-----------------------------------------------|-----------:|--------------:|-------------:|-------------:|
| A1 | Generate draft structured Intent from email   | Low        | -             | -            | **Auto**     |
| A2 | Update existing Intent fields                 | Medium     | -             | Suggestion   | Suggestion   |
| A3 | Generate clarifying questions for client      | Low        | Suggestion    | Suggestion   | **Suggestion** |
| A4 | Propose internal "go / no-go" recommendation  | Medium     | -             | Suggestion   | -            |
| A5 | Change pipeline stage (e.g. to Commit)        | High       | Forbidden     | Forbidden    | Forbidden    |
| A6 | Send e-mail or message to client/partner      | High       | Forbidden     | Forbidden    | Forbidden    |
| A7 | Change NDA status or confidentiality level    | High       | Forbidden     | Forbidden    | Forbidden    |
| A8 | Add/check L1/L2 consistency warnings          | Medium     | Auto          | -            | -            |
| A9 | Generate short internal summary of an Intent  | Low        | Suggestion    | Suggestion   | Suggestion   |
| A10| Modify organisation profile                   | Medium     | -             | Forbidden    | Forbidden    |

Notes:

- "Auto" means the Avatar may perform this action directly in the UI **but**:
  - changes must still be visible and reversible by the user before final save.
- "Suggestion" means the Avatar may propose this action, but the user must explicitly accept or ignore it.
- "Forbidden" means the Avatar must never perform or propose this; if prompted, it must respond with "I am not allowed to do this" and log nothing beyond a generic help action.

---

## 4. "I don't know / need more data" policy

"I don't know" is a required, explicit form of response for all Avatars.

### 4.1 Common rules

- If available data is insufficient, contradictory, or out of scope, the Avatar must:
  1. Explain what is missing or why it cannot answer.
  2. Propose concrete next steps (e.g. questions to ask, data to add).
- Avatar should not attempt speculative answers or fabricate details.
- "I don't know" cases are not considered failures; they are part of safe operation.

### 4.2 Triggers

Each Avatar has typical "I don't know" trigger conditions:

- **System Avatar**
  - questions about legal or tax consequences,
  - requests to change NDA or legal terms,
  - questions outside Enabion (e.g. "Which CRM should we buy").

- **Org Avatar X**
  - Intent clearly outside org profile,
  - conflicting strategic preferences (e.g. two owners set contradictory directions),
  - missing critical fields (no sector, no approximate budget, no timeline).

- **Intent Coach**
  - source text less than a minimal length or with no actionable content,
  - heavily contradictory requirements (obvious inconsistency),
  - language not supported in R1.0.

### 4.3 Response patterns (language-aware)

Each Avatar should respond using a language-aware pattern:

- In PL: `"Nie mam wystarczaj?cych informacji, ?eby odpowiedzie? precyzyjnie. Brakuje mi: [...]"`
- In DE: `"Ich habe nicht gen?gend Informationen, um pr?zise zu antworten. Es fehlt mir: [...]"`
- In NL: `"Ik heb niet genoeg informatie om precies te antwoorden. Wat nog ontbreekt: [...]"`
- Otherwise or when in doubt: EN: `"I do not have enough information to answer this reliably. I am missing: [...]"`

The missing pieces list should be concise (3-7 bullets).

### 4.4 Logging

When an Avatar returns "I don't know / need more data":

- It still emits `AVATAR_SUGGESTION_ISSUED` with:
  - `suggestion_type = "need_more_data"`,
  - list of missing information in the payload.
- User feedback on whether this was helpful is collected as usual.

---

## 5. AI Gateway (R1.0) - responsibilities & design

### 5.1 Role in architecture

The **AI Gateway** is a backend service that:

1. Receives high-level **tasks** from Avatars (e.g. "structure this Intent", "generate questions").
2. Chooses the appropriate underlying language model (small vs larger, etc.).
3. Applies organisation-level limits and cost guardrails.
4. Enforces data boundaries (org isolation, Model 1 - Standard only).
5. Logs **AI usage metadata** for audit and TrustScore.

Avatars never call model APIs directly; they call the AI Gateway with a structured request.

### 5.2 Task model

Gateway defines a set of `task_type` values. For R1.0 we support at minimum:

- `intent_structuring` - from raw text to structured Intent.
- `intent_gap_detection` - list of missing elements / incomplete fields.
- `clarifying_questions` - questions to ask client/internal.
- `fit_scoring` - assessment of strategic fit (Org Avatar X).
- `summary_internal` - short internal summaries.
- `help_explanation` - explanation of concepts (System Avatar).

The Gateway request schema (conceptual):

```json
{
  "org_id": "ORG-123",
  "user_id": "USER-456",
  "avatar_type": "intent_coach",
  "task_type": "intent_structuring",
  "input_language": "de",
  "requested_language": "de",
  "input_refs": {
    "email_id": "EMAIL-789",
    "intent_draft_id": "INTENT-111"
  },
  "input_text": "<trimmed user text or structured JSON>",
  "constraints": {
    "max_output_tokens": 1024,
    "tone": "business-neutral"
  }
}
```

The Gateway response schema (conceptual):

```json
{
  "model_family": "llm_small_v1",
  "model_version": "2025-12-01",
  "output_language": "de",
  "output": {
    "structured_intent": { "...": "..." },
    "questions": [ "..." ],
    "notes": [ "..." ]
  },
  "meta": {
    "prompt_tokens": 1134,
    "completion_tokens": 512,
    "latency_ms": 850
  }
}
```

### 5.3 Model routing (R1.0)

- Two logical model classes:
  - `llm_small` - cheaper, fast, used for:
    - classification, tagging, gap detection,
    - short explanations.
  - `llm_reasoning` - more capable, used for:
    - complex Intent structuring,
    - multi-step reasoning,
    - long summaries.
- Default mapping:
  - `intent_structuring` -> `llm_reasoning`
  - `intent_gap_detection` -> `llm_small`
  - `clarifying_questions` -> `llm_small`
  - `fit_scoring` -> `llm_small`
  - `summary_internal` -> `llm_small`
  - `help_explanation` -> `llm_small`

Per-task overrides can be configured in code but do not require UI in R1.0.

### 5.4 Limits & cost guardrails

Per organisation the Gateway keeps:

- `monthly_ai_token_limit` - soft limit of AI tokens per month.
- `max_tokens_per_call` - max tokens the Gateway will ask for in a single request.
- `max_concurrent_calls_per_user` - simple flood-protection.

Behaviour:

- If `monthly_ai_token_limit` is reached:
  - Avatars switch to "light mode":
    - still allowed for short explanations (`help_explanation`),
    - heavy tasks (large structuring, long summaries) are blocked with a friendly message.
- All limits are configurable via backend config; no R1.0 UI required, except for generic "you reached your AI budget" message.

### 5.5 Data boundaries & Model 1 - Standard

In R1.0:

- Only **Model 1 - Standard** is active:
  - data is stored in Enabion's multi-tenant cloud,
  - only L1/L2 content is handled by Avatars.
- The Gateway enforces tenant isolation:
  - every call includes `org_id`,
  - the Gateway cannot load content from any other organisation.
- No cross-organisation RAG / global content is used in Avatar reasoning in R1.0.
- Gateway may use static global Playbook knowledge (product docs) which is non-customer data.

### 5.6 Logging & audit

For every call the Gateway creates an **AI call log** record (internal):

- `call_id`
- `timestamp`
- `org_id`, `user_id`, `avatar_type`, `task_type`
- `model_family`, `model_version`
- `input_token_count`, `output_token_count`
- `cost_estimate`
- `status` (success/error/cancelled)

If the Avatar result leads to a user-visible suggestion, separate `AVATAR_SUGGESTION_*` events are emitted (see section 8).

---

## 6. Language handling (R1.0)

### 6.1 Supported languages

- Full support (input + output, UI + Avatars): **PL, DE, NL**.
- EN is always available as a default / fallback language.
- Every organisation has a **default UI language**; every user may have a **personal UI language**.

### 6.2 Language detection

When a new Intent is created from an email or pasted text:

1. The Gateway (or a light utility model) detects the **primary language**.
2. This is stored as `intent.language_primary`.
3. If detection confidence is low:
   - the user is asked to confirm or override.

### 6.3 Avatar language behaviour

- By default, Avatars respond in:
  - the user's UI language if supported and relevant, otherwise
  - the `intent.language_primary`, otherwise
  - EN.
- The request carries both:
  - `input_language` - detected from text,
  - `requested_language` - target output language; may be overridden in UI.

### 6.4 Unsupported languages

If the text is in a language not supported in R1.0:

- Avatars respond in EN (or user's UI language if possible) and:
  - explain that this language is not fully supported yet,
  - suggest the user to rewrite or summarise in PL/DE/NL/EN.
- Event `AVATAR_SUGGESTION_*` is still logged with `language = "unknown"` or ISO code if detectable.

---

## 7. Data boundaries & privacy (Avatar-level)

### 7.1 General rules

- Avatars cannot see more data than the current user is allowed to see.
- All Avatar operations are confined to the **current organisation** (`org_id`).
- When logging suggestions, we store **references** and minimal context, not full raw content.

### 7.2 Per-Avatar access

- **System Avatar**
  - Access:
    - global, static product knowledge (Playbook),
    - minimal metadata about the current screen / entity,
    - NDA status and L1/L2 level of the current Intent.
  - No access to:
    - full history of other organisations,
    - details of non-current Intents.

- **Org Avatar X**
  - Access:
    - organisation profile data,
    - all Intents and pipeline metadata of this organisation,
    - minimal TrustScore MVP signals (as provided by API).
  - No access to:
    - any other organisation's data,
    - Identity & Truth raw data.

- **Intent Coach**
  - Access:
    - full text of raw input (email, notes),
    - current Intent draft,
    - relevant org configuration (languages etc.).
  - No access to:
    - historic projects beyond the current Intent in R1.0.

### 7.3 Logging text vs references

- In `AVATAR_SUGGESTION_*` events we:
  - DO store:
    - brief textual suggestion (limited length),
    - generated questions,
    - category labels, scores.
  - DO NOT store:
    - full raw email text (only `email_id`/hash),
    - full documents or attachments (only references).

BCOS Data & Event Model v1 defines how `entity_ref` and `input_ref` are structured; this spec only constrains what should **not** be duplicated in event payloads.

---

## 8. Avatar suggestion events (`AVATAR_SUGGESTION_*`)

All Avatar suggestions that are shown to a user and relate to a business entity (Intent, pre-sales Engagement) must be logged using the `AVATAR_SUGGESTION_*` event family.

### 8.1 Base event shape

BCOS events follow a common envelope:

```json
{
  "event_id": "UUID",
  "event_type": "AVATAR_SUGGESTION_ISSUED",
  "occurred_at": "2025-12-10T12:34:56Z",
  "org_id": "ORG-123",
  "actor": {
    "type": "avatar",
    "avatar_type": "intent_coach",
    "avatar_version": "r1.0.0"
  },
  "entity_ref": {
    "entity_type": "intent",
    "entity_id": "INTENT-111"
  },
  "payload": { "...": "..." }
}
```

The `payload` structure depends on the specific event type.

### 8.2 Event types (R1.0)

#### 8.2.1 `AVATAR_SUGGESTION_ISSUED`

Emitted whenever an Avatar shows a suggestion to a user.

Payload (conceptual):

```json
{
  "suggestion_id": "SUGG-999",
  "task_type": "intent_gap_detection",
  "suggestion_type": "gap_list",
  "language": "de",
  "input_ref": {
    "email_id": "EMAIL-789",
    "intent_version": "v3"
  },
  "model_family": "llm_small",
  "model_version": "2025-12-01",
  "confidence_score": 0.82,
  "content_summary": "3 gaps detected (KPI, budget, stakeholders)",
  "content_preview": "Missing KPIs; no indicative budget; unclear decision maker.",
  "requires_decision": true
}
```

Special case for "I don't know":

```json
{
  "suggestion_id": "SUGG-1000",
  "task_type": "intent_structuring",
  "suggestion_type": "need_more_data",
  "missing_information": [
    "Business KPIs for success",
    "Approximate budget range",
    "Target go-live date"
  ],
  "confidence_score": 0.2,
  "requires_decision": false
}
```

#### 8.2.2 `AVATAR_SUGGESTION_DECIDED`

Emitted when a user accepts, rejects, edits or ignores a suggestion.

Payload (conceptual):

```json
{
  "suggestion_id": "SUGG-999",
  "decision": "accepted", 
  "decision_timestamp": "2025-12-10T12:40:00Z",
  "decision_user_id": "USER-456",
  "applied_changes_ref": {
    "intent_version_before": "v3",
    "intent_version_after": "v4"
  }
}
```

Valid `decision` values:

- `accepted`
- `rejected`
- `edited` (user partially applied / modified suggestion)
- `dismissed` (explicit ignore/close)
- `expired` (auto, e.g. when Intent is deleted)

#### 8.2.3 `AVATAR_SUGGESTION_FEEDBACK`

Optional, but recommended when user explicitly rates a suggestion.

Payload:

```json
{
  "suggestion_id": "SUGG-999",
  "feedback_user_id": "USER-456",
  "thumb": "up",              // "up" | "down" | "neutral"
  "comment": "Good gaps, but missed regulatory risk.",
  "label_hallucination": false
}
```

### 8.3 Alignment with TrustScore & future use

- `AVATAR_SUGGESTION_FEEDBACK` will be aggregated later to:
  - measure Avatar quality,
  - feed into TrustScore components (e.g. behaviour of users, acceptance of safe suggestions).
- For R1.0 we only:
  - store these events,
  - expose basic metrics in internal dashboards.

---

## 9. Avatar -> Release -> Scope of powers

Summary of how Avatar capabilities evolve. R1.0 is highlighted.

| Avatar / Release       | R1.0 (this spec)                                                 | R1.1                                                   | R2.0+ (preview)                                                                 |
|------------------------|------------------------------------------------------------------|--------------------------------------------------------|----------------------------------------------------------------------------------|
| System Avatar          | Help, onboarding, governance nudges, concept explanations.      | Deeper guidance across Org Dashboard, lightweight Q&A. | Acts as "OS guide" across full BCOS including Deliver/Expand & Trust Rooms.     |
| Org Avatar X (light)  | Strategic fit & prioritisation hints, light recommendations.     | Stronger pipeline insights, simple scoring dashboards. | Full portfolio guidance, pattern detection across many projects/programmes.      |
| Intent Coach           | Parsing emails into Intents, gap detection, questions, summary. | Draft internal/external messages, variant scenarios.   | Full co-pilot for Clarify & Match, including cross-project pattern knowledge.    |
| User Avatars (BD/AM)  | - (not implemented)                                              | First versions: drafting emails, notes, follow-ups.    | Rich personal assistants with full history & context of that user/team.         |
| Project Avatars        | -                                                                | -                                                      | Project Companion for Deliver/Expand, risk and scope monitoring.                |
| Deal Risk Advisor      | -                                                                | -                                                      | Deep risk & compliance assessment for Commit & Assure.                          |
| Program Avatars        | -                                                                | -                                                      | Governance for multi-project Programmes across many X/Y/Z.                      |

---

## 10. Avatar feedback & quality KPIs (R1.0)

### 10.1 User feedback mechanisms

- Every suggestion panel has:
  - explicit **thumb up / thumb down** widget,
  - optional free-text comment box.
- Rating actions emit `AVATAR_SUGGESTION_FEEDBACK` events.

### 10.2 Minimal KPIs for R1.0 (internal beta)

Before calling R1.0 "production-ready", internal tests (N ? 50 distinct Intents across PL/DE/NL) should show:

1. **Perceived helpfulness**
   - >= 80% of rated suggestions from Intent Coach / System Avatar / Org Avatar X receive `thumb = up`.

2. **Hallucination rate**
   - < 5% of suggestions are explicitly flagged by testers as hallucinations (`label_hallucination = true`).

3. **Safe uncertainty**
   - In ambiguous / low-data scenarios, Avatars choose "need more data / I don't know" in >= 90% of test cases instead of confidently stating speculative answers.

These KPIs are measured from `AVATAR_SUGGESTION_*` events and test annotations.

---

## 11. Security, compliance & governance notes (R1.0)

- All behaviour in this spec must comply with:
  - Model 1 - Standard data handling,
  - L1/L2 confidentiality semantics,
  - NDA Layers 0-1.
- Avatar & Gateway logs (`AVATAR_SUGGESTION_*`, AI call logs) are part of:
  - future ODR / dispute processes,
  - audit trails for AI Act / NIS2 compliance (once applicable).
- Changes to Avatar behaviour that materially affect:
  - allowed actions,
  - input/output data,
  - "I don't know" thresholds,
  - must be versioned (`avatar_version`) and referenced in events.

---

## 12. Implementation checklist (link to Issue #4 Definition of Done)

R1.0 is considered complete from Avatar & AI Gateway perspective when:

1. A dedicated section **"AI Gateway & Avatars - Design & Guardrails (R1.0)"** exists in `docs/Phase1_MVP-Spec.md` and reflects this spec.
2. System Avatar, Org Avatar X and Intent Coach are implemented with:
   - inputs/outputs/context as defined,
   - actions limited by the matrix in section 3,
   - "I don't know" behaviour per section 4.
3. All AI calls go through AI Gateway with logging per section 5.6.
4. Language handling for PL/DE/NL + EN fallback is implemented per section 6.
5. Data boundaries and event payload rules in sections 7-8 are respected.
6. Avatar feedback mechanism and KPIs are wired into the dev "Definition of Done" (Issue #11).
7. At least one internal beta test cycle has measured KPIs described in section 10.2.

This document is the canonical reference for Avatar & Gateway behaviour in R1.0; all related code, tests and UX must remain consistent with it.

## AI audit logging & data access (Model 1)
- Follow `docs/Security_Privacy_Model1_MVP.md` for audit events and retention.
- Log `AVATAR_SUGGESTION_*` with minimal metadata (no full sensitive text); keep audit logs encrypted and separated from app logs.
- Avatars operate only on L1/L2 data in Model 1; no L3 content is stored. Respect NDA gating for L2 (Mutual NDA Layer 1).


Reference: AI logging and data boundaries must follow docs/Security_Privacy_Model1_MVP.md (Model 1, R1.0) and NDA scopes in docs/legal/enabion_mutual_nda_layer1_legal_R1.0.md / ..._L0-L1_product_copy_R1.0.md.

