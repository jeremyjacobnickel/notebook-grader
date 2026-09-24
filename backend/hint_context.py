"""Kontext eines Tipps aus den Notebook-Tags bestimmen, ohne studentischen Code auszuführen."""

import re

from fastapi import HTTPException

from backend.settings import ROOT
from grader.notebook_cells import has_answer, package_notebook, read_cells, task_prompt

TASKS_DIR = ROOT / "tasks"


def package_cells(praktikum):
    """Zellen des veröffentlichten Praktikums; die id ist per Pydantic auf [A-Za-z0-9_-] beschränkt."""
    try:
        return read_cells(package_notebook(TASKS_DIR / praktikum))
    except (OSError, ValueError, KeyError):
        raise HTTPException(422, "Unbekanntes Praktikum.") from None


def failure_prefix(task, part):
    # Konvention aus WORKFLOW.md: Testnamen beginnen mit test_<task><part>_.
    return f"test_{task}{part}_"


def error_context(traceback, prefix):
    # pytest --tb=short: jeder Fehler beginnt mit einer Unterstrich-Überschrift.
    blocks = re.split(r'(?m)(?=^_{3,} .+ _{3,}\s*$)', traceback)
    chosen = []
    for block in blocks:
        title = block.splitlines()[0] if block else ''
        if re.search(r'\b' + re.escape(prefix), title):
            # Globale Zusammenfassung am Ende gehört nicht zur Teilaufgabe.
            chosen.append(re.split(r'(?m)^={3,}', block)[0].strip())
    return '\n\n'.join(chosen)[:6000] or '[Keine eindeutig zugeordnete aktuelle Testfehlermeldung verfügbar.]'


def build_context(payload):
    """Die Extension sendet bereits nur Setup- und Antwortzellen der gewählten Aufgabe."""
    cells = package_cells(payload.praktikum)
    if not has_answer(cells, payload.task, payload.part):
        raise HTTPException(422, "Bitte eine Aufgabe bzw. Teilaufgabe aus dem Notebook auswählen.")
    key = payload.task + payload.part
    prefix = failure_prefix(payload.task, payload.part)
    return key, task_prompt(cells, payload.task, payload.part), payload.code, error_context(payload.traceback, prefix)
