# Alternative direction: ILIAS LTI web-server application

> **Status: archived — not the current plan.** The project pivoted to a
> VS Code extension (see the main `README.md`). This document preserves
> the earlier server-side design so the idea is not lost; it may be
> revived if the editor-based client turns out not to fit.
>
> A full snapshot of this design — including the old `grader/` package and
> its tests — lives on the branch **`archive/ilias-lti-webserver`**.

## Idea in one sentence

A server-side grading pipeline that ILIAS launches over **LTI**, so a
student gets immediate feedback right after uploading a notebook, and the
grade flows back into the ILIAS gradebook.

## What LTI is

A connector standard that lets ILIAS launch an external tool with single
sign-on and receive a score back. ILIAS is the consumer/platform; this
grader would be the external tool, running on its own server, not inside
ILIAS.

## Architecture (server-side pipeline)

```
grader/notebook_reader.py — parses .ipynb files into cells/tasks
grader/code_runner.py     — runs code cells in a sandbox, collects test results
grader/code_analyzer.py   — static analysis (ruff)
grader/ai_grader.py       — calls the LLM for qualitative feedback
grader/report_builder.py  — assembles the final per-student report
grader/main.py            — orchestrates the pipeline
```

A small web layer (Flask) would expose three pages: LTI launch, upload,
feedback.

## Student flow

1. Student opens the LTI activity in the ILIAS course → ILIAS launches the
   tool (passes name, course, role).
2. Student uploads their `.ipynb` in the tool.
3. The pipeline runs and shows feedback immediately in the browser.
4. The score is sent back to the ILIAS gradebook via the LTI outcomes
   service.

## Decisions that were already made

- **Hosting:** on FH Münster servers, so student data does not leave the
  university (data protection).
- **Feedback:** immediate. The automatic, formative feedback (test
  results, ruff, LLM hints) is shown right after upload; the final grade
  is then passed back to ILIAS.

## What would still be needed

- Build the grading pipeline itself (the `grader/` modules).
- Add the Flask web layer (LTI launch, upload, feedback).
- Add an LTI library (`PyLTI1p3` for LTI 1.3, or `PyLTI` for LTI 1.1) —
  version decided with the FH ILIAS admin.
- Have the ILIAS admin register the tool as an LTI consumer (key/secret or
  client_id, deployment id, login/JWKS URLs).
- Set up the FH server with a fixed HTTPS address (LTI requires TLS).
- **Sandbox student code execution** — `code_runner` runs untrusted code,
  so it must run in an isolated container with time/memory limits and no
  network. Critical for a web-facing tool.
- Clarify data protection (DSGVO): student notebooks are personal data;
  sending code to an external LLM needs a legal basis / processing
  agreement (AVV), or the LLM stays inside the FH infrastructure.

## Staged build plan (how it was meant to be built)

Each stage builds on the last:

1. **Run locally first.** Finish the core CLI pipeline so it works on a
   laptop, no internet: notebook in → pytest/ruff/LLM → feedback out.
   The biggest piece.
2. **Set up a web server at the FH.** Wrap the program in a small Flask
   web app (LTI launch, upload, feedback pages) on an FH Münster server
   under a fixed HTTPS address. Add sandboxing here.
3. **Connect to ILIAS via LTI.** The ILIAS admin registers the server as
   an LTI tool; exchange keys once. The student then clicks in ILIAS,
   lands logged-in in the tool, and the grade is passed back.

Stages 2 and 3 cannot be done alone — they need the FH IT / ILIAS admin.
Talk to them early (DSGVO, and whether ILIAS supports LTI 1.1 or 1.3).

## Why this direction was paused

The VS Code extension (the current plan) avoids the hardest parts of this
design: no server-side execution of untrusted code (it runs locally on the
student's machine, so no Docker sandbox is needed), no LTI registration,
no fixed HTTPS host. It also *replaces* the ILIAS upload instead of
integrating with ILIAS. If editor-based delivery proves impractical, this
server-side LTI approach is the documented fallback.
