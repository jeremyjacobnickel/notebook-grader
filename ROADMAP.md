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

## Als Nächstes: Kursbetrieb mit etwa 100 Studierenden

Die folgenden Punkte sind geplant, noch nicht implementiert:

1. Persönliche, widerrufbare Zugänge und Kurszuordnung statt gemeinsamem Token.
2. Dauerhaftes FH-Backend mit HTTPS, PostgreSQL, automatischem Neustart,
   Überwachung und geprüften Sicherungen. Erreichbarkeit zuhause über VPN
   oder eine von der FH freigegebene öffentliche Schnittstelle klären.
3. Zentrale, versionierte Aufgabenverteilung und installierbare Extension.
4. Professorenansicht für Kurse, Veröffentlichungen, Deadlines,
   individuelle Fristverlängerungen, Abgabeübersicht und CSV-Export.
5. Deadline anhand der Serverzeit prüfen; Zeitzone explizit anzeigen.
   Vorschlag: letzte rechtzeitig bestätigte Abgabe zählt, spätere lokale
   Bearbeitung bleibt möglich. Regeln für verspätete Abgaben mit dem Prof
   festlegen. Wiederholte Übermittlung derselben Abgabe darf keine Duplikate
   erzeugen; Abgabe-ID und Serverzeit als Bestätigung zurückgeben.
6. Gemeinsame KI-Limits/Budgets über Backend-Prozesse hinweg, begrenzte
   Parallelität und Warteschlange. Abgaben dürfen nicht durch wartende
   KI-Anfragen blockiert werden. Kapazität mit der FH abstimmen und mit
   100 simulierten Nutzern testen; zuerst Pilotgruppe, dann ganzer Kurs.
7. Optional: Arbeitsstände getrennt von verbindlichen Abgaben speichern
   und laden, falls Studierende zwischen Labor-PC und privatem Gerät wechseln.

Lokales Bearbeiten und Testen bleibt offline möglich. KI, Aufgabenabruf
und Abgabe benötigen eine Verbindung. Die lokale Bewertung bleibt gemäß
README die Grundlage; serverseitige unabhängige Codeprüfung ist nicht Teil
dieses Ausbauplans.

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


## Update 2026-09-13

The local Praktikum 5 prototype, real FH-LiteLLM hints, SQLite submission and manual VS Code validation are complete; see PROTOTYP.md. Remaining: individual course identities, FH deployment, distribution and professor-approved scoring. The existing notebook exporter and its tests are retained.

## Umgesetzt: gezielte Tipps und Teilaufgaben

- Gezielter Kontext für FH-LiteLLM samt Hilfsfunktionen und Testfehlern.
- Verbrauchsmetadaten in SQLite und in der Seitenleiste; unbekannte Kosten
  und Router-Modellzuordnung werden nicht geschätzt.
- Klartextantworten mit Bereinigung häufiger LaTeX-/Markdown-Markierungen.
- Einzelprüfung der Teilaufgaben in Praktikum 5, Status „offen“ bei fehlenden
  Definitionen/Platzhaltern, verständliche Fehlerdetails.
- Einzeltest-Ergebnisse sind nicht als Gesamtpraktikum abgebbar.
- Grenzen und aktualisierte Testdateien: siehe PROTOTYP.md.
