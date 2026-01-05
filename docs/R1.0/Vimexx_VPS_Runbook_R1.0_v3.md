# Vimexx VPS Runbook (R1.0, Model 1 — Standard)
## Dev always-on + Prod pilot-mode (start/stop)

Status: draft internal (must be kept in sync with infra + manual ops)  
Timezone: CET  
Owner: Dev Lead (Ewa) / CTO (Mieszko2.0)  
Last updated: 2025-12-19

This runbook describes the **minimum operational baseline** for the Enabion R1.0 pilot on a single VPS:
- **Remote Dev** runs continuously (`dev.enabion.com`, `api.dev.enabion.com`) from branch `dev`.
- **Remote Prod (Pilot Mode)** runs only during pilot windows (`enabion.com`, `api.enabion.com`) from `main` / RC tags.

---

## 0) P0 security notice (must be done first)

If any operational credentials were ever committed to Git, treat them as **compromised**:
- remove them from the repo,
- rotate/replace them,
- document the new secret-handling rules.

Do not store any passwords, tokens, or server IPs in repo docs.

---

## 1) VPS baseline [CEO] + [Ewa]

**Target VPS**
- OS: Ubuntu 22.04 LTS (64-bit)
- EU datacenter (NL)
- Firewall: allow 22/tcp (SSH), 80/tcp, 443/tcp only

**Users**
- Recommended: create a dedicated non-root user `deploy` and add to `docker` group.
- Disable password login for SSH; use keys only.

---

## 2) Docker & compose plugin [Ewa]

Install Docker Engine and `docker compose` plugin via official Docker repo.

Verification:
```
docker --version
docker compose version
```

---

## 3) Directory layout (recommended) [Ewa]

Create the following structure (names can vary, but must be consistent with scripts/workflows):

```
/srv/enabion/
  edge/               # Traefik edge proxy (always-on)
  dev/
    repo/             # git checkout (branch dev)
    env/              # NOT in git
  prod/
    repo/             # git checkout (main / tags)
    env/              # NOT in git
  _volumes/
    edge/traefik/
    dev/postgres/
    prod/postgres/
  _backups/
    dev/postgres/
    prod/postgres/
```

Permissions:
- `deploy` owns `/srv/enabion/*` (except system directories).
- env files are `chmod 600`.

---

## 4) Edge proxy (Traefik) — always-on [Ewa]

Run Traefik from `infra/docker-compose.edge.yml`.

Requirements:
- docker network `enabion_edge` (external) exists
- Traefik has access to docker socket
- ACME storage persisted under `/srv/enabion/_volumes/edge/traefik/acme.json`

Start:
```
cd /srv/enabion/edge/repo
docker compose -f infra/docker-compose.edge.yml up -d
```

---

## 4.1) Outbound SMTP relay (Docker, smarthost)

Outbound-only mail relay runs as a container (no Postfix on host). No inbound SMTP, no MX, no public ports.

Compose:
- `infra/docker-compose.prod.yml` and `infra/docker-compose.prod.pilot.yml` include `smtp-relay`.
- The relay is reachable only on the internal Docker network `smtp_internal` (no `ports:`).

Env (NOT in git; placeholders only):
```
# /srv/enabion/dev/env/smtp-relay.env
RELAYHOST=smtp.example.com
RELAYHOST_PORT=587
RELAYHOST_USERNAME=__SMTP_USER__
RELAYHOST_PASSWORD=__SMTP_PASS__
```

Backend env (NOT in git; use placeholders):
```
SMTP_HOST=smtp-relay
SMTP_PORT=25
SMTP_SECURE=false
SMTP_FROM=no-reply@example.com
APP_PUBLIC_URL=https://dev.example.com
```

Notes:
- Backend -> relay uses port 25 on `smtp-relay`; relay -> smarthost uses 587.
- Keep AUTH_RESET_DEBUG=true for debug token mode; set to false to send emails.

---

## 4.2) Smoke test - password reset email

Checklist:
- [ ] Relay container is up and reachable on `smtp_internal` (no public SMTP ports).
- [ ] Backend env has SMTP_* + APP_PUBLIC_URL set (placeholders in repo only).
- [ ] AUTH_RESET_DEBUG=false on backend for this test.
- [ ] Request reset via UI (`/reset`) for a test inbox; request returns 200.
- [ ] Email arrives with reset link pointing to APP_PUBLIC_URL.
- [ ] Open reset link, set a new password; confirm success.
- [ ] Verify logs/events do not include email address or reset token.

---

## 5) Remote Dev stack — always-on [Ewa]

**Domains**
- `dev.enabion.com` → frontend
- `api.dev.enabion.com` → backend

**Source**
- branch: `dev`

Start/update:
```
cd /srv/enabion/dev/repo
git fetch --all --tags
git checkout dev
git reset --hard origin/dev
docker compose -f infra/docker-compose.vps.dev.yml up -d --build
```

Health checks:
- `https://api.dev.enabion.com/health`
- `https://dev.enabion.com/api/health`

---

## 6) Remote Prod stack — pilot mode (OFF outside pilot windows) [Ewa]

**Domains**
- `enabion.com` → frontend (pilot)
- `api.enabion.com` → backend

**Source**
- `main` or a tag `r1.0-rc.<n>`

### 6.1 Recommended: maintenance service for prod domains (always-on)

To keep TLS certificates valid and show a sane page when the pilot is OFF:
- keep a tiny `maintenance` container running on prod domains with low router priority
- when prod app starts, prod routers use higher priority and override maintenance

This costs negligible resources and avoids 404/expired cert issues.

### 6.2 Start pilot (prod)

```
cd /srv/enabion/prod/repo
git fetch --all --tags
git checkout r1.0-rc.<n>
docker compose -f infra/docker-compose.vps.prod.yml up -d --build
```

Smoke tests:
- `https://api.enabion.com/health`
- `https://enabion.com/api/health`

Log pilot start in `docs/log/log-YYYY-MM-DD.md` (CET): tag + timestamp + operator.

### 6.3 Stop pilot (prod)

```
cd /srv/enabion/prod/repo
docker compose -f infra/docker-compose.vps.prod.yml down
```

Optionally dump DB **before** shutdown (or immediately after, if DB still running):
```
docker compose -f infra/docker-compose.vps.prod.yml exec -T db pg_dump -U <user> <db> > /srv/enabion/_backups/prod/postgres/<timestamp>.sql
```

Log pilot stop + incidents/feedback in daily log.

---

## 7) Manual operations only [Ewa]

Automation via GH Actions/scripts is not used; start/stop/deploy are run manually on the VPS.

---

## 8) Backups (minimum) [Ewa]

### Code
- nightly sync to backup branches is fine, but do not store secrets there either.

### DB (Dev)
- nightly dump is acceptable if dev is always-on.

### DB (Prod)
- run DB dump at the end of every pilot session
- do not rely on nightly backups if prod is usually OFF

### Restore drill (required before pilot)
- restore dev DB to a clean instance and verify the app boots
- record result in log

---

## 9) Incident protocol (minimum) [Ewa + CEO]

P0 = data leakage / auth bypass / secrets exposure / prod down during pilot.

Minimum steps:
1) stop pilot if risk is ongoing
2) rotate affected credentials
3) write incident note in log (no secrets)
4) create GH issue `type:security-privacy` + `priority:P0`
