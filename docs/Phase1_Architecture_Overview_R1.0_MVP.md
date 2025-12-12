# Architecture Overview - R1.0 MVP (Model 1 - Standard)

_Status: Draft v0.1, 2025-12-10_  
_Source of truth: Enabion Playbook v2.3 (2025), Enabion Full Implementation Plan v0.4_

This document captures the **technical architecture for Release R1.0 (MVP)** of Enabion - focusing on:

- Intent -> Avatars -> Matching -> NDA 0/1 -> pre-sales pipeline for firms **X** (and minimal value for **Y**),
- **Model 1 - Standard** data model (multi-tenant SaaS in EU region),
- clear preparation for **Models 2-3 (Shielded / Sovereign)** without implementing them yet,
- alignment with:
  - `MVP - Product Spec R1.0`,
  - `BCOS Data & Event Model v1 (MVP)`,
  - `AI Gateway & Avatars - Design & Guardrails (R1.0)`,
  - `Security & Privacy baseline - Model 1 (MVP)`.

The target consumer of this document is the **engineering team (Ewa)** and any technical partners. It is **normative** for R1.0: deviations must be explicitly agreed and reflected back here.

---

## 1. Scope and context

### 1.1 Product scope in R1.0 (recap)

R1.0 implements a **narrow but sharp** slice of Enabion, centred on:

1. **Intent & Brief Scanner / Intent Coach**
   - from email/RFP/plain text into a structured Intent (goal, context, scope, assumptions, KPI, risks),
   - detection of gaps and questions to ask the client.

2. **Avatars (R1.0 scope)**
   - System Avatar - onboarding, guidance, explanations of L1/L2 and NDA,
   - Organization Avatar X (light) - preferences & lead qualification,
   - Intent Coach / Brief Scanner - core workhorse of Clarify.

3. **Matching (MVP level)**
   - simple rule-based + semantic matching based on profile of X/Y and Intent attributes,
   - shortlist of candidate Y (optional in R1.0 - still valuable in single-player mode for X).

4. **Trust & NDA (MVP level)**
   - Level 1 / Level 2 / Level 3 confidentiality model in the UI,
   - NDA Layer 0 (No-NDA Zone) and Layer 1 (Enabion Mutual NDA),
   - simple, behavioural TrustScore MVP (completeness, responsiveness).

5. **Pre-sales pipeline for X**
   - Kanban-style pipeline from `New -> Clarify -> Match -> Commit -> Won/Lost`,
   - status per Intent and basic metrics for organisation X.

6. **Languages and markets**
   - target markets: **PL, DE, NL** - full UI localisation,
   - Avatars must **understand and respond** in PL/DE/NL and EN,
   - EN acts as default / fallback language.

7. **Minimal Y support**
   - Y can receive and respond to Intents,
   - Y has a minimal org profile and simple view of assigned Intents,
   - full Y pipeline & OS come later (R2.0+).

R1.0 **does not** implement:

- BCOS project containers & Trust Rooms (R2.0),
- EnableMark? and full TrustGraph (R3.0),
- Models 2-3 (Shielded/Sovereign) - only extension points,
- full ODR module, Issues/Disputes event types (R2.0+).

### 1.2 Deployment and system context

At R1.0 Enabion is a **multi-tenant SaaS** in an **EU cloud region**. High-level context:

- **Users (X & Y):** access Enabion via web browser (desktop first).  
- **Web App (SPA/SSR):** deployed as a Next.js app, served over HTTPS.  
- **BCOS Core API:** backend service handling domain logic and persistence.  
- **AI Gateway:** orchestrates all calls to LLM providers, logs usage and suggestions.  
- **Data Layer:** multi-tenant PostgreSQL + object storage + vector store.  
- **Email Integration:** dedicated email addresses / webhooks for "email -> Intent" flow.  

High-level context diagram (logical):

```mermaid
flowchart LR
    subgraph Users
      UX[User X (BD/AM/CEO)]
      UY[User Y (BD/AM)]
    end

    subgraph EnabionCloud[Enabion Cloud (EU region)]
      WA[Web App (Next.js)]
      API[BCOS Core API]
      AIG[AI Gateway]
      DB[(PostgreSQL<br/>+ pgvector)]
      OBJ[(Object Storage)]
    end

    subgraph External
      LLM[LLM Providers<br/>(e.g. OpenAI, others)]
      EMAIL[Customer Email Systems<br/>(M365, Google, etc.)]
    end

    UX -->|HTTPS| WA
    UY -->|HTTPS| WA
    WA -->|HTTPS / REST| API
    API -->|SQL| DB
    API -->|files| OBJ
    API -->|AI tasks| AIG
    AIG -->|LLM API| LLM
    EMAIL -->|Forward / Webhook| API
```

This is **conceptual** - exact service topology (containers, functions, etc.) is described in section 4.

---

## 2. Architecture principles (R1.0)

The architecture implements the principles from the Playbook and Implementation Plan, concretised for R1.0:

1. **Trust-first, AI-native**
   - Trust, governance and transparent logging are built-in from the start.
   - All AI actions are mediated via **AI Gateway** with **event logging**.

2. **Platform of platforms**
   - R1.0 provides its own web UI but assumes coexistence with email/CRM/Teams.
   - Integration surfaces (email, basic exports) are first-class concerns, not addons.

3. **Multi-tenant SaaS, Model 1 - Standard**
   - Shared application & database with strict logical separation by `organisation_id`.
   - Built to allow later transition to dedicated instances (Model 3) without redesign.

4. **Language-agnostic**
   - All core flows operate on structured data independent of natural language.
   - Avatars and UI handle PL/DE/NL/EN; business logic is language-neutral.

5. **Event-centric BCOS**
   - Key domain actions (Intent created/updated, suggestions, NDA accepted, Commit decision) are represented as events.
   - R1.0 implements a **"light event sourcing"** pattern: both state tables and an event log.

6. **Simple, evolvable topology**
   - R1.0 is delivered as a small number of deployables:
     - Web App,
     - BCOS Core API (including initial AI Gateway module),
   - with clear seams to split out AI Gateway / Integrations as separate services when needed.

7. **Observability by default**
   - R1.0 includes:
     - structured application logging,
     - basic metrics (requests, latency, errors, AI usage),
     - simple alerts on uptime / error rate / token spend.

8. **Security & privacy baseline**
   - All communication over TLS,
   - encryption at rest for DB and object storage,
   - RBAC per organisation,
   - minimal PII, no sensitive L3 data by design in R1.0.

---

## 3. Tech stack R1.0 (implemented)

Sources: `docs/0. Enabion_Playbook_v2.3.md`, `docs/0. Enabion_implementation_plan_v0.4.md`.

### 3.1 Frontend
- Next.js + React + TypeScript.
- Full i18n (PL/DE/NL) with a central localisation layer.
- REST/JSON to backend (GraphQL optional later, not in R1.0).

### 3.2 Backend (BCOS Core + AI Gateway v1)
- Node.js + TypeScript; framework: NestJS (modular, DI, testable).
- API: REST/JSON.
- Modules (inline in R1.0):
  - core: Org, User, Intent, Event, NDA, TrustScoreSnapshot (MVP).
  - ai-gateway: System Avatar, Org Avatar X, Intent Coach; logs `AVATAR_SUGGESTION_*`.
  - security: auth, RBAC, audit (Model 1 – Standard).
- Multi-tenant:
  - single Postgres instance; each entity scoped by `org_id`.
  - authorisation uses `org_id` + role (Owner, Manager, Contributor, Viewer).

### 3.3 Database & storage
- Primary DB: PostgreSQL.
- Model 1 – Standard (L1 + selected L2 in multi-tenant SaaS).
- Events stored as rows in an event-log table per `BCOS_Data_Event_Model_v1`.

### 3.4 Infrastructure & deployment (R1.0)
- VPS: Vimexx (EU/NL), Ubuntu 22.04 LTS.
- Docker + docker-compose; reverse proxy: Traefik or Nginx with Let’s Encrypt.
- Environments:
  - local: `infra/docker-compose.dev.yml`
  - staging: Vimexx `infra/docker-compose.staging.yml`
- Secret management: env files on server; only `.env.example` in Git; CI uses GitHub Secrets.

### 3.5 AI Services Layer – R2.0+ (future, not implemented in R1.0)
- R1.0 keeps Avatars & AI Gateway inside NestJS (Node). No separate Python/FastAPI services and no Redis in production for MVP.
- Future (R2.0+) possible services (Python/FastAPI) called from BCOS Core:
  - `ai-matching` (advanced matching, embeddings, vector indexes),
  - `ai-embeddings` (embedding pipeline, vector DB),
  - `trustscore-engine` (TrustScore v2 / Trust Graph 1.0 per methodology).
- Interfaces stay HTTP (REST/JSON) or gRPC; backend remains the caller. Redis/queues only when these services appear in R2.0+.

### 3.6 Observability & logging (R1.0)
- Structured JSON logs with `request_id` and `org_id` on key events (per BCOS Data & Event Model v1).
- Healthchecks: backend `GET /health`; frontend simple 200 status (build/version).
- Error tracking: central tool (e.g., Sentry) can be added; unhandled errors logged with `request_id` and `org_id` when available.

## 4. Technology stack decisions

These decisions are **binding for R1.0** unless explicitly revisited.

### 3.1 Cloud and region

- **Primary region:** one EU cloud region (e.g. Frankfurt) for all tenants in R1.0.
- **Target environment:** managed cloud provider (AWS / GCP / Azure) - architecture remains cloud-agnostic, but initial implementation will favour:
  - managed PostgreSQL,
  - managed object storage,
  - managed monitoring.

In code/infrastructure we should abstract provider-specific parts behind lightweight interfaces (e.g. storage adapter, mail adapter).

### 3.2 Frontend

- **Framework:** Next.js (React, TypeScript).  
- **Runtime:** Node.js runtime for SSR/ISR where needed.  
- **Key responsibilities:**
  - auth flows and organisation switcher,
  - Intent creation & editing,
  - Avatar suggestions display and feedback (accept / reject),
  - pre-sales pipeline board,
  - basic settings and profile screens.
- **State management:** client-side state via React Query (or similar) backed by API calls; no Redux required for MVP.
- **Routing:** app routes per organisation; URLs should encode `orgSlug` to avoid confusion when user belongs to multiple orgs.

### 3.3 Backend - BCOS Core API

- **Runtime:** Node.js (LTS), TypeScript.
- **Framework:** NestJS or a similar modular framework providing DI, routing, and testability.
- **API style:** JSON over HTTPS, REST-like endpoints, with potential to introduce GraphQL or tRPC later if needed.
- **Key modules (within a single codebase):**
  - Auth & Org Management,
  - Users & Roles,
  - Intent & Pipeline,
  - Avatar Orchestration (calls into AI Gateway),
  - NDA & Confidentiality Levels,
  - TrustScore MVP,
  - Event Log,
  - Email Integration (inbound),
  - Observability.

R1.0 will ship as **a single deployable service** with clear internal module boundaries.

### 3.4 Data layer

- **Relational DB:** PostgreSQL (>= 15), single shared schema.
- **Vector store:** pgvector extension within the same PostgreSQL instance for MVP (no external vector DB).
- **Object storage:** cloud object storage (e.g. S3/Bucket) for attachments and exported documents.

PostgreSQL schema is driven by `BCOS Data & Event Model v1`. Key tables (non-exhaustive):

- `organisations`, `organisation_members`,
- `users`,
- `intents`, `intent_revisions`,
- `pipeline_items` (or pipeline columns/status history),
- `avatar_suggestions`,
- `ndas`, `nda_acceptances`,
- `events` (generic event log),
- `trust_score_snapshots` (MVP level).

### 3.5 AI Gateway

For R1.0 the AI Gateway is implemented as a **module within BCOS Core** (same deployable), with a clear interface layer so it can be extracted later.

Responsibilities:

- normalise all AI tasks into a standard request/response format,
- choose appropriate model (e.g. "mini" vs "full"),
- enforce per-tenant limits and cost accounting,
- log `AVATAR_SUGGESTION_*` events and raw metrics (tokens, latency),
- manage provider credentials via secure configuration.

### 3.6 Integrations

R1.0 integrations are intentionally narrow:

- **Email -> Intent**
  - a dedicated inbound endpoint to receive forwarded emails,
  - mapping subject/body/attachments into a new or existing Intent,
  - optional per-organisation email alias (e.g. `intent+<orgSlug>@enabion.app`).

- **Exports**
  - export of Intent to Markdown/PDF for sharing with clients not yet on Enabion.

No CRM/Teams/Slack integrations in R1.0 beyond manual exports.

---

## 4. Logical system decomposition

### 4.1 Modules overview

Logical modules in R1.0:

1. **Web App (Next.js)**
   - UI & UX,
   - client-side orchestration,
   - basic field validation.

2. **Auth & Organisation Service (API module)**
   - organisations, membership, roles,
   - organisation switcher, invitation flows,
   - basic identity model (email-based accounts, later SSO).

3. **Intent & Pipeline Service (API module)**
   - CRUD for Intents,
   - linking Intents to pipeline columns/stages,
   - linking to organisations X and (optionally) Y,
   - revisions for Intent content.

4. **Avatar Orchestration Service (API module)**
   - exposes APIs to the Web App for:
     - generating structured Intent from raw text,
     - generating gap analysis & questions,
     - generating suggested responses for BD/AM,
   - delegates to AI Gateway and writes events back to DB.

5. **AI Gateway Module**
   - **Task-level abstraction**:
     - `INTENT_STRUCTURING`,
     - `GAP_ANALYSIS`,
     - `MATCHING_EXPLANATION`,
     - `REPLY_DRAFT`,
   - provider abstraction (OpenAI, future others),
   - logging of usage and errors.

6. **Trust & NDA Service (API module)**
   - management of L1/L2/L3 tags per Intent / message,
   - management of Mutual NDA (Layer 1),
   - mapping NDA status to what can be shown in UI.

7. **TrustScore MVP Service**
   - calculates and periodically stores trust score snapshot per organisation based on:
     - completeness of profile,
     - responsiveness to Intents,
     - basic behavioural signals.

8. **Event Log Service**
   - unified event append API,
   - persistence of events,
   - simple query/filter APIs for audit and analytics.

9. **Email Integration Service**
   - inbound email/webhook handling,
   - mapping to Intent creation/updating,
   - security checks (spam, domain whitelisting).

10. **Observability & Ops Layer**
    - logging, metrics, health checks,
    - minimal UI for system status (for Enabion ops only).

### 4.2 Component diagram (logical)

```mermaid
flowchart TB
    subgraph Frontend
      FE[Web App<br/>(Next.js, TS)]
    end

    subgraph Backend[BCOS Core API (Node.js, TS)]
      AUTH[Auth & Org]
      INTENT[Intent & Pipeline]
      AVA[Avatar Orchestration]
      NDA[NDA & Confidentiality]
      TRUST[TrustScore MVP]
      EV[Event Log]
      MAIL[Email Integration]
      AIGM[AI Gateway Module]
    end

    subgraph DataLayer[Data Layer]
      PSQL[(PostgreSQL + pgvector)]
      STORE[(Object Storage)]
    end

    subgraph AIProviders[LLM Providers]
      LLMAPI[LLM APIs]
    end

    FE --> AUTH
    FE --> INTENT
    FE --> AVA
    FE --> NDA
    FE --> TRUST

    AUTH --> PSQL
    INTENT --> PSQL
    NDA --> PSQL
    TRUST --> PSQL
    EV --> PSQL
    MAIL --> PSQL

    AVA --> AIGM
    AIGM --> LLMAPI

    INTENT --> EV
    AVA --> EV
    NDA --> EV
    TRUST --> EV
    MAIL --> EV
```

This diagram is **normative** at module level; physical deployment may collapse multiple modules into one process for MVP, but interfaces should follow these boundaries.

---

## 5. Multi-tenancy and data isolation

### 5.1 Tenancy model

R1.0 uses a **shared-schema, shared-database, multi-tenant** model.

Core concepts:

- `organisation` - represents X or Y (or other ecosystem actors in the future).
- `user` - human account; each user belongs to **at least one** organisation.
- `organisation_member` - association with role(s) in a given organisation.

Key patterns:

- Each row in tenant-scoped tables includes `organisation_id` (or `owner_organisation_id`).
- Access control logic in API always resolves the *current org context* from:
  - auth token,
  - URL/org slug,
  - active organisation selection in UI.

### 5.2 Shared objects between organisations

Some entities logically belong to **multiple organisations**, e.g.:

- an Intent created by X and explicitly shared with Y,
- (later) Engagement / Project Container X?Y.

For R1.0 we handle this via **linking tables** rather than "global" tenant-less records:

- `intents` table:
  - `owner_organisation_id` - organisation that created the Intent,
  - `visibility` - enum (`private`, `shared`),
- `intent_organisations` (link table):
  - `intent_id`,
  - `organisation_id` (X or Y).

Access rules (simplified):

- For a given `orgCtx` (current org):
  - user can see Intents where:
    - `intents.owner_organisation_id = orgCtx`, or
    - `intent_organisations.organisation_id = orgCtx`,
  - plus role-based filters (e.g. only BD/AM can edit).

This pattern preserves per-tenant boundaries while allowing multi-party collaboration later (R2.0+).

### 5.3 Future-proofing for Models 2-3

Even though R1.0 only implements Model 1 - Standard, the tenancy model is designed so that:

- The **logical schema** (tables & relationships) is tenant-agnostic.
- For Model 3 - Sovereign we can **physically split** tenants into:
  - separate databases,
  - or separate deployments,
  without changing application semantics.
- Model 2 - Shielded will introduce an additional **"data location" abstraction** (local vs Enabion) per organisation; this is reflected in design of AI Gateway (see section 7).

---

## 6. Data & Event Model alignment

R1.0 must be aligned with `BCOS Data & Event Model v1`. This section defines how the architecture uses that model.

### 6.1 State tables vs Event log

The system maintains:

1. **State tables** (relational):
   - fast reads, simple queries,
   - denormalised fields where it makes sense (e.g. current pipeline stage).

2. **Event log** (`events` table):
   - canonical record of what happened **over time**,
   - each event contains:
     - `id`,
     - `organisation_id` (owner or primary tenant),
     - `entity_type` (e.g. `INTENT`, `NDA`, `ORG`, `SUGGESTION`),
     - `entity_id`,
     - `event_type` (e.g. `INTENT_CREATED`, `AVATAR_SUGGESTION_ISSUED`),
     - `actor_user_id` (optional for system events),
     - `actor_org_id`,
     - `ai_actor_id` (for Avatar actions, if needed),
     - `payload` (JSONB, schema per event type),
     - `created_at` (timestamp).

Event log is not yet exposed to end users in full detail in R1.0, but is:

- the basis for future ODR and audit,
- the key source for TrustScore v2 and Trust Graph (R3.0+).

### 6.2 MVP event types

R1.0 implements at least these event categories:

- **Intent lifecycle**
  - `INTENT_CREATED`,
  - `INTENT_UPDATED`,
  - `INTENT_STAGE_CHANGED` (pipeline move).

- **Avatar interactions**
  - `AVATAR_SUGGESTION_ISSUED`,
  - `AVATAR_SUGGESTION_ACCEPTED`,
  - `AVATAR_SUGGESTION_REJECTED`.

- **NDA & confidentiality**
  - `NDA_MUTUAL_ACCEPTED` (Layer 1),
  - `INTENT_CONFIDENTIALITY_CHANGED` (L1/L2).

- **Trust & behaviour**
  - `PROFILE_COMPLETED`,
  - `INTENT_RESPONDED` (Y's response recorded),
  - `INTENT_CLOSED` (Won/Lost).

No `ISSUE_*` or `DISPUTE_*` events in R1.0 - those start in R2.0 when Deliver is introduced.

### 6.3 Identifiers & references

- All primary entities use **UUIDv4** identifiers to avoid exposing sequential IDs.
- External references (e.g. email message IDs) are stored in dedicated fields but not used as primary keys.
- Any AI usage logs include `event_id` references so we can trace suggestions and decisions later.

---

## 7. AI Gateway & Avatars integration

### 7.1 Responsibilities of AI Gateway in R1.0

AI Gateway is the **single entry point** for all LLM interactions. It:

1. Receives **typed tasks** from BCOS modules, e.g.:
   - `INTENT_STRUCTURING` - "from raw email/text, produce structured Intent draft",
   - `INTENT_GAP_ANALYSIS` - "given existing Intent, identify missing fields and questions",
   - `PROPOSAL_OUTLINE` - "generate outline for reply/proposal (optional R1.0)".

2. Normalises requests into a standard internal format:
   - input text + context objects,
   - expected output schema (e.g. JSON with explicit fields).

3. Selects a model:
   - default: smaller, cheaper model for daily operations,
   - stronger model for heavier tasks (optional, behind feature flag).

4. Calls the provider API:
   - handles retries, timeouts, error classification,
   - never stores provider API keys in application code - uses secure secret storage.

5. Logs usage:
   - tokens (prompt/completion),
   - latency,
   - error flags,
   - organisation & task type.

6. Returns structured output to the caller (Avatar Orchestration Service).

### 7.2 Avatars and task orchestration

Avatars in R1.0 exist primarily as **behavioural patterns** implemented in backend code + prompt templates and guardrails.

- **System Avatar**
  - provides guided flows and explanations, no direct heavy AI calls,
  - may use AI Gateway for UI copy / explanations in PL/DE/NL.

- **Organization Avatar X (light)**
  - uses config & historical activity to advise on "fit / non-fit" and prioritisation,
  - leverages event log to understand responsiveness patterns.

- **Intent Coach / Brief Scanner**
  - heavy user of AI Gateway:
    - transforms raw email into structured Intent,
    - runs gap analysis & risk hints,
    - suggests follow-up questions.

Each avatar interaction must:

- create an `AVATAR_SUGGESTION_ISSUED` event,
- include enough metadata to reconstruct what was suggested and based on what,
- be followed by user action (accept/reject/edit), also logged as events.

### 7.3 Extension points for Models 2-3

R1.0 design anticipates:

- **Local AI Runner** in Model 2/3:
  - AI Gateway will include a pluggable **"execution backend"** abstraction:
    - cloud LLM providers,
    - local LLM endpoints (customer infrastructure).
- **Data boundaries**:
  - tasks will include metadata about **data classification (L1/L2/L3)** and data origin,
  - AI Gateway must support enforcing policies such as "L2 data for this tenant may not leave customer infra" (implemented later).

---

## 8. Security & privacy baseline (R1.0, Model 1 - Standard)

This section summarises architecture-level decisions; details are in `Security & Privacy baseline - Model 1 (MVP)`.

### 8.1 Authentication & authorisation

- **AuthN:** email + password with email verification in R1.0 (later extension to SSO).
- **Sessions:** short-lived JWT or opaque tokens with refresh, stored securely (httpOnly cookies).
- **AuthZ:**
  - per-organisation roles:
    - `Owner` - full control,
    - `Manager` - manage Intents and pipeline,
    - `Contributor` - work with Intents assigned to them,
    - `Viewer` - read-only access.
  - resource access always checked against both:
    - user membership in organisation,
    - resource's `organisation_id` / `intent_organisations` links.

### 8.2 Confidentiality levels & NDA layers

- **Levels:** L1 (public/matching), L2 (confidential/NDA), L3 (deep confidential - not used in R1.0 data flows).
- **NDA layers in R1.0:**
  - Layer 0 - No-NDA Zone: default for L1 data,
  - Layer 1 - Enabion Mutual NDA: accepted once per organisation, applied to all pre-sales interactions within the ecosystem.

R1.0 enforces:

- L1 vs L2 labelling at Intent/message level,
- only showing L2 content to organisations that have valid NDA Layer 1 in place.

### 8.3 Data protection & encryption

- **In transit:** all traffic over HTTPS with modern TLS configuration.
- **At rest:**
  - PostgreSQL with encryption at rest (via cloud provider),
  - object storage with encryption at rest,
  - backups encrypted and stored in EU region.

- **PII minimisation:**
  - store only necessary user info (name, email, organisation, basic preferences),
  - avoid storing sensitive personal data in free-form fields; clearly communicate to users that L3 data is out-of-scope for R1.0.

### 8.4 Auditing

R1.0 audit capability comprises:

- event log (section 6),
- minimal admin queries/endpoints to retrieve event history for a given Intent or organisation,
- per-organisation view limited to events where they are an involved party.

Future releases (R2.0-R4.0) will extend this into full audit and ODR evidence packages.

---

## 9. Observability baseline

Observability is **part of the architecture**, not an afterthought.

### 9.1 Logging

- Structured logs (JSON) for all services,
- key fields:
  - timestamp, service, environment, severity,
  - request ID / correlation ID,
  - organisation id (when applicable),
  - route/operation, status code,
  - error details (structured).

### 9.2 Metrics

At minimum:

- **HTTP/API**
  - request count,
  - latency (p95/p99),
  - 4xx and 5xx error rate.

- **AI Gateway**
  - number of tasks per type,
  - AI provider errors/timeouts,
  - token usage per organisation & task type.

- **Business**
  - number of new Intents per day,
  - number of Avatar suggestions issued,
  - acceptance rate of suggestions (proxy for Avatar quality).

### 9.3 Tracing (optional for R1.0)

- Recommended but not mandatory: basic distributed tracing using OpenTelemetry.
- If implemented, traces should connect:
  - incoming HTTP request,
  - DB queries,
  - AI Gateway calls,
  - email webhook handling.

### 9.4 Alerts

Basic alerts configured for:

- uptime check failures,
- high 5xx rate,
- AI provider error rate above threshold,
- token usage exceeding expected envelope per organisation (possible misuse/bug).

---

## 10. Non-goals and trade-offs in R1.0

To keep MVP deliverable and focused, R1.0 **explicitly does not include**:

1. **Full BCOS project containers & Trust Rooms**
   - only pre-sales pipeline and Intent management,
   - no Deliver/Execution containers - planned for R2.0.

2. **Issues/Disputes and ODR**
   - no `ISSUE_*` or `DISPUTE_*` events,
   - no ODR UI or exports - those appear alongside Deliver (R2.0) and ODR v1 (R3.0).

3. **Models 2-3 (Shielded/Sovereign)**
   - no on-prem agent or local AI Runner yet,
   - no per-organisation data residency controls beyond "EU cloud region".

4. **Full-blown Y OS**
   - Y can receive and respond to Intents,
   - no dedicated Y pipeline or dashboards - first meaningful Y OS comes with R2.0.

5. **Advanced Hubs / EnableMark / TrustGraph**
   - TrustScore MVP is limited and mostly behavioural,
   - Hubs and full TrustGraph only from R3.0 onwards.

6. **Multi-region / multi-jurisdiction deployment**
   - single EU region only,
   - no region-by-region policy differences yet.

These trade-offs will be revisited after R1.0 usage data and feedback.

---

## 11. Roadmap alignment (R1.0 -> R5.0)

This architecture is intentionally designed to evolve along the Implementation Plan:

- **R1.1 - Org Dashboard & Multi-Seat**
  - reuses BCOS Core and event log,
  - mostly frontend and reporting changes,
  - no structural backend rework expected.

- **R2.0 - BCOS Containers & Trust Rooms**
  - builds on existing Intent + event model,
  - adds Engagement/Project Container schema and Trust Room messages,
  - introduces Issues/Disputes events and basic Deliver/Expand.

- **R3.0 - TrustGraph & EnableMark v1.0**
  - reuses event log for TrustScore v2 and Trust Graph,
  - introduces Hubs as new entities referencing existing organisations and outcomes.

- **R4.0 - Regulated & Sovereign Data Models**
  - extends AI Gateway to support local AI Runner backends,
  - introduces Model 2-3 data policies and dedicated instances,
  - strengthens auditing and AI governance.

- **R5.0 - Global Ecosystem & BigTech / Big5**
  - scales the same core architecture to more regions,
  - adds deeper integrations and program-level features,
  - does not require redesign of the R1.0 core if the above principles are followed.

---

## 12. Implementation notes for Ewa (Dev Lead)

1. Treat this document as **the baseline architecture** when creating or modifying:
   - `docs/Phase1_MVP-Spec.md` (Architecture section),
   - initial service/module layout in the codebase.

2. Keep the modules outlined in section 4 as **separate NestJS modules / packages** even if deployed as a single service.

3. Ensure every new API endpoint:
   - resolves current organisation context,
   - enforces tenant boundaries as described in section 5,
   - emits appropriate events into the event log (section 6).

4. When implementing AI calls:
   - always go via the AI Gateway module,
   - never call provider SDKs directly from feature modules,
   - attach task type and organisation to each AI usage log.

5. When in doubt between "quick hack" and "sticking to architecture" - default to the architecture and document any exceptions explicitly in code comments + log file.

## Security baseline (R1.0)
- Canonical Security & Privacy baseline: `docs/Security_Privacy_Model1_MVP.md` (Issue #5).
- Customer note: `docs/Security_Privacy_Note_Model1_R1.0.md`.
- Architecture must enforce: HTTPS/TLS, encryption at rest (DB/storage/backups), RBAC roles (Owner/Manager/Contributor/Viewer), NDA-gated access to L2, minimal audit log as defined in the security baseline, and retention/pseudonymisation rules for deletion.
\nReference: Business narrative for Models 1-3 lives in docs/whitepapers/Data_Models_1-3_Business_Whitepaper_v0.md (Issue #9).
