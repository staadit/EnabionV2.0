# BlobStore v1 (R1.0)

**Status:** Implementable baseline (R1.0)

**Owner:** Engineering

**Primary implementation tracker:** GitHub issue `R1.0-BLOBSTORE-001 (#42)`

---

## 1. Purpose

BlobStore v1 provides a single, auditable storage abstraction for binary artifacts needed by R1.0 flows:

- inbound email raw payloads (EML/MIME)
- inbound email attachments
- manual intent attachments (future: `R1.0-INTENT-ATT-001 #77`)
- export/share artifacts (future: `#79/#80/#78`)

Key objectives:

- **single abstraction** across local filesystem and S3-compatible storage
- **encryption-at-rest** for confidential content (L2+)
- **policy enforcement** (tenant isolation + RBAC + NDA gating) at download time
- **backup/restore compatibility** for pilot-mode operations (future: `#85`)

Non-goals for v1:

- signed URLs / direct-to-S3 upload (future: `#87`)
- full BYOK/KMS key management (future enhancement)

---

## 2. Concepts and scope

### 2.1 Confidentiality levels

- **L1**: non-confidential (default)
- **L2**: confidential; requires **Mutual NDA acceptance** to access in applicable contexts
- **L3**: restricted / highly sensitive (placeholder in R1.0; not required to be fully implemented)

### 2.2 Where encryption applies

- **Encrypt-at-rest** is applied for blobs with `confidentiality >= L2`.
- L1 blobs **may be stored unencrypted** (baseline), while still benefiting from tenant isolation and RBAC.

### 2.3 Where NDA gating applies

- NDA gating is enforced **at the API/policy layer**, not inside the storage drivers.
- Access to **L2** attachments must be denied if the required NDA state is not satisfied.

---

## 3. Architecture overview

### 3.1 Layering

1. **API layer**
   - Upload endpoints accept bytes/multipart
   - Download endpoints stream bytes
   - Calls policy checks before any blob access

2. **Service layer**
   - `BlobService`: creates `blobs` records, computes hashes, calls drivers, handles encryption envelope
   - `AttachmentService`: links a blob to a business entity (Intent or other)

3. **Storage abstraction**
   - `BlobStore` interface: `put`, `get`, `delete`
   - Drivers:
     - `LocalBlobStore` (filesystem)
     - `S3BlobStore` (S3-compatible; feature-flag by env)

4. **Crypto envelope**
   - AES-256-GCM encryption/decryption when `confidentiality >= L2`
   - IV/TAG stored as metadata in DB; key material never stored in DB

### 3.2 Data model

#### Table: `blobs`

Represents a physical object in storage.

Recommended columns (R1.0):

- `id` (uuid)
- `tenant_id` (uuid)
- `storage_driver` (`local|s3`)
- `object_key` (string) - path/key in backing store
- `size_bytes` (int)
- `sha256` (char(64))
- `content_type` (string)
- `confidentiality` (`L1|L2|L3`)
- `encrypted` (bool)
- `encryption_alg` (string, e.g. `AES-256-GCM`, nullable)
- `encryption_key_id` (string, e.g. `master-v1`, nullable)
- `encryption_iv_b64` (string, nullable)
- `encryption_tag_b64` (string, nullable)
- `created_at` (timestamp)

#### Table: `attachments`

Represents a blob bound to a business object.

Recommended columns (R1.0):

- `id` (uuid)
- `tenant_id` (uuid)
- `intent_id` (uuid, nullable for future extension)
- `source` (`email_ingest|manual_upload|export`)
- `filename` (string)
- `blob_id` (uuid FK -> `blobs.id`)
- `created_by_user_id` (uuid, nullable for ingest)
- `created_at` (timestamp)

---

## 4. API surface (R1.0)

### 4.1 Manual upload (Intent attachments)

`POST /v1/intents/:intentId/attachments`

- content type: `multipart/form-data`
- inputs:
  - `file` (required)
  - `confidentiality` (optional; default `L1`)
- behavior:
  - policy: tenant + RBAC for upload
  - persist: create `blobs`, write via driver, create `attachments`

### 4.2 Download (Attachment)

`GET /v1/attachments/:attachmentId`

- response: streamed bytes
- behavior:
  - policy check **before** accessing blob:
    - tenant isolation
    - RBAC
    - NDA gating for L2
  - decrypt on-the-fly if encrypted

> R1.0 baseline uses backend streaming rather than signed URLs.

### 4.3 Email ingest integration (R1.0)

Inbound email processing stores:

- **raw email** (optional but recommended): one blob representing the EML/MIME payload
- each email attachment: one `blob` + one `attachment` (`source=email_ingest`)

---

## 5. Security controls

### 5.1 Tenant isolation

All blob access must be tenant-scoped:

- every `blob` and `attachment` row includes `tenant_id`
- queries must include `tenant_id` filter
- object keys may include tenant prefix (recommended), but DB is authoritative

### 5.2 RBAC enforcement

Download/upload routes must enforce role-based permissions:

- Owner / BD-AM / Viewer (as defined in RBAC v1)
- Viewer: read-only

### 5.3 NDA gating for L2

- L2 attachments require Mutual NDA acceptance.
- Enforcement is done in `AttachmentAccessPolicy` (or equivalent).
- If NDA not satisfied: return **403**.

### 5.4 Encryption-at-rest (AES-256-GCM)

- Applied when `confidentiality >= L2`.
- Stored metadata:
  - IV (`encryption_iv_b64`)
  - TAG (`encryption_tag_b64`)
  - algorithm id (`encryption_alg`)
  - key id (`encryption_key_id`)
- Key management (R1.0):
  - one master key from environment (`BLOB_ENC_MASTER_KEY`)
  - rotation strategy is a future enhancement

### 5.5 Limits and content policy

Blobstore v1 should implement baseline safeguards:

- max upload size (configurable; enforce at API)
- allowed content types (configurable; soft-enforce initially)

Signed URLs and more advanced policies are tracked in `R1.0-BLOBSTORE-SEC-001 (#87)`.

---

## 6. Configuration (ENV)

### 6.1 Common

- `BLOBSTORE_DRIVER` = `local` | `s3`  
  Default: `local`

- `BLOB_ENC_MASTER_KEY`  
  Base64-encoded 32-byte key. Required if storing L2.

- `BLOB_ENC_KEY_ID`  
  Identifier for the active key (for metadata; default `master-v1`).

- `BLOBSTORE_MAX_UPLOAD_MB`  
  Optional per-request guard (API-level) to reject oversize uploads.

- `BLOBSTORE_ALLOWED_CONTENT_TYPES`  
  Optional comma-separated allowlist (soft-enforced in R1.0).

### 6.2 Local driver

- `BLOBSTORE_LOCAL_ROOT`  
  Example: `/srv/enabion/blobstore`
  Default (dev): `<repo>/apps/backend/tmp/blobstore`

Deployment note:

- mount as a persistent volume in Docker Compose
- ensure permissions are restricted to the app user

### 6.3 S3 driver (optional)

- `S3_ENDPOINT` (for S3-compatible providers)
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`

R1.0 expectation:

- S3 driver compiles and is ready to enable via env
- activation may be deferred until credentials are available

---

## 7. Testing strategy (minimum for R1.0)

### 7.1 Unit tests

- Local driver roundtrip: `put` -> `get` bytes equality
- AES-GCM roundtrip: encrypt -> decrypt equals input
- Policy: L2 attachment without NDA acceptance returns 403
- Script coverage: `apps/backend/scripts/blobstore.test.ts`

### 7.2 Integration tests (docker)

- upload attachment -> DB rows created -> download returns identical bytes
- tenant isolation: cannot download attachment from another tenant
- Script: `apps/backend/scripts/attachment-integration.test.ts` (local driver, NDA gate paths)

---

## 8. Backup and restore notes (pilot-mode)

R1.0 restore drill (`#85`) must include:

- database restore (Postgres)
- blobstore restore:
  - Local driver: restore the blob directory/volume
  - S3 driver: ensure bucket versioning/backup strategy (provider-specific)

Recommendation:

- include `blobs` and `attachments` tables in backup scope
- verify SHA-256 on restore for spot checks

---

## 9. Operational considerations

- **Streaming:** downloads should stream (avoid buffering large blobs in memory)
- **Observability:** create product events for upload/download outcomes (align with `#24` and event protocol)
- **Retention:** future work will integrate soft-delete/anonymization policies (`#81/#82`)

---

## 10. Issue linkage

- Implements: `#42 (R1.0-BLOBSTORE-001)`
- Blocks: `#77 (Intent attachments)`
- Related:
  - `#63/#19 (Mutual NDA flow)`
  - `#85 (Restore drill)`
  - `#87 (Blobstore policy, signed URLs)`
  - `#84 (Audit event coverage)`
