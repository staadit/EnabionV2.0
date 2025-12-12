# Enabion Mutual NDA - Product copy (Layer 0/1, R1.0)

Status: Draft for internal review (product/UX)
Release: R1.0 - MVP - Intent & Pre-Sales OS for X
Scope: Model 1 - Standard data, pre-sales only (L1 + L2 under NDA)

---

## Scope (R1.0 / pre-sales only)
- Supported: **Layer 0 (No-NDA, L1 only)**, **Layer 1 (Enabion Mutual NDA for L2)**.
- Not implemented in R1.0: **Layer 2 (Custom NDA FastTrack)**, **Layer 3 (External NDA)** – roadmap R2.0+.
- L3 data is **not** processed in R1.0; only signalled in UI as “future”.

## Product copy for UI (tooltips/badges/CTA)
- **L0 – No-NDA Zone (L1 only)**
  - “Safe to share high-level info (conference stage). No NDA required. Don’t paste confidential details.”
- **L1 – Enabion Mutual NDA (covers L2)**
  - “Accept Mutual NDA to share L2 pre-sales details. Both parties accept once, then L2 fields unlock.”
- **L3 – Deep confidential (not in R1.0)**
  - “Not supported in R1.0. For deep confidential work, use Shielded/Sovereign models in future releases.”

## What users see in R1.0
- Org-level NDA status: Not accepted / Active / Terminated.
- NDA version and acceptance date (per org).
- Counterparty name when sharing with another org.
- Link to full Mutual NDA text (see legal file below).
- Badges in UI for L0/L1/L3 and a CTA: “Enable Mutual NDA (Layer 1)”.

## Links
- Legal text (full agreement): `docs/legal/enabion_mutual_nda_layer1_legal_R1.0.md`
- Security baseline (roles/logs/encryption): `docs/Security_Privacy_Model1_MVP.md`
- NDA events and fields: `docs/BCOS_Data_Event_Model_v1.md` (`NDA_ACCEPTED`, confidentiality levels on Intent/Engagement`).
