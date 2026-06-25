"""Tests gegen das echte 1_Praktikum.ipynb."""

from pathlib import Path
import json
import pytest

from grader.notebook_reader import read, Notebook


FIXTURE = Path(__file__).parent / "fixtures" / "1_Praktikum.ipynb"


@pytest.fixture(scope="module")
def notebook() -> Notebook:
    return read(FIXTURE)


def test_finds_all_seven_tasks(notebook):
    assert [t.number for t in notebook.tasks] == [1, 2, 3, 4, 5, 6, 7]


def test_extracts_task_titles(notebook):
    titles = {t.number: t.title for t in notebook.tasks}
    assert titles[1] == "Arithmetische Operationen"
    assert titles[4] == "Modulo-Operator"
    assert titles[6] == "Schwenkkran"


def test_appends_follow_up_markdown_to_description(notebook):
    # Bei Aufgabe 4 steht der Holzbalken-Text in einer eigenen Markdown-Zelle
    # nach dem Header
    task = notebook.task(4)
    assert "Holzbalken" in task.description
    assert "42" in task.description


def test_ignores_whitespace_only_code_cells(tmp_path):
    # Leere und reine Whitespace-Zellen werden nicht als Abgabe gezählt,
    # sonst sieht es so aus, als hätte der Studierende geantwortet.
    nb = {
        "cells": [
            {"cell_type": "markdown", "source": "## 1. Aufgabe: Test"},
            {"cell_type": "code", "source": ""},
            {"cell_type": "code", "source": "   \n  \t\n"},
            {"cell_type": "markdown", "source": "## 2. Aufgabe: Real"},
            {"cell_type": "code", "source": "x = 1"},
        ],
        "metadata": {},
        "nbformat": 4,
        "nbformat_minor": 5,
    }
    path = tmp_path / "fake.ipynb"
    path.write_text(json.dumps(nb))

    result = read(path)
    assert result.task(1).code_cells == []
    assert result.task(2).code_cells == ["x = 1"]


def test_task_lookup_by_number(notebook):
    assert notebook.task(2).title.startswith("Transzendente")
    assert notebook.task(99) is None


def test_missing_file_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        read(tmp_path / "does_not_exist.ipynb")


def test_assigns_code_cells_to_current_task(tmp_path):
    # Mini-Notebook von Hand bauen, weil das echte noch keine Lösungen enthält
    nb = {
        "cells": [
            {"cell_type": "markdown", "source": "## 1. Aufgabe: Test"},
            {"cell_type": "code", "source": "a = 12*12 + 12\nprint(a)"},
            {"cell_type": "markdown", "source": "## 2. Aufgabe: Another Test"},
            {"cell_type": "code", "source": "import numpy as np\nb = np.sin(0)"},
        ],
        "metadata": {},
        "nbformat": 4,
        "nbformat_minor": 5,
    }
    path = tmp_path / "fake.ipynb"
    path.write_text(json.dumps(nb))

    result = read(path)
    assert result.task(1).code == "a = 12*12 + 12\nprint(a)"
    assert "np.sin" in result.task(2).code
