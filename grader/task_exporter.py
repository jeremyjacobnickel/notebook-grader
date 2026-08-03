"""Erzeugt aus einem Praktikums-Notebook-Paar die Aufgaben-Ordner für die
VS-Code-Extension.

Aufruf:
    python -m grader.task_exporter <aufgaben.ipynb> <loesung.ipynb> <zielordner>

Beispiel:
    python -m grader.task_exporter 1_Praktikum.ipynb 1_Praktikum_Loesung.ipynb tasks/1_praktikum

Je Aufgabe entstehen zwei Dateien (eine Datei pro Aufgabe, weil sich
Variablennamen wie `a`, `b` zwischen den Aufgaben wiederholen):
    aufgabe_<n>.py       -- Stub, in den die Studierenden ihren Code schreiben
    test_aufgabe_<n>.py  -- pytest-Tests mit den Erwartungswerten aus der Lösung

Aufgaben ohne prüfbare Variablen (reine Textantworten, Grafik-Aufgaben)
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
import os
import sys

from grader.notebook_reader import Notebook, Task, read


def is_checkable(value: object) -> bool:
    # Nur einfache Werte werden getestet: Zahlen, Strings, Wahrheitswerte.
    # Module, Funktionen, Klassen usw. sind keine Aufgaben-Ergebnisse.
    return isinstance(value, (bool, int, float, str))


def to_plain(value: object) -> object:
    # numpy-Skalare (z. B. np.float64) in normale Python-Werte umwandeln,
    # damit repr() in den generierten Tests sauberes Python ergibt.
    if type(value).__module__.startswith("numpy") and hasattr(value, "item"):
        return value.item()
    return value


def collect_expected_values(loesung: Notebook) -> dict[int, dict[str, object]]:
    """Führt die Lösungs-Zellen aus und sammelt je Aufgabe die einfachen
    Variablen, die diese Aufgabe neu anlegt oder ändert."""
    # Ein gemeinsamer Namespace über alle Aufgaben: spätere Aufgaben
    # nutzen z. B. das `import numpy as np` einer früheren Aufgabe.
    namespace: dict[str, object] = {}
    expected: dict[int, dict[str, object]] = {}

    for task in loesung.tasks:
        before = dict(namespace)
        try:
            exec(task.code, namespace)  # Lösung des Profs -- vertrauenswürdig
        except Exception as error:
            print(
                f"Warnung: Lösung zu Aufgabe {task.number} nicht ausführbar "
                f"({error}) -- Aufgabe wird übersprungen.",
                file=sys.stderr,
            )
            continue

        values: dict[str, object] = {}
        for name, value in namespace.items():
            if name.startswith("_"):
                continue
            plain = to_plain(value)
            if not is_checkable(plain):
                continue
            if name in before and to_plain(before[name]) == plain:
                # Unverändert -- der Wert gehört zu einer früheren Aufgabe.
                # (Grenzfall: weist eine Aufgabe zufällig denselben Wert zu,
                # wird sie hier nicht erkannt.)
                continue
            values[name] = plain
        if values:
            expected[task.number] = values

    return expected


def render_stub(task: Task, var_names: list[str]) -> str:
    # None-Platzhalter, damit der Import in den Tests nie fehlschlägt --
    # sonst würde eine ungelöste Aufgabe den ganzen pytest-Lauf stoppen.
    placeholders = "\n".join(f"{name} = None" for name in var_names)
    return (
        f'"""{task.number}. Aufgabe: {task.title}\n'
        "\n"
        "Aufgabenstellung: siehe Praktikums-Notebook.\n"
        "Ersetzen Sie die None-Werte durch Ihre Berechnungen.\n"
        '"""\n'
        "\n"
        f"{placeholders}\n"
    )


def render_tests(task: Task, values: dict[str, object]) -> str:
    has_floats = any(
        isinstance(v, float) and not isinstance(v, bool) for v in values.values()
    )
    lines = [
        f'"""Automatisch generierte Tests für Aufgabe {task.number} -- '
        'nicht von Hand ändern."""',
        "",
    ]
    if has_floats:
        lines += ["import pytest", ""]
    lines += [f"from aufgabe_{task.number} import {', '.join(values)}", ""]

    for name, value in values.items():
        lines += ["", f"def test_{name}():"]
        if isinstance(value, float) and not isinstance(value, bool):
            # Floats nie exakt vergleichen -- Rundungsfehler
            lines.append(f"    assert {name} == pytest.approx({value!r})")
        else:
            lines.append(f"    assert {name} == {value!r}")

    return "\n".join(lines) + "\n"


def export(aufgaben_path: Path, loesung_path: Path, target_dir: Path) -> list[int]:
    """Erzeugt den Zielordner und gibt die Nummern der exportierten
    Aufgaben zurück."""
    aufgaben = read(aufgaben_path)
    loesung = read(loesung_path)

    numbers_a = [t.number for t in aufgaben.tasks]
    numbers_l = [t.number for t in loesung.tasks]
    if numbers_a != numbers_l:
        raise ValueError(
            f"Notebooks passen nicht zusammen: Aufgaben {numbers_a} vs. "
            f"Lösung {numbers_l}"
        )

    expected = collect_expected_values(loesung)

    target_dir.mkdir(parents=True, exist_ok=True)
    exported: list[int] = []
    for task in aufgaben.tasks:
        if task.number not in expected:
            print(
                f"Aufgabe {task.number} ({task.title}): keine prüfbaren "
                "Variablen -- wird nicht über die Extension geprüft."
            )
            continue
        values = expected[task.number]
        stub_path = target_dir / f"aufgabe_{task.number}.py"
        test_path = target_dir / f"test_aufgabe_{task.number}.py"
        stub_path.write_text(render_stub(task, list(values)), encoding="utf-8")
        test_path.write_text(render_tests(task, values), encoding="utf-8")
        exported.append(task.number)

    return exported


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Konvertiert ein Praktikums-Notebook-Paar in einen tasks/-Ordner."
    )
    parser.add_argument("aufgaben", type=Path, help="Notebook mit leeren Code-Zellen")
    parser.add_argument("loesung", type=Path, help="Notebook mit den Lösungen")
    parser.add_argument("ziel", type=Path, help="Zielordner, z. B. tasks/1_praktikum")
    args = parser.parse_args()

    # Grafik-Lösungen (matplotlib) sollen beim Ausführen kein Fenster öffnen
    os.environ.setdefault("MPLBACKEND", "Agg")

    exported = export(args.aufgaben, args.loesung, args.ziel)
    print(f"{len(exported)} Aufgaben exportiert nach {args.ziel}: {exported}")


if __name__ == "__main__":
    main()
