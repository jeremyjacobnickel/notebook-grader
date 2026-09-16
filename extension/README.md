# Notebook Grader — VS-Code-Extension

Die Studierenden-Seite des Notebook Graders: Praktikums-ZIP laden, das
Jupyter-Notebook bearbeiten, pytest lokal ausführen, Punktestand sehen,
KI-Tipp holen und Ergebnis abgeben. Bestanden = mindestens 80 % der Punkte.

## Voraussetzungen

- VS Code ≥ 1.90
- Jupyter-Unterstützung in VS Code für `.ipynb`
- Node.js ≥ 18 (zum Bauen)
- Python mit pytest und den für das Praktikum benötigten Paketen

## Kanonisches Praktikumsformat

Studierende erhalten vom Professor genau ein `.zip`-Paket. Es enthält
mindestens:

```text
manifest.json
5_praktikum.ipynb
test_5_praktikum.py
grader_checks.py        # optional, falls die Tests es benötigen
assets/                 # optional
```

`manifest.json` Version 1:

```json
{
  "version": 1,
  "id": "5_praktikum",
  "notebook": "5_praktikum.ipynb"
}
```

Die `.ipynb` ist die einzige studentische Arbeitsdatei. Aufgabenstellung und
Antwortzellen liegen gemeinsam im Notebook. Die Extension akzeptiert folgende
Cell-Tags:

- `role:prompt` — Aufgaben-/Erklärungstext, nicht ausführbar
- `role:answer` — studentischer Code, wird für Tests extrahiert
- `role:setup` — gemeinsamer Setup-/Importcode, wird vor Antwortcode ausgeführt
- `task:<id>` — Aufgabenzuordnung, z. B. `task:2`
- `part:<id>` — optionale Teilaufgabe, z. B. `part:c`

Mehrere räumlich getrennte `role:answer`-Zellen dürfen dieselben `task`-/`part`-
Tags tragen. Beim Testlauf werden alle `role:setup`- und `role:answer`-Zellen in
Notebook-Reihenfolge in eine generierte `.py` mit demselben Basisnamen geschrieben.
pytest arbeitet auf dieser Datei. Markdown- und ungetaggte Codezellen werden nicht
als Abgabecode ausgeführt.

## Praktikum laden

1. Workspace-Ordner in VS Code öffnen.
2. `Notebook Grader: Praktikum laden` ausführen.
3. Das vom Professor bereitgestellte `.zip` auswählen.
4. Die Extension validiert Paket, Manifest und Notebook und entpackt nach
   `work/<id>/`.
5. Das Notebook wird direkt geöffnet.

Existiert `work/<id>/` bereits, wird die vorhandene Bearbeitung niemals still
überschrieben. Der Student kann stattdessen den vorhandenen Stand öffnen.

## Bauen und starten

```bash
cd extension
npm install
npm run compile
npm run lint
npm test
```

Zum Ausprobieren den Ordner `extension/` in VS Code öffnen und mit **F5** den
Extension Development Host starten. Dort einen Workspace öffnen und ein gültiges
Praktikums-ZIP über `Praktikum laden` auswählen.

## Commands

| Command | Zweck |
|---|---|
| `Notebook Grader: Praktikum laden` | ZIP auswählen, validieren, nach `work/<id>/` entpacken und `.ipynb` öffnen |
| `Notebook Grader: Tests ausführen` | Notebook speichern, getaggten Code extrahieren, `python -m pytest` ausführen |
| `Notebook Grader: Aufgaben-Notebook öffnen` | aktuelle `.ipynb` öffnen |
| `Notebook Grader: Ergebnis abgeben` | letztes Gesamtergebnis an das Backend senden |
| `Notebook Grader: KI-Tipp holen` | extrahierten Antwortcode + letzte Fehlerausgabe an `/hint` senden |

## Einstellungen

| Einstellung | Bedeutung |
|---|---|
| `notebookGrader.backendUrl` | Basis-URL des FH-Backends |
| `notebookGrader.courseToken` | Kurs-Token; nur als Authorization-Header, nie loggen |
| `notebookGrader.pythonPath` | Python-Interpreter für pytest |

## Sicherheit des ZIP-Imports

Der Import akzeptiert normale ZIP-Einträge mit `stored` oder `deflate`. Absolute
Pfade und Einträge, die mit `..` aus dem Zielordner ausbrechen würden, werden
abgewiesen. Ein Paket muss ein Manifest Version 1, das referenzierte `.ipynb` und
mindestens eine `test_*.py` enthalten.

## Backend-Contracts

Der KI-Tutor erhält nicht die Notebook-JSON-Datei, sondern nur den aus
`role:setup` und `role:answer` extrahierten Python-Code. Damit werden Aufgaben-
Markdown, Notebook-Ausgaben und sonstige Metadaten nicht unnötig übertragen.
