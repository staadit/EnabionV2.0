# Intent export (L1-only) – R1.0

## Scope
- Authenticated org users only (owner org).
- Formats: Markdown (.md), PDF (.pdf), DOCX (.docx).
- Always rendered from the L1-redacted model (no L2 fields, source text, or L2 attachments).
- Notice included in every export: “L1-only export; confidential (L2) details omitted.”

## Data model (L1)
- title, intentId, orgName, ownerName, clientName, pipelineStage, deadlineAt
- goal, context, scope, kpis, risks
- exportedAt (server timestamp)
- flags: hasL2, l2Redacted=true when L2 exists, ndaRequired (for cross-org scenarios)

## API
- `GET /v1/intents/:intentId/export?format=md|pdf|docx` (default md)
- Headers:
  - Content-Type: md `text/markdown; charset=utf-8`; pdf `application/pdf`; docx `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Content-Disposition: `attachment; filename="intent-<intentId>-l1.<ext>"`

## Security rules
- Backend is source of truth for redaction: export uses the redaction service from L2 enforcement (#64).
- Guard against forbidden fields before rendering (e.g., sourceTextRaw must be null/absent).
- Tests assert no L2 sentinel appears in md/pdf/docx outputs.

## Rendering notes
- Markdown: simple sections, include notice and flags.
- PDF: pdfkit, compression off to keep deterministic text for tests.
- DOCX: docx package; headings + paragraphs; notice at top.

## DoD (tests)
- Exports of intents containing L2 sentinel do not include the sentinel (md/pdf/docx).
- Correct headers/content-disposition per format.
- Export fails for cross-org requester.
