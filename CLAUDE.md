# Instructions for AI Assistants

Read these files before changing the repository:

1. `README.md` — current architecture and project conventions.
2. `WORKFLOW.md` — canonical Praktikum preparation and ZIP/notebook contract.
3. `DECISIONS.md` — architectural history and rationale.

If old code or historical documents conflict with `README.md`/`WORKFLOW.md`, do not silently restore the old workflow.

## Current architecture

- Student work format: **Jupyter Notebook (`.ipynb`)**.
- Distribution format: **ZIP selected by the student via `Praktikum laden`**.
- The notebook contains prompts and answer cells together.
- Cell metadata uses `role:prompt`, `role:answer`, `role:setup`, `task:<id>`, and optional `part:<id>` tags.
- Before pytest, the extension materializes `role:setup` + `role:answer` code cells into a generated `.py` with the same base name as the notebook.
- Unit tests remain ordinary pytest files and may use AST checks.
- Existing `.py` exporter examples are legacy/history, not the canonical student workflow.

## Style rules

- Identifiers in English; comments/docstrings may be German.
- One module = one responsibility.
- Standard library first. New dependencies require a `DECISIONS.md` entry.
- Prefer simple, explicit code over clever abstractions.
- No dead code or speculative framework-building.

## Development workflow

- Work on a feature branch, never directly on `main`.
- Every behavior change needs tests where practical.
- Before PR:
  - Python: `pytest tests/`
  - Extension: `cd extension && npm ci && npm run lint && npm test`
- Keep README/WORKFLOW in sync when changing tags, manifest, ZIP layout, or student workflow.

## Security and privacy

Never commit or include in fixtures/prompts/logs:

- `.env`
- real course/FH tokens
- real student submissions or personal data
- professor solution notebooks

ZIP extraction must reject path traversal. Existing student work must never be silently overwritten during package import.

## AI tutor

The backend enforces Socratic guidance. The client sends extracted student Python code rather than the complete notebook JSON whenever possible. Do not broaden transmitted data without an explicit privacy decision.
