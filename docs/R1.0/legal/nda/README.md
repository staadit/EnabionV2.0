# Enabion R1.0 - Mutual NDA docs

Canonical files:
- `mutual_nda_v0.1_en.md` - source of truth (EN, with placeholders for parties/jurisdiction).
- `mutual_nda_v0.1_summary_pl.md` - UI summary (PL).
- `mutual_nda_v0.1_summary_de.md` - UI summary (DE).
- `mutual_nda_v0.1_summary_nl.md` - UI summary (NL).

Hash for EN canonical text (exact UTF-8 bytes, no trailing spaces):
```
SHA-256: 9ed55f618aab2662e3137c3aa2eaa86fcccd655d6d060e26664864b6509cbffd
```

How to compute SHA-256:
- macOS/Linux: `sha256sum mutual_nda_v0.1_en.md`
- PowerShell: `Get-FileHash mutual_nda_v0.1_en.md -Algorithm SHA256`

Acceptance storage (backend):
- Store `ndaVersion = Enabion_mutual_nda_v0.1_en` and `enHashSha256 = 9ed5...bffd` with acceptance (user/org, acceptedAt, channel, language).
- Do **not** hash summaries; the EN file is the legal canonical.

Updating:
1) Bump filenames/version (v0.2, etc.), edit EN, recompute SHA-256.
2) Update summaries if needed.
3) Update acceptance logic to use the new `ndaVersion` and `enHashSha256`.
