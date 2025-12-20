# Security CI Remediation (R1.0)

Purpose: provide a repeatable playbook when CI fails on secrets scanning or dependency vulnerabilities.

## 1) Gitleaks (secrets scan) failed

1) Identify the leaked value and its location from the CI log.
2) Rotate the affected credential immediately (DB/API/mail/VPS/CI).
3) Remove the secret from the repo tree:
   - delete the file or replace the value with `<redacted>`
   - commit the change
4) Purge the secret from history:
   - use `git filter-repo` (preferred) or `git filter-branch` if needed
   - force-push updated history to all affected branches/tags
5) Verify:
   - re-run CI (gitleaks should pass)
   - confirm services are healthy after rotation

Notes:
- History rewrite requires branch protection changes and coordination with collaborators.
- If a value is a false positive, add it to a gitleaks allowlist file (`.gitleaks.toml`) with a clear justification.

## 2) npm audit (dependency scan) failed

1) Reproduce locally:
   - `cd apps/backend && npm audit --omit=dev --audit-level=high`
   - `cd apps/frontend && npm audit --omit=dev --audit-level=high`
2) Remediate:
   - `npm audit fix` (if safe), or bump the offending package manually
   - update `package-lock.json` with `npm install`
3) Verify:
   - re-run the audit commands
   - commit and push

## 3) Post-fix checks

- Confirm CI green on PR/push.
- For pilot/prod, verify health endpoints after any rotation.
