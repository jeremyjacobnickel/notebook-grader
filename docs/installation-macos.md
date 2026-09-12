# Installation auf macOS (aktuelle Version, aus dem Quellcode)

Schritt-für-Schritt-Anleitung, um die VS-Code-Extension auf einem
frischen Mac zu installieren. Es gibt noch keine fertige `.vsix`-Datei
zum Download, deshalb wird sie einmalig selbst gebaut (Schritte 1–5).
Sobald eine fertige `.vsix` verteilt wird, brauchen Studierende nur
noch die Schritte 1, 2 und 6.

## 1. Visual Studio Code installieren

1. https://code.visualstudio.com öffnen → **Download for macOS**.
2. Die heruntergeladene ZIP-Datei entpacken und **Visual Studio Code**
   in den Ordner **Programme** ziehen.
3. Einmal starten (Rechtsklick → Öffnen, falls macOS nachfragt).

## 2. Python installieren

1. https://www.python.org/downloads/ → **Download Python 3.x** (macOS-Installer).
2. Installer durchklicken.
3. **Terminal** öffnen (Programme → Dienstprogramme → Terminal) und
   die Test-Werkzeuge installieren:

   ```bash
   python3 -m pip install pytest numpy
   ```

   (Die Extension findet sowohl `python` als auch `python3` automatisch.)

## 3. Git und Node.js installieren (nur zum Bauen nötig)

1. Git: im Terminal `git --version` eingeben — macOS bietet bei Bedarf
   automatisch die Installation der „Command Line Tools" an. Bestätigen.
2. Node.js: https://nodejs.org → **LTS**-Version (macOS-Installer, `.pkg`)
   herunterladen und durchklicken.

## 4. Projekt holen und Extension bauen

Im Terminal:

```bash
git clone https://github.com/jeremyjacobnickel/notebook-grader.git
cd notebook-grader/extension
npm install
npm run compile
npx @vscode/vsce package
```

Der letzte Befehl fragt ggf. ein-, zweimal nach (mit `y` bestätigen)
und erzeugt die Datei **`notebook-grader-<version>.vsix`** (aktuell
`notebook-grader-0.2.0.vsix`) — sie liegt im Ordner
`notebook-grader/extension/` (im Terminal zeigt `open .` den Ordner
im Finder).

## 5. Extension in VS Code installieren

1. VS Code öffnen → Extensions-Ansicht (`Cmd+Shift+X`).
2. Oben rechts auf das **„…"-Menü** → **„Install from VSIX…"**.
3. Die erzeugte `.vsix`-Datei auswählen.

## 6. Einrichten und ausprobieren

1. Einen Ordner in VS Code öffnen (File → Open Folder), der einen
   `tasks/`-Ordner mit Praktika enthält — zum Ausprobieren eignet sich
   `notebook-grader/extension/fixtures` aus dem geklonten Projekt.
   (Alternativ in den Einstellungen `Cmd+,` → nach `notebookGrader`
   suchen → **Tasks Source** auf einen beliebigen Aufgaben-Ordner zeigen.)
2. `Cmd+Shift+P` → **„Notebook Grader: Praktikum laden"** → Praktikum wählen.
3. Aufgabe lösen, dann `Cmd+Shift+P` → **„Notebook Grader: Tests ausführen"**.
4. Punktestand erscheint in der Sidebar (🎓-Symbol in der linken
   Aktivitätsleiste) und unten in der Statusleiste — inklusive der
   Liste **„Woran es hakt"** bei fehlgeschlagenen Tests.

„Ergebnis abgeben" und „KI-Tipp holen" brauchen das FH-Backend
(Einstellungen `backendUrl` + `courseToken`); solange es nicht läuft,
zeigen diese Befehle eine freundliche Fehlermeldung.

## Aktualisieren, wenn sich im Repo etwas geändert hat

Die Extension holt sich Änderungen **nicht** von allein — sie ist eine
lokal installierte Datei. Nach neuen Commits auf `main` sind es diese
vier Schritte:

```bash
cd notebook-grader
git checkout main
git pull                      # neue Änderungen holen
cd extension
npm install                   # nur nötig, wenn sich Abhängigkeiten geändert haben
npm run compile
npx @vscode/vsce package      # erzeugt die neue .vsix
```

Dann in VS Code: **Extensions → „…"-Menü → „Install from VSIX…"** und die
neue Datei auswählen. VS Code ersetzt die alte Fassung und fragt nach
einem Neustart des Fensters.

**Gute Gewohnheit:** Vor `git pull` prüfen, ob eigene Änderungen im
Projektordner liegen (`git status`) — sonst kann der Pull abbrechen.
Die Aufgaben, an denen du arbeitest, liegen im `work/`-Ordner deines
Workspace und werden von einem Update **nicht** angefasst.

**Wenn die Versionsnummer gleich geblieben ist** (z. B. zweimal `0.2.0`),
erkennt VS Code die neue Datei manchmal nicht als Änderung. Dann erst
deinstallieren, danach neu installieren:

```bash
code --uninstall-extension fh-muenster.notebook-grader
```

## Häufige Probleme

| Problem | Lösung |
|---|---|
| „Python wurde nicht gefunden" | Schritt 2 wiederholen; danach VS Code neu starten. |
| „pytest konnte nicht ausgeführt werden" | `python3 -m pip install pytest` im Terminal ausführen. |
| `npm` oder `git` unbekannt | Schritt 3 (Node.js bzw. Command Line Tools) fehlt. |
| VS Code lässt sich nicht öffnen („nicht verifiziert") | Rechtsklick auf die App → **Öffnen** → bestätigen. |
