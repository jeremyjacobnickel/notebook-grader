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
  protocols, and async are not.
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
- Run `pytest tests/` before opening a PR.

## Files that must never be committed

- `.env` (use `.env.example` as the template)
- Real student notebooks — they contain personal data and live outside
  the repo. Only `examples/sample_submission.ipynb` is committed.

## Current state (June 2026)

- Stage 1 has started. `grader/notebook_reader.py` (reads an `.ipynb`
  into cells) exists and has tests under `tests/`.
- Still to build for the local pipeline: `code_runner`, `code_analyzer`,
  `ai_grader`, `report_builder`, `main` (see the README module layout).

## The plan: ILIAS / LTI integration in 3 stages

The end goal is to embed the grader into ILIAS via LTI so a student gets
immediate feedback right after submitting, with a grade flowing back into
the ILIAS gradebook. Build it in this order — each stage builds on the last
(the README has the longer version):

1. **Run locally first.** Finish the core CLI pipeline so it works on a
   laptop, no internet: notebook in → pytest/ruff/LLM → feedback out.
   This is the biggest piece and the current focus.
2. **Set up a web server at the FH.** Wrap the program in a small Flask web
   app (LTI launch page, upload page, feedback page), running on an
   FH Münster server under a fixed HTTPS address. Add sandboxing here.
3. **Connect to ILIAS via LTI.** The ILIAS admin registers the server as an
   LTI tool; exchange keys once. Then the student clicks in ILIAS, lands
   logged-in in the tool, and the grade can be passed back.

Stages 2 and 3 cannot be done alone — they need the FH IT / ILIAS admin.
Talk to them early (data protection / DSGVO, and whether ILIAS supports
LTI 1.1 or 1.3).

## Decisions already made

- **Hosting:** on FH Münster servers (student data stays in-house).
- **Feedback:** immediate — automatic formative feedback (tests, ruff, LLM
  hints) shown right after upload, with the grade passed back to ILIAS.

## Known critical risks (don't forget when building stages 2–3)

- **Sandboxing:** `code_runner` executes untrusted student code. In a
  web-facing setup it must run isolated (container, time/memory limits,
  no network).
- **DSGVO / data protection:** student notebooks are personal data. Sending
  code to an external LLM needs a legal basis / processing agreement (AVV),
  or the LLM must stay inside FH infrastructure.
