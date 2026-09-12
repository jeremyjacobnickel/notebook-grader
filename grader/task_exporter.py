"""Erzeugt aus einem Praktikums-Notebook die Aufgaben-Ordner für die
VS-Code-Extension.

Aufruf:
    python -m grader.task_exporter <loesung.ipynb> <zielordner> [--aufgaben <aufgaben.ipynb>]

Beispiel:
    python -m grader.task_exporter 1_Praktikum_Loesung.ipynb tasks/1_praktikum

Je Aufgabe entstehen zwei Dateien (eine Datei pro Aufgabe, weil sich
Variablennamen wie `a`, `b` zwischen den Aufgaben wiederholen):
    aufgabe_<n>.py       -- Stub, in den die Studierenden ihren Code schreiben
    test_aufgabe_<n>.py  -- pytest-Tests mit den Erwartungswerten aus der Lösung

Geprüft werden zwei Arten von Ergebnissen:
- **Variablen** mit einfachem Wert (Zahl, Text, Wahrheitswert, Liste davon),
  die die Aufgabe neu anlegt oder ändert.
- **Funktionen**: Beispielaufrufe aus der Musterlösung selbst (z. B.
  `print(factorial_iter(4))`) werden ausgeführt und ihr Ergebnis
  festgehalten. Aufrufe mit Variablen statt festen Werten als Argument
  lassen sich nicht nachstellen und werden übersprungen.

Aufgaben ohne prüfbares Ergebnis (reine Textantworten, Grafik-Aufgaben)
werden übersprungen -- sie werden nicht über die Extension geprüft,
sondern anderweitig (Entscheidung siehe DECISIONS.md).

Hinweise:
- Die Lösungs-Zellen werden hier ausgeführt (vertrauenswürdiger Code des
  Profs). Pakete, die die Lösungen nutzen (z. B. numpy), müssen
  installiert sein.
- Vorhandene Dateien im Zielordner werden überschrieben (erneuter Export
  nach einer Korrektur ist der Normalfall).
"""

from pathlib import Path
import argparse
import ast
import contextlib
import inspect
import io
import os
import sys

from grader.notebook_reader import Notebook, Task, read


# Ein Ergebnis je Aufgabe: geprüfte Variablen und geprüfte Funktionsaufrufe
class TaskResult:
    def __init__(self) -> None:
        self.values: dict[str, object] = {}
        # je Eintrag: (Funktionsname, Argumente, erwartetes Ergebnis)
        self.calls: list[tuple[str, list, object]] = []
        # je Eintrag: (Funktionsname, Signatur als Text) -- auch ungetestete
        self.functions: list[tuple[str, str]] = []

    def has_tests(self) -> bool:
        return bool(self.values) or bool(self.calls)


def is_checkable(value: object) -> bool:
    # Nur einfache Werte werden getestet: Zahlen, Strings, Wahrheitswerte
    # und Listen/Tupel daraus. Alles andere (Arrays, Grafiken, Module)
    # lässt sich nicht als Literal in eine Testdatei schreiben.
    if isinstance(value, (bool, int, float, str)):
        return True
    if isinstance(value, (list, tuple)):
        return all(isinstance(item, (bool, int, float, str)) for item in value)
    return False


def to_plain(value: object) -> object:
    # numpy-Skalare (z. B. np.float64) in normale Python-Werte umwandeln,
    # damit repr() in den generierten Tests sauberes Python ergibt.
    # `ndim == 0` trennt Skalare von echten Arrays -- eine 5x5-Matrix
    # lässt sich nicht in eine einzelne Zahl umwandeln.
    if type(value).__module__.startswith("numpy") and getattr(value, "ndim", None) == 0:
        return value.item()
    if isinstance(value, (list, tuple)):
        return [to_plain(item) for item in value]
    return value


def contains_float(value: object) -> bool:
    # Fließkommazahlen nie exakt vergleichen -- Rundungsfehler
    if isinstance(value, bool):
        return False
    if isinstance(value, float):
        return True
    if isinstance(value, (list, tuple)):
        return any(contains_float(item) for item in value)
    return False


def find_defined_functions(code: str) -> list[str]:
    """Namen der Funktionen, die dieser Code auf oberster Ebene definiert."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    names = []
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            names.append(node.name)
    return names


def find_example_calls(code: str, function_names: list[str]) -> list[tuple[str, list]]:
    """Beispielaufrufe aus der Musterlösung, bei denen alle Argumente
    feste Werte sind (z. B. `factorial_iter(4)`).

    Rekursive Aufrufe wie `factorial_rec(number - 1)` haben eine Variable
    als Argument und fallen damit automatisch heraus."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    examples: list[tuple[str, list]] = []
    seen = set()
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if not isinstance(node.func, ast.Name):
            continue
        if node.func.id not in function_names or node.keywords:
            continue
        try:
            args = [ast.literal_eval(arg) for arg in node.args]
        except ValueError:
            continue  # Argument ist kein fester Wert
        key = (node.func.id, repr(args))
        if key in seen:
            continue
        seen.add(key)
        examples.append((node.func.id, args))
    return examples


def collect_expected(loesung: Notebook) -> dict[int, TaskResult]:
    """Führt die Lösung aus und sammelt je Aufgabe die prüfbaren Ergebnisse."""
    # Ein gemeinsamer Namespace über alle Aufgaben: spätere Aufgaben
    # nutzen z. B. das `import numpy as np` aus dem Vorspann.
    namespace: dict[str, object] = {}
    if loesung.preamble:
        exec(loesung.preamble, namespace)  # Vorspann des Profs

    results: dict[int, TaskResult] = {}
    for task in loesung.tasks:
        before = dict(namespace)
        try:
            # Ausgaben der Lösung unterdrücken, sonst rauscht die Konsole voll
            with contextlib.redirect_stdout(io.StringIO()):
                exec(task.code, namespace)  # Lösung des Profs -- vertrauenswürdig
        except Exception as error:
            print(
                f"Warnung: Lösung zu Aufgabe {task.number} nicht ausführbar "
                f"({error}) -- Aufgabe wird übersprungen.",
                file=sys.stderr,
            )
            continue

        result = TaskResult()
        collect_values(namespace, before, result)
        collect_calls(task, namespace, result)
        if result.has_tests() or result.functions:
            results[task.number] = result

    return results


def collect_values(
    namespace: dict[str, object], before: dict[str, object], result: TaskResult
) -> None:
    for name, value in namespace.items():
        if name.startswith("_") or callable(value):
            continue
        plain = to_plain(value)
        if not is_checkable(plain):
            continue
        if name in before and to_plain(before[name]) == plain:
            # Unverändert -- der Wert gehört zu einer früheren Aufgabe.
            # (Grenzfall: weist eine Aufgabe zufällig denselben Wert zu,
            # wird sie hier nicht erkannt.)
            continue
        result.values[name] = plain


def collect_calls(
    task: Task, namespace: dict[str, object], result: TaskResult
) -> None:
    function_names = find_defined_functions(task.code)
    for name in function_names:
        function = namespace.get(name)
        if function is None:
            continue
        result.functions.append((name, format_signature(function)))

    for name, args in find_example_calls(task.code, function_names):
        function = namespace.get(name)
        if function is None:
            continue
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                returned = to_plain(function(*args))
        except Exception:
            continue  # Beispielaufruf nicht nachstellbar
        if is_checkable(returned):
            result.calls.append((name, args, returned))


def format_signature(function: object) -> str:
    try:
        return str(inspect.signature(function))  # z. B. "(number)"
    except (TypeError, ValueError):
        return "()"


def render_stub(task: Task, result: TaskResult, preamble: str) -> str:
    lines = [
        f'"""{task.number}. Aufgabe: {task.title}',
        "",
        "Aufgabenstellung: siehe Praktikums-Notebook.",
        "Ersetzen Sie die Platzhalter durch Ihre Lösung.",
        '"""',
        "",
    ]
    if preamble.strip():
        lines += [preamble.strip(), "", ""]
    for name, signature in result.functions:
        lines += [f"def {name}{signature}:", "    # Ihr Code:", "    return None", "", ""]
    for name in result.values:
        lines.append(f"{name} = None")
    return "\n".join(lines).rstrip() + "\n"


def render_tests(task: Task, result: TaskResult) -> str:
    needs_approx = any(contains_float(v) for v in result.values.values()) or any(
        contains_float(expected) for _, _, expected in result.calls
    )
    tested_functions = []
    for name, _, _ in result.calls:
        if name not in tested_functions:
            tested_functions.append(name)
    imported = list(result.values) + tested_functions

    lines = [
        f'"""Automatisch generierte Tests für Aufgabe {task.number} -- '
        'nicht von Hand ändern."""',
        "",
    ]
    if needs_approx:
        lines += ["import pytest", ""]
    lines += [f"from aufgabe_{task.number} import {', '.join(imported)}", ""]

    for name, value in result.values.items():
        lines += ["", f"def test_{name}():", f"    assert {name} == {expected_repr(value)}"]

    counters: dict[str, int] = {}
    for name, args, expected in result.calls:
        counters[name] = counters.get(name, 0) + 1
        call = f"{name}({', '.join(repr(arg) for arg in args)})"
        lines += [
            "",
            f"def test_{name}_beispiel_{counters[name]}():",
            f"    assert {call} == {expected_repr(expected)}",
        ]

    return "\n".join(lines) + "\n"


def expected_repr(value: object) -> str:
    if contains_float(value):
        return f"pytest.approx({value!r})"
    return repr(value)


def export(
    loesung_path: Path, target_dir: Path, aufgaben_path: Path | None = None
) -> list[int]:
    """Erzeugt den Zielordner und gibt die Nummern der exportierten
    Aufgaben zurück. `aufgaben_path` ist optional und dient nur der
    Kontrolle, dass beide Notebooks dieselben Aufgaben enthalten."""
    loesung = read(loesung_path)

    if aufgaben_path is not None:
        aufgaben = read(aufgaben_path)
        numbers_a = [t.number for t in aufgaben.tasks]
        numbers_l = [t.number for t in loesung.tasks]
        if numbers_a != numbers_l:
            raise ValueError(
                f"Notebooks passen nicht zusammen: Aufgaben {numbers_a} vs. "
                f"Lösung {numbers_l}"
            )

    results = collect_expected(loesung)

    target_dir.mkdir(parents=True, exist_ok=True)
    exported: list[int] = []
    for task in loesung.tasks:
        result = results.get(task.number)
        if result is None or not result.has_tests():
            print(
                f"Aufgabe {task.number} ({task.title}): kein prüfbares Ergebnis "
                "-- wird nicht über die Extension geprüft."
            )
            continue
        stub_path = target_dir / f"aufgabe_{task.number}.py"
        test_path = target_dir / f"test_aufgabe_{task.number}.py"
        stub_path.write_text(
            render_stub(task, result, loesung.preamble), encoding="utf-8"
        )
        test_path.write_text(render_tests(task, result), encoding="utf-8")
        exported.append(task.number)

    return exported


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Konvertiert ein Praktikums-Notebook in einen tasks/-Ordner."
    )
    parser.add_argument("loesung", type=Path, help="Notebook mit den Lösungen")
    parser.add_argument("ziel", type=Path, help="Zielordner, z. B. tasks/1_praktikum")
    parser.add_argument(
        "--aufgaben",
        type=Path,
        default=None,
        help="Optional: Aufgaben-Notebook zur Kontrolle der Aufgabenliste",
    )
    args = parser.parse_args()

    # Grafik-Lösungen (matplotlib) sollen beim Ausführen kein Fenster öffnen
    os.environ.setdefault("MPLBACKEND", "Agg")

    exported = export(args.loesung, args.ziel, args.aufgaben)
    print(f"{len(exported)} Aufgaben exportiert nach {args.ziel}: {exported}")


if __name__ == "__main__":
    main()
