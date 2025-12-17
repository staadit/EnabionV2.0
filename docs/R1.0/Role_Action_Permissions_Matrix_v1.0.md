# R1.0 Role × Action Permissions Matrix (Owner / BD-AM / Viewer)

Last updated: 2025-12-15 (CET)  
Scope: Model 1 (R1.0) — pilot-grade RBAC expectations for API/UI and tests.

| Action / Capability | Owner | BD/AM | Viewer |
| --- | --- | --- | --- |
| Create intent (L1/L2 fields) | ✅ | ✅ | ❌ |
| Edit intent (L1/L2 fields) | ✅ (full) | ✅ (business fields) | ❌ |
| View intent L1 | ✅ | ✅ | ✅ |
| View intent L2 (requires NDA) | ✅ | ✅ | ❌ |
| Change pipeline stage | ✅ | ✅ | ❌ |
| Upload/download attachments (gated by NDA/L2) | ✅ | ✅ | ❌ |
| Generate share link (L1 only) | ✅ | ✅ | ❌ |
| Export intent (MD/PDF, L1 only) | ✅ | ✅ | ❌ |
| Invite Y / send share link | ✅ | ✅ | ❌ |
| Accept NDA (Layer 1) | ✅ | ✅ | ❌ |
| Set org language / preferences | ✅ | ❌ | ❌ |
| Manage members / roles | ✅ | ❌ | ❌ |
| View telemetry dashboard | ✅ | ✅ | ✅ |
| Start/stop pilot (GH Actions/tag deploy) | ✅ | ❌ | ❌ |

Notes:
- L2 data is visible/usable only after NDA acceptance (R1.0-NDA-001) and enforced via R1.0-L2-ENF-001 + AI-PII rules.
- Signed/secure access required for attachments (R1.0-BLOBSTORE-001/SEC-001); exports and share links are L1-only.
- Tests should cover positive/negative cases per row; CI-QUAL-002 should enforce RBAC/isolation.
