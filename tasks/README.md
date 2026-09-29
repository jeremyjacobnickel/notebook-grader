# Praktikumsaufgaben

Jeder Unterordner ist ein veröffentlichtes Praktikumspaket im Format aus
[WORKFLOW.md](../WORKFLOW.md): `manifest.json`, das getaggte Aufgaben-Notebook,
pytest-Tests und optionale Hilfsdateien. Studierende erhalten diesen Inhalt als
ZIP; das Backend liest hier die Aufgabenstellung für KI-Tipps und nimmt nur
Abgaben zu vorhandenen Paketen an.

`5_praktikum/` enthält das unbearbeitete Notebook, 19 pytest-Prüfungen und die
gemeinsame `conftest.py` (Kopie von `grader/praktikum_conftest.py`; ein Test in
`tests/test_partial_grading.py` prüft, dass alle Kopien übereinstimmen).
Musterlösungen sind nicht Teil dieses Ordners oder Repositories.

Jeder Test zählt einen Punkt; bestanden ab 80 %. Details und bewusst nicht
bewertete Teile stehen in [PROTOTYP.md](../PROTOTYP.md).
