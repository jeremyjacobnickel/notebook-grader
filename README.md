# Notebook Grader / Praktikumsbegleiter

VS-Code-Extension plus lokales/FH-FastAPI-Backend für Programmierpraktika an der FH Münster. Studierende bearbeiten ein Jupyter-Notebook lokal, führen bereitgestellte pytest-Tests aus, können gezielte KI-Tipps anfordern und geben später über den vorgesehenen GitLab-Workflow ab.

> Der Repository-Name `notebook-grader` ist historisch. Architekturentscheidungen stehen in `DECISIONS.md`, der operative Praktikumsworkflow in `WORKFLOW.md`.

## Kanonischer Studenten-Workflow

1. Der Professor stellt ein Praktikum als `.zip` bereit.
2. Der Student öffnet einen Workspace in VS Code.
3. **Praktikum laden** öffnet eine Dateiauswahl; der Student wählt das erhaltene ZIP.
4. Die Extension validiert das Paket und entpackt es nach `work/<id>/`.
5. Das enthaltene `.ipynb` wird direkt geöffnet.
6. Aufgabenstellung und Antwortzellen befinden sich gemeinsam im Notebook.
7. **Tests ausführen** speichert das Notebook, extrahiert getaggte Codezellen und führt die mitgelieferten pytest-Tests lokal aus.
8. Optional kann der Student einen sokratischen KI-Tipp anfordern.
9. Der spätere Abgabe-Workflow wird über ein lokales Git-Repository und GitLab realisiert (siehe ROADMAP/Issues).

## Aufgabenformat: Jupyter Notebook

`.ipynb` ist das einzige kanonische studentische Aufgabenformat. Eine separate `.md`-Aufgabenstellung und eine manuell bearbeitete `.py` sind nicht Teil des Zielworkflows.

### Cell-Tags

Notebook-Zellen werden über `metadata.tags` klassifiziert:

- `role:prompt` — Aufgabenstellung/Erklärung
- `role:answer` — studentisch bearbeiteter Code
- `role:setup` — gemeinsamer Setup-/Importcode
- `task:<id>` — Aufgabe, z. B. `task:2`
- `part:<id>` — optionale Teilaufgabe, z. B. `part:c`

Beispiel:

```json
"tags": ["role:answer", "task:2", "part:c"]
```

Mehrere Zellen dürfen zu derselben Task/Part gehören und räumlich getrennt sein. Die Notebook-Reihenfolge bleibt erhalten. Aufgaben gelten als atomar: Tests dürfen keinen studentischen Zustand aus vorherigen Tasks voraussetzen. Gemeinsamer `role:setup`-Code ist davon ausgenommen.

## ZIP-Paket

Mindeststruktur:

```text
manifest.json
5_praktikum.ipynb
test_5_praktikum.py
```

Optional:

```text
grader_checks.py
assets/
```

Manifest Version 1:

```json
{
  "version": 1,
  "id": "5_praktikum",
  "notebook": "5_praktikum.ipynb"
}
```

Die Extension weist ungültige Paketversionen, fehlende Pflichtdateien und ZIP-Pfade außerhalb des Zielordners zurück. Existierende Bearbeitungen werden beim erneuten Laden nicht überschrieben.

## Testausführung

Vor pytest erzeugt die Extension aus allen `role:setup`- und `role:answer`-Codezellen in Notebook-Reihenfolge eine `.py` mit demselben Basisnamen wie das Notebook. Diese Datei ist ein Laufzeit-Artefakt; der Student arbeitet ausschließlich im Notebook.

Die bestehenden Tests können dadurch weiterhin normale Python-Module und AST-Strukturprüfungen verwenden. Teilaufgaben sollen isoliert testbar bleiben; unfertige andere Aufgaben dürfen den Test nicht blockieren.

Bestehensmodell des aktuellen Prototyps: **mindestens 80 % der Tests bestanden**. Jeder pytest-Test entspricht einem Bewertungskriterium; mehrere Eingabefälle können innerhalb eines Tests geprüft werden, ohne dadurch stärker gewichtet zu werden.

## Komponenten

### `extension/`

TypeScript, VS Code API.

- ZIP auswählen und importieren
- Notebook öffnen
- getaggten Code extrahieren
- pytest lokal starten
- Score/Fehler anzeigen
- KI-Tipps über das Backend anfordern
- Ergebnis an Backend senden

### `backend/`

FastAPI-Prototyp mit `/submit` und `/hint`. Der KI-Tutor erhält nur den extrahierten Python-Code und die relevante Testausgabe, nicht die vollständige Notebook-JSON-Datei.

### `grader/`

Historische und vorbereitende Notebook-/Testwerkzeuge. Die vorhandene Exporter-Logik stammt aus der früheren `.py`-Zwischenarchitektur und darf nicht mehr als kanonischer Studentenworkflow behandelt werden. Bei Weiterentwicklung ist sie auf das in `WORKFLOW.md` beschriebene Notebook-/ZIP-Format auszurichten oder als Legacy-Werkzeug zu markieren.

### `tasks/`

Praktikums-/Testmaterial für Entwicklung und Verifikation. Neue Praktika müssen dem Notebook-/Manifest-Vertrag entsprechen.

## Entwicklung

Python:

```bash
pytest tests/
```

Extension:

```bash
cd extension
npm ci
npm run lint
npm test
```

Änderungen auf Feature-Branches, nicht direkt auf `main`. Neue Dependencies nur mit dokumentierter Begründung in `DECISIONS.md`.

## Projektkonventionen

- Code und Identifier auf Englisch; Kommentare dürfen Deutsch sein.
- Ein Modul = eine klare Verantwortung.
- Standardbibliothek bevorzugen.
- Einfache, explizite Implementierungen statt unnötiger Abstraktionen.
- Anforderungen und Formatänderungen im Repository dokumentieren, nicht nur in Chats.

## Dateien/Daten, die nie committed werden dürfen

- `.env`
- echte Tokens/Secrets
- reale Studentendaten oder Abgaben
- Musterlösungs-Notebooks des Professors

Das Aufgaben-Notebook im verteilten Paket enthält nur Aufgabenstellung, Setup und leere/Starter-Antwortzellen.

## KI-Tutor

Der Tutor soll gezielt helfen, aber keine fertigen Lösungen liefern. Die sokratische Systemanweisung wird serverseitig erzwungen. Für `/hint` werden nur die benötigten studentischen Codeanteile übertragen. Datenschutz und zulässige Speicherung von KI-Metadaten müssen vor Produktivbetrieb abschließend geklärt werden.

## GitLab / Abgabe

Geplant ist ein lokales Git-Repository pro Praktikumsbearbeitung mit regelmäßigen Auto-Commits. Eine verbindliche Abgabe erfolgt später explizit per Push auf ein konfiguriertes GitLab-Ziel. Tool-Quellcode und studentische Abgabe-Repositories bleiben strikt getrennt. Details werden in den entsprechenden GitHub-Issues umgesetzt.

## Frühere Architektur

Der frühere LTI/ILIAS-Webserver-Ansatz bleibt unter `docs/alternatives/` dokumentiert. Ebenso können ältere `.py`-Exporter-Beispiele zu Regressions-/Historienzwecken erhalten bleiben; sie sind jedoch nicht mehr der aktuelle Studentenworkflow.
