# Tasks (Praktika)

Assignment definitions. **Skeleton — no tasks committed yet.**

Prefer `.py` files (testable with `pytest` / VS Code) over `.ipynb`.
Use notebooks only for visualisation tasks, then test them with
`nbval` / `papermill`.

Planned per-task layout:

```
tasks/<praktikum>/
  README.md       — Aufgabenstellung (task description)
  <name>.py       — starter / solution file the student edits
  test_<name>.py  — pytest + Hypothesis tests (random inputs per run)
  structure.py    — optional ast checks (e.g. loop instead of a builtin)
```

Grading is pass/fail: passed = at least 80 % of the total points.

Only example/starter tasks are committed. Real student submissions stay
outside the repo (personal data).
