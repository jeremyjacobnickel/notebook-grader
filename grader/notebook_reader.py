"""Liest Jupyter-Notebooks und gruppiert Code-Zellen pro Aufgabe."""

from dataclasses import dataclass, field
from pathlib import Path
import json
import re


@dataclass
class Task:
    number: int
    title: str
    description: str
    code_cells: list[str] = field(default_factory=list)

    @property
    def code(self) -> str:
        return "\n\n".join(self.code_cells)


@dataclass
class Notebook:
    path: Path
    tasks: list[Task] = field(default_factory=list)

    def task(self, number: int) -> Task | None:
        for task in self.tasks:
            if task.number == number:
                return task
        return None


# Matcht Aufgaben-Header wie "## 4. Aufgabe: Modulo-Operator"
_TASK_HEADER = re.compile(r"^##\s*(\d+)\.\s*Aufgabe[:\s]*(.*)$", re.MULTILINE)


def read(path: Path) -> Notebook:
    path = Path(path)
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)

    notebook = Notebook(path=path)
    current = None

    for cell in raw.get("cells", []):
        source = _join_source(cell.get("source", ""))
        cell_type = cell.get("cell_type")

        if cell_type == "markdown":
            header = _TASK_HEADER.search(source)
            if header:
                # Neue Aufgabe beginnt — vorherige abschließen
                if current is not None:
                    notebook.tasks.append(current)
                current = Task(
                    number=int(header.group(1)),
                    title=header.group(2).strip(),
                    description=source,
                )
            elif current is not None:
                # Folge-Markdown gehört zur aktuellen Aufgabe
                # (z. B. der Holzbalken-Text bei Aufgabe 4)
                current.description += "\n\n" + source

        elif cell_type == "code" and current is not None:
            # Leere Zellen ignorieren — sonst sieht es so aus,
            # als hätte der Studierende abgegeben
            if source.strip():
                current.code_cells.append(source)

    if current is not None:
        notebook.tasks.append(current)

    return notebook


def _join_source(source) -> str:
    # nbformat liefert source mal als String, mal als Liste von Zeilen
    if isinstance(source, str):
        return source
    return "".join(source)
