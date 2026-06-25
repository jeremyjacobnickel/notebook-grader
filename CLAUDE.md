# Project context for Claude

This file is read automatically at the start of every session. It is the
persistent memory of the project — the chat history is NOT saved, only the
files in this repo are. Keep this file up to date when the plan changes.

## What this project is

An AI-assisted grading system for Jupyter notebook submissions in a Python
intro course at FH Münster. It combines deterministic code analysis (pytest,
ruff) with LLM-based qualitative feedback. The human grader confirms or
overrides the final grade.

## Who I am working with

- The maintainer is **learning Python**: knows variables, loops, functions.
  Does NOT know decorators, generators, async/await, or advanced typing.
- Prefer **simple, explicit code** over clever abstractions. Add comments
  where logic is non-obvious.
- The maintainer prefers **explanations in German** (chat). Code and
  identifiers stay in English; comments may be German.

## Project conventions

- Code and identifiers in English. Comments may be German.
- One module = one clear responsibility.
- Functions short enough to fit on one screen.
- Prefer the standard library when possible.
- No new dependency without a written reason in DECISIONS.md.
- Never commit the `.env` file. Use `.env.example` as the template.
- Real student notebooks contain personal data — they live outside the repo.
  Only `examples/sample_submission.ipynb` is committed.

## Planned module layout

- `grader/notebook_reader.py` — parses .ipynb files into cells
- `grader/code_runner.py`     — runs code cells, collects test results
- `grader/code_analyzer.py`   — static analysis (ruff)
- `grader/ai_grader.py`       — calls the LLM for qualitative feedback
- `grader/report_builder.py`  — assembles the final per-student report
- `grader/main.py`            — orchestrates the pipeline

## Current state (June 2026)

- The grading pipeline **does not exist yet**. The repo currently holds
  only README, LICENSE, .gitignore, and this file.
- Next concrete step discussed: start Stage 1 below, e.g. build
  `notebook_reader.py` (read an .ipynb into cells) first.

## The plan: ILIAS / LTI integration in 3 stages

The end goal is to embed the grader into ILIAS via LTI so a student gets
immediate feedback right after submitting, with a grade flowing back into
the ILIAS gradebook. Build it in this order — each stage builds on the last:

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
  hints) shown right after upload. The **final grade is still confirmed by
  a human** before being passed back to ILIAS.

## Known critical risks (don't forget when building stages 2–3)

- **Sandboxing:** `code_runner` executes untrusted student code. In a
  web-facing setup it must run isolated (container, time/memory limits,
  no network).
- **DSGVO / data protection:** student notebooks are personal data. Sending
  code to an external LLM needs a legal basis / processing agreement (AVV),
  or the LLM must stay inside FH infrastructure.

See the README for the longer version of the LTI plan.
