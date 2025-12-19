# Security & Privacy Note - Model 1 (R1.0)
Status: Draft customer-facing (EN)
Version: v0.1
Date: 2025-12-10
Related epic: #5

## 1. What is Model 1 - Standard (R1.0)
Model 1 is the default deployment of Enabion: a multi-tenant SaaS hosted by Enabion in an EU cloud region. It covers pre-sales only (Intent -> Clarify -> Match -> Commit) and stores two confidentiality levels:
- **L1 (public/matching):** information you could share in a conference-style case study.
- **L2 (confidential/NDA):** deeper project details available after NDA.
L3 (deep confidential) is **not** stored in R1.0; for those cases we will use future Shielded/Sovereign models.

## 2. What data we store and where
- **Organisation profile:** company name, sectors, tech stack, regions, basic settings.
- **Users:** name, work email, role (Owner/Manager/Contributor/Viewer).
- **Intents:** project descriptions (L1/L2), pipeline status, invited partners.
- **NDA info:** whether Mutual NDA is active between parties (dates, parties, template version).
- **Avatar suggestions & feedback:** AI suggestions and whether users accepted/rejected them.
- **Audit events:** who created/edited/viewed an Intent, who accepted NDA, key AI actions.
All production data resides in Enabion's EU cloud (database + encrypted object storage). No customer data is used to train third-party AI models beyond the configured service usage.

## 3. Roles and access
- **Owner:** admin/billing, can manage users and settings.
- **Manager:** manages pipeline and Intents; can add users up to Manager level.
- **Contributor:** creates/edits Intents, works with Avatars.
- **Viewer:** read-only access to Intents and pipeline (may comment where allowed).
Access inside one organisation: all roles can see Intents by default. Partners Y only see Intents explicitly shared with them, and only L2 content when NDA is active between X and Y.

## 4. Logging and audit trail
We keep a minimal, structured audit log (who/when/what) for:
- logins and user/role changes,
- creation/update/view of Intents,
- NDA acceptance,
- AI suggestions issued/accepted/rejected,
- Commit decisions and Intent sharing with partners.
- Attachment upload/download events (with NDA gate for L2) for auditability.
Audit logs are stored separately, encrypted, and kept for at least 12 months in production. Logs avoid full sensitive text; where needed we pseudonymise.

## 5. Encryption and data protection
- **In transit:** all access via HTTPS (TLS 1.2+); internal services also use TLS/VPC isolation.
- **At rest:** database, object storage and backups are encrypted (cloud-managed encryption). L2 attachments are envelope-encrypted and only streamed after NDA/RBAC checks; S3 downloads use signed URLs with expiry, local driver streams via backend.
- **Content policy:** upload limits and MIME allowlist enforced for attachments to reduce risk from executable/oversize payloads.
- **Secrets:** API keys and credentials are stored in secret management, not in code.

## 6. Data retention and deletion
- Soft delete by default for organisations, users, Intents; pseudonymisation for PII where required.
- Optional hard delete of Intent content after a grace period (e.g., 30 days) per customer policy.
- Audit logs retained min. 12 months; can be pseudonymised on request.
- We do not keep L3 content in R1.0; for such cases we recommend future Shielded/Sovereign models.

## 7. Alignment with future models and regulations
- **Models 2-3 (Shielded/Sovereign):** planned for regulated/high-sensitivity use; Model 1 is designed to evolve without schema rewrites.
- **NIS2 / AI Act:** R1.0 follows reasonable SaaS security (TLS, encryption at rest, RBAC, audit log) and keeps AI usage logged. Deeper regulatory controls (data residency per tenant, local AI runners, advanced AI governance) are planned for later releases.

## 8. How to use this note with customers
- Share when describing Enabion security posture for R1.0 pre-sales.
- Pair with the Mutual NDA (Layer 1) for L2 work.
- Emphasise that deep-confidential (L3) scenarios will use Shielded/Sovereign models in future releases.
