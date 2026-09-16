# Praktikums-Workflow

Diese Datei ist die operative Quelle für die Vorbereitung und Auslieferung von Praktika.

## 1. Kanonisches Aufgabenformat

Ein Praktikum wird als **Jupyter-Notebook (`.ipynb`)** erstellt. Aufgabenstellung und studentische Antwortzellen liegen gemeinsam in dieser Datei. Eine separate `.md`-Aufgabenbeschreibung oder studentisch bearbeitete `.py` ist nicht Teil des Zielworkflows.

### Cell-Tags

Die Zuordnung erfolgt ausschließlich über `metadata.tags`:

- `role:prompt` — Markdown-Zelle mit Aufgabenstellung/Erklärung
- `role:answer` — Codezelle, die der Student bearbeitet und die getestet wird
- `role:setup` — gemeinsamer Setup-/Importcode
- `task:<id>` — Aufgabe, z. B. `task:2`
- `part:<id>` — optionale Teilaufgabe, z. B. `part:c`

Beispiel:

```json
"tags": ["role:answer", "task:2", "part:c"]
```

Eine Task kann mehrere Parts besitzen. Parts dürfen räumlich getrennt sein. Mehrere Zellen dürfen dieselben `task`-/`part`-Tags tragen; ihre Reihenfolge im Notebook bleibt maßgeblich.

Aufgaben gelten als atomar. Tests einer Task dürfen keinen studentischen Zustand aus vorherigen Tasks voraussetzen. `role:setup` ist davon ausgenommen und darf gemeinsam benötigte Imports/Setup bereitstellen.

## 2. Paketformat

Der Professor verteilt ein ZIP mit folgender Mindeststruktur:

```text
manifest.json
<praktikum>.ipynb
test_<praktikum>.py
```

Optional:

```text
grader_checks.py
assets/
```

`manifest.json` Version 1:

```json
{
  "version": 1,
  "id": "5_praktikum",
  "notebook": "5_praktikum.ipynb"
}
```

Regeln:

- `manifest.json` liegt im ZIP-Root.
- `id` enthält nur Buchstaben, Zahlen, `_` und `-`.
- `notebook` verweist auf genau die studentische `.ipynb`.
- Mindestens eine `test_*.py` liegt im Paket.
- Musterlösungen werden niemals ausgeliefert oder committed.
- Assets gehören in das Paket, wenn das Notebook sie benötigt.

## 3. Studentischer Ablauf

1. Student öffnet einen Workspace in VS Code.
2. `Notebook Grader: Praktikum laden` auswählen.
3. Das vom Professor erhaltene ZIP auswählen.
4. Die Extension validiert und entpackt nach `work/<id>/`.
5. Die `.ipynb` wird geöffnet.
6. Student bearbeitet ausschließlich `role:answer`-Zellen.
7. `Tests ausführen` speichert das Notebook, extrahiert `role:setup` + `role:answer` in Notebook-Reihenfolge und erzeugt `<notebook>.py` als Laufzeit-Artefakt.
8. pytest läuft lokal gegen diese generierte Datei.

Ein vorhandenes `work/<id>/` wird beim erneuten Laden niemals still überschrieben.

## 4. Unit-Tests

Tests prüfen fachliches Verhalten und, wo die Aufgabenstellung eine konkrete Implementierungsart fordert, zusätzlich Struktur per AST. Mehrere Eingabefälle innerhalb einer Testfunktion zählen weiterhin als ein Bewertungskriterium.

Die Tests dürfen nicht darauf angewiesen sein, dass alle anderen Aufgaben korrekt oder überhaupt bearbeitet sind. Für Teilaufgaben dürfen nur benötigte Definitionen und ihre Task-internen Abhängigkeiten ausgeführt werden.

## 5. Vorbereitung eines neuen Praktikums

Vor Veröffentlichung:

- [ ] Notebook öffnet ohne Fehler.
- [ ] Jede Aufgaben-/Antwortzelle hat gültige Rollen-Tags.
- [ ] `task`/`part`-Tags sind konsistent.
- [ ] Setup-/Importcode ist als `role:setup` markiert.
- [ ] Unit-Tests laufen gegen eine Referenzlösung vollständig grün.
- [ ] Offenes Starter-Notebook wird sinnvoll als offen/fehlend erkannt.
- [ ] ZIP enthält Manifest, Notebook, Tests und alle benötigten Assets.
- [ ] Kein Token, keine Musterlösung und keine realen Studentendaten enthalten.
- [ ] Paket kann über `Praktikum laden` importiert werden.

## 6. Änderungen am Format

Änderungen an Cell-Tags, Manifest oder ZIP-Struktur sind Architekturänderungen. Sie müssen vor Implementierung in `DECISIONS.md` dokumentiert und anschließend hier sowie in `extension/README.md` nachgezogen werden.
