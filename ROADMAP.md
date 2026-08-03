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
- **Konverter Notebook → `tasks/`** (`grader/task_exporter.py`):
  liest das Notebook-Paar des Profs, führt die Lösungen aus und erzeugt
  je Aufgabe `aufgabe_<n>.py` (Stub mit None-Platzhaltern) +
  `test_aufgabe_<n>.py` (Erwartungswerte, Floats mit `pytest.approx`).
  Textantwort-/Grafik-Aufgaben werden übersprungen (siehe DECISIONS.md).
  Verifiziert am echten 1. Praktikum: 6 von 7 Aufgaben exportiert,
  nur Aufgabe 4 gelöst → 4/37 Tests (10,8 %), Musterlösung überall →
  37/37 (100 %, bestanden).

## Als Nächstes

1. **Manuell testen im Extension Development Host** (F5 in VS Code,
   Anleitung in `extension/README.md`) — kann nur der Maintainer:
   QuickPick, Sidebar, StatusBar, Fehlermeldungen.
2. **FH-Backend bauen** (eigenes Projekt oder `backend/` hier):
   `POST /submit` speichert Ergebnis je Kurs-Token,
   `POST /hint` ruft das LLM für einen sokratischen Tipp.
   Vorher DSGVO klären (AVV oder FH-internes LLM).
3. **Echte Aufgaben exportieren:** Der Prof (oder Maintainer) führt den
   Konverter für jedes Praktikum aus und legt die Ergebnisse in den
   `tasks/`-Ordner, den die Studierenden bekommen. Auf dem Rechner
   müssen die Pakete der Lösungen installiert sein (numpy, matplotlib).
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
