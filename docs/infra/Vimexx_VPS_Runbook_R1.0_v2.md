# Vimexx VPS Runbook (R1.0, Model 1 - Standard)
## Dev always-on + Prod pilot-mode (start/stop)

Status: draft internal (must be kept in sync with infra + GH Actions)  
Timezone: CET  
Owner: Dev Lead (Ewa) / CTO (Mieszko2.0)  
Last updated: 2025-12-15

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

## 4) Edge proxy (Traefik) – always-on [Ewa]

- Compose: `infra/docker-compose.edge.yml`
- Network: external `enabion_edge` must exist (`docker network create enabion_edge || true`)
- ACME: `/srv/enabion/_volumes/edge/traefik/acme.json` (chmod 600)
- Run from the VPS checkout (e.g. `/srv/enabion/prod/repo`, branch `dev`):
```
cd /srv/enabion/prod/repo
git checkout dev
git pull --ff-only
docker compose -f infra/docker-compose.edge.yml up -d
```
- Traefik can stay up even if app stacks are stopped (keeps TLS valid and 404s under control).

---

## 5) Remote Dev stack – always-on [Ewa]

- Domains: `dev.enabion.com` (frontend), `api.dev.enabion.com` (backend)
- Branch: `dev`
- Compose file: `infra/docker-compose.prod.yml` (legacy name, serves *dev*)
- Manual start/update:
```
cd /srv/enabion/prod/repo
git fetch --all --tags
git checkout dev
git reset --hard origin/dev
docker compose -f infra/docker-compose.prod.yml up -d --build
```
- Health: `https://dev.enabion.com/api/health`, `https://api.dev.enabion.com/health`
- GH Actions: workflow **Deploy to VPS (prod)** (`.github/workflows/deploy-prod.yml`) triggers on push to `dev` and calls `/usr/local/bin/enabion-deploy-prod.sh` on the VPS (deploys this dev stack).

---

## 6) Remote Prod stack – pilot mode (keep OFF by default) [Ewa]

- Domains: `enabion.com` (frontend), `api.enabion.com` (backend)
- Ref: `main` or release/tag
- Compose: `infra/docker-compose.prod.pilot.yml` (Traefik labels + healthchecks)
- Default posture: stack **down** when no pilot (`docker compose -f infra/docker-compose.prod.pilot.yml down`) to save VPS resources.
- Start pilot (manual on VPS):
```
cd /srv/enabion/prod/repo
git fetch --all --tags
git checkout <tag-or-main>
git reset --hard <tag-or-main>
docker compose -f infra/docker-compose.prod.pilot.yml up -d --build
```
- Start/stop via GH Actions: workflow **Deploy Prod Pilot (manual)** (`.github/workflows/deploy-prod-pilot.yml`) → inputs `ref` and `mode` (`start|stop|restart`).
- Smoke tests after start: `https://enabion.com/api/health`, `https://api.enabion.com/health`
- After pilot: `docker compose -f infra/docker-compose.prod.pilot.yml down`; optionally `pg_dump` the prod DB and log the pilot session in `docs/log/log-YYYY-MM-DD.md`.

---

## 7) GitHub Actions hooks [Ewa]

- `deploy-prod.yml` (dev deploy): trigger push to `dev`; runs `/usr/local/bin/enabion-deploy-prod.sh` on VPS, which uses `infra/docker-compose.prod.yml`.
- `deploy-prod-pilot.yml`: manual `workflow_dispatch`; inputs `ref`, `mode`; runs `infra/docker-compose.prod.pilot.yml` on VPS.
- `nightly-backup.yml`: cron `0 3 * * *` CET; zips `dev` HEAD into `backup-dev` branch, tags `backup-dev-YYYYMMDD-HHMMSS`, prunes >90 days.
- `db-backup.yml`: cron `0 4 * * *` CET; `pg_dump` via `docker compose -f infra/docker-compose.prod.yml exec db ...`; stores gzip under `backup-dev/db-backups` and pushes with `GITHUB_TOKEN` (requires dev DB running).

---

## 8) Backups (minimum) [Ewa]

- Code: nightly zip of `dev` (see `nightly-backup.yml`); no secrets in repo.
- DB (dev stack): nightly 04:00 CET via `db-backup.yml`; ensure disk space on runner and branch `backup-dev`.
- DB (prod pilot): take `pg_dump` at the end of every pilot before `down`; store under `/srv/enabion/_backups/prod/postgres` and/or commit manually to `backup-dev`.
- Restore drill: periodically restore a dump into a fresh DB container and run app health checks; record results in daily log.

---

## 9) Incident protocol (minimum) [Ewa + CEO]

P0 = data leakage / auth bypass / secrets exposure / prod down during pilot.

Minimum steps:
1) stop affected stack (pilot/dev) if risk is ongoing
2) rotate affected credentials
3) write incident note in log (no secrets)
4) create GH issue `type:security-privacy` + `priority:P0`
