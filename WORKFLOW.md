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

### Setup und Imports

Über der ersten Aufgabe steht eine `role:setup`-Codezelle. Wer das Praktikum vorbereitet (Mensch oder KI), ergänzt dort selbstständig alle Imports, die Aufgaben und Tests benötigen (z. B. `import numpy as np`). Ausnahme: Fordert die Aufgabenstellung ausdrücklich, dass Studierende einen Import selbst schreiben, gehört dieser Import in die Antwortzelle der Aufgabe und nicht ins Setup.

### Ungetaggte Codezellen

Im ausgelieferten Notebook trägt jede Codezelle ein `role`-Tag. Codezellen ohne `role`-Tag hat daher der Student eingefügt. Sie gelten als `role:answer` der nächsten darüberliegenden Zelle mit `task`-Tag (samt deren `part`) — so werden z. B. Hilfsfunktionen in einer eigenen Zelle getestet und im KI-Tipp berücksichtigt. Ungetaggte Codezellen vor der ersten Aufgabe werden ignoriert.

`task`- und `part`-Werte bestehen nur aus Buchstaben und Ziffern (z. B. `task:2`, `part:c`). Jede `role:answer`-Zelle trägt ein `task`-Tag. Die zugehörige `role:prompt`-Zelle mit denselben `task`-/`part`-Tags beginnt mit einer Überschrift; sie erscheint als Titel in der Aufgabenauswahl der Extension.

Die Extension liest Aufgaben und Teilaufgaben ausschließlich aus diesen Tags. Es gibt keine praktikumsspezifischen Listen im Code von Extension oder Backend.

## 2. Paketformat

Der Professor verteilt ein ZIP mit folgender Mindeststruktur:

```text
manifest.json
<praktikum>.ipynb
test_<praktikum>.py
conftest.py
```

Optional:

```text
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
- `conftest.py` ist eine unveränderte Kopie von `grader/praktikum_conftest.py`.
- Musterlösungen werden niemals ausgeliefert oder committed.
- Assets gehören in das Paket, wenn das Notebook sie benötigt.

## 3. Studentischer Ablauf

1. Student öffnet einen Workspace in VS Code.
2. `Notebook Grader: Praktikum laden` auswählen.
3. Das vom Professor erhaltene ZIP auswählen.
4. Die Extension validiert und entpackt nach `work/<id>/`.
5. Die `.ipynb` wird geöffnet.
6. Student bearbeitet ausschließlich `role:answer`-Zellen.
7. `Tests ausführen` speichert das Notebook und startet pytest im Praktikumsordner.
8. Die `conftest.py` des Pakets liest das Notebook direkt; es entsteht keine `.py`-Datei.
9. Für einen KI-Tipp wählt der Student eine Aufgabe/Teilaufgabe aus den Tags. Übertragen werden nur `role:setup`-Code und die Antwortzellen dieser Task bis einschließlich der gewählten Teilaufgabe (Reihenfolge des ersten Auftretens der Parts). Die Aufgabenstellung liest das Backend aus den `role:prompt`-Zellen seiner eigenen Kopie des Pakets unter `tasks/<id>/`.

Ein vorhandenes `work/<id>/` wird beim erneuten Laden niemals still überschrieben.

## 4. Unit-Tests

Testfunktionen heißen `test_<task><part>_<beschreibung>`, z. B. `test_2c_submatrix_function` für `task:2`, `part:c` oder `test_4_sort_values` für `task:4` ohne Part. Über dieses Präfix ordnet die Extension Ergebnisse den Teilaufgaben zu (Einzelprüfung, Fortschrittsanzeige) und das Backend Testfehler einem KI-Tipp. Hat eine Task Parts, wird pro Part getestet.

Tests prüfen fachliches Verhalten und, wo die Aufgabenstellung eine konkrete Implementierungsart fordert, zusätzlich Struktur per AST. Mehrere Eingabefälle innerhalb einer Testfunktion zählen weiterhin als ein Bewertungskriterium.

Die Tests dürfen nicht darauf angewiesen sein, dass alle anderen Aufgaben korrekt oder überhaupt bearbeitet sind. Das stellt die `conftest.py` sicher:

- Jeder Test gehört über sein Präfix zu genau einer Task/Part; passt kein Präfix, schlägt der Test mit einer klaren Meldung fehl.
- Geparst werden nur die `role:setup`-Zellen und die Antwortzellen dieser Task bis einschließlich des Parts (Parts in der Reihenfolge ihres ersten Auftretens). Jede Zelle wird einzeln geparst; ein Syntaxfehler betrifft nur Tests, die diese Zelle laden, und nennt die Notebook-Zellennummer. IPython-Zeilen mit `%` oder `!` werden ignoriert.
- `role:setup` wird vollständig ausgeführt. Von den Antwortzellen werden nur die Definitionen der geforderten Namen und ihre Abhängigkeiten ausgeführt; Beispielaufrufe wie `print(...)` in Antwortzellen laufen nicht mit.

Test-API (ohne Import nutzbar, stammt aus `conftest.py`):

```python
@pytest.mark.requires("submatrix")          # Name fehlt -> MISSING, Platzhalter -> OPEN (beides "offen")
def test_2c_submatrix_function(solution):   # solution: Namensraum nach Ausführung
    assert solution["submatrix"](...) ...

@pytest.mark.requires("det_laplace")
def test_2d_recursion(definitions):          # definitions: Name -> AST-Knoten, für Strukturprüfungen
    node = definitions["det_laplace"]
```

Platzhalter sind unveränderte Starter: Funktionen nur mit `pass`, `...`, `return None` oder `raise NotImplementedError`, sowie Zuweisungen `= None`. Ohne `requires` werden alle Anweisungen der ausgewählten Antwortzellen ausgeführt.

## 5. Vorbereitung eines neuen Praktikums

Vor Veröffentlichung:

- [ ] Notebook öffnet ohne Fehler.
- [ ] Jede Aufgaben-/Antwortzelle hat gültige Rollen-Tags.
- [ ] `task`/`part`-Tags sind konsistent und bestehen nur aus Buchstaben/Ziffern.
- [ ] Jede Testfunktion beginnt mit `test_<task><part>_` einer vorhandenen Antwortzelle.
- [ ] Setup-/Importcode steht in einer `role:setup`-Zelle über der ersten Aufgabe; alle nötigen Imports sind ergänzt (außer die Aufgabe fordert den Import vom Studenten).
- [ ] Jede Codezelle trägt ein `role`-Tag.
- [ ] `conftest.py` ist eine Kopie von `grader/praktikum_conftest.py`; jeder Test nutzt `requires` für die geforderten Namen.
- [ ] Unit-Tests laufen gegen eine Referenzlösung vollständig grün.
- [ ] Offenes Starter-Notebook wird sinnvoll als offen/fehlend erkannt.
- [ ] ZIP enthält Manifest, Notebook, Tests und alle benötigten Assets.
- [ ] Kein Token, keine Musterlösung und keine realen Studentendaten enthalten.
- [ ] Paket kann über `Praktikum laden` importiert werden.

## 6. Änderungen am Format

Änderungen an Cell-Tags, Manifest oder ZIP-Struktur sind Architekturänderungen. Sie müssen vor Implementierung in `DECISIONS.md` dokumentiert und anschließend hier sowie in `extension/README.md` nachgezogen werden.
