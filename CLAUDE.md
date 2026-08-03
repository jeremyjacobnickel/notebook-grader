# Instructions for AI Assistants

This file is read by Claude Code and similar AI assistants before
they touch the codebase. The chat history is NOT saved — only the files
in this repo are, so keep this file up to date when the plan changes.

## First, read the README

`README.md` is the single source of truth for project conventions,
module layout, and the maintainer's skill level. Always follow it.
If a request conflicts with the README, surface that conflict before
acting.

## Style rules (in addition to README)

- **Identifiers in English, comments may be German.** Variable, function,
  class, and test names are English. Docstrings and inline comments may
  be German — they are used for learning.
- **One module = one responsibility.** Do not pile unrelated helpers
  into a single file.
- **Standard library first.** Adding a new dependency requires a
  `DECISIONS.md` entry that names the alternatives considered and the
  reason for the choice.
- **Match the maintainer's skill level.** `@dataclass` and `@property`
  are fine. Custom decorators, metaclasses, descriptors, generator
  protocols, and async are not. For the TypeScript extension: stay
  close to the official VS Code extension samples, no clever
  abstractions.
- **No dead code, no speculative abstractions.** Build what the current
  task needs.

## Working with the maintainer

- The maintainer is **learning Python** (see the README for the exact
  level). Prefer **simple, explicit code** over clever abstractions and
  add comments where logic is non-obvious.
- The maintainer prefers **explanations in German** (chat). Code,
  identifiers, and tests stay in English; comments/docstrings may be German.

## Workflow

- Work on a feature branch, never directly on `main`.
- Commit `frame-only` changes (docs, configs, fixtures) separately from
  code changes when both fit in one PR.
- Before opening a PR: `pytest tests/` for Python changes,
  `npm run lint && npm test` in `extension/` for extension changes.

## Files that must never be committed

- `.env` (use `.env.example` as the template)
- Real student notebooks — they contain personal data and live outside
  the repo. Only `examples/sample_submission.ipynb` is committed.
- **The professor's Lösung notebooks** — students could find them in
  the repo. Only the Aufgaben version (empty code cells) may be
  committed as a fixture.
- The real `notebookGrader.courseToken` value — never in code, logs,
  fixtures, or docs.

## Current state (August 2026)

- **Direction change:** VS-Code-Extension instead of the earlier
  LTI/ILIAS web-tool plan (see DECISIONS.md entry 2026-08-03).
- `extension/` v1 is built: three commands (`loadPraktikum`, `runTests`,
  `submit`) plus `hint`, a sidebar (WebviewView) and a status bar item.
  Pure score/JUnit logic is unit-tested (`npm test`, node:test).
  Manual testing in the Extension Development Host is still open.
- **Task source format is fixed** (see DECISIONS.md 2026-08-03): the
  professor maintains each praktikum as a pair of Jupyter notebooks —
  an Aufgaben version (markdown per task: `## N. Aufgabe: Titel`,
  empty code cells) and a Lösung version (same cells, filled in).
  `tests/fixtures/1_Praktikum.ipynb` is the real Aufgaben version.
- `grader/notebook_reader.py` **stays**: it already parses exactly this
  format (verified against both versions) and becomes the basis of the
  notebook → `tasks/` converter (see ROADMAP.md).

## The plan: VS-Code-Extension + FH backend

1. **Extension (client) — done in v1.** Students load a task, run
   pytest locally (pass = ≥ 80 % of tests), see the score inline, and
   submit the result. AI hints come from the backend.
2. **FH backend — next.** Small service (likely FastAPI) implementing
   the two contracts the extension already uses:
   `POST /submit` (store result per course token) and
   `POST /hint` (LLM call that returns a Socratic hint).
3. **Rollout.** Package the extension (`vsce package` → `.vsix`),
   distribute tasks (for now a local `tasks/` folder; the seam in
   `loadPraktikum` allows a backend download later), hand out course
   tokens.

## Known critical risks

- **DSGVO / data protection:** `/hint` sends student code to the
  backend and from there to an LLM. Needs a legal basis / processing
  agreement (AVV), or the LLM must stay inside FH infrastructure.
  (Server-side sandboxing is no longer needed — student code runs on
  the student's own machine.)
- **courseToken** is a shared secret per course. Never log it; treat
  leaked tokens as replaceable.
