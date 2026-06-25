# Notebook Grader

An AI-assisted grading system for Jupyter notebook
submissions in a Python intro course at FH Münster.
Combines deterministic code analysis (pytest, ruff)
with LLM-based qualitative feedback. The human
grader confirms or overrides the final grade.

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

## Important

- Never commit the `.env` file. Use `.env.example` as the template.
- Real student notebooks contain personal data — they live outside
  the repo. Only `examples/sample_submission.ipynb` is committed.
