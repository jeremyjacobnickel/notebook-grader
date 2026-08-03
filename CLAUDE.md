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
  protocols, and async are not. This applies to the Python code
  (`grader/`, `backend/`, `tasks/`). The TypeScript extension
  (`extension/`) follows the official VS Code extension samples —
  kept small and conventional, no clever abstractions.
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

- `.env` (use `.env.example` as the template) — it holds the course and
  FH AI API tokens.
- Real student submissions — they contain personal data and live outside
  the repo.
- **The professor's Lösung notebooks** — students could find them in
  the repo. Only the Aufgaben version (empty code cells) may be
  committed as a fixture (`tests/fixtures/1_Praktikum.ipynb`).
- The real `notebookGrader.courseToken` value — never in code, logs,
  fixtures, or docs.

## Current state (August 2026)

- **Direction:** VS-Code-Extension + FastAPI backend, no LTI/ILIAS
  (see DECISIONS.md 2026-06-29 and 2026-08-03).
- `extension/` v1 is built: three commands (`loadPraktikum`, `runTests`,
  `submit`) plus `hint`, a sidebar (WebviewView) and a status bar item.
  Pure score/JUnit logic is unit-tested (`npm test`, node:test).
  Manual testing in the Extension Development Host is still open.
- **Task source format is fixed** (see DECISIONS.md 2026-08-03): the
  professor maintains each praktikum as a pair of Jupyter notebooks —
  an Aufgaben version (markdown per task: `## N. Aufgabe: Titel`,
  empty code cells) and a Lösung version (same cells, filled in).
  `tests/fixtures/1_Praktikum.ipynb` is the real Aufgaben version.
- `grader/task_exporter.py` **converts** a notebook pair into a
  `tasks/<id>/` folder: one `aufgabe_<n>.py` stub (None placeholders)
  plus one `test_aufgabe_<n>.py` per task; tasks without checkable
  variables (text answers, graphics) are skipped and are NOT graded by
  the extension (see DECISIONS.md 2026-08-03). `notebook_reader.py`
  does the parsing underneath.
- `backend/` and `tasks/` are skeletons (README placeholders).
- History note: an earlier parallel extension implementation from the
  `feat/vscode-extension` branch was superseded by this one when the
  branches were merged (2026-08-03); the surviving implementation is
  the one wired to the task_exporter layout.

## The plan: VS-Code-Extension + FH backend

1. **Extension (client) — done in v1.** Students load a task, run
   pytest locally (pass = ≥ 80 % of tests), see the score inline, and
   submit the result. AI hints come from the backend.
2. **FH backend — next.** FastAPI service implementing the two
   contracts the extension already uses: `POST /submit` (store result
   per course token) and `POST /hint` (proxy to the FH AI API that
   returns a Socratic hint; the Socratic framing is enforced
   server-side).
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

## Earlier direction (preserved, not current)

The project was previously planned as a **server-side grading pipeline
launched by ILIAS over LTI**. That idea is **not deleted** — it is kept
as a documented fallback in `docs/alternatives/ilias-lti-webserver.md`,
with a full code snapshot on the branch `archive/ilias-lti-webserver`.
Do not treat it as the active plan; consult it only if the editor-based
approach is abandoned.
