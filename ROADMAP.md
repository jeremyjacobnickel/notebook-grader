# Roadmap

Stand und nächste Schritte. Bei Änderungen aktuell halten —
diese Datei ist (neben CLAUDE.md) das Gedächtnis des Projekts.
Stand: 2026-08-03.

## Wo wir stehen (Stufe 1: lokale Pipeline)

| Modul | Status |
|---|---|
| `grader/notebook_reader.py` | ✅ fertig — liest `.ipynb`, gruppiert Code-Zellen pro Aufgabe, 7 Tests grün |
| `grader/code_runner.py` | ❌ fehlt |
| `grader/code_analyzer.py` | ❌ fehlt |
| `grader/ai_grader.py` | ❌ fehlt |
| `grader/report_builder.py` | ❌ fehlt |
| `grader/main.py` | ❌ fehlt |

Außerdem vorhanden: `DECISIONS.md` (3 Einträge), `.env.example`,
Test-Fixture `tests/fixtures/1_Praktikum.ipynb` (Aufgabenblatt ohne
Studierenden-Daten), `requirements-dev.txt` (pytest).

## Nächste Schritte (in dieser Reihenfolge)

1. **`code_runner.py`** — führt den Code einer Aufgabe aus und sammelt
   das Ergebnis (stdout, Fehler, Exit-Status).
   - Einfachster Ansatz: `subprocess.run` mit Timeout pro Aufgabe.
   - Bewusst noch KEIN volles Sandboxing (kommt in Stufe 2), aber
     Timeout von Anfang an, damit Endlosschleifen nicht blockieren.
2. **`code_analyzer.py`** — ruft `ruff` auf den Studierenden-Code auf
   und sammelt die Findings.
   - `ruff` ist eine neue Dependency → vorher Eintrag in `DECISIONS.md`.
3. **`report_builder.py`** — baut aus Runner- und Analyzer-Ergebnissen
   einen lesbaren Report pro Studierendem (Markdown oder Text).
   - Bewusst VOR `ai_grader`: so ist die Pipeline früh end-to-end
     testbar, ganz ohne API-Key und Kosten.
4. **`ai_grader.py`** — schickt Code + Aufgabenstellung an das LLM für
   qualitatives Feedback.
   - Braucht: API-Key in `.env`, Eintrag in `DECISIONS.md` (welches
     Modell, welche Bibliothek), Kosten-/Latenz-Überlegung.
   - DSGVO im Blick behalten: für den lokalen Betrieb mit Test-Daten ok,
     vor Stufe 2/3 klären (AVV oder FH-internes LLM).
5. **`main.py`** — CLI, die alles verkettet:
   `python -m grader.main pfad/zum/notebook.ipynb` → Report.
   - Standard-Library `argparse` reicht.
6. **`examples/sample_submission.ipynb`** — Beispiel-Abgabe committen.
   README verspricht diese Datei bereits, sie existiert aber noch nicht.

Damit ist Stufe 1 abgeschlossen: Notebook rein → pytest/ruff/LLM →
Feedback raus, komplett lokal.

## Danach: Stufe 2 — Webserver an der FH

- Kleine Flask-App (Upload-Seite, Feedback-Seite) um die Pipeline.
- **Sandboxing wird hier Pflicht:** Studierenden-Code isoliert ausführen
  (Container, Zeit-/Speicherlimit, kein Netz).
- Fester HTTPS-Server der FH Münster (mit FH-IT abstimmen).

## Danach: Stufe 3 — LTI-Anbindung an ILIAS

- LTI-Bibliothek wählen (1.1 vs. 1.3 — hängt von der ILIAS-Version ab).
- ILIAS-Admin registriert das Tool, Schlüsselaustausch.
- Noten-Rückgabe (Outcomes/AGS) testen.

## Offene Punkte / Orga (früh anstoßen, blockiert sonst Stufe 2–3)

- [ ] Gespräch mit FH-IT / ILIAS-Admin: LTI-Version? Server? Wer betreibt?
- [ ] DSGVO klären: externes LLM mit AVV oder FH-internes LLM?
- [ ] Kleinigkeit README: unter "Running tests" steht noch
      "(add this once tests exist)" — Tests existieren inzwischen.
