# Enabion R1.0 - Intent & Pre-Sales OS

Repository for Enabion R1.0/R1.1 delivery. This monorepo keeps product/architecture specs in `docs/` and hosts application code in `apps/` with shared infra in `infra/`.

**You are Ewa, key dev lead, Mieszko is the CTO and I amd CEO.**
- project board is here: https://github.com/users/staadit/projects/4
- your tracker is here: https://github.com/staadit/EnabionV2.0/issues/38

## Key documents
- Playbook: `docs/0. Enabion_Playbook_v2.3.md`
- Implementation Plan: `docs/0. Enabion_implementation_plan_v0.4.md`
- R1.0 handoff pack index: `docs/R1.0/R1.0_Handoff_Pack_Index_v1.1.md`
- Phase 1 MVP spec and linked artefacts live under `docs/`.

## Repo layout
- `docs/` - product/architecture/legal/security specs and logs.
- `apps/backend/` - backend service (NestJS + Prisma) skeleton.
- `apps/frontend/` - frontend app (Next.js) skeleton.
- `infra/` - shared infrastructure assets (docker-compose, runbooks).

## Dev Quickstart
```
docker compose -f infra/docker-compose.dev.yml up -d
```
- Frontend: http://localhost:3000
- Backend healthcheck: http://localhost:4000/health

### Healthchecks (dev/stage)

- Backend: GET `http://localhost:4000/health`
- Frontend: GET `http://localhost:3000/api/health`
- Database: `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`

`infra/docker-compose.dev.yml` and `infra/docker-compose.staging.yml` include healthchecks and depend-on conditions so containers wait for healthy services.

## Dev standards (R1.0)
- Source of truth for DoD/dev standards: `docs/engineering/Definition_of_Done_R1.0.md`.
- Epics should use clear sections (Goal/Scope/Constraints/AC/Telemetry) with Tasks as checklists (`[ ]`), ready for AI-assisted breakdown.
- AI-generated code: require unit/integration/e2e sanity, log events (no PII), and PR checkbox "AI code reviewed + tests ran".
- `infra/priv.md` is private (local-only, read-only) and must never be committed/pushed.

## Branching model
- `main` - produkcyjny, stabilny; merge tylko przez PR + review.
- `dev` - gałąź integracyjna; feature branche mergujemy przez PR do `dev`.
- Release/gotowe inkrementy: PR z `dev` do `main`.
- Backups: na push do `main` lub `dev` (branże `backup`, `backup-dev`, tagi `backup-main-*`, `backup-dev-*` z retencją 90 dni).

## Workflow
- Default branch: `main` (work via PRs).
- Project board columns: Backlog | In progress | For CEO | Done.
