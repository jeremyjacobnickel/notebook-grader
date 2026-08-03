# Roadmap

Stand und nächste Schritte. Bei Änderungen aktuell halten —
diese Datei ist (neben CLAUDE.md) das Gedächtnis des Projekts.
Stand: 2026-08-03.

**Richtungswechsel:** VS-Code-Extension statt LTI/ILIAS-Web-Tool
(Begründung: DECISIONS.md, Eintrag 2026-08-03).

## Erledigt

- `extension/` v1 (TypeScript):
  - `loadPraktikum` — Aufgabe per QuickPick wählen, nach `work/<id>/`
    kopieren, `<id>.py` öffnen (Naht für späteren Backend-Download).
  - `runTests` — `python -m pytest --junitxml`, JUnit-Parser +
    Score-Logik als reine, unit-getestete Funktionen; bestanden ≥ 80 %.
  - `submit` / `hint` — fetch gegen die Backend-Contracts
    (`POST /submit`, `POST /hint`), Token nur im Header.
  - Sidebar (Punktestand + Tipp-Button) und StatusBar (grün/rot).
  - 9 Unit-Tests (node:test), ESLint, tsc strict; Beispiel-Aufgabe
    unter `extension/fixtures/tasks/beispiel/`.

## Als Nächstes

1. **Manuell testen im Extension Development Host** (F5 in VS Code,
   Anleitung in `extension/README.md`) — kann nur der Maintainer:
   QuickPick, Sidebar, StatusBar, Fehlermeldungen.
2. **FH-Backend bauen** (eigenes Projekt oder `backend/` hier):
   `POST /submit` speichert Ergebnis je Kurs-Token,
   `POST /hint` ruft das LLM für einen sokratischen Tipp.
   Vorher DSGVO klären (AVV oder FH-internes LLM).
3. **Konverter Notebook → `tasks/` bauen** (z. B. `grader/task_exporter.py`):
   Der Prof pflegt je Praktikum ein Notebook-Paar (Aufgaben-Version mit
   leeren Code-Zellen + Lösungs-Version, siehe DECISIONS.md 2026-08-03).
   `notebook_reader.py` parst beides bereits. Der Konverter erzeugt daraus
   den Aufgaben-Stub und pytest-Tests. Offene Design-Fragen:
   - **Variablen-Wiederverwendung:** `a`, `b`, `c` kommen in mehreren
     Aufgaben vor — in einer flachen `.py` überschreiben sie sich.
     Wahrscheinlich: eine Datei pro Aufgabe (`aufgabe_4.py` +
     `test_aufgabe_4.py`) statt einer Datei pro Praktikum.
   - **Erwartungswerte:** kommen aus dem Ausführen der Lösungs-Zellen
     (braucht numpy); Float-Vergleiche mit `pytest.approx`.
   - **Nicht automatisch testbar:** Textantworten (Aufgabe 1c, 2d/Leukipp)
     und Grafik-Aufgaben (Aufgabe 7, Vibe Coding) — wie zählen sie in
     die 80-%-Grenze?
4. **Verteilung:** `vsce package` → `.vsix` an die Studierenden;
   Kurs-Token-Ausgabe organisieren.

## Offene Punkte / Orga

- [ ] DSGVO für `/hint`: Studierenden-Code geht an Backend + LLM —
      AVV oder FH-internes Modell?
- [ ] Wie werden Kurs-Tokens erzeugt und verteilt?
- [ ] Wo läuft das Backend an der FH (Server, HTTPS-Adresse)?
- [ ] Bewusster Trade-off mit dem Prof klären: lokale pytest-Tests
      enthalten zwangsläufig die Erwartungswerte — Studierende könnten
      Ergebnisse hart codieren. Formative Prüfung ok, aber keine
      manipulationssichere Bewertung.
- [ ] Lösungs-Notebooks liegen außerhalb des Repos (nie committen,
      siehe CLAUDE.md) — Ablageort mit dem Prof vereinbaren.
