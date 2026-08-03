# Design Decisions

Logbuch der Entscheidungen, die nicht aus dem Code selbst hervorgehen.
Neue Einträge oben anfügen, Datum im Format YYYY-MM-DD.

---

## 2026-08-03 — Konverter: eine Datei pro Aufgabe, nur Variablen-Checks

**Kontext:** `grader/task_exporter.py` erzeugt aus dem Notebook-Paar die
`tasks/`-Ordner für die Extension. In den Notebooks verwenden mehrere
Aufgaben dieselben Variablennamen (`a`, `b`, `c` …) — in einer
gemeinsamen Datei würden sie sich überschreiben.

**Entscheidung (Maintainer):**
- **Eine Datei pro Aufgabe:** `aufgabe_<n>.py` + `test_aufgabe_<n>.py`.
- Die Stubs enthalten **None-Platzhalter** für die erwarteten Variablen.
  So schlägt der Import in den Tests nie fehl und eine ungelöste
  Aufgabe stoppt nicht den ganzen pytest-Lauf (die Extension ruft
  pytest zusätzlich mit `--continue-on-collection-errors` auf).
- Getestet werden nur **einfache Variablenwerte** (Zahlen, Strings,
  bool), die die Lösung der jeweiligen Aufgabe neu anlegt oder ändert.
  Floats mit `pytest.approx`.
- **Aufgaben mit Textantworten statt Code werden nicht über die
  Extension geprüft** — sie erzeugen keine Dateien und zählen nicht in
  die 80-%-Grenze. Die Kontrolle passiert anderswo (z. B. Leukipp).

**Begründung:** Einfachstes Layout, das die Variablen-Kollisionen löst;
der Studierenden-Fortschritt bleibt als Prozentwert über alle
generierten Tests korrekt messbar.

---

## 2026-08-03 — `grader/` bleibt: Basis für den Notebook-Konverter

**Kontext:** Nach dem Wechsel zur VS-Code-Extension war offen, ob die
alte Notebook-Pipeline (`grader/notebook_reader.py`) entfernt wird
("no dead code"). Jetzt ist geklärt: Der Prof pflegt die Praktika
weiterhin als Jupyter-Notebook-Paar — eine **Aufgaben-Version**
(Markdown-Aufgaben, leere Code-Zellen) und eine **Lösungs-Version**
(gleiche Zellen, ausgefüllt, mit Ausgaben).

**Entscheidung:** `notebook_reader.py` bleibt und wird die Basis des
Konverters Notebook → `tasks/<id>/` (Aufgaben-Stub + pytest-Tests).

**Begründung:** Der Reader parst genau dieses Format bereits
(verifiziert gegen das echte 1. Praktikum, Aufgaben- und
Lösungs-Version: je 7 Aufgaben sauber erkannt) und ist getestet.
Lösungs-Notebooks werden wie echte Abgaben NIE committet — sonst
könnten Studierende sie im Repo finden.

---

## 2026-08-03 — VS-Code-Extension statt LTI/ILIAS-Einbindung

**Kontext:** Ursprünglich war geplant, den Grader als Web-Tool über LTI
in ILIAS einzubinden (3-Stufen-Plan: lokal → FH-Webserver → LTI).

**Alternativen:**
- LTI-Web-Tool: Flask-Server an der FH, Registrierung durch den
  ILIAS-Admin, Server-Sandbox für Studierenden-Code, DSGVO-Klärung für
  Notebook-Uploads.
- VS-Code-Extension: Studierende arbeiten lokal in VS Code, die Tests
  laufen auf dem eigenen Rechner; nur das Ergebnis (bestanden ab 80 %)
  und — für KI-Tipps — der Code gehen an ein kleines FH-Backend.

**Entscheidung:** VS-Code-Extension. Der Client liegt in `extension/`,
das FH-Backend (`POST /submit`, `POST /hint`) folgt separat.

**Begründung:** Einfach zu installieren und zu verteilen, keine
Server-Sandbox nötig (der Code läuft beim Studierenden), kein
LTI-/ILIAS-Abstimmungsprozess. Trade-off: keine automatische Note im
ILIAS-Gradebook — das Backend sammelt die Bestanden-Status über ein
Kurs-Token.

---

## 2026-06-25 — `pytest` als Test-Runner (Dev-Dependency)

**Kontext:** Erster Test (`tests/test_notebook_reader.py`) braucht ein Framework.

**Alternativen:**
- `unittest` aus der Standard-Library — keine neue Dependency.
- `pytest` — kompakte Assertion-Syntax, Fixtures, gute Fehlermeldungen.

**Entscheidung:** `pytest` als Dev-Dependency in `requirements-dev.txt`.

**Begründung:** README-Konvention "no new dependency without a reason"
ist erfüllt durch diesen Eintrag. `pytest` ist De-facto-Standard, und
die Fixture-Syntax hält die Tests kurz, was zum Skill-Level passt.
`unittest`-Boilerplate (Klassen, `self.assertEqual`) wäre für Lernende
mehr Ballast als Hilfe.

---

## 2026-06-25 — `@dataclass` und `@property` erlaubt

**Kontext:** Erste Module (`notebook_reader.py`) modellieren Daten.

**Entscheidung:** `@dataclass` und `@property` aus der Standard-Library
sind erlaubt. Eigene Decorators schreiben weiterhin nicht.

**Begründung:** Beide ersetzen Boilerplate (`__init__`, Getter), ohne
versteckte Magie einzuführen. README-Skill-Level-Note wurde entsprechend
präzisiert (siehe README).

---

## 2026-06-25 — `json` statt `nbformat` zum Notebook-Parsen

**Kontext:** `notebook_reader.py` liest `.ipynb`-Dateien.

**Alternativen:**
- `nbformat` (offizielles Jupyter-Paket) — Validierung, Roundtrips.
- `json` aus der Standard-Library — `.ipynb` ist stabiles JSON.

**Entscheidung:** `json` aus der Standard-Library.

**Begründung:** Eine Dependency weniger. Wir brauchen aktuell weder
Validierung noch Schreib-Operationen. Wechsel auf `nbformat` ist ein
Einzeiler, falls später Roundtrips nötig werden.
