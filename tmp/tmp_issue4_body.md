## Goal

Define behaviour and guardrails for all Avatars used in R1.0 (System Avatar, Org Avatar X, Intent Coach) and basic AI Gateway rules, fully aligned with the Enabion Playbook and the R1.0 Implementation Plan.

## Scope / checklist

  * List all Avatars in R1.0:
    * System Avatar,
    * Org Avatar X (light),
    * Intent Coach / Brief Scanner.
  * Clearly mark which Avatar families are out of scope for R1.0 but appear later (Project Avatar, User & Team Avatars, Deal Risk Advisor, Program Avatars).
  * For each R1.0 Avatar:
    * describe inputs (e-mail / Intent / Org profile, etc.), outputs and context sources (BCOS entities and events),
    * list core R1.0 responsibilities (onboarding, first Intent guidance, lead qualification, Intent parsing & gap detection).
  * Define what each Avatar may do automatically vs what must only be a suggestion:
    * include at least a simple "matrix of allowed actions" (Avatar × action type × project / risk level).
  * Define the "I don’t know / need more data" policy:
    * per Avatar, including typical triggers, UX copy patterns and logging requirements.
  * Specify `AVATAR_SUGGESTION_*` logging:
    * event types and mapping to the BCOS Data & Event Model v1,
    * minimal metadata (input reference, model id/version, suggestion category, confidence, human decision).
  * Define minimal AI Gateway responsibilities in R1.0:
    * model routing and selection (light vs stronger model, per language),
    * per-organisation limits / quotas and basic cost guardrails,
    * logging and audit hooks (what is logged where),
    * how the Gateway interacts with Model 1 – Standard and L0/L1 (No-NDA / Mutual NDA) boundaries.
  * Describe how Avatars handle languages in R1.0:
    * supported languages: PL, DE, NL + EN as default/fallback,
    * language detection from mail / Intent,
    * behaviour when language is unknown or unsupported.
  * Define basic Data Boundaries for R1.0 Avatars:
    * what data each Avatar can access inside an organisation,
    * what data can be sent to external models,
    * how we handle PII and content references in logs.
  * Define a simple user feedback mechanism for Avatar suggestions (thumbs up/down, optional comments) and how this feeds into events / TrustScore.
  * Add a minimal "Avatar → Release → Scope of powers" table:
    * columns at minimum: R1.0, R1.1, R2.0+, with a short note what changes.
  * Add a short roadmap paragraph for AI Gateway & Avatars in R2.0+:
    * Trust Rooms, Project Avatars, Deal Risk Advisor, regulated AI Governance – clearly marked as "future, not implemented in R1.0".
  * Ensure explicit alignment with:
    * [M0] MVP – Product Spec R1.0 (#1),
    * [M0] BCOS Data & Event Model v1 (MVP) (#2),
    * [M0] Architecture Overview – MVP (R1.0) (#3),
    * [M0] Security & Privacy baseline – Model 1 (MVP) (#5),
    * [M0] Mutual NDA (Layer 1) & L0/L1 product copy (#6),
    * [M1] Integrations Playbook – email → Intent (MVP) (#8),
    * [M1] TrustScore & Trust Graph – Methodology v0 (#10),
    * [M1] Definition of Done & dev standards (R1.0) (#11).

## Tasks

  * [Ewa] In `docs/Phase1_MVP-Spec.md`, create a section **"AI Gateway & Avatars – Design & Guardrails (R1.0)"** under the R1.0 specs structure (next to Product, Data & Event Model, Architecture, Security, etc.).
  * [Ewa] In that section, document the list of R1.0 Avatars (System Avatar, Org Avatar X (light), Intent Coach / Brief Scanner) and the future Avatar families, based on the Playbook and Implementation Plan.
  * [Ewa] For each R1.0 Avatar, add a sub-section that:
    * describes inputs, outputs and context (entities/events),
    * lists allowed automatic actions vs suggestions,
    * specifies "I don’t know / need more data" behaviour and logging.
  * [Ewa] Add a sub-section **"AI Gateway (R1.0)"** that:
    * describes how the Gateway picks models, enforces limits and logs usage,
    * explains how the Gateway respects Model 1 – Standard and L0/L1 boundaries.
  * [Ewa] Define the minimal **"Avatar → Release → Scope of powers"** table in the same section, covering at least R1.0, R1.1 and R2.0+.
  * [Ewa] Add a sub-section **"Logging & Events"** that links Avatar behaviour to the BCOS Data & Event Model:
    * reference the `AVATAR_SUGGESTION_*` events and required metadata,
    * ensure field names/types are consistent with Issue #2.
  * [Ewa] Add a short sub-section **"Avatar quality & feedback"** that:
    * describes thumbs up/down feedback and optional comments,
    * references the Avatar quality KPI section from the Definition of Done / dev standards (Issue #11) instead of duplicating numbers.
  * [Ewa] Cross-check terminology with:
    * Issue #1 (Product Spec),
    * Issue #2 (BCOS Data & Event Model),
    * Issue #3 (Architecture Overview),
    * Issue #5 (Security & Privacy baseline),
    * Issue #6 (Mutual NDA & L0/L1 copy),
    * Issue #8 (Integrations Playbook – email → Intent),
    * Issue #10 (TrustScore & Trust Graph – Methodology v0),
    * Issue #11 (Definition of Done & dev standards),
    and update names if anything diverges.
  * [Ewa] Add a short comment to this issue with:
    * link(s) to the relevant section(s) in `docs/Phase1_MVP-Spec.md`,
    * a note where the "Avatar → Release → Scope of powers" table lives.

## Relationships

  * Related to #1 [M0] MVP – Product Spec R1.0
  * Related to #2 [M0] BCOS Data & Event Model v1 (MVP)
  * Related to #3 [M0] Architecture Overview – MVP (R1.0)
  * Related to #5 [M0] Security & Privacy baseline – Model 1 (MVP)
  * Related to #6 [M0] Mutual NDA (Layer 1) & L0/L1 product copy
  * Related to #8 [M1] Integrations Playbook – email → Intent (MVP)
  * Related to #10 [M1] TrustScore & Trust Graph – Methodology v0
  * Related to #11 [M1] Definition of Done & dev standards (R1.0)

## Definition of Done

  * `docs/Phase1_MVP-Spec.md` contains a section titled **"AI Gateway & Avatars – Design & Guardrails (R1.0)"** under the R1.0 spec.
  * The section documents all R1.0 Avatars (System Avatar, Org Avatar X (light), Intent Coach / Brief Scanner) with:
    * inputs/outputs/context sources,
    * allowed automatic actions vs suggestions,
    * "I don’t know / need more data" behaviour.
  * `AVATAR_SUGGESTION_*` events and their metadata are defined and consistent with the BCOS Data & Event Model v1 spec (Issue #2).
  * Minimal AI Gateway responsibilities for R1.0 are documented, including model routing, limits and logging, and how the Gateway respects Model 1 – Standard and L0/L1 boundaries.
  * Language handling for Avatars in R1.0 (PL/DE/NL + EN fallback) is described.
  * Basic Data Boundaries for R1.0 Avatars are described (what data is visible to whom and what goes to external models).
  * A minimal **"Avatar → Release → Scope of powers"** table is present in the spec.
  * A short roadmap note for R2.0+ Avatar & AI Gateway evolution is present, clearly marked as "future".
  * The spec references the Avatar quality KPI section from the Definition of Done / dev standards (Issue #11).
  * This issue contains a comment with links to the relevant spec section(s), so other epics (Issues #1, #2, #3, #5, #6, #8, #10, #11) can treat it as the canonical AI behaviour reference for R1.0.
