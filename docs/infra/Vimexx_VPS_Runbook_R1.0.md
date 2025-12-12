# Vimexx VPS Runbook (R1.0, Model 1 – Standard)

Status: draft internal  
Scope: R1.0 staging (EU)  
Roles: [CEO] manual steps on Vimexx panel; [Ewa] runbook + commands

## 1) Order and base access [CEO]
- Location: EU (NL) datacenter.
- OS: Ubuntu 22.04 LTS (64-bit).
- Size: min. 1 vCPU, 2 GB RAM, 40–50 GB SSD, IPv4.
- Obtain root SSH access (from Vimexx panel).

## 2) First login and user setup
```
ssh root@<vps-ip>
adduser enabion
usermod -aG sudo enabion
```
- Upload SSH public key for user `enabion` (`~enabion/.ssh/authorized_keys`).
- In `/etc/ssh/sshd_config` set:
  - `PermitRootLogin no`
  - `PasswordAuthentication no`
Restart SSH: `systemctl restart sshd`.

## 3) OS hardening [Ewa]
```
apt update && apt upgrade -y
apt install ufw -y
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```
Logrotate: use defaults (already present).

## 4) Install Docker + compose plugin [Ewa]
```
apt install ca-certificates curl gnupg -y
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
usermod -aG docker enabion
```

## 5) Directory layout [Ewa]
```
mkdir -p /opt/enabion/staging/{env,data/logs}
```
- `env/` – .env files (not in Git).
- `data/` – persistent volumes (e.g., Postgres).
- `logs/` – optional app logs.

## 6) Reverse proxy and TLS [Ewa/CEO]
- Use Traefik or Nginx with Let’s Encrypt.
- Routes:
  - `staging.<domain>` → frontend :3000
  - API → backend :4000
- Postgres is internal only (localhost/docker network).

## 7) Deploy from Git [CEO]
```
cd /opt/enabion/staging
git clone https://github.com/staadit/EnabionV2.0.git .
git checkout main
docker compose -f infra/docker-compose.staging.yml up -d --build
```
For updates:
```
cd /opt/enabion/staging
git pull origin main
docker compose -f infra/docker-compose.staging.yml up -d --build
```

## 8) Env files (examples) [Ewa]
- `/opt/enabion/staging/env/backend.env` → contains `DATABASE_URL=...`, `PORT=4000`.
- `/opt/enabion/staging/env/frontend.env` → contains `BACKEND_URL=https://api.staging.<domain>`, `PORT=3000`.
- `/opt/enabion/staging/env/db.env` → `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

## 9) Firewall/ports recap
- Allow: 22/tcp (SSH), 80/tcp, 443/tcp.
- Block others from the internet; DB only local/docker network.

## 10) Compliance notes
- Data location: EU (NL) only.
- Model 1 – Standard: multi-tenant SaaS; no Shielded/Sovereign in R1.0.
- NDA layers: L0/L1 only for pre-sales data.
