# Instructions for AI Assistants

This file is read by Claude Code and similar AI assistants before
they touch the codebase.

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
