# Vimexx VPS Runbook (R1.0, Model 1 – Standard)

Status: active (dev stack on `dev` branch, Traefik edge)

## 1) Base provisioning (CEO)
- Location: EU (NL), Ubuntu 22.04 LTS, min 2 vCPU / 4 GB RAM / 100 GB SSD, IPv4.
- Root SSH from panel, then disable root/password login after user setup.

## 2) Users & SSH (CEO/Ewa)
```bash
ssh root@<vps-ip>
adduser deploy
usermod -aG docker deploy
```
- Wgraj klucz publiczny deploy → `/home/deploy/.ssh/authorized_keys` (chmod 700 dir, 600 file).
- `/etc/ssh/sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`; restart sshd.

## 3) OS hardening (Ewa)
```bash
apt update && apt upgrade -y
apt install ufw ca-certificates curl gnupg -y
ufw allow 22/tcp; ufw allow 80/tcp; ufw allow 443/tcp; ufw enable
```

## 4) Docker + compose (Ewa)
```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
usermod -aG docker deploy
```

## 5) Canonical layout (prod stack on `dev` branch)
```bash
sudo mkdir -p /srv/enabion/{prod/env,edge} /srv/enabion/_volumes/{prod/postgres,edge/traefik} /srv/enabion/_backups/prod
sudo chown -R deploy:deploy /srv/enabion
sudo touch /srv/enabion/_volumes/edge/traefik/acme.json
sudo chmod 600 /srv/enabion/_volumes/edge/traefik/acme.json
sudo docker network create enabion_edge || true
```
- Repo: `/srv/enabion/prod/repo` (branch `dev`, deploy tagless).
- Env: `/srv/enabion/prod/env/{db.env,backend.env,frontend.env}` (not in git).
- Data: `/srv/enabion/_volumes/prod/postgres`.
- Edge cert storage: `/srv/enabion/_volumes/edge/traefik/acme.json`.

## 6) Clone & origin (deploy)
```bash
sudo -u deploy -H bash -lc "
  cd /srv/enabion/prod
  git clone git@github.com:staadit/EnabionV2.0.git repo
  cd repo && git checkout dev
"
```

## 7) Edge proxy (Traefik) (deploy)
Compose: `infra/docker-compose.edge.yml` (ports 80/443, LE http-01, network `enabion_edge`).
```bash
cd /srv/enabion/prod/repo
docker compose -f infra/docker-compose.edge.yml up -d
```
DNS: `dev.enabion.com` → 37.97.223.106, `api.dev.enabion.com` → 37.97.223.106.

## 8) App stack (prod compose, no public ports)
Compose: `infra/docker-compose.prod.yml` (db internal; backend/frontend on `enabion_edge` with Traefik labels).
```bash
cd /srv/enabion/prod/repo
docker compose -f infra/docker-compose.prod.yml up -d --build
docker compose -f infra/docker-compose.prod.yml ps
```
Health:
```bash
curl -H "Host: dev.enabion.com" http://127.0.0.1/api/health
curl -H "Host: api.dev.enabion.com" http://127.0.0.1/health
```

## 9) Deploy pipeline (GitHub Actions)
- Default branch: `dev`.
- Workflow: `.github/workflows/deploy-prod.yml` on push to `dev`, SSH → `/usr/local/bin/enabion-deploy-prod.sh` (git reset --hard origin/dev, compose up).
- Secrets: `VPS_HOST=37.97.223.106`, `VPS_USER=deploy`, `VPS_SSH_KEY` (deploy key), `VPS_KNOWN_HOSTS`, optional `VPS_PORT`.

## 10) Backups
- Code backups: `.github/workflows/nightly-backup.yml` (03:00 UTC) → branch `backup-dev` (zip of `dev`, tags 90d retention).
- DB backups: `.github/workflows/db-backup.yml` (04:00 UTC) → `backup-dev/db-backups/db-backup-*.sql.gz`, tags 90d retention. Uses `pg_dump` from running `db` container.
- Manual DB backup example:
```bash
cd /srv/enabion/prod/repo
docker compose -f infra/docker-compose.prod.yml exec -T db pg_dump -U enabion enabion_prod > /srv/enabion/_backups/prod/postgres/backup-$(date +%F).sql
```

## 11) Firewall / ports
- Allow only 22/80/443. Do not publish 3000/4000/5432.

## 12) Compliance
- Data in EU (NL). Model 1 – Standard (multi-tenant, no Shielded/Sovereign). NDA L0/L1 only for pre-sales. 
