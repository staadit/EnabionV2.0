# Enabion - Security & Privacy baseline (Model 1 - Standard, MVP R1.0)

Status: **Internal draft for MVP (R1.0)**  
Version: 0.2  
Date: 2025-12-10  
Scope: **Model 1 - Standard** (multi-tenant SaaS, SME focus, R1.0)  

---

## 1. Purpose & scope of this document

This document defines the **security and privacy baseline for Enabion MVP (R1.0)** for customers using:

- **Data Model 1 - Standard** (multi-tenant SaaS in Enabion cloud), and  
- **confidentiality Levels L1/L2** with **NDA Layers 0/1** (No-NDA Zone + Enabion Mutual NDA).  

It is **not** a full security whitepaper for Models 2-3 (Shielded / Sovereign); instead, it:

1. Describes what we **do** in R1.0 to protect customer data in Model 1.  
2. Clarifies which risks are **explicitly out of scope** for MVP and will be addressed in later releases.  
3. Provides a **simple narrative for SME clients** and a more detailed section for CIO/CISO / legal.  

This baseline aligns with the core principles in the Enabion Playbook:

- **Your Data, Your Control - Our Trust Layer** - Enabion cares primarily about structured context, events and trust signals, not full raw document archives. fileciteturn0file2L942-L969  
- **Model 1 - Standard as default** for SMEs that already use modern SaaS and do not need dedicated Shielded/Sovereign setups yet. fileciteturn0file2L972-L1000  

---

## 2. Context & assumptions (R1.0, Model 1 - Standard)

### 2.1 Target customers in MVP

Model 1 - Standard in R1.0 targets primarily:

- software houses, agencies, consulting companies (5-500 people),  
- SME organisations using Microsoft 365 / Google Workspace / modern SaaS,  
- companies that need **fast value in pre-sales & collaboration**, not yet full regulated-sector controls. fileciteturn0file3L252-L285  

### 2.2 What R1.0 does **and does not** cover

**Covered in R1.0 / Model 1:**

- multi-tenant SaaS hosted in an EU region,  
- organisations, users and roles (Owner / Manager / Contributor / Viewer), fileciteturn0file3L482-L497  
- Intents, pre-sales pipeline, basic matching, Avatars for Clarify & Match,  
- L1/L2 confidentiality levels and NDA Layers 0/1 (No-NDA Zone + Enabion Mutual NDA), fileciteturn0file2L1001-L1067  
- basic behavioural TrustScore MVP (profile completeness, responsiveness, intent completion). fileciteturn0file3L350-L379  

**Explicitly out of scope for R1.0 / Model 1:**

- Model 2 - Shielded and Model 3 - Sovereign (only architecture-ready in MVP, not delivered), fileciteturn0file3L638-L679  
- advanced AI Governance matri[x] per project type (comes with R4.0), fileciteturn0file3L809-L842  
- ODR v1 (formal Online Dispute Resolution) - appears with R3.0, not MVP, fileciteturn0file3L703-L742  
- full Hubs productisation (R3+),  
- financial escrow & advanced economic governance (R3+). fileciteturn0file3L736-L742  

### 2.3 Threat model - high level

R1.0 focuses on mitigating:

- **unauthorised access** to organisations' Intents and pre-sales data,  
- **accidental disclosure** of sensitive L2 information between unrelated tenants,  
- **data loss** due to infrastructure failure,  
- **basic abuse** of email->Intent and Avatars (spam, prompt injection, obvious misuse).  

R1.0 **does not** attempt to fully solve:

- nation-state-level adversaries,  
- cross-jurisdiction regulatory edge cases (handled gradually with R4.0),  
- complex insider threat models inside customer organisations (we provide basic RBAC, not full IRM).  

---

## 3. Data classification & NDA in Model 1

### 3.1 Levels L1 / L2 / L3 - recap

As defined in the Playbook: fileciteturn0file2L1001-L1042  

- **L1 - public / matching**  
  Information that could be shared "on a conference stage": high-level description of needs, sectors, technologies, public company profile, rough budget ranges.

- **L2 - confidential / NDA**  
  Deeper business context, non-public project information, assumptions, constraints, but **without** highly sensitive IP/PII or critical operational data.

- **L3 - deep confidential**  
  Critical IP, PII in regulated sectors, defence-grade information, highly sensitive operations.  

### 3.2 Levels supported in R1.0 / Model 1

R1.0 / Model 1 supports:

- **L1** - fully, without NDA (No-NDA Zone / Layer 0),  
- **L2** - under NDA Layer 1 (Enabion Mutual NDA).  

**L3 is conceptually present** in the UX (language, signalling) but not supported with dedicated technical and process controls in R1.0. Any project requiring L3-grade protection should be handled via bespoke arrangements and is a natural candidate for Model 2-3 in later releases.

### 3.3 NDA Layers in R1.0

- **Layer 0 - No-NDA Zone**  
  Default for new Intents. Only L1 data should be entered/shared here.  

- **Layer 1 - Enabion Mutual NDA**  
  Ecosystem-wide pre-sales NDA signed once by the organisation at onboarding, covering pre-sales interactions between parties that also accepted Mutual NDA. fileciteturn0file2L1043-L1067  

Layers 2-3 (Custom NDA FastTrack & External NDA via DocuSign/Adobe) are defined for future releases, not implemented in MVP. fileciteturn0file2L1068-L1107  

---

## 4. What data Enabion stores in Model 1 (R1.0)

### 4.1 Data categories

In R1.0 / Model 1 the platform stores the following **core categories of data**:

1. **Organisation & user data**  
   - organisation profile (name, basic contact data, sectors, technologies),  
   - user accounts (name, email, role in the org),  
   - basic settings (language, notification preferences).  

2. **Intents & pre-sales data**  
   - structured Intents: goal, context, scope, KPIs, risks, timeline, budget ranges,  
   - avatar suggestions and their status (issued, accepted, rejected),  
   - pre-sales pipeline state (Clarify / Match / Commit, Won/Lost),  
   - simple matching metadata (sectors, technologies, geography, language, size). fileciteturn0file3L252-L324  

3. **Event log (MVP subset)**  
   For MVP we log only events strictly required to support Clarify-Match-Commit in pre-sales: fileciteturn0file3L915-L955  

   - `INTENT_CREATED`, `INTENT_UPDATED`,  
   - `AVATAR_SUGGESTION_ISSUED`, `SUGGESTION_ACCEPTED`, `SUGGESTION_REJECTED`,  
   - `NDA_ACCEPTED` (Mutual NDA),  
   - `COMMIT_DECISION_TAKEN` (Won/Lost decision).  

   We **do not yet** log Issues/Disputes or Deliver/Execution data in R1.0.

4. **Attachments (limited)**  

   MVP supports optional attachments to Intents (e.g. RFP PDFs, short briefs).  
   For Model 1 these files are stored in cloud object storage, encrypted at rest (see 6.3).  

### 4.2 Data we deliberately avoid

Consistent with the "Your Data, Your Control - Our Trust Layer" principle, R1.0 does **not require**: fileciteturn0file2L942-L969  

- full ticket or code repositories,  
- full internal documentation archives,  
- detailed financial transaction data,  
- end-user PII databases.  

For typical SME clients this is enough to deliver value in **Intent -> Avatars -> Matching -> pre-sales pipeline**, without pulling in the entire operational data stack.

---

## 5. System architecture & boundaries (Model 1)

### 5.1 High-level architecture elements

Model 1 uses the baseline architecture from the Implementation Plan: fileciteturn0file3L561-L609  

- **Frontend Web (SPA)** - user interface for Orgs X/Y, pre-sales pipeline, Intents, Avatars.  
- **BCOS Core / Backend API** - multi-tenant API for organisations, users, Intents, events, NDA & TrustScore logic.  
- **AI Gateway** - service that sends well-scoped tasks to LLMs (Intent Coach, avatar suggestions) and logs AI usage. fileciteturn0file2L676-L723  
- **Data & Experience Layer** - relational DB (e.g. Postgres) for structured data, object storage for attachments, vector store for retrieval.  
- **Integrations** - primarily e-mail->Intent in R1.0; other integrations are future work. fileciteturn0file3L609-L637  

### 5.2 Tenant isolation

- All core entities (Org, User, Intent, Events, Attachments) are **scoped by organisation ID**.  
- BCOS Core enforces **organisation-scoped authorisation** at API level for every request.  
- No UI or API endpoint allows cross-org browsing of Intents unless both organisations explicitly participate in the same engagement (future X↔Y flows).  
- System-level admin access is restricted to a minimal set of operational accounts with strong controls (see 6.1).  

---

## 6. Security controls in Model 1 - MVP baseline

### 6.1 Identity & Access Management (IAM)

**Authentication**

- Email + password with secure hashing (e.g. bcrypt/argon2) for all users.  
- Password policies aligned with current industry best practices (minimum length, complexity or passphrases).  
- Session management with server-side invalidation and sensible timeouts.  

**Authorisation & roles** fileciteturn0file3L482-L497  

- Four main roles per organisation:  
  - **Owner** - full admin for the organisation, billing & settings,  
  - **Manager** - access to all Intents & pipeline in the org,  
  - **Contributor** - can create/edit Intents they own or are assigned to,  
  - **Viewer** - read-only access (e.g. CEO).  
- Role checks enforced in backend; front-end only reflects capabilities.  

**Planned for later releases (not MVP guarantee):**

- SSO / SAML / OIDC integration with corporate IdPs,  
- mandatory MFA for high-risk orgs.  

### 6.2 Network & perimeter

- All traffic to Enabion application is served over **HTTPS (TLS 1.2+)**.  
- No plaintext HTTP endpoints; HSTS enabled.  
- Access to databases and object storage is limited to application subnets (no public DB endpoints).  

### 6.3 Data at rest & backups

- All structured data (DB) and attachments (object storage) are **encrypted at rest** (e.g. AES-256 by cloud provider).  
- Regular automated backups of DB and storage with at least:  
  - **RPO ≤ 24h** (daily backups),  
  - **RTO** target in hours (exact SLO to be decided per environment).  
- Backups stored in separate physical/availability zones where possible.  

### 6.4 Logging, monitoring & audit (MVP scope)

- Application logs capture:  
  - authentication attempts (success/failure),  
  - key business events listed in 4.1.3 (INTENT_*, AVATAR_SUGGESTION_*, NDA_ACCEPTED, COMMIT_DECISION_TAKEN),  
  - errors and performance metrics.  
- Access to logs is restricted to operational staff; logs are not exposed to customers directly in MVP.  
- Basic infrastructure monitoring (uptime, error rates, latency) with alerting on critical thresholds for MVP. fileciteturn0file3L533-L558  

### 6.5 AI & LLM usage controls

Aligned with AI Gateway & Avatars design & guardrails: fileciteturn0file3L610-L637  

- All AI calls go through **AI Gateway**, which:  
  - minimises the payload to what is strictly needed (e.g. structured Intent fields, not full org history),  
  - tags each request with org ID, user ID, model ID, purpose,  
  - logs outcome as `AVATAR_SUGGESTION_*` events.  
- For MVP we commit to using LLM providers that:  
  - support **"no training on customer data"** configurations,  
  - provide data residency compatible with our hosting region, or  
  - are used only on **pre-processed, low-risk snippets** where this is acceptable.  
- Avatars must be able to respond with **"I don't know / I need more data"** and should not fabricate unknown facts about organisations or people (behavioural requirement enforced via prompt design & testing). fileciteturn0file2L724-L772  

### 6.6 Email->Intent - abuse & phishing

For the email->Intent integration (R1.0 scope): fileciteturn0file3L702-L712  

- Each organisation gets a dedicated address pattern `intent@<orgslug>.enabion.com`.  
- Basic anti-abuse controls:  
  - accept emails only from whitelisted domains (configurable per org) or after first manual approval,  
  - optional DMARC/SPF checking to reduce spoofing,  
  - size limits for emails and attachments.  
- Avatars treat incoming email content as **untrusted**:  
  - they never auto-execute links or code,  
  - they summarise and extract Intent but do not act beyond the BCOS context.  

---

## 7. Privacy & data protection

### 7.1 Data minimisation

R1.0 is designed to collect only the data required to support:  

> Intent -> Avatars -> Matching -> NDA -> pre-sales pipeline. fileciteturn0file2L942-L969  

We explicitly avoid storing:

- sensitive PII about end-customers of X/Y,  
- production credentials, API keys, private certificates,  
- detailed operational logs of customer internal systems.  

### 7.2 Data subject rights & deletion

For Model 1 MVP:

- Users can request deletion of their accounts via support; account becomes inactive and PII is minimised where legally possible.  
- Organisations can request anonymisation of closed Intents and associated events, except where legal retention obligations apply (e.g. billing logs). fileciteturn0file2L1188-L1217  
- System design differentiates between:  
  - **raw content** (which can often be deleted or anonymised),  
  - **event-log** (which may need to be preserved in minimal form for legal / Trust Graph reasons).  

Detailed legal policy will be captured in the separate **Data Ownership & Deletion Policy** document mentioned in the Implementation Plan. fileciteturn0file3L857-L885  

### 7.3 Multi-jurisdiction awareness (MVP level)

- R1.0 assumes hosting in an EU region and is designed to be **GDPR-friendly by default**.  
- For non-EU customers, we will initially apply the same baseline and extend region-specific controls with R4.0 (multi-jurisdiction support). fileciteturn0file2L1218-L1235  

---

## 8. Known limitations & non-goals for R1.0

The following **are known limitations** of the MVP security & privacy posture and are intentionally accepted trade-offs:

1. **No dedicated Model 2-3 enforcement yet**  
   - we do not support fully shielded or sovereign deployments; those require additional work and are not part of MVP. fileciteturn0file3L638-L679  

2. **No advanced device / endpoint security controls**  
   - customers are responsible for securing their own endpoints and internal environments.  

3. **Limited AI transparency UI**  
   - AI usage is logged and auditable internally, but end-user-facing explainability is basic (e.g. "why this suggestion" text only).  

4. **No full ODR / dispute process**  
   - since Deliver/Execution is not part of R1.0, we do not yet provide formal dispute workflows or evidence packages (these come with R2.0-R3.0). fileciteturn0file3L703-L742  

5. **No granular customer-configurable retention policies yet**  
   - default retention is conservative; fine-grained per-org retention will be introduced with regulated/enterprise releases.  

---

## 9. Roadmap from Model 1 MVP to Models 2-3

This document is a **baseline** for R1.0. The path forward is: fileciteturn0file3L638-L679turn0file3L809-L842  

- **R2.0 - BCOS Containers & Trust Rooms**  
  - introduce Deliver/Expand, Issues/Disputes, Trust Rooms, NDA Layers 2-3 (Custom & External),  
  - start implementing Model 2 - Shielded with simple on-prem connector.

- **R3.0 - TrustGraph & EnableMark v1.0**  
  - full TrustScore v2, Trust Graph 1.0, Hubs v1,  
  - ODR v1 and evidence export,  
  - Startup Inclusion & AI UpScaler (v1).  

- **R4.0 - Regulated & Sovereign Data Models**  
  - full Model 2 - Shielded and Model 3 - Sovereign,  
  - multi-jurisdiction support, AI Governance matri[x], advanced audit / compliance tooling.  

Model 1 MVP must be **architecturally compatible** with Models 2-3 from day one; this document defines the minimum security & privacy bar for that first step.

---

## 10. Summary for CEO / CIO / CISO

In one page:

- Enabion R1.0 / Model 1 is a **multi-tenant SaaS** focused on Intent -> Avatars -> Matching -> NDA -> pre-sales pipeline.  
- It supports **L1/L2** confidentiality levels with **No-NDA Zone + Enabion Mutual NDA**, while L3 remains future scope.  
- Data stored is limited to **organisational profiles, Intents, pre-sales metadata and minimal event logs** - not full operational systems.  
- Security baseline:  
  - **RBAC** per organisation,  
  - **encryption in transit and at rest**, backups, basic monitoring and audit logs,  
  - all AI traffic controlled via **AI Gateway** with no-training configurations and explicit logging.  
- Privacy baseline is **data-minimal** and designed to be GDPR-friendly, with clear separation between raw content and event logs.  
- Several advanced controls (Shielded/Sovereign models, ODR, detailed AI Governance, granular retention) are planned for R2.0-R4.0 and intentionally excluded from MVP scope.

This allows SME customers to start using Enabion safely in pre-sales and collaboration **without waiting for full enterprise/regulatory feature set**, while keeping a clear, documented path to higher security tiers.
