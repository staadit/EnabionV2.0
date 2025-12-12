## Goal
Track and govern specification documents (Phase1_MVP-Spec, Playbook refs, Implementation Plan) so teams use a single, versioned source-of-truth and links from issues/projects remain consistent.

## Scope / checklist
- [x] Maintain index of core specs (Phase1_MVP-Spec.md, Enabion_Playbook_v2.3.md, Implementation Plan v0.4) with links and current status.
- [ ] Define document ownership and update cadence for R1.0/R1.1 sections.
- [ ] Ensure each epic links to its canonical spec section (issues #1-#13).
- [x] Track ERD and other assets locations (e.g., docs/assets/bcos-data-model-v1.png) and update links when regenerated.
- [ ] Add "Document control" note to new spec files with source-of-truth issue reference.
- [x] Periodically reconcile GitHub issues vs spec updates (log changes in docs/log/log-YYYY-MM-DD.md).

## R1 Document Index (working list)

| Document | Version | Last updated | Description | Issue |
| --- | --- | --- | --- | --- |
| Phase1_MVP-Spec.md | v0.3 | 2025-12-10 | R1.0 MVP spec (product + data/event model + architecture hooks), EN-only. | #1 |
| Phase1_Architecture_Overview_R1.0_MVP.md | v0.1 | 2025-12-10 | Architecture decisions for R1.0. | #3 |
| AI_Gateway_Avatars_R1.0_Spec.md | v0.1 | 2025-12-10 | AI Gateway & Avatars guardrails. | #4 |
| BCOS_Data_Event_Model_v1.md | v0.1 | 2025-12-10 | Canonical BCOS Data & Event Model for R1.0. | #2 |
| enabion_implementation_plan_v0.4.md | v0.4 | 2025-12-10 | Full implementation plan (M0/M1 scope, Q&A). | — |
| Enabion_Playbook_v2.3.md | v2.3 | 2025-12-10 | Playbook reference for terminology and flows. | — |
| docs/assets/bcos-data-model-v1.png | v0.1 | 2025-12-10 | ERD for BCOS Data & Event Model v1. | #2 |
| Security_Privacy_Model1_MVP.md | v0.2 | 2025-12-10 | Security & Privacy baseline (R1.0 / Model 1, internal). | #5 |
| Security_Privacy_Note_Model1_R1.0.md | v0.1 | 2025-12-10 | Security & Privacy note (customer-facing, R1.0). | #5 |
| legal/enabion_mutual_nda_layer1_legal_R1.0.md | v0.1 | 2025-12-10 | Mutual NDA Layer 1 – full legal text (R1.0). | #6 |
| legal/enabion_mutual_nda_layer1_L0-L1_product_copy_R1.0.md | v0.1 | 2025-12-10 | Mutual NDA Layer 1 – L0/L1 product/UX copy (R1.0). | #6 |
| commercial/Commercial_Enablement_UseCases_Pricing_R1.0_v0.1.md | v0.1 | 2025-12-10 | Commercial enablement use cases & pricing draft. | #7 |
| integrations/Email_to_Intent_MVP_Playbook.md | v0.0 | 2025-12-10 | Email -> Intent playbook (mapping, limits, security, edge cases). | #8 |
| whitepapers/Data_Models_1-3_Business_Whitepaper_v0.md | v0.0 | 2025-12-10 | Data Models 1-3 business whitepaper (Model 1 live, 2-3 roadmap). | #9 |
| trust/TrustScore_TrustGraph_Methodology_v0.md | v0.0 | 2025-12-10 | TrustScore & Trust Graph methodology (MVP + roadmap). | #10 |
| engineering/Definition_of_Done_R1.0.md | v0.0 | 2025-12-10 | DoD & dev standards for R1.0. | #11 |
| engineering/R1.0_Story_Map.md | v0.0 | 2025-12-10 | Story map for breaking down R1.0 features into issues. | #12 |
| engineering/R1.1_Story_Map.md | v0.0 | 2025-12-10 | Story map for breaking down R1.1 features into issues. | #13 |

## Definition of Done
- [ ] All core specs are indexed with links and owners.
- [ ] Every epic issue references its relevant spec section.
- [ ] Asset locations (ERD, diagrams) are documented and linked.
- [ ] Update cadence documented and agreed (R1.0/R1.1).
- [ ] Log entry added summarizing document-control setup.
