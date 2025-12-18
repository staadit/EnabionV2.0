# S0 Security Incident Response Runbook (R1.0) — “Secrets in Git”

Status: **Mandatory P0 gate**  
Release: **R1.0**  
Timezone: **CET**  
Last updated: **2025-12-15**

This runbook is executed when the repository contains sensitive operational data (credentials, tokens, SSH keys, DB passwords, environment files, private notes with secrets, etc.).

**Assumption:** if the repo has ever been accessible to people outside the core team (including public access), treat all discovered secrets as **compromised**.

---

## 1) Principles (non-negotiable)

1. **Rotate first, then clean.** Even if you purge history, assume the secret was copied.  
2. **No secrets in git, ever.** Not in `/docs`, not in `/infra`, not in screenshots, not in logs.  
3. **Least privilege.** Deploy keys read-only; DB users scoped; separate dev/prod credentials.  
4. **Document the incident without secrets.** Log file paths and actions only (no values).  

---

## 2) Rapid response checklist (90-minute target)

### Step A — Freeze exposure
- Temporarily pause deployments if they rely on compromised secrets.
- Identify all secret-bearing files quickly:
  - obvious: `*.env`, `*.key`, `id_rsa`, `priv.md`, `secrets.md`
  - less obvious: run a secrets scan locally (see Step D)

### Step B — Rotate credentials (assume compromise)
Rotate at minimum:
- VPS access:
  - rotate SSH keys (deploy user + any admin/root keys that might be in the repo)
  - remove old keys from `~/.ssh/authorized_keys`
- Database:
  - change Postgres user/passwords (dev and prod separately)
  - update VPS env files stored outside git
- GitHub:
  - rotate GitHub Actions secrets, deploy keys, PATs (if any)
  - rotate any “backup” workflow credentials (e.g., tokens)
- Third-party keys (if present):
  - email ingestion providers
  - monitoring providers
  - AI providers (if any)

**Important:** do not rely on “we rewrote git history” as mitigation. Rotation is mandatory.

### Step C — Remove from working tree (immediate)
- Delete secret-bearing files from the repo.
- Replace with sanitized templates:
  - `infra/priv.example.md`
  - `env/backend.example.env`, `env/db.example.env`, etc.
- Add `.gitignore` rules for:
  - `*.env`, `*.pem`, `*.key`, `acme.json`, `priv.md`, `secrets*`, dumps, backups
- Add `README` section: “No secrets in git” + where secrets are stored (VPS `/srv/enabion/.../env/` or password manager).

### Step D — Add automated prevention (CI)
Minimum acceptable prevention for R1.0:
- CI secret scanning on PR + push (recommended: `gitleaks`)
- Fail builds when secrets detected
- Optional: enable GitHub secret scanning / push protection (if available on plan)

### Step E — Purge history (recommended if repo was public)
If secrets were committed historically:
- Use `git filter-repo` (preferred) or BFG to remove files/patterns from history
- Force-push sanitized history
- Invalidate/rotate secrets again (assume history may still be cached by others)

**Caution:** coordinate this step. History rewrite will require contributors to re-clone or hard reset.

---

## 3) Minimum deliverables for Gate S0 (Definition of Done)

Gate S0 is “Done” only when:
- No plaintext secrets exist in `main` or `dev` working trees.
- Rotated credentials are verified (deploy works, DB works).
- CI prevents re-introducing secrets (PR fails).
- A sanitized incident entry exists in `docs/log/log-YYYY-MM-DD.md` (CET):
  - exposed file paths (only)
  - what was rotated (categories only)
  - follow-up tasks/issues created (e.g., `SEC-INC-001/002`)

---

## 4) Suggested implementation (concrete, repo-agnostic)

### 4.1 CI: gitleaks scanning
- Add workflow: `.github/workflows/security-secrets-scan.yml`
- Add config: `.gitleaks.toml`
- Run on:
  - `pull_request`
  - `push` to `dev` and `main`

### 4.2 Local dev: optional pre-commit
- Document a local command:
  - `gitleaks detect --source . --no-git`
- Optional pre-commit hook (developer convenience). CI is still mandatory.

---

## 5) Follow-up hardening (post-S0, not blocking immediate work)

- Split credentials per environment:
  - dev vs prod DB user
  - dev vs prod deploy key
- Principle of least privilege:
  - deploy user cannot read other env folders
  - DB users scoped to one database
- Add an “incident response” section in the VPS runbook:
  - “what to rotate, where to change, how to verify”

---

## 6) GitHub issue mapping

- `SEC-INC-001`: purge secrets + rotate credentials
- `SEC-INC-002`: CI secrets scanning + guardrails

These must be marked **P0** and set to block downstream work in GitHub relationships.
