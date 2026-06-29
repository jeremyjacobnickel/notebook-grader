# Design Decisions

Logbuch der Entscheidungen, die nicht aus dem Code selbst hervorgehen.
Neue Einträge oben anfügen, Datum im Format YYYY-MM-DD.

---

## 2026-06-29 — `nbgrader` als Gerüst verworfen

**Kontext:** Überlegung, `nbgrader` als Grundgerüst für Punktevergabe
und Notebook-Handling zu nutzen.

**Alternativen:**
- `nbgrader` — fertiges Autograding-Framework für Jupyter-Notebooks.
- Schlanke Eigenlösung: `notebook_reader.py` (Parsen) plus eine kleine
  `grading_scheme.py` (Aufgabe → max. Punkte).

**Entscheidung:** Kein `nbgrader`. Schlanke Eigenlösung.

**Begründung:** `nbgrader` bringt eine eigene Datenbank, ein
Zell-Metadaten-Schema und einen JupyterHub-Workflow mit. Das steht im
Widerspruch zu "Standard-Library zuerst" und liegt deutlich über dem
Skill-Level des Maintainers (traitlets-Config, nbconvert-Preprocessors,
versteckte Magie). Die beiden gewünschten Funktionen — Notebooks lesen
und Punkte vergeben — sind je wenige Dutzend Zeilen und teils schon
gebaut. Reversibel: bei echtem Bedarf später nachrüstbar.

---

## 2026-06-29 — `ruff` für die Stilprüfung (Dev-Dependency)

**Kontext:** Stil-Layer der Bewertung (die README nennt `ruff` bereits).

**Alternativen:**
- `flake8` + `pycodestyle` + Plugins — mehrere Pakete.
- `ruff` — eine einzelne, schnelle Binary, deckt Linting und Format ab.

**Entscheidung:** `ruff` als Dev-Dependency.

**Begründung:** Eine Abhängigkeit statt mehrerer, sehr schnell, einfache
Konfiguration. Prüft sowohl Studierenden-Code als auch das Projekt selbst.

---

## 2026-06-29 — `ast` (Standard-Library) für strukturelle Anforderungen

**Kontext:** Manche Aufgaben verlangen eine bestimmte Struktur (Schleife,
benannte Funktion, Modulo-Operator), nicht nur ein korrektes Ergebnis.

**Entscheidung:** Eigenes kleines Skript auf Basis des `ast`-Moduls aus
der Standard-Library. Einfache `ast.walk()`-+-`isinstance`-Prüfungen,
keine Visitor-Magie.

**Begründung:** Keine neue Abhängigkeit, gut lesbar, passt zum
Skill-Level. Trennt die strukturelle Prüfung sauber von Korrektheit
(pytest) und Stil (ruff).

---

## 2026-06-29 — Docker als Sandbox für Studierenden-Code

**Kontext:** `code_runner` und die Test-Läufe führen nicht
vertrauenswürdigen Code aus.

**Alternativen:**
- Direkter `subprocess`-Aufruf mit Limits — schwer wirklich abzusichern
  (Netzwerk, Dateisystem, Capabilities).
- `firejail` / `nsjail` / gVisor — wirksam, aber zusätzliche Tools und
  mehr Komplexität.
- Docker — verbreitet, isoliert Netzwerk/Dateisystem, CPU-/RAM-/Zeit-Limits.

**Entscheidung:** Docker-Container ohne Netzwerk, mit Ressourcen-Limits,
non-root und read-only Dateisystem.

**Begründung:** Pflicht für ein web-facing Tool (siehe README, LTI). Die
eigenen Unit-Tests des Graders laufen weiterhin normal auf dem Host.

---

## 2026-06-29 — `Hypothesis` vorerst zurückgestellt

**Kontext:** Idee, Property-based Testing für die Korrektheitsprüfung zu
nutzen.

**Entscheidung:** Noch nicht aufnehmen.

**Begründung:** Mächtig, aber das Schreiben von Strategien/Properties
liegt über dem aktuellen Skill-Level, und es gibt noch keinen konkreten
Anwendungsfall. Wird bei echtem Bedarf mit eigenem Eintrag nachgezogen.

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
