---
Goal
----
Capture the technical architecture decisions for R1.0 MVP so that implementation is aligned with future Models 2-3 and later releases. Status: section and diagram committed, ready for CEO review.

Scope / checklist
------------------
  * Outline the R1.0 architecture layers and main components:
    - web client (frontend),
    - BCOS Core / API,
    - persistence layer (database),
    - AI Gateway,
    - integrations (email -> Intent, future connectors).
  * Choose and document the main tech stack for R1.0 (frontend, backend, database, hosting).
  * Define multi-tenant approach and data separation between organisations, consistent with the BCOS Data & Event Model v1 and Security & Privacy baseline.
  * Decide what is a separate service from day one (e.g. AI Gateway) and what stays in the main app; describe boundaries and communication patterns between them.
  * Describe how we log and monitor core flows in R1.0 (observability baseline: logs, metrics, traces, basic alerts).
  * Document a high-level component diagram (frontend, BCOS Core, AI Gateway, integrations, external services) and store it in the repo.
  * Note explicit non-goals / trade-offs for R1.0 (what we postpone to R1.1, R2.0+ and Models 2-3).
  * Explain how the R1.0 architecture is prepared for future Data Models 2-3 (Shielded / Sovereign) without implementing them yet (extension points, connectors, isolation options).
  * Highlight architectural guardrails:
    - language-agnostic design (PL/DE/NL + EN),
    - readiness for future NIS2 / AI Act / eIDAS2/eID requirements.

Tasks
-----
  * [x] [Ewa] In `docs/Phase1_MVP-Spec.md`, add a dedicated section titled `Architecture Overview - R1.0 MVP` (directly after "BCOS Data & Event Model v1 (MVP)").
  * [x] [Ewa] In that section, describe the R1.0 architecture layers and main components:
    - web client (frontend),
    - BCOS Core / API,
    - persistence layer (database),
    - AI Gateway,
    - integrations (email -> Intent and future connectors),
    and show how they relate to entities/events defined in the BCOS Data & Event Model v1.
  * [x] [Ewa] Document the chosen R1.0 tech stack and multi-tenant approach as concrete bullets/tables:
    - frontend, backend, database, hosting,
    - how tenant / org scoping is implemented in the architecture,
    using terminology consistent with Issues #1, #2, #5 and the Implementation Plan.
  * [x] [Ewa] Describe which modules run as separate services in R1.0 (e.g. AI Gateway) vs what stays inside the main app, including:
    - communication patterns (HTTP, messaging, etc.),
    - clear responsibility boundaries between BCOS Core and AI Gateway.
  * [x] [Ewa] Add a subsection "Observability baseline (R1.0)" in the Architecture Overview section that summarises:
    - what we log,
    - which metrics we capture,
    - where we expect basic alerts,
    in alignment with Issue #5 (Security & Privacy baseline - Model 1) and Issue #11 (Definition of Done & dev standards).
  * [x] [Ewa] Create a simple high-level component diagram for the R1.0 architecture and commit it under:
    - `docs/assets/architecture-r1-overview.png` (or `.svg`),
    and embed it in the Architecture Overview section of `Phase1_MVP-Spec.md`.
  * [x] [Ewa] In the "Relationships" section of this issue, link it as "Related to":
    - #1 - MVP - Product Spec R1.0,
    - #2 - BCOS Data & Event Model v1 (MVP),
    - #4 - AI Gateway & Avatars - Design & Guardrails (R1.0),
    - #5 - Security & Privacy baseline - Model 1 (MVP),
    - #8 - Integrations Playbook - email -> Intent (MVP),
    - #11 - Definition of Done & dev standards (R1.0).
  * [x] [Ewa] Add a short comment on this issue with:
    - a link/anchor to the `Architecture Overview - R1.0 MVP` section inside `docs/Phase1_MVP-Spec.md`,
    - the path to the component diagram file in `/docs/assets/...`.

Relationships
-------------
  * Related to #1 - MVP - Product Spec R1.0
  * Related to #2 - BCOS Data & Event Model v1 (MVP)
  * Related to #4 - AI Gateway & Avatars - Design & Guardrails (R1.0)
  * Related to #5 - Security & Privacy baseline - Model 1 (MVP)
  * Related to #8 - Integrations Playbook - email -> Intent (MVP)
  * Related to #11 - Definition of Done & dev standards (R1.0)

Definition of Done
------------------
  * [x] `docs/Phase1_MVP-Spec.md` contains a section titled `Architecture Overview - R1.0 MVP`:
    - describing the R1.0 architecture layers (web client, BCOS Core, database, AI Gateway, integrations),
    - documenting the chosen R1.0 tech stack and multi-tenant approach,
    - clearly stating which modules run as separate services vs which stay in the main app for R1.0.
  * [x] The Architecture Overview section explicitly references and is consistent with:
    - Issue #2 - BCOS Data & Event Model v1 (entities, events, tenant scoping),
    - Issue #5 - Security & Privacy baseline - Model 1 (roles, access rules, audit logs),
    - Issue #4 - AI Gateway & Avatars - Design & Guardrails (R1.0).
  * [x] The section includes a short "Guardrails" subsection covering:
    - language-agnostic design (PL/DE/NL + EN),
    - future NIS2 / AI Act / eIDAS2/eID readiness at high level.
  * [x] A high-level component diagram file (e.g. `docs/assets/architecture-r1-overview.png`) is committed to the repo and embedded in the Architecture Overview section.
  * [ ] The "Relationships" panel of this issue lists related issues:
    - #1, #2, #4, #5, #8, #11 (as "Related to").
  * [ ] CEO/CTO have reviewed and accepted the Architecture Overview (e.g. via an "Approved" comment on this issue) and the card can be moved to the "Done" column.

Workflow hint  
-------------
- Normal flow: Backlog -> In progress -> For CEO -> Done.
---
