# Issue #42 - R1.0-BLOBSTORE-001 (ready-to-paste body)

**Spec/source:** docs/R1.0/R1_0_infra_blobstore.md (from Mieszko) - authoritative R1.0 plan to implement.

## Decision (R1.0 baseline)
- Build a full technical plan + scaffold (not just stubs) with a minimal, production-sensible scope.
- BlobStore abstraction with two drivers: Local (default for dev/staging) and S3 (optional, feature-flag/env; do not block if creds absent).
- AES-GCM encryption at the BlobStore layer for objects marked confidentiality >= L2 (in R1.0 this means L2). NDA gating is enforced at API/policy, not in the storage driver.
- Scope for R1.0: storage for email raw (MIME/EML) and email attachments from ingest; Intent attachments later (#77) reuse the same mechanism.

## Data model (Postgres)
- `blobs`: id (uuid), tenant_id (uuid), storage_driver (local|s3), object_key (string), size_bytes (int), sha256 (char(64)), content_type (string), confidentiality (L1|L2|L3; R1.0 uses L1/L2), encrypted (bool), encryption_alg (string, e.g. AES-256-GCM), encryption_key_id (string, identifier only), encryption_iv_b64 (string), encryption_tag_b64 (string), created_at.
- `attachments`: id (uuid), tenant_id, intent_id (uuid, nullable for future types), source (email_ingest|manual_upload|export), filename, blob_id (uuid FK), created_by_user_id (uuid, nullable if ingest), created_at.

## API (R1.0)
- Upload (manual): `POST /v1/intents/:intentId/attachments` (multipart/form-data; file + confidentiality default L1); flow: create blob -> create attachment.
- Download: `GET /v1/attachments/:id` (auth: tenant + RBAC + NDA gating if L2).
- Email ingest: each mail attachment -> BlobStore.put() -> attachments (source=email_ingest).
- Signed URLs can wait (#87); R1.0 downloads stream via backend proxy.

## Security / NDA gating
- L1 attachments: access per RBAC inside tenant.
- L2 attachments: require Mutual NDA accepted for the X<->Y relationship in context of the Intent/share link. `NdaPolicy.canAccess(tenant, user, intentId, confidentiality)`; if missing NDA -> 403.
- AES-GCM: encrypt-at-rest for L2; store IV/TAG in `blobs`. Key: `BLOB_ENC_MASTER_KEY` (32 bytes base64). Future KMS/BYOK planned for R4.0.

## What to implement now (R1.0-BLOBSTORE-001)
- BlobStore interface: put(stream|buffer, meta) -> BlobRef; get(blobId) -> stream; delete(blobId).
- Drivers: LocalBlobStore (filesystem, default) and S3BlobStore (S3-compatible, optional env).
- CryptoEnvelope (AES-256-GCM): encrypt/decrypt only when confidentiality >= L2; persist IV/TAG in `blobs`.
- Services: BlobService (creates `blobs`, calls driver, computes sha256); AttachmentService (creates `attachments`, links to Intent).
- API: POST /v1/intents/:intentId/attachments (multipart); GET /v1/attachments/:attachmentId (stream).
- Policy: AttachmentAccessPolicy with tenant isolation + RBAC + NDA check for L2.

## ENV (R1.0)
- `BLOBSTORE_DRIVER=local|s3` (default local)
- `BLOBSTORE_LOCAL_ROOT=/srv/enabion/blobstore` (or docker volume)
- `BLOB_ENC_MASTER_KEY=...` (32 bytes base64; rotate later)
- Optional S3: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.

## Tests (minimum, required)
- Unit: Local driver roundtrip; AES-GCM encrypt/decrypt roundtrip; policy test L2 without NDA -> 403.
- Integration (docker): upload attachment -> DB records created -> download returns identical bytes.

## Definition of Done (#42)
- Local driver works end-to-end (upload/download) + tests green.
- S3 driver compiles and is env-toggleable (even if not exercised against a real bucket).
- AES-GCM works for L2 (with test).
- NDA gating enforced for L2 (403 test).
- Documentation: `docs/R1.0/R1_0_infra_blobstore.md` (env, folders, backup note).

## Status 2025-12-18 (Ewa tracker #38)

**Done**
- Prisma models/migration `20251218_add_blobstore` for `Blob`/`Attachment` landed.
- BlobStore interface, Local driver default, S3 stub (env-toggleable), AES-GCM envelope; services `BlobService`/`AttachmentService`; API `POST /v1/intents/:intentId/attachments`, `GET /v1/attachments/:id` (stream, NDA gate for L2).
- Unit tests added (`scripts/blobstore.test.ts` covers local roundtrip, AES-GCM, L2 w/o NDA -> 403); `npm test` green. Env knobs documented in `docs/R1.0/R1_0_infra_blobstore.md`.

**Checklist (#42)**
- [x] Implement schema changes (blobs, attachments) + migration (`20251218_add_blobstore`).
- [x] Implement BlobStore interface with Local + optional S3 drivers (env flag; S3 stub compiles).
- [x] Implement CryptoEnvelope AES-GCM for confidentiality >= L2 with metadata (IV/TAG/key_id) in blobs.
- [x] Implement BlobService + AttachmentService + API endpoints with AttachmentAccessPolicy (tenant/RBAC/NDA) — controller now calls `NdaPolicy.canAccess(...)`; query flag remains only as assumed acceptance for tests.
- [x] Tests: integration (docker-style) upload/download + tenant isolation via `scripts/attachment-integration.test.ts`; unit tests cover local driver, AES-GCM, L2 without NDA -> 403.
- [x] Docs: `docs/R1.0/R1_0_infra_blobstore.md` env/paths/notes updated.
- [ ] Mark issue For CEO after implementation/tests; apply DB migrations in environments (`npx prisma migrate deploy`). Optional: S3 smoke with `@aws-sdk/client-s3`.
- [ ] Apply DB migrations in environments: `cd apps/backend && npx prisma migrate deploy`.
- [ ] Optional: S3 smoke test with `@aws-sdk/client-s3` installed and env set; mark issue For CEO after deploy/tests.

