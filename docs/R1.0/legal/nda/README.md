# Enabion R1.0 — Mutual NDA docs

Canonical files:
- `mutual_nda_v0.1_en.md` — source of truth (EN, with placeholders for parties/jurisdiction).
- `mutual_nda_summary_v0.1_pl.md` — UI summary (PL).
- `mutual_nda_summary_v0.1_de.md` — UI summary (DE).
- `mutual_nda_summary_v0.1_nl.md` — UI summary (NL).

Hash for EN canonical text (exact UTF-8 bytes, no trailing spaces):
```
SHA-256: 95eb2fe3cb4a9e2da4eccfa9032254b4757d82a9521aa44be1ea357d47f4e2fb
```

How to compute SHA-256:
- macOS/Linux: `sha256sum mutual_nda_v0.1_en.md`
- PowerShell: `Get-FileHash mutual_nda_v0.1_en.md -Algorithm SHA256`

Acceptance storage (backend):
- Store `ndaVersion = v0.1` and `enHash = 95eb...e2fb` with acceptance (user/org, acceptedAt, channel, language).
- Do **not** hash summaries; the EN file is the legal canonical.

Updating:
1) Bump filenames/version (v0.2, etc.), edit EN, recompute SHA-256.
2) Update summaries if needed.
3) Update acceptance logic to use the new `ndaVersion` and `enHash`.
