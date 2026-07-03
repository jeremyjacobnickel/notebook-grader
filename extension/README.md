# Notebook Grader — VS-Code-Extension

Die Extension für Studierende: Praktikum in den Workspace laden,
pytest lokal ausführen (Punktestand in Sidebar und Statusleiste),
bei Bedarf einen KI-Tipp holen und das Ergebnis ans FH-Backend
abgeben. Bestanden = mindestens 80 % der Tests grün.

## Bauen und starten

Voraussetzungen: Node.js 18+, VS Code 1.90+, Python mit pytest.

```bash
cd extension
npm install
npm run compile   # TypeScript nach out/ kompilieren
npm run lint      # ESLint
npm test          # Unit-Tests (Score- und JUnit-XML-Logik)
```

Zum Ausprobieren: den Ordner `extension/` in VS Code öffnen und mit
**F5** (Run Extension) den Extension Development Host starten. Dort
einen Ordner öffnen, der einen `tasks/`-Ordner enthält — zum Beispiel
`extension/fixtures/` aus diesem Repo, das ein Mini-Praktikum
(`1_praktikum`) mit drei trivialen pytest-Tests mitbringt.

## Commands (Command-Palette, Kategorie „Notebook Grader“)

- **Praktikum laden** — listet die Unterordner der Aufgaben-Quelle,
  kopiert das gewählte Praktikum in den Workspace und öffnet `<id>.py`.
- **Tests ausführen** — startet `python -m pytest` im Praktikums-Ordner,
  zeigt `bestanden/gesamt`, Prozent und Status in der Sidebar
  („Notebook Grader“ im Explorer) und der Statusleiste.
- **Ergebnis abgeben** — schickt das Ergebnis an `POST {backendUrl}/submit`.

Der **Tipp holen**-Button in der Sidebar ruft `POST {backendUrl}/hint`
mit dem aktuellen Code und der letzten pytest-Fehlerausgabe auf und
zeigt den sokratischen Tipp an.

## Einstellungen

| Einstellung                 | Bedeutung                                             |
| --------------------------- | ----------------------------------------------------- |
| `notebookGrader.backendUrl` | Basis-URL des FH-Backends                             |
| `notebookGrader.courseToken`| Kurs-Token, wird als `Authorization: Bearer` gesendet |
| `notebookGrader.tasksSource`| Aufgaben-Ordner (leer = `tasks/` im Workspace)        |

Der Kurs-Token wird nie geloggt.

## Aufbau

- `src/extension.ts` — activate: Commands, Sidebar, StatusBar registrieren
- `src/commands/` — je Command eine Datei
- `src/grading/` — pytest-Runner plus reine Score-/XML-Parse-Logik
- `src/backend/client.ts` — HTTP-Client (eingebautes fetch)
- `src/sidebar/` — WebviewViewProvider für den Punktestand
- `src/taskSource.ts` — Aufgaben-Quelle (lokaler Ordner; Naht für einen
  späteren Backend-Download)
- `src/test/` — Unit-Tests, laufen mit `node --test` ohne VS Code
