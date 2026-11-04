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
conftest.py             # Kopie von grader/praktikum_conftest.py
peppers.tiff            # optional: Dateien, die Aufgaben laden
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
Tags tragen. Beim Testlauf speichert die Extension das Notebook und startet
pytest im Praktikumsordner; die `conftest.py` des Pakets liest das Notebook
direkt und führt pro Test nur Setup und die Zellen der zugehörigen Aufgabe aus.
Es wird keine `.py` erzeugt. Ungetaggte Codezellen gelten als Antwort der
Aufgabe darüber; Markdown- und Zellen mit anderen Rollen werden nicht ausgeführt.

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
| `Notebook Grader: Jetzt sichern` | aktuellen Stand sofort committen und auf GitLab übertragen (auch Knopf im Autosave-Verlauf und Klick auf die Statusleiste) |
| `Notebook Grader: Autosave einrichten` | Einstellungen für Repo-URL und Intervall öffnen |
| `Notebook Grader: Autosave-Verlauf aktualisieren` | Verlauf in der Seitenleiste neu laden |
| `Notebook Grader: GitLab-Token eintragen` | Personal Access Token im SecretStorage von VS Code speichern |
| `Notebook Grader: GitLab-Token entfernen` | gespeichertes Token löschen; danach wird nur lokal gesichert |

## Einstellungen

| Einstellung | Bedeutung |
|---|---|
| `notebookGrader.backendUrl` | Basis-URL des FH-Backends |
| `notebookGrader.courseToken` | Kurs-Token; nur als Authorization-Header, nie loggen |
| `notebookGrader.pythonPath` | Python-Interpreter für pytest |
| `notebookGrader.autosave.repositoryUrl` | HTTPS-URL des eigenen GitLab-Repos; leer = Autosave aus |
| `notebookGrader.autosave.intervalMinutes` | Abstand der automatischen Sicherungen (Standard 5 Minuten) |

## Autosave (Prototyp)

Der Autosave legt einen nachvollziehbaren Arbeitsverlauf im privaten
GitLab-Repo des Studenten an. Er dient der Datensicherung und als
Gesprächsgrundlage, nicht der Bewertung (Hintergrund in `DECISIONS.md`).

Einrichten:

1. In GitLab ein leeres, privates Repo anlegen.
2. Unter *Einstellungen → Access Tokens* ein Personal Access Token mit dem
   Scope `write_repository` und Ablaufdatum erstellen.
3. `notebookGrader.autosave.repositoryUrl` auf die HTTPS-URL des Repos setzen,
   z. B. `https://gitlab.com/name/praktika.git`.
4. `Notebook Grader: GitLab-Token eintragen` ausführen und das Token einfügen.

Gesichert wird beim Laden eines Praktikums (Ausgangsstand), alle
`intervalMinutes` Minuten bei Änderungen, nach jedem Testlauf und nach jeder
Abgabe (zusätzlich Tag `abgabe/<id>/<Zeitstempel>`). Ein ungespeichertes
Notebook wird vorher gespeichert. Im Repo liegt pro Praktikum
`<id>/<notebook>.ipynb` ohne Ausgaben und Ausführungszähler; die Trailer
`Praktikum`, `Anlass`, `Tests` und `Teilaufgabe` in den Commit-Nachrichten sind
für eine spätere Auswertung gedacht.

Die Ansicht **Autosave-Verlauf** im Explorer listet die Snapshots des aktuellen
Praktikums (Uhrzeit, Anlass, Testergebnis, „nur lokal“, solange noch nicht
übertragen). Ein Klick zeigt die Änderungen dieses Schritts im Notebook-Diff,
das Kontextmenü vergleicht einen Stand mit dem aktuellen Notebook oder stellt
ihn wieder her. Der Speichern-Knopf in der Titelleiste sichert sofort,
„Aktualisieren“ holt zusätzlich Stände anderer Geräte von GitLab.

**Auf einem anderen Gerät weiterarbeiten:** Autosave dort mit derselben
Repo-URL und einem Token einrichten, dann das Praktikums-ZIP laden. Gibt es auf
GitLab schon einen bearbeiteten Stand, fragt die Extension vor dem Öffnen, ob
er übernommen werden soll. War das Praktikum auf dem Gerät schon geladen:
Verlauf aktualisieren und per Rechtsklick „Diesen Stand wiederherstellen“.
Wiederherstellen sichert den aktuellen Stand immer zuerst und protokolliert
die Übernahme als eigenen Schritt. Ausgaben sind nicht gesichert; die Zellen
danach neu ausführen. Frühere Stände werden über
das schreibgeschützte Schema `notebook-grader-autosave:` geöffnet; die
Zeitachse von VS Code kann sie nicht anzeigen, weil deren Schnittstelle für
Extensions nicht freigegeben ist.

Das Autosave-Repo ist ein eigener Klon im globalen Speicher der Extension, nicht
im Workspace. Ohne Netz oder Token wird lokal committet und beim nächsten Anlass
übertragen. Arbeiten zwei Geräte parallel, wird der GitLab-Stand per Merge
übernommen (bei Konflikten gewinnt der lokale Stand), nie per Force-Push. Die
Statusleiste zeigt den letzten Stand; Details stehen im Ausgabekanal
„Notebook Grader – Autosave“. Benötigt Git ≥ 2.31.

## Sicherheit des ZIP-Imports

Der Import akzeptiert normale ZIP-Einträge mit `stored` oder `deflate`. Absolute
Pfade und Einträge, die mit `..` aus dem Zielordner ausbrechen würden, werden
abgewiesen. Ein Paket muss ein Manifest Version 1, das referenzierte `.ipynb` und
mindestens eine `test_*.py` enthalten.

## Backend-Contracts

Aufgaben und Teilaufgaben für „Teilaufgabe prüfen“ und „KI-Tipp holen“ stammen
aus den `task`-/`part`-Tags des Notebooks (`src/notebook.ts`); Testnamen folgen
`test_<task><part>_…` (siehe `WORKFLOW.md`).

`POST /hint` erhält `praktikum`, `task`, `part`, `question`, `traceback` und `code`.
`code` enthält nicht die Notebook-JSON-Datei, sondern nur `role:setup`-Code und
die Antwortzellen der gewählten Task bis einschließlich der gewählten
Teilaufgabe. Aufgaben-Markdown, Notebook-Ausgaben, andere Tasks und sonstige
Metadaten werden nicht übertragen.
