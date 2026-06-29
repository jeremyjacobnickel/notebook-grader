# Lab Submission Tool (VS Code Extension)

A VS Code extension plus a minimal FastAPI backend for Python lab
("Praktikum") submissions in the *Grundlagen der Programmierung* module
at a University of Applied Sciences (FH). It replaces the previous manual
upload to ILIAS (via Leukipp): students load a task into their workspace,
solve it locally in VS Code, run the tests with one button to see their
score inline (green/red), optionally ask the AI tutor for a hint, and
submit the result to an FH backend.

> The repository is still named `notebook-grader` for historical reasons.
> The project is now an editor-based lab tool, not a server-side notebook
> grader. See `DECISIONS.md` for the pivot.

## Skill level of the maintainer

I am learning Python. I know variables, loops, and functions. I use
simple decorators from the standard library like `@dataclass` and
`@property`, but I do not write my own decorators, and I do not know
metaclasses, descriptors, or async/await. Prefer simple, explicit code
over clever abstractions. Add comments where logic is non-obvious.

The extension is written in TypeScript, which is new to me. Keep it
small and conventional — follow the official VS Code extension examples
rather than clever patterns.

## Grading model

Pass / fail only. **Passed = at least 80 % of the total points.** There
is no exam and no grade pressure — the focus is on learning, not on
cheating prevention. The local test result is what counts.

## Student workflow

1. Load a Praktikum into the workspace via the extension.
2. Solve the task locally in VS Code (`.py` files).
3. Press **Run tests** → the score is shown inline, green/red.
4. Optionally press **Hint** → a Socratic AI tip (guiding questions, not
   a finished solution).
5. Press **Submit** → the result is sent to the FH backend.

## Components

Three parts:

### Extension (client) — `extension/`

TypeScript, VS Code API. Three commands — load Praktikum, run tests,
submit. A sidebar panel shows the current score and a hint button. The
extension runs `pytest` locally on the student's machine and talks to the
backend with the course token.

### Tests (correctness)

`pytest` is the engine. **Hypothesis** (property-based testing) generates
random inputs on every run, so "passing" means the code actually works
and cannot be hard-coded against fixed test values. This didactically
replaces the deliberately-omitted hidden tests. Optional `ast` checks
cover structural requirements (e.g. a loop instead of a built-in
function). Everything runs locally on the student's machine.

### Backend — `backend/`

FastAPI, minimal. Two endpoints:

- `POST /submit` — logs the pass/fail result per student (CSV/SQLite to
  start).
- `POST /hint` — proxy to the existing FH AI API, with a token check,
  rate limiting, and a system prompt that pins the AI to Socratic help
  (guiding questions and concepts, never finished solutions). The
  Socratic framing is enforced server-side, not trusted to the client.

## Task format

Prefer `.py` files (better testable with `pytest` / VS Code) over
`.ipynb` notebooks. Use notebooks only when a task requires
visualisation; then test them with `nbval` / `papermill`.

Target per-task layout:

```
tasks/<praktikum>/
  README.md       — Aufgabenstellung (task description)
  <name>.py       — starter / solution file the student edits
  test_<name>.py  — pytest + Hypothesis tests (random inputs per run)
  structure.py    — optional ast checks (e.g. loop instead of a builtin)
```

## AI tutor role

A tutor that helps while programming — targeted hints based on the code,
the task description, and the traceback, but never complete solutions.
The Socratic behaviour is enforced in the `/hint` system prompt on the
server, not in the client.

## Authentication

A simple token, issued at course enrolment, is sent with every backend
request and checked server-side. No SSO/OAuth. The token lives in `.env`
(see `.env.example`) and is never committed.

## Deliberately out of scope

- **No server-side re-execution / hidden tests** — the local test result
  counts (acceptable for lab submissions).
- **No SSO/OAuth** — a simple enrolment token is enough.
- **No plagiarism check** (maybe later).
- **No server-side Docker sandbox** — code runs locally on the student's
  own machine, so there is no untrusted code on our servers.

## Project conventions

- Code and identifiers in English. Comments may be German.
- One module = one clear responsibility.
- Functions short enough to fit on one screen.
- Prefer the standard library when possible.
- No new dependency without a written reason in `DECISIONS.md`.

## Repository layout

- `extension/` — VS Code extension (TypeScript) — *skeleton, planned*
- `backend/`   — FastAPI service (`/submit`, `/hint`) — *skeleton, planned*
- `tasks/`     — Praktikum definitions (`.py` + pytest/Hypothesis) — *skeleton, planned*

The previous server-side grading package (`grader/`) and its tests were
removed in the pivot; see `DECISIONS.md`.

## Running tests

`pytest` (it discovers the task tests under `tasks/`). Hypothesis is used
inside those task tests.

## Important

- Never commit the `.env` file — it holds the backend/AI tokens. Use
  `.env.example` as the template.
- Real student submissions contain personal data — they live outside the
  repo. Only example/starter tasks under `tasks/` are committed.
