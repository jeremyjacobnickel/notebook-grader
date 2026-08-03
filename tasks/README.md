# Tasks (Praktika)

Assignment definitions. **Skeleton — no tasks committed yet.**

Tasks are plain `.py` files. The assignment *content* stays identical to
today's material (same problems, same variable names, the
"store-the-result-in-a-variable" style); only the container changes from
`.ipynb` to `.py`. Where the Aufgabenstellung and figures live — inline in
the `.py` or in a separate program (browser / Leukipp / ILIAS) — is an
open decision, to be made later. The autograder runs the student's `.py`
in a fresh namespace and compares the resulting variables to the reference.

Planned per-task layout:

```
tasks/<praktikum>/
  <praktikum>.py   — the file the student edits (task content as today)
  assets/          — data files the task needs (e.g. peppers.tiff)
  autograder.py    — checks expected variables (np.allclose) + optional ast checks
```

Grading is pass/fail: passed = at least 80 % of the total points.

Only example/starter tasks are committed. Real student submissions stay
outside the repo (personal data).
