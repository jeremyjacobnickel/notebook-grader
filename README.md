# Notebook Grader

An AI-assisted grading system for Jupyter notebook
submissions in a Python intro course at FH Münster.
Combines deterministic code analysis (pytest, ruff)
with LLM-based qualitative feedback. Students recieve instant feedback via LTI inside Ilias

## Skill level of the maintainer

I am learning Python. I know variables, loops, and
functions. I use simple decorators from the standard
library like `@dataclass` and `@property`, but I do
not write my own decorators, and I do not know
metaclasses, descriptors, or async/await. Prefer
simple, explicit code over clever abstractions. Add
comments where logic is non-obvious.

## Project conventions

- Code and identifiers in English. Comments may be German.
- One module = one clear responsibility.
- Functions short enough to fit on one screen.
- Prefer the standard library when possible.
- No new dependency without a written reason in DECISIONS.md.

## Module layout

- `grader/notebook_reader.py` — parses .ipynb files into cells
- `grader/code_runner.py`     — runs code cells, collects test results
- `grader/code_analyzer.py`   — static analysis (ruff)
- `grader/ai_grader.py`       — calls the LLM for qualitative feedback
- `grader/report_builder.py`  — assembles the final per-student report
- `grader/main.py`            — orchestrates the pipeline

## Running tests

`pytest tests/` (add this once tests exist)

## ILIAS / LTI integration (planned)

The goal is to embed this grader into ILIAS via LTI so that a student
gets **immediate feedback right after submitting** their notebook, and a
grade can later flow back into the ILIAS gradebook.

**What LTI is:** a connector standard (like a USB port) that lets ILIAS
launch an external tool with single sign-on and receive a score back.
ILIAS is the consumer/platform; this grader is the external tool. The
tool runs on its own server, not inside ILIAS.

**Decisions already made:**

- **Hosting:** on FH Münster servers (so student data does not leave the
  university — important for data protection).
- **Feedback:** immediate. The automatic, formative feedback (test
  results, ruff, LLM hints) is shown to the student right after upload.
  The final grade is still confirmed by a human before it is passed back
  to ILIAS.

**Student flow:**

1. Student opens the LTI activity in the ILIAS course → ILIAS launches
   the tool (passes name, course, role).
2. Student uploads their `.ipynb` in the tool.
3. The pipeline runs and shows feedback immediately in the browser.
4. After human confirmation, the score is sent back to the ILIAS
   gradebook via the LTI outcomes service.

**What is still needed to get there:**

- Build the grading pipeline itself (the `grader/` modules do not exist yet).
- Add a small web layer (Flask) with three pages: LTI launch, upload, feedback.
- Add an LTI library (`PyLTI1p3` for LTI 1.3, or `PyLTI` for LTI 1.1) —
  decide the version with the FH ILIAS admin.
- Have the ILIAS admin register the tool as an LTI consumer (exchange of
  key/secret or client_id, deployment id, login/JWKS URLs).
- Set up the FH server with a fixed HTTPS address (LTI requires TLS).
- **Sandbox student code execution** — `code_runner` runs untrusted code,
  so it must run in an isolated container with time/memory limits and no
  network. Critical for a web-facing tool.
- Clarify data protection (DSGVO): student notebooks are personal data;
  sending code to an external LLM needs a legal basis / processing
  agreement (AVV), or the LLM stays inside the FH infrastructure.

This is a future direction. Finish the local CLI pipeline first, then add
the web layer, then LTI — ideally together with the FH ILIAS admin.

## Important

- Never commit the `.env` file. Use `.env.example` as the template.
- Real student notebooks contain personal data — they live outside
  the repo. Only `examples/sample_submission.ipynb` is committed.
