"""Tests für den Konverter Notebook -> tasks/-Ordner."""

from pathlib import Path
import json
import subprocess
import sys
import pytest

from grader.task_exporter import export


def run_pytest_in(target: Path, test_file: str) -> int:
    """Startet pytest als Subprozess (wie die Extension) und gibt den
    Exit-Code zurück. Ein eigener Prozess pro Lauf verhindert, dass
    sich gleichnamige Module (aufgabe_1) über sys.modules vermischen."""
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "-q", test_file],
        cwd=target,
        capture_output=True,
    )
    return result.returncode


def make_notebook(path: Path, cells: list[dict]) -> Path:
    """Schreibt ein Mini-Notebook im ipynb-Format (JSON)."""
    nb = {"cells": cells, "metadata": {}, "nbformat": 4, "nbformat_minor": 5}
    path.write_text(json.dumps(nb), encoding="utf-8")
    return path


def markdown(source: str) -> dict:
    return {"cell_type": "markdown", "source": source}


def code(source: str) -> dict:
    return {"cell_type": "code", "source": source}


@pytest.fixture()
def notebook_pair(tmp_path):
    """Ein Aufgaben-/Lösungs-Paar mit drei Aufgaben:
    1: ganze Zahlen, 2: Kommazahl, 3: reine Textantwort (keine Variablen)."""
    aufgaben = make_notebook(
        tmp_path / "aufgaben.ipynb",
        [
            markdown("## 1. Aufgabe: Rechnen"),
            code(""),
            markdown("## 2. Aufgabe: Kommazahlen"),
            code(""),
            markdown("## 3. Aufgabe: Textantwort"),
            code(""),
        ],
    )
    loesung = make_notebook(
        tmp_path / "loesung.ipynb",
        [
            markdown("## 1. Aufgabe: Rechnen"),
            code("x = 5\ny = x * 2"),
            markdown("## 2. Aufgabe: Kommazahlen"),
            code("pi_rough = 0.1 + 0.2"),
            markdown("## 3. Aufgabe: Textantwort"),
            code("print('nur Text, keine Variablen')"),
        ],
    )
    return aufgaben, loesung


def test_exports_stub_and_tests_per_task(notebook_pair, tmp_path):
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"

    exported = export(aufgaben, loesung, target)

    assert exported == [1, 2]
    assert (target / "aufgabe_1.py").exists()
    assert (target / "test_aufgabe_1.py").exists()
    assert (target / "aufgabe_2.py").exists()
    assert (target / "test_aufgabe_2.py").exists()


def test_text_only_task_is_skipped(notebook_pair, tmp_path):
    # Aufgabe 3 hat nur eine print-Ausgabe -- keine Dateien, wird
    # nicht über die Extension geprüft
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"

    export(aufgaben, loesung, target)

    assert not (target / "aufgabe_3.py").exists()
    assert not (target / "test_aufgabe_3.py").exists()


def test_generated_int_asserts(notebook_pair, tmp_path):
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(aufgaben, loesung, target)

    content = (target / "test_aufgabe_1.py").read_text(encoding="utf-8")
    assert "from aufgabe_1 import x, y" in content
    assert "assert x == 5" in content
    assert "assert y == 10" in content


def test_floats_use_pytest_approx(notebook_pair, tmp_path):
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(aufgaben, loesung, target)

    content = (target / "test_aufgabe_2.py").read_text(encoding="utf-8")
    # 0.1 + 0.2 ist wegen Fließkomma nicht exakt 0.3
    assert f"pytest.approx({0.1 + 0.2!r})" in content


def test_earlier_variables_are_not_retested(notebook_pair, tmp_path):
    # x und y stammen aus Aufgabe 1 und bleiben in Aufgabe 2 unverändert --
    # sie dürfen dort nicht noch einmal geprüft werden
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(aufgaben, loesung, target)

    content = (target / "test_aufgabe_2.py").read_text(encoding="utf-8")
    assert "from aufgabe_2 import pi_rough" in content
    assert "test_x" not in content


def test_stub_names_expected_variables(notebook_pair, tmp_path):
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(aufgaben, loesung, target)

    stub = (target / "aufgabe_1.py").read_text(encoding="utf-8")
    assert "1. Aufgabe: Rechnen" in stub
    assert "x = None" in stub
    assert "y = None" in stub


def test_unsolved_stub_fails_tests_but_does_not_break_import(notebook_pair, tmp_path):
    # Ungelöster Stub (None-Platzhalter): die Tests schlagen fehl,
    # aber der Import funktioniert -- pytest läuft komplett durch
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(aufgaben, loesung, target)

    # Exit-Code 1 = Tests gelaufen und fehlgeschlagen, kein Abbruch
    assert run_pytest_in(target, "test_aufgabe_1.py") == 1


def test_generated_tests_pass_with_correct_solution(notebook_pair, tmp_path):
    # Ende-zu-Ende im Kleinen: Stub wie ein Studierender ausfüllen und
    # die generierte Testdatei gegen das Modul ausführen
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(aufgaben, loesung, target)

    (target / "aufgabe_1.py").write_text("x = 5\ny = x * 2\n", encoding="utf-8")
    assert run_pytest_in(target, "test_aufgabe_1.py") == 0


def test_broken_solution_cell_skips_task(tmp_path):
    aufgaben = make_notebook(
        tmp_path / "a.ipynb",
        [
            markdown("## 1. Aufgabe: Kaputt"),
            code(""),
            markdown("## 2. Aufgabe: Heil"),
            code(""),
        ],
    )
    loesung = make_notebook(
        tmp_path / "l.ipynb",
        [
            markdown("## 1. Aufgabe: Kaputt"),
            code("raise RuntimeError('geht nicht')"),
            markdown("## 2. Aufgabe: Heil"),
            code("z = 1"),
        ],
    )
    target = tmp_path / "out"

    exported = export(aufgaben, loesung, target)

    assert exported == [2]
    assert not (target / "aufgabe_1.py").exists()


def test_mismatched_notebooks_raise(tmp_path):
    aufgaben = make_notebook(
        tmp_path / "a.ipynb",
        [markdown("## 1. Aufgabe: Eins"), code("")],
    )
    loesung = make_notebook(
        tmp_path / "l.ipynb",
        [
            markdown("## 1. Aufgabe: Eins"),
            code("a = 1"),
            markdown("## 2. Aufgabe: Zwei"),
            code("b = 2"),
        ],
    )
    with pytest.raises(ValueError):
        export(aufgaben, loesung, tmp_path / "out")
