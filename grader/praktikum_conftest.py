"""pytest-Unterstützung für Praktikumspakete; liegt im Paket als conftest.py.

Kanonische Quelle: grader/praktikum_conftest.py (nur Standardbibliothek + pytest).
Jeder Test prüft genau eine Aufgabe/Teilaufgabe, erkannt am Testnamen
test_<task><part>_… (siehe WORKFLOW.md). Ausgeführt werden nur role:setup und
die Antwortzellen dieser Aufgabe bis einschließlich der Teilaufgabe. Fehler in
anderen Aufgaben beeinflussen den Test daher nicht.
"""

import ast
import json
import re
from pathlib import Path

import pytest

PACKAGE = Path(__file__).resolve().parent


def pytest_configure(config):
    config.addinivalue_line("markers", "requires(*names): Namen, die die Aufgabe definieren muss.")


def notebook_cells():
    """Codezellen mit wirksamer Rolle/Aufgabe.

    Ungetaggte Codezellen haben Studierende eingefügt; sie gehören zur nächsten
    darüberliegenden Aufgabe/Teilaufgabe. Vor der ersten Aufgabe werden sie ignoriert.
    """
    manifest = json.loads((PACKAGE / "manifest.json").read_text(encoding="utf-8"))
    raw = json.loads((PACKAGE / manifest["notebook"]).read_text(encoding="utf-8"))
    cells = []
    context = None
    for index, cell in enumerate(raw.get("cells", [])):
        tags = [tag for tag in (cell.get("metadata") or {}).get("tags") or [] if isinstance(tag, str)]
        values = dict(tag.split(":", 1) for tag in reversed(tags) if ":" in tag)
        if "task" in values:
            context = (values["task"], values.get("part", ""))
        if cell.get("cell_type") != "code":
            continue
        role = values.get("role")
        task, part = values.get("task", ""), values.get("part", "")
        if role is None and context:
            role, (task, part) = "answer", context
        source = cell.get("source", "")
        cells.append({"index": index, "role": role, "task": task, "part": part,
                      "source": "".join(source) if isinstance(source, list) else source})
    return cells


def task_for_test(name, cells):
    ids = list(dict.fromkeys((cell["task"], cell["part"]) for cell in cells
                             if cell["role"] == "answer" and cell["task"]))
    matches = [pair for pair in ids if name.startswith(f"test_{pair[0]}{pair[1]}_")]
    if len(matches) != 1:
        pytest.fail(f"Testname {name} passt zu keiner Aufgabe des Notebooks (erwartet test_<task><part>_…).",
                    pytrace=False)
    return matches[0]


def selected_cells(cells, task, part):
    """Setup plus Antwortzellen der Aufgabe bis einschließlich der Teilaufgabe."""
    own = [cell for cell in cells if cell["role"] == "answer" and cell["task"] == task]
    parts = list(dict.fromkeys(cell["part"] for cell in own))
    allowed = parts[:parts.index(part) + 1]
    setup = [cell for cell in cells if cell["role"] == "setup"]
    return setup, [cell for cell in own if cell["part"] in allowed]


def parse(cell):
    # IPython-Magics (%matplotlib, !pip) sind kein Python; Zeilen bleiben für Meldungen erhalten.
    source = re.sub(r"(?m)^[ \t]*[%!].*$", "", cell["source"])
    try:
        return ast.parse(source, filename=f"Notebook-Zelle {cell['index'] + 1}")
    except SyntaxError as error:
        pytest.fail(f"EXECUTION: Syntaxfehler in Notebook-Zelle {cell['index'] + 1}, "
                    f"Zeile {error.lineno}: {error.msg}", pytrace=False)


def defined_names(node):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        return {node.name}
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        return {alias.asname or alias.name.split(".")[0] for alias in node.names}
    return {n.id for n in ast.walk(node) if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Store)}


def is_docstring(node):
    return isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str)


def placeholder(node):
    """Unveränderter Starter: leere Funktion, pass/…/return None, NotImplementedError oder `= None`."""
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        for item in (n for n in node.body if not is_docstring(n)):
            if isinstance(item, ast.Pass):
                continue
            if isinstance(item, ast.Return) and (item.value is None or isinstance(item.value, ast.Constant)
                                                 and item.value.value is None):
                continue
            if isinstance(item, ast.Expr) and isinstance(item.value, ast.Constant) and item.value.value is Ellipsis:
                continue
            if isinstance(item, ast.Raise):
                exc = item.exc.func if isinstance(item.exc, ast.Call) else item.exc
                if isinstance(exc, ast.Name) and exc.id == "NotImplementedError":
                    continue
            return False
        return True
    if isinstance(node, (ast.Assign, ast.AnnAssign)):
        return node.value is None or isinstance(node.value, ast.Constant) and node.value.value is None
    return False


class TaskCode:
    def __init__(self, test_name, requires):
        cells = notebook_cells()
        setup, answers = selected_cells(cells, *task_for_test(test_name, cells))
        self.setup = [(cell, parse(cell)) for cell in setup]
        self.nodes = [(cell, node) for cell in answers for node in parse(cell).body]
        # Spätere Definitionen überschreiben frühere, wie beim Ausführen des Notebooks.
        self.definitions = {name: node for _, node in self.nodes for name in defined_names(node)}
        self.requires = requires
        for name in requires:
            node = self.definitions.get(name)
            if node is None:
                pytest.skip(f"MISSING: {name} fehlt. Prüfe den geforderten Namen in der Aufgabenstellung.")
            if placeholder(node):
                pytest.skip(f"OPEN: {name} enthält noch einen Platzhalter.")

    def execute(self):
        """Setup vollständig, von den Antworten nur benötigte Definitionen samt Abhängigkeiten."""
        namespace = {"__name__": "__grader__"}
        chosen = list(self.nodes)
        if self.requires:
            names, chosen = set(self.requires), []
            changed = True
            while changed:
                changed = False
                for item in self.nodes:
                    if item not in chosen and defined_names(item[1]) & names:
                        chosen.append(item)
                        names.update(n.id for n in ast.walk(item[1])
                                     if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load))
                        changed = True
            chosen.sort(key=lambda item: (item[0]["index"], item[1].lineno))
        blocks = [(cell, tree.body) for cell, tree in self.setup] + [(cell, [node]) for cell, node in chosen]
        for cell, body in blocks:
            try:
                exec(compile(ast.Module(body=body, type_ignores=[]),
                             f"Notebook-Zelle {cell['index'] + 1}", "exec"), namespace)
            except Exception as error:
                pytest.fail(f"EXECUTION: {type(error).__name__} in Notebook-Zelle {cell['index'] + 1}: {error}",
                            pytrace=False)
        return namespace


@pytest.fixture
def task_code(request):
    marker = request.node.get_closest_marker("requires")
    return TaskCode(request.node.originalname, marker.args if marker else ())


@pytest.fixture
def solution(task_code):
    """Namensraum mit dem ausgeführten Code der Aufgabe dieses Tests."""
    return task_code.execute()


@pytest.fixture
def definitions(task_code):
    """AST-Knoten der Antwortdefinitionen dieses Tests (für Strukturprüfungen)."""
    return task_code.definitions
