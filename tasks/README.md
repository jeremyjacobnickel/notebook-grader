# Tasks (Praktika)

Assignment definitions. **Skeleton — no tasks committed yet.**

Tasks stay as `.ipynb` notebooks — the existing course material, kept as
unchanged as possible. The Aufgabenstellung is read in the browser
(Leukipp / ILIAS); the student edits the notebook in VS Code. The
autograder extracts the notebook's code cells, runs them, and compares the
resulting variables to the reference.

Planned per-task layout:

```
tasks/<praktikum>/
  <praktikum>.ipynb  — the notebook the student edits
  assets/            — data files the task needs (e.g. peppers.tiff)
  autograder.py      — checks expected variables (np.allclose) + optional ast checks
```

Grading is pass/fail: passed = at least 80 % of the total points.

Only example/starter tasks are committed. Real student submissions stay
outside the repo (personal data).
