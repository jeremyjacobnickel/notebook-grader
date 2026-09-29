"""Getaggte Zellen eines veröffentlichten Praktikums-Notebooks lesen (Vertrag aus WORKFLOW.md).

Für das Backend (Aufgabenstellung, gültige Aufgaben). Die Testausführung im Paket
übernimmt grader/praktikum_conftest.py, die Extension extension/src/notebook.ts.
Tags: `role:prompt|answer|setup`, `task:<id>`, optional `part:<id>`.
"""

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Cell:
    index: int
    kind: str
    source: str
    tags: tuple[str, ...]

    def tag(self, prefix):
        """Wert des ersten Tags `<prefix>:<wert>`, sonst leerer String."""
        return next((tag.split(":", 1)[1] for tag in self.tags if tag.startswith(prefix + ":")), "")

    @property
    def role(self):
        return self.tag("role")

    @property
    def task(self):
        return self.tag("task")

    @property
    def part(self):
        return self.tag("part")


def read_cells(notebook):
    raw = json.loads(Path(notebook).read_text(encoding="utf-8"))
    if not isinstance(raw.get("cells"), list):
        raise ValueError("Ungültiges Jupyter-Notebook: cells fehlt.")
    cells = []
    for index, cell in enumerate(raw["cells"]):
        source = cell.get("source", "")
        tags = (cell.get("metadata") or {}).get("tags") or []
        cells.append(Cell(index, cell.get("cell_type", ""),
                          "".join(source) if isinstance(source, list) else source,
                          tuple(tag for tag in tags if isinstance(tag, str))))
    return cells


def package_notebook(folder):
    """Notebook-Pfad laut `manifest.json` eines Praktikumsordners."""
    folder = Path(folder)
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    notebook = (folder / manifest["notebook"]).resolve()
    if folder.resolve() not in notebook.parents:
        raise ValueError("manifest.json verweist auf ein Notebook außerhalb des Praktikumsordners.")
    return notebook


def has_answer(cells, task, part=""):
    return any(cell.role == "answer" and cell.task == task and cell.part == part for cell in cells)


def task_prompt(cells, task, part=""):
    """Einleitung der Aufgabe plus die gewählte Teilaufgabe (ohne Teilaufgabe: alles zur Aufgabe)."""
    return "\n\n".join(cell.source.strip() for cell in cells
                       if cell.role == "prompt" and cell.task == task
                       and (not part or cell.part in ("", part)))
