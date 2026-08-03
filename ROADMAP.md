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
3. **Aufgaben erstellen:** echte Praktikums-Aufgaben als
   `tasks/<id>/<id>.py` + `test_<id>.py` (aus den bestehenden
   Notebook-Aufgaben ableiten).
4. **Verteilung:** `vsce package` → `.vsix` an die Studierenden;
   Kurs-Token-Ausgabe organisieren.
5. **Entscheidung `grader/`:** die alte Notebook-Pipeline
   (`notebook_reader.py` + Tests) wird von der Extension nicht
   genutzt. Behalten (z. B. als Konvertierungshilfe Notebook → Task)
   oder entfernen („no dead code")?

## Offene Punkte / Orga

- [ ] DSGVO für `/hint`: Studierenden-Code geht an Backend + LLM —
      AVV oder FH-internes Modell?
- [ ] Wie werden Kurs-Tokens erzeugt und verteilt?
- [ ] Wo läuft das Backend an der FH (Server, HTTPS-Adresse)?
