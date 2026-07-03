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
  (`backend/`, `tasks/`). The TypeScript extension (`extension/`) follows
  the official VS Code extension samples — kept small and conventional.
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
- Run `pytest` before opening a PR (it discovers the task tests under
  `tasks/`).

## Files that must never be committed

- `.env` (use `.env.example` as the template) — it holds the course and
  FH AI API tokens.
- Real student submissions — they contain personal data and live outside
  the repo. Only example/starter tasks under `tasks/` are committed.

## Current plan (June 2026): VS Code extension + FastAPI backend

The project is a **VS Code extension** for Python lab ("Praktikum")
submissions, with a minimal FastAPI backend. Students load a task, solve
it locally, run `pytest` + Hypothesis with one button (inline green/red
score), optionally ask the AI tutor for a Socratic hint, and submit the
pass/fail result. Code runs **locally** on the student's machine, so there
is no server-side sandbox. See the README for the full architecture,
workflow, and out-of-scope items.

Repository areas (currently skeletons): `extension/`, `backend/`, `tasks/`.

## Earlier direction (preserved, not current)

The project was previously planned as a **server-side grading pipeline
launched by ILIAS over LTI** (the 3-stage local → web server → LTI plan).
That idea is **not deleted** — it is kept as a documented fallback in
`docs/alternatives/ilias-lti-webserver.md`, with a full code snapshot on
the branch `archive/ilias-lti-webserver`. Do not treat it as the active
plan; consult it only if the editor-based approach is abandoned.
