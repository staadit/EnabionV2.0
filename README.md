# Enabion R1.0 – Intent & Pre-Sales OS

Repository for Enabion R1.0/R1.1 delivery. This monorepo keeps product/architecture specs in `docs/` and will host application code in `apps/` with shared infra in `infra/`.

## Key documents
- Playbook: `docs/0. Enabion_Playbook_v2.3.md`
- Implementation Plan: `docs/0. Enabion_implementation_plan_v0.4.md`
- Phase 1 MVP spec and linked artefacts live under `docs/`.

## Repo layout
- `docs/` – product/architecture/legal/security specs and logs.
- `apps/backend/` – backend service (NestJS + Prisma) skeleton.
- `apps/frontend/` – frontend app (Next.js) skeleton.
- `infra/` – shared infrastructure assets (docker-compose, runbooks).

## Dev Quickstart
```
docker compose -f infra/docker-compose.dev.yml up -d
```
- Frontend: http://localhost:3000
- Backend healthcheck: http://localhost:4000/health

## Dev standards (R1.0)
- Source of truth for DoD/dev standards: `docs/engineering/Definition_of_Done_R1.0.md`.
- Epics should use clear sections (Goal/Scope/Constraints/AC/Telemetry) with Tasks as checklists (`[ ]`), ready for AI-assisted breakdown.
- AI-generated code: require unit/integration/e2e sanity, log events (no PII), and PR checkbox “AI code reviewed + tests ran”.

## Branching model
- `main` – produkcyjny, stabilny; merge tylko przez PR + review.
- `dev` – gałąź integracyjna; feature branche mergujemy przez PR do `dev`.
- Release/gotowe inkrementy: PR z `dev` do `main`.
- Backups: na push do `main` lub `dev` (branże `backup`, `backup-dev`, tagi `backup-main-*`, `backup-dev-*` z retencją 90 dni).

## Workflow
- Default branch: `main` (work via PRs).
- Project board columns: Backlog | In progress | For CEO | Done.
