# Notebook Grader — VS-Code-Extension

Die Studierenden-Seite des Notebook Graders: Praktikum laden, pytest
lokal ausführen, Punktestand sehen, KI-Tipp holen, Ergebnis abgeben.
Bestanden = mindestens 80 % der Punkte.

## Voraussetzungen

- VS Code ≥ 1.90
- Node.js ≥ 18 (zum Bauen)
- Python mit pytest (`pip install pytest`) — zum Ausführen der Tests

## Prototyp für Praktikum 5

Vollständige Einrichtung: [PROTOTYP.md](../PROTOTYP.md). Der Prototyp bietet Aufgabenbeschreibung, 19 Prüfungen, FH-LiteLLM-Tipps und lokale Abgaben. `notebookGrader.pythonPath` legt den Interpreter mit NumPy und pytest fest.

## Bauen und starten

```bash
cd extension
npm install
npm run compile   # TypeScript bauen
npm run lint      # ESLint
npm test          # Unit-Tests (reine Score-/XML-Logik, node:test)
```

Zum Ausprobieren: den Ordner `extension/` in VS Code öffnen und mit
**F5** den Extension Development Host starten. Dort einen Workspace
öffnen und die Einstellung `notebookGrader.tasksSource` auf den
mitgelieferten Beispiel-Ordner zeigen lassen
(`<repo>/extension/fixtures/tasks`) — oder einen eigenen `tasks/`-Ordner
im Workspace anlegen.

## Commands (Befehlspalette)

| Command | Zweck |
|---|---|
| `Notebook Grader: Praktikum laden` | Aufgabe aus `tasksSource` wählen, nach `work/<id>/` kopieren, `<id>.py` öffnen |
| `Notebook Grader: Tests ausführen` | `python -m pytest --junitxml=…` im Task-Ordner, Ergebnis in Sidebar + StatusBar |
| `Notebook Grader: Ergebnis abgeben` | Schickt das letzte Ergebnis an `POST {backendUrl}/submit` |
| `Notebook Grader: KI-Tipp holen` | Schickt Code + letzte Fehlerausgabe an `POST {backendUrl}/hint`, zeigt den Tipp in der Sidebar |

Die Sidebar (Aktivitätsleiste → „Notebook Grader") zeigt Punktestand,
Bestanden-Status und den „Tipp holen"-Button.

## Einstellungen

| Einstellung | Bedeutung |
|---|---|
| `notebookGrader.backendUrl` | Basis-URL des FH-Backends |
| `notebookGrader.courseToken` | Kurs-Token; wird als `Authorization: Bearer …` mitgeschickt, nie geloggt |
| `notebookGrader.tasksSource` | Ordner mit den Aufgaben (ein Unterordner pro Aufgabe); leer = `tasks/` im Workspace |

## Backend-Contracts (Client-Sicht)

Beide Requests: `Authorization: Bearer <courseToken>`,
`Content-Type: application/json`.

```
POST {backendUrl}/submit
  → { "praktikum": "beispiel", "passed": true, "score": 6, "total": 7, "percentage": 85.7 }
  ← { "ok": true }

POST {backendUrl}/hint
  → { "praktikum": "beispiel", "code": "<Inhalt der .py-Datei>", "traceback": "<pytest-Ausgabe oder ''>" }
  ← { "hint": "..." }
```

## Aufbau

```
src/
  extension.ts            Einstieg: Commands, Sidebar, StatusBar registrieren
  config.ts               Einstellungen lesen (Token nie loggen)
  state.ts                gemeinsamer Zustand (Praktikum, Score, Traceback)
  statusBar.ts            StatusBar-Item (grün/rot)
  commands/               je Command eine Datei
  grading/                pytest-Runner + reine Score-/JUnit-Logik (unit-getestet)
  backend/client.ts       fetch-Aufrufe für /submit und /hint
  sidebar/                WebviewViewProvider (Punktestand + Tipp-Button)
  test/                   Unit-Tests (node --test)
fixtures/tasks/beispiel/  Mini-Aufgabe zum manuellen Durchspielen
```
