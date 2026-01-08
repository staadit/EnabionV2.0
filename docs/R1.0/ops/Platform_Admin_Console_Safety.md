# Platform Admin Console Safety (R1.0)

## Access
- Access is allowlist-only via `PLATFORM_ADMIN_EMAIL_ALLOWLIST`.
- No self-service promote; only ops/admin emails are permitted.

## Data handling
- Do not copy L2 data outside Enabion systems.
- Event payloads returned by the console are redacted for sensitive fields.
- If you need deeper access, follow the incident runbook and request approval.

## Tenants
- Use Tenants list for name/slug/tenantId lookup.
- Tenant detail shows org metadata, member list, and intent/event links.

## Users
- Search by email or userId.
- Review status (Active/Deactivated) and org mapping.

## Events
- Always query with orgId, subjectId, or type.
- Payloads are redacted (body/content/raw/attachments/etc).

## Incident response
- If you see suspicious activity, follow `docs/R1.0/S0_Security_Incident_Response_Runbook_v1.1.md`.
