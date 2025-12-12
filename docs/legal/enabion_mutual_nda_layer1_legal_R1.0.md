# Enabion Mutual NDA (Layer 1) & L0/L1 Product Copy - R1.0 (Draft)

Status: Draft for internal review (legal + product)  
Release: R1.0 - MVP - Intent & Pre-Sales OS for X  
Scope: Model 1 - Standard data, Layer 0-1 NDA, pre-sales only

> **Important legal note**  
> This document is a **draft template** prepared for product and architecture work.  
> It **is not legal advice** and **must be reviewed, adapted and approved** by qualified legal counsel in relevant jurisdictions before being used with real customers or partners.

---

## 1. Context & Objectives

This document delivers the content for issue **#6 - "Mutual NDA (Layer 1) & L0/L1 product copy"** for R1.0 (MVP - Intent & Pre-Sales OS for X). It connects directly to the Playbook v2.3 (NDA layers 0-3, L1/L2/L3 confidentiality) and the Full Implementation Plan (R1.0 scope).

**Objectives:**

1. Provide a **Mutual NDA (Layer 1)** template aligned with the Enabion concepts of:
   - Model 1 - Standard data model (multi-tenant SaaS),
   - No-NDA Zone (Layer 0 / L0),
   - Level 1 / Level 2 / Level 3 confidentiality.
2. Define **what NDA-related elements must be visible inside the product** (UI & event model) for R1.0.
3. Provide **short UX/product copy** that explains to users:
   - what L0 ("No-NDA Zone") means,
   - what happens when they enable **Mutual NDA (Layer 1)**,
   - what changes in terms of data use and confidentiality.
4. Outline **future NDA layers** (Custom NDA / External NDA) for R2.0+, without implementing them yet in R1.0.

This document is written in English as the **canonical legal/product version**. Translations/localisations (PL/DE/NL, etc.) should be prepared later based on this master.

---

## 2. Conceptual overview - L0 / L1 / NDA Layers

### 2.1. Levels of confidentiality (L1-L3)

From the Playbook, confidentiality levels are defined (Playbook/Implementation Plan reference)

- **L1 - public / matching** - information that the organisation would be comfortable sharing ?on stage" (conference, website, public pitch).  
  Examples: high-level description of the problem, industry segment, company size, non-sensitive KPIs.
- **L2 - confidential / NDA** - information shared **after NDA**, needed to properly assess and discuss a potential collaboration.  
  Examples: simplified architecture diagrams, business constraints, non-public process descriptions, indicative budgets, non-public internal priorities.
- **L3 - deep confidential** - highly sensitive IP, regulated or critical information.  
  Examples: detailed customer data, PII, defence-related requirements, trade secrets, full production architecture.

R1.0 works mainly with **L1 and L2**. L3 is only referenced conceptually - no dedicated feature work in MVP.

### 2.2. NDA layers 0-3

From the Playbook, Enabion introduces **four NDA layers** to balance speed and (Playbook/Implementation Plan reference)

- **Layer 0 - "No-NDA Zone"** - work on **L1 only**, no NDA required.
- **Layer 1 - Enabion Mutual NDA** - one standard mutual NDA, accepted once per organisation; covers all pre-sales engagements (L2) between organisations that also accepted the same Mutual NDA.
- **Layer 2 - Custom NDA FastTrack** - the client's own NDA template, managed and tracked inside Enabion.
- **Layer 3 - External NDA** - NDA workflow managed in external tools (DocuSign/Adobe/etc.), with status synchronised back to Enabion.

R1.0 implements:

- **Layer 0** (L0 - No-NDA Zone - L1 data only), and
- **Layer 1** (Mutual NDA) - this document.

Layers 2-3 are referenced in section 6 as **future layers (R2.0+)**.

---

## 3. Enabion Mutual NDA (Layer 1) - Template (Draft)

> **Again: this is a draft template for discussion and product work. Do not use as-is with customers. Legal review is mandatory.**

### 3.1. Structure & design decisions

Design decisions, consistent with the Playbook and Implementation Plan:

1. **Purpose:** fast, neutral **pre-sales mutual NDA** for L2 information shared via Enabion in the context of evaluating and negotiating potential collaborations or projects.
2. **Parties:** multi-party framework NDA between:  
   - **Enabion Operator** (platform provider), and  
   - each **Enabion Member Organisation** that accepts the Mutual NDA.  
   Confidentiality obligations apply **bilaterally between Member Organisations that exchange information** and between each Member Organisation and the Enabion Operator in its role as platform provider/processor.
3. **Scope:** pre-sales, non-exclusive, non-transferable, limited to the **evaluation and negotiation** of potential collaborations (projects, programs, partnerships). Delivery/execution NDAs or contracts are out of scope.
4. **Data model alignment:** explicitly references **L1/L2/L3** and **Data Models 1-3**, but the legally operative scope for R1.0 is **Model 1 - Standard** and L1/L2.
5. **Governance:** the NDA does **not** change ownership of data. It is consistent with the ?Your Data, Your Control - Our Trust Layer" (Playbook/Implementation Plan reference)
6. **Simplicity:** wording kept as short and readable as possible while remaining legally meaningful.

### 3.2. Header & parties

```text
ENABION MUTUAL PRE-SALES NON-DISCLOSURE AGREEMENT
(LAYER 1 - ECOSYSTEM NDA - DRAFT)

This Enabion Mutual Pre-Sales Non-Disclosure Agreement ("Agreement") is entered into by and between:

(1) [ENABION OPERATOR LEGAL ENTITY], a company organised and existing under the laws of [JURISDICTION], with its registered office at [ADDRESS] ("Enabion");

and

(2) each legal entity that (a) has a valid organisation account in the Enabion platform, and (b) has accepted this Agreement through the Enabion interface ("Member Organisation", collectively "Member Organisations").

Each Member Organisation and Enabion may be referred to individually as a "Party" and collectively as the "Parties".
```

### 3.3. Definitions (extract)

```text
1. Definitions

1.1 "Enabion Platform" means the cloud service operated by Enabion that provides the Business Collaboration OS functionality described in the Enabion Playbook and related documentation (including Intent, Avatars, matching, NDA layers, and pre-sales pipeline).

1.2 "Engagement" means a potential cooperation, project, program or other business relationship being discussed or evaluated between one or more Member Organisations using the Enabion Platform.

1.3 "Confidential Information" means any non-public information disclosed by a Member Organisation ("Disclosing Member") to another Member Organisation ("Receiving Member") and/or to Enabion in connection with an Engagement, which is (a) identified as confidential at the time of disclosure, or (b) by its nature should reasonably be understood to be confidential, including without limitation Level 2 ("L2 - confidential / NDA") information as defined in the Enabion documentation.

1.4 "Level 1 Information" or "L1" means high-level, non-sensitive information suitable for the No-NDA Zone, as described in the Enabion documentation (e.g. public-like descriptions, industries, non-sensitive context).

1.5 "Level 2 Information" or "L2" means confidential information shared under NDA, as described in the Enabion documentation (e.g. more detailed context, constraints, non-public process descriptions, indicative budgets).

1.6 "Level 3 Information" or "L3" means highly sensitive information (e.g. critical IP, regulated or defence-related data). L3 is not intended to be shared under this Agreement.

1.7 "Data Models 1-3" means the data engagement models (Standard, Shielded, Sovereign) defined in the Enabion documentation. This Agreement is designed primarily for use with Model 1 - Standard.
```

### 3.4. Confidentiality obligations

```text
2. Purpose and scope

2.1 This Agreement governs the treatment of Confidential Information exchanged in connection with the evaluation and negotiation of potential Engagements between Member Organisations via the Enabion Platform ("Purpose").

2.2 This Agreement is not intended to govern the execution or delivery of any Engagement, which will be subject to separate contracts between the relevant Member Organisations.

3. Mutual confidentiality

3.1 Each Receiving Member shall:
    (a) use Confidential Information solely for the Purpose; 
    (b) not disclose Confidential Information to any third party, except as permitted under this Agreement; 
    (c) protect Confidential Information with at least the same degree of care it uses to protect its own confidential information of a similar nature, and not less than reasonable care.

3.2 Enabion shall:
    (a) use Confidential Information solely for operating and improving the Enabion Platform in accordance with Enabion's terms of service and data protection documentation;
    (b) not disclose Confidential Information of a Member Organisation to another Member Organisation except as instructed or enabled by that Member Organisation through the Enabion Platform (e.g. by sharing an Intent or Engagement);
    (c) implement and maintain appropriate technical and organisational measures to protect Confidential Information against unauthorised access, use or disclosure.
```

### 3.5. Exceptions

```text
4. Exceptions

The obligations in section 3 do not apply to information which the Receiving Member or Enabion can demonstrate:

(a) is or becomes publicly available without breach of this Agreement;
(b) was lawfully known to the Receiving Member or Enabion prior to disclosure by the Disclosing Member;
(c) is received from a third party without breach of any confidentiality obligation;
(d) is independently developed without use of or reference to the Confidential Information;
(e) must be disclosed by law, regulation or court order, provided that (to the extent legally permitted) the Disclosing Member is given reasonable notice and an opportunity to seek protective measures.
```

### 3.6. L0 / L1 / L2 boundary and L3 exclusion

```text
5. No-NDA Zone and L2 boundary

5.1 Member Organisations acknowledge that:
     (a) Level 1 Information (L1) may be shared in the No-NDA Zone (Layer 0) without NDA, and
     (b) Level 2 Information (L2) should only be shared where the relevant Member Organisations have accepted this Agreement (Layer 1) or another applicable NDA (Layer 2 or 3).

5.2 Member Organisations agree that they are responsible for classifying their information as L1/L2/L3 within the Enabion Platform and for avoiding the upload of L3 information under this Agreement. L3 information, if any, must be handled under separate, more stringent arrangements (e.g. Custom NDA, External NDA, or dedicated sovereign deployment).

5.3 Enabion will provide product controls and indicators to help Member Organisations understand whether an Engagement is currently in the No-NDA Zone (L0) or covered by this Agreement (Layer 1), but ultimate responsibility for the classification and content of disclosures remains with the Member Organisations.
```

### 3.7. Term, survival and residuals

```text
6. Term and survival

6.1 This Agreement enters into force for a Member Organisation on the date it accepts this Agreement through the Enabion Platform ("Effective Date") and remains in effect until terminated by that Member Organisation or Enabion in accordance with the platform terms.

6.2 Confidentiality obligations for each item of Confidential Information shall survive for a period of [3-5] years from the date of its disclosure, or such longer period as required by law or agreed in writing between the relevant Member Organisations.

7. Residual information

7.1 Nothing in this Agreement prevents the Receiving Member or Enabion from using information retained in the unaided memory of individuals who have had access to Confidential Information, provided that such use does not involve the disclosure of Confidential Information in tangible form or breach any other obligation under this Agreement.
```

### 3.8. No licence, no exclusivity, no warranties

```text
8. No licence and no exclusivity

8.1 This Agreement does not grant any licence or other rights to intellectual property, except the limited right to use Confidential Information for the Purpose.

8.2 Nothing in this Agreement obliges any Party to proceed with any Engagement or transaction. Each Party remains free to work with other partners and to discontinue discussions at any time.

9. No warranties

9.1 All Confidential Information is provided "as is". The Disclosing Member and Enabion make no representations or warranties, express or implied, regarding the accuracy or completeness of the Confidential Information.
```

### 3.9. Data processing, trust and analytics

```text
10. Data processing and trust analytics

10.1 The Parties acknowledge that Enabion may process certain metadata and event logs relating to Engagements (e.g. timestamps, statuses, anonymised performance indicators) in order to operate the Enabion Platform, improve its services and generate aggregated trust analytics (TrustScore, Trust Graph), as described in Enabion's documentation.

10.2 Such processing shall be performed in accordance with applicable data protection law and with Enabion's data protection documentation (including any data processing agreement concluded between Enabion and the relevant Member Organisation).

10.3 Enabion shall not disclose identifiable Confidential Information of one Member Organisation to another Member Organisation except as instructed by the relevant Member Organisation through the Enabion Platform.
```

### 3.10. Governing law, jurisdiction, miscellaneous

```text
11. Governing law and jurisdiction

11.1 This Agreement shall be governed by and construed in accordance with the laws of [JURISDICTION], excluding its conflict of law rules.

11.2 Any dispute arising out of or in connection with this Agreement that cannot be resolved amicably shall be submitted to the exclusive jurisdiction of the courts of [CITY, COUNTRY], without prejudice to any mandatory consumer protection laws where applicable.

12. Miscellaneous

12.1 Entire Agreement. This Agreement constitutes the entire agreement between the Parties regarding its subject matter and supersedes all prior NDAs between the Parties for pre-sales use of the Enabion Platform, unless expressly stated otherwise.

12.2 Amendments. Enabion may propose updates to this Agreement from time to time. Material changes will be communicated through the Enabion Platform. Continued use after the effective date of an updated Agreement may be treated as acceptance, subject to applicable law.

12.3 Counterparts and electronic acceptance. This Agreement may be accepted and entered into by click-through or similar electronic means. No wet signatures are required.
```

---

## 4. NDA elements visible in the product (R1.0)

This section defines **what must be visible in the product UI and data model** to make Layer 0/1 behaviour clear and auditable in R1.0 (Model 1 - Standard).

### 4.1. Organisation-level information

For each **organisation account**:

- **NDA status badge** (Org Settings / Profile):
  - `No NDA` - has not accepted Enabion Mutual NDA.
  - `Mutual NDA (Layer 1) active` - accepted; shows date and version.
- **Fields in data model**:
  - `mutual_nda_status` enum: `NONE` | `ACTIVE` | `TERMINATED`.
  - `mutual_nda_version` (string, e.g. `1.0`, `1.1`).
  - `mutual_nda_accepted_at` (timestamp, UTC).
  - `mutual_nda_terminated_at` (nullable timestamp).
- **Event(s)**:
  - `NDA_LAYER1_ACCEPTED` (org_id, version, timestamp, actor).
  - `NDA_LAYER1_TERMINATED` (org_id, reason, timestamp, actor).

### 4.2. Intent / Engagement-level information

For each **Intent** and **pre-sales Engagement** in R1.0:

- **Key UI elements**:
  - L0/L1 indicator in the header or sidebar, e.g.:  
    - `Confidentiality: L1 - No-NDA Zone` or  
    - `Confidentiality: L2 - Mutual NDA (Layer 1)`.
  - A small **"info" tooltip** next to the label with short copy (see section 5).
  - A link "View NDA details" opening:
    - name and version of the NDA,
    - parties (organisations that have accepted Layer 1),
    - effective dates and status.

- **Fields in data model**:
  - `confidentiality_level`: `L1` | `L2` (L3 not used in R1.0).
  - `nda_layer`: `L0` | `L1` | `L2` | `L3` (R1.0 uses only `L0`/`L1`).
  - `nda_source`: `NONE` | `MUTUAL_LAYER1` | `CUSTOM_LAYER2` | `EXTERNAL_LAYER3`.
  - `nda_effective_from` and `nda_effective_to` (nullable).

- **Events**:
  - `ENGAGEMENT_CONFIDENTIALITY_CHANGED` (from L1 to L2, etc.).
  - `ENGAGEMENT_NDA_BOUND` (engagement_id, nda_layer, nda_source, timestamp).

### 4.3. Minimal "must show" NDA information in UI

At minimum, users must be able to see, for the current Intent/Engagement:

1. **Whether NDA applies or not**:
   - "This engagement is in No-NDA Zone (L0)" vs "This engagement is covered by Enabion Mutual NDA (Layer 1)".

2. **Which organisations are covered**:
   - list of organisations in the engagement and whether they have accepted Layer 1.

3. **Dates & version**:
   - effective date and current version of the Mutual NDA.

4. **Quick explanation**:
   - 1-2 sentences on what this practically means (see UX copy below).

---

## 5. L0/L1 UX copy - product-ready strings

This section provides **short, ready-to-use copy** for UI elements, tooltips and help texts explaining L0/L1 behaviour in language suitable for non-legal users.

### 5.1. Labels & badges

**Confidentiality badges (Intent / Engagement header)**

- `L1 - No-NDA Zone`  
  Short description:  
  > "Safe to share high-level information. No NDA in place yet."

- `L2 - Mutual NDA (Layer 1)`  
  Short description:  
  > "Confidential information under Enabion Mutual NDA."

### 5.2. Tooltips / inline help

**Tooltip for L1 - No-NDA Zone**

> **No-NDA Zone (L0 / L1 data)**  
> This engagement is in the *No-NDA Zone*.  
> You can share only information that is safe to say on a conference or website (Level 1).  
> Do **not** paste sensitive details, customer data or deep IP here.  
> When you need to go deeper (Level 2), enable the Mutual NDA.

**Tooltip for L2 - Mutual NDA (Layer 1)**

> **Mutual NDA (Layer 1)**  
> Your organisation and the other party have accepted the Enabion Mutual NDA.  
> This covers Level 2 confidential information needed for serious pre-sales discussions (scope, constraints, indicative budgets, non-public context).  
> Deep confidential / highly regulated data (Level 3) is still out of scope and needs separate arrangements.

### 5.3. Call-to-action copy - enabling Mutual NDA

**Organisation settings - onboarding banner**

> **Protect pre-sales with one Mutual NDA**  
> Accept the Enabion Mutual NDA once and use it for all pre-sales conversations with other organisations in the Enabion ecosystem.  
> No more separate NDAs for every first call.  
> You can still use your own NDA or external tools later for high-risk / fully confidential projects.

Button label: `Review & accept Mutual NDA`

**Per-Engagement banner (when no NDA yet, but parties are known)**

> **Going beyond "conference level"**  
> This engagement is currently in the No-NDA Zone.  
> Before sharing sensitive details, enable the Mutual NDA for all parties.

Button label: `Enable Mutual NDA (Layer 1)`

### 5.4. Short FAQ copy (Help / "" modal)

**Q1: What is the No-NDA Zone**  
> It's the default mode for early conversations. You share only Level 1 information - the kind of context you could share on a public stage. No NDA is in place, so avoid sensitive details, customer data or deep IP.

**Q2: What changes when we enable the Mutual NDA (Layer 1)**  
> Once both organisations accept the Enabion Mutual NDA, Level 2 information shared in this engagement is covered by a standard mutual confidentiality agreement. You can safely discuss more detailed context, constraints and indicative budgets needed to decide whether the collaboration makes sense.

**Q3: Does Mutual NDA cover execution and delivery of the project**  
> No. Layer 1 is for pre-sales and evaluation only. Execution and delivery should be covered by your main contract or a separate project-specific NDA.

**Q4: Can we still use our own NDA**  
> Yes. In the next releases, Enabion will support uploading your own NDA template (Layer 2) or using external NDA tools (Layer 3), while keeping a clear status inside the platform.

---

## 6. Future NDA layers - R2.0+ (for reference)

This section briefly documents how **Layer 2 and 3** are expected to work so that the Mutual NDA and L0/L1 copy are future-proof.

### 6.1. Layer 2 - Custom NDA FastTrack (R2.0+)

Planned behaviour (high-level, non-binding for R1.0):

- **Who uses it:** organisations that must use their own NDA template (e.g. banks, large corporates).
- **What happens in product:**  
  - organisation uploads its standard NDA template and basic metadata (name, version, governing law),
  - Enabion helps pre-fill party data and engagement identifiers,
  - status is tracked in Enabion (draft / sent / signed / rejected).

- **UI impact (Intent / Engagement):**
  - confidentiality badge may show `L2 - Custom NDA (Layer 2)`,
  - tooltip explains that a custom NDA applies instead of the standard Mutual NDA.

### 6.2. Layer 3 - External NDA (R2.0+)

Planned behaviour:

- **Who uses it:** organisations that already run NDA workflows in external tools (DocuSign, Adobe Sign, internal systems) and want to keep it that way.
- **What happens in product:**  
  - Enabion triggers an external NDA workflow or links to it,
  - only high-level **status** and identifiers are synchronised back (e.g. `SIGNED`, `DECLINED`, `IN REVIEW`),
  - Enabion does not need full NDA content to know whether Level 2 can be used.

- **UI impact (Intent / Engagement):**
  - confidentiality badge may show `L2 - External NDA (Layer 3)`,
  - tooltip explains that NDA is handled outside Enabion, with status synced in.

### 6.3. Alignment with data models

For R2.0+, Custom NDA and External NDA must:

- remain consistent with **Data Models 1-3** (Standard / Shielded / (Playbook/Implementation Plan reference)
- **not** change the fundamental principle that:
  - raw, highly sensitive data (especially L3) remains under the control of the client,
  - Enabion mostly needs metadata, statuses and anonymised signals for TrustScore and Trust Graph, not full content.

---

## 7. Implementation notes & hand-off

### 7.1. For product / UX

- Use this document as the **source of truth** for:
  - confidentiality badges, tooltips and banners,
  - FAQ entries concerning L0/L1/L2,
  - entry points to Mutual NDA review/acceptance.
- Keep all user-facing terms consistent:
  - always use "No-NDA Zone (L0)" + "L1 information",
  - always use "Mutual NDA (Layer 1)" + "L2 confidential information".

### 7.2. For legal

- Treat the NDA text in section 3 as a **starting point**:
  - adapt to the chosen governing law and corporate structure,
  - align with full Terms of Service and Data Processing Agreement,
  - validate the intended multi-party mechanism (ecosystem NDA vs bilateral NDAs).

### 7.3. For engineering

- Implement the fields and events from section **4** in:
  - BCOS data model (Org + Intent/Engagement entities),
  - event model (`NDA_LAYER1_*`, `ENGAGEMENT_NDA_BOUND`, (Playbook/Implementation Plan reference)
- Use the UX strings from section **5** as the initial copy in R1.0, with localisation as a separate task.

Note: Technical enforcement of L0/L1 and data visibility follows the Security & Privacy baseline in `docs/Security_Privacy_Model1_MVP.md` (Issue #5).


