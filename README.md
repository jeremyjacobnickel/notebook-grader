# Notebook Grader

Automated grading for the Python intro course at FH Münster.
Students solve small Python tasks in VS Code; a VS-Code-Extension
runs the task's pytest suite locally, shows pass/fail instantly,
offers AI-powered Socratic hints, and submits the result to an
FH backend. Passing means at least 80 % of the points.

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

## Components

- **`extension/`** — the VS-Code-Extension (TypeScript). Loads a
  praktikum into the workspace, runs `python -m pytest` locally,
  shows the score in a sidebar and the status bar, fetches AI hints,
  and submits pass/fail to the backend. Build and usage instructions:
  `extension/README.md`.
- **FH backend** (not in this repo yet) — a small service with two
  endpoints, `POST /submit` (collect results per course token) and
  `POST /hint` (LLM-generated Socratic hint). The HTTP contracts the
  extension is built against are documented in `extension/README.md`.
- **`grader/`, `tests/`** — Python helpers around the professor's
  notebook format. Each praktikum is maintained as a pair of Jupyter
  notebooks (Aufgaben version with empty code cells + Lösung version).
  `notebook_reader.py` parses that format and is the basis for the
  planned notebook → `tasks/` converter (see ROADMAP.md).

## Running tests

- Extension: `cd extension && npm test` (unit tests for the pure
  score/JUnit logic) and `npm run lint`.
- Python (legacy pipeline): `pytest tests/`

## Important

- Never commit the `.env` file. Use `.env.example` as the template.
- Real student notebooks contain personal data — they live outside
  the repo. Only `examples/sample_submission.ipynb` is committed.
- The `notebookGrader.courseToken` setting is a secret: the extension
  sends it only as an Authorization header and never logs it.
