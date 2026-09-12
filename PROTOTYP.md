# Praktikum 5 – lokaler Prototyp

Die Extension lädt Python-Aufgaben, prüft 19 Kriterien und holt auf Wunsch
einen gezielten Tutor-Hinweis über FH-LiteLLM. Abgaben werden lokal in SQLite
gespeichert. Das gelieferte Notebook bleibt unverändert.

## Start auf diesem Mac

Im Projektordner `/Users/Jeremy/Programmieren/notebook-grader`:

```sh
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8765
```

Dann in `extension/` einmal `npm run compile` ausführen und VS Code starten:

```sh
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
  --extensionDevelopmentPath=/Users/Jeremy/Programmieren/notebook-grader/extension \
  /Users/Jeremy/Programmieren/notebook-grader-demo
```

Falls VS Code einen bestehenden Entwicklungshost wiederverwendet: dort über
**Datei → Ordner öffnen** den Ordner `notebook-grader-demo` wählen.

Die persönliche Lösung aus dem Notebook liegt nur in diesem separaten
Demo-Ordner. Dort sind Backend-URL, lokales Kurs-Token und Python-Interpreter
bereits eingestellt. Das Kurs-Token ist kein LiteLLM-Schlüssel.

## Ablauf

1. Im Explorer den Abschnitt **Notebook Grader** aufklappen.
2. **Praktikum laden → 5_praktikum**. Bestehende Bearbeitungen werden wieder
   geöffnet und nicht überschrieben.
3. **Aufgaben öffnen** zeigt die ursprünglichen Aufgabenstellungen.
4. **Tests ausführen** zeigt einzelne Prüfungen und den Gesamtstand. Unter
   **Testdetails** steht die vollständige begrenzte pytest-Ausgabe.
5. **KI-Tipp holen**: Teilaufgabe und Frage wählen. Der Code, die Frage,
   Aufgabenbeschreibung und aktuelle Fehlerausgabe gehen über das lokale
   Backend an FH-LiteLLM. Der Schlüssel bleibt im Backend.
6. **Ergebnis abgeben** speichert das aktuelle Resultat lokal. Änderungen
   am Code erfordern einen neuen Testlauf.

Für einen frischen Versuch einen neuen, leeren Arbeitsordner öffnen und
die Einstellungen `notebookGrader.tasksSource`, `backendUrl`, `courseToken`
und `pythonPath` entsprechend der Demo setzen. **Praktikum laden** kopiert
dann den unbearbeiteten Starter aus `tasks/5_praktikum/`.

## Zugang und Installation

`.env` im Projektstamm enthält `LITELLM_API_KEY`, `LITELLM_BASE_URL`,
`LITELLM_MODEL` und `COURSE_TOKEN`. Sie ist versteckt und von Git ausgeschlossen.
Die Datei wird pro Backend-Anfrage neu gelesen. Den persönlichen Key nicht
in die Extension oder ein Git-Repository übernehmen.

FH-VPN bzw. FH-Netz ist für LiteLLM erforderlich. Der Dienst nutzt
`https://litellm.fh-muenster.de/v1/chat/completions`, standardmäßig mit
`default_router`. Ein fehlender Key oder Netzwerkfehler wird ausdrücklich
gemeldet; es gibt keine vorgetäuschten KI-Antworten.

Für die getestete Umgebung: Python 3.14, `python3 -m venv .venv`, dann
`.venv/bin/python -m pip install -r requirements-lock.txt`. Für andere Python-Versionen ab 3.10 passende Versionen über `requirements.txt` auflösen. Für die Extension
Node und `npm ci` in `extension/` verwenden.

## Prüfungen

- `.venv/bin/python -m pytest`: Backend-Regressionstests mit simuliertem LiteLLM.
- `npm test` und `npm run lint` in `extension/`: Build, Bewertungs-/Parser-/Dateischutztests und Linting.
- `.venv/bin/python -m pytest /pfad/zum/geladenen/5_praktikum -q`: echte Aufgabenprüfung.
- Der unbearbeitete Starter soll durchfallen; er gehört nicht zur grünen Projekt-Testsuite.

Jeder der 19 Tests zählt einen Punkt. 16 bestandene Prüfungen reichen aus.
Strukturprüfungen ergänzen Verhaltenstests (iterativ/rekursiv, Verwendung
der Echo-Hilfsfunktionen, insert/append und verschachtelte Schleifen).
Sie prüfen typische direkte Implementierungen, keine vollständige
semantische Gleichwertigkeit. Beispiel-Prints und das Sortieren leerer
Listen werden nicht bewertet, da der vorgegebene Algorithmus das erste
Listenelement voraussetzt.

## Grenzen

Lokaler Einpersonen-Prototyp, kein FH-Produktivsystem. Ein Token steht für
eine lokale Demo-Identität. Vor dem Kursbetrieb fehlen individuelle Konten,
eine mit dem Professor abgestimmte Punkteverteilung, sichere zentrale
Aufgabenverteilung und ein Betriebs-/Datenschutzkonzept.

Abgaben liegen in `.local/submissions.sqlite3` (Token-Hash, Aufgabe, Punkte,
Status, Zeitpunkt). Code und KI-Dialoge werden nicht gespeichert. Lokale
Testergebnisse werden wie geplant vertraut. KI-Hinweise können fehlerhaft
sein; der sokratische Prompt ist keine Garantie gegen vollständige Lösungen.

Quellen: [FH-LiteLLM-Anleitung](https://confluence.fh-muenster.de/spaces/howto/pages/235922533/LiteLLM),
[LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/user_keys).


## Verifikation am 12.09.2026

- Build und Linting erfolgreich; 11 Extension- und 11 Backend-Regressionstests bestanden.
- Persönliche Notebook-Lösung in separater Demo: 19/19 Prüfungen bestanden, auch über den Extension-Button.
- Unbearbeiteter Starter: 19/19 Prüfungen fehlgeschlagen (erwartet).
- Absichtlich falscher Rekursionsschritt: genau der passende Verhaltenstest fehlgeschlagen, 18/19 bestanden.
- Echter FH-LiteLLM-Aufruf über die Extension erfolgreich; Antwort in der Sidebar angezeigt.
- Lokale Abgabe über den Extension-Button bestätigt und in SQLite nachgeprüft.
