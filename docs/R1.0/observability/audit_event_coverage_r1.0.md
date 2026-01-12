# R1.0 audit event coverage

Minimal reference for audit-critical actions and emitted BCOS events (L1-safe payloads only).

| User action | Event type | subjectType | Payload keys | Channel |
| --- | --- | --- | --- | --- |
| View intent (owner/Y portal) | `INTENT_VIEWED` | `INTENT` | `payloadVersion`, `intentId`, `viewContext` (`owner`/`y_portal`) | `ui` |
| View intent via share link | `INTENT_SHARED_LINK_VIEWED` | `SHARE_LINK` | `payloadVersion`, `intentId`, `shareTokenId` | `api` |
| Generate export (md/pdf/docx) | `EXPORT_GENERATED` | `EXPORT` | `payloadVersion`, `intentId`, `exportId`, `format` (`markdown`/`pdf`/`docx`) | `ui` |
| Upload attachment | `ATTACHMENT_UPLOADED` | `ATTACHMENT` | `payloadVersion`, `intentId`, `attachmentId`, `filename`, `sizeBytes` | `api`/`ui` |
| Download attachment (allowed) | `ATTACHMENT_DOWNLOADED` | `ATTACHMENT` | `payloadVersion`, `intentId`, `attachmentId`, `via` (`owner`/`share_link`/`system`) | `api`/`ui` |

All envelopes include `orgId`, `actorUserId` (or null for public share), `actorOrgId`, `pipelineStage`, `lifecycleStep`, `channel`, `correlationId`, `occurredAt`.
