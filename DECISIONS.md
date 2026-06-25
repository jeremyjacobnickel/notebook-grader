# Design Decisions

Logbuch der Entscheidungen, die nicht aus dem Code selbst hervorgehen.
Neue Einträge oben anfügen, Datum im Format YYYY-MM-DD.

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
