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

    exported = export(loesung, target, aufgaben)

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

    export(loesung, target, aufgaben)

    assert not (target / "aufgabe_3.py").exists()
    assert not (target / "test_aufgabe_3.py").exists()


def test_generated_int_asserts(notebook_pair, tmp_path):
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(loesung, target, aufgaben)

    content = (target / "test_aufgabe_1.py").read_text(encoding="utf-8")
    assert "from aufgabe_1 import x, y" in content
    assert "assert x == 5" in content
    assert "assert y == 10" in content


def test_floats_use_pytest_approx(notebook_pair, tmp_path):
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(loesung, target, aufgaben)

    content = (target / "test_aufgabe_2.py").read_text(encoding="utf-8")
    # 0.1 + 0.2 ist wegen Fließkomma nicht exakt 0.3
    assert f"pytest.approx({0.1 + 0.2!r})" in content


def test_earlier_variables_are_not_retested(notebook_pair, tmp_path):
    # x und y stammen aus Aufgabe 1 und bleiben in Aufgabe 2 unverändert --
    # sie dürfen dort nicht noch einmal geprüft werden
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(loesung, target, aufgaben)

    content = (target / "test_aufgabe_2.py").read_text(encoding="utf-8")
    assert "from aufgabe_2 import pi_rough" in content
    assert "test_x" not in content


def test_stub_names_expected_variables(notebook_pair, tmp_path):
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(loesung, target, aufgaben)

    stub = (target / "aufgabe_1.py").read_text(encoding="utf-8")
    assert "1. Aufgabe: Rechnen" in stub
    assert "x = None" in stub
    assert "y = None" in stub


def test_unsolved_stub_fails_tests_but_does_not_break_import(notebook_pair, tmp_path):
    # Ungelöster Stub (None-Platzhalter): die Tests schlagen fehl,
    # aber der Import funktioniert -- pytest läuft komplett durch
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(loesung, target, aufgaben)

    # Exit-Code 1 = Tests gelaufen und fehlgeschlagen, kein Abbruch
    assert run_pytest_in(target, "test_aufgabe_1.py") == 1


def test_generated_tests_pass_with_correct_solution(notebook_pair, tmp_path):
    # Ende-zu-Ende im Kleinen: Stub wie ein Studierender ausfüllen und
    # die generierte Testdatei gegen das Modul ausführen
    aufgaben, loesung = notebook_pair
    target = tmp_path / "tasks" / "beispiel"
    export(loesung, target, aufgaben)

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

    exported = export(loesung, target, aufgaben)

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
        export(loesung, tmp_path / "out", aufgaben)


@pytest.fixture()
def function_notebook(tmp_path):
    """Lösung im Stil des 5. Praktikums: Funktionen statt Variablen,
    mit einem Vorspann vor der ersten Aufgabe."""
    return make_notebook(
        tmp_path / "funktionen.ipynb",
        [
            markdown("# 5. Praktikum"),
            code("import math"),
            markdown("## 1. Aufgabe: Fakultät"),
            code(
                "def factorial_iter(number):\n"
                "    result = 1\n"
                "    for i in range(1, number + 1):\n"
                "        result = result * i\n"
                "    return result\n"
                "\n"
                "print(factorial_iter(0))\n"
                "print(factorial_iter(4))"
            ),
            markdown("## 2. Aufgabe: Listen"),
            code(
                "def double_all(values):\n"
                "    return [v * 2 for v in values]\n"
                "\n"
                "print(double_all([1, 2, 3]))"
            ),
        ],
    )


def test_exports_function_tasks(function_notebook, tmp_path):
    target = tmp_path / "out"
    exported = export(function_notebook, target)

    assert exported == [1, 2]
    content = (target / "test_aufgabe_1.py").read_text(encoding="utf-8")
    assert "from aufgabe_1 import factorial_iter" in content
    assert "assert factorial_iter(0) == 1" in content
    assert "assert factorial_iter(4) == 24" in content


def test_function_stub_keeps_signature_and_preamble(function_notebook, tmp_path):
    target = tmp_path / "out"
    export(function_notebook, target)

    stub = (target / "aufgabe_1.py").read_text(encoding="utf-8")
    assert "import math" in stub  # Vorspann des Profs
    assert "def factorial_iter(number):" in stub
    assert "return None" in stub


def test_list_results_are_supported(function_notebook, tmp_path):
    target = tmp_path / "out"
    export(function_notebook, target)

    content = (target / "test_aufgabe_2.py").read_text(encoding="utf-8")
    assert "assert double_all([1, 2, 3]) == [2, 4, 6]" in content


def test_generated_function_tests_pass_with_correct_solution(
    function_notebook, tmp_path
):
    target = tmp_path / "out"
    export(function_notebook, target)

    (target / "aufgabe_1.py").write_text(
        "def factorial_iter(number):\n"
        "    result = 1\n"
        "    for i in range(1, number + 1):\n"
        "        result = result * i\n"
        "    return result\n",
        encoding="utf-8",
    )
    assert run_pytest_in(target, "test_aufgabe_1.py") == 0


def test_recursive_calls_are_not_used_as_examples(tmp_path):
    # factorial_rec(number - 1) hat eine Variable als Argument und
    # darf nicht als Beispielaufruf enden
    loesung = make_notebook(
        tmp_path / "l.ipynb",
        [
            markdown("## 1. Aufgabe: Rekursion"),
            code(
                "def factorial_rec(number):\n"
                "    if number == 0:\n"
                "        return 1\n"
                "    return number * factorial_rec(number - 1)\n"
                "\n"
                "print(factorial_rec(3))"
            ),
        ],
    )
    target = tmp_path / "out"
    export(loesung, target)

    content = (target / "test_aufgabe_1.py").read_text(encoding="utf-8")
    assert "assert factorial_rec(3) == 6" in content
    assert content.count("def test_") == 1


def test_aufgaben_notebook_is_optional(function_notebook, tmp_path):
    # Ohne Aufgaben-Notebook exportieren funktioniert (nur Lösung vorhanden)
    exported = export(function_notebook, tmp_path / "out")
    assert exported == [1, 2]


def test_numpy_arrays_do_not_crash_the_export(tmp_path):
    # Regression: eine Matrix ist kein Skalar -- .item() würde abstürzen.
    # Das Array ist nicht prüfbar, der Skalar daneben schon.
    numpy = pytest.importorskip("numpy")
    loesung = make_notebook(
        tmp_path / "l.ipynb",
        [
            markdown("# Praktikum"),
            code("import numpy as np"),
            markdown("## 1. Aufgabe: Matrix"),
            code("A = np.ones((3, 3))\nfirst = A[0, 0]"),
        ],
    )
    target = tmp_path / "out"

    assert export(loesung, target) == [1]

    content = (target / "test_aufgabe_1.py").read_text(encoding="utf-8")
    assert "first" in content
    assert "test_A" not in content  # Matrix wird nicht geprüft
