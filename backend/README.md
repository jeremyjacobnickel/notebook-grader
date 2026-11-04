# Lokales FastAPI-Backend

Start: `.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8765`
aus dem Projektstamm. Einrichtung und Vorführung: [PROTOTYP.md](../PROTOTYP.md).

- `GET /health`: Erreichbarkeit und ob ein LiteLLM-Key konfiguriert ist.
- `POST /hint`: Bearer-Token prüfen, maximal sechs Anfragen pro Minute,
  Aufgabenbeschreibung + Code + Fehler + Frage an den FH-LiteLLM-Proxy.
  Antwort: `{"hint": "…", "usage": {…}, "sources": [{"title", "pages", "excerpt"}]}`.
  Kein Code wird im Backend ausgeführt.
- `POST /submit`: Konsistente Punktestände in `.local/submissions.sqlite3`
  speichern. Antwort: `{"ok": true, "submission_id": 1}`.

Unterstützt werden alle Praktika, deren Paket unter `tasks/<id>/` liegt
(`manifest.json` + Notebook). Ein Kurs-Token entspricht im lokalen
Prototyp einer Demo-Identität; mehrere Studierende sind noch nicht umgesetzt.

Die `.env` im Projektstamm enthält `COURSE_TOKEN`, `LITELLM_API_KEY`,
`LITELLM_BASE_URL` und `LITELLM_MODEL`, optional `SCRIPT_PDF` (Pfad zum
Vorlesungsskript). Sie wird bei Anfragen frisch gelesen.
Weder Schlüssel noch Code/Dialogsätze werden geloggt oder in SQLite gespeichert.

## Gezielte Tipps und Verbrauch

`POST /hint` benötigt `task` und – falls die Aufgabe Teilaufgaben hat – `part`,
jeweils wie in den Notebook-Tags (`task:3`, `part:c`). Das Backend prüft, dass
im Notebook unter `tasks/<praktikum>/` eine passende `role:answer`-Zelle
existiert, und übernimmt die `role:prompt`-Zellen der Task ohne Part sowie die
des gewählten Parts als Aufgabenstellung. Es werden keine studentischen
Funktionen ausgeführt.

Die Auswahl des Codes erfolgt bereits in der Extension: Sie sendet nur
`role:setup`-Code und die Antwortzellen der Task bis einschließlich des
gewählten Parts. Das Backend leitet diesen Code unverändert weiter. Aus der
pytest-Ausgabe werden nur Fehlerblöcke von Tests mit dem Präfix
`test_<task><part>_` übernommen; globale Collection-Fehler werden ausgelassen.

Die Antwort enthält zusätzlich `usage`: `requested_model`, `reported_model`,
`deployment_id`, `input_tokens`, `output_tokens`, `total_tokens`, `cost_usd`,
`duration_ms`, `context_characters` und `recorded`. Dauer: bis zur Verarbeitung
der LiteLLM-Antwort, ohne lokale Speicherung. Tokens/Kosten stammen aus der
Antwort, fehlende Werte sind `null`, nicht null Dollar. Ein gemeldeter
`default_router` ist kein Beleg für ein konkretes Modell. Die Deployment-ID
kann von der FH einem Modell zugeordnet werden; wir erfinden diese Zuordnung
nicht. Die ausgewiesenen LiteLLM-Kosten sind keine persönliche Rechnung.

## Auszüge aus dem Vorlesungsskript

Ist `SCRIPT_PDF` gesetzt, sucht `/hint` passende Abschnitte im Skript
(`backend/script_index.py`, Hintergrund in `DECISIONS.md`): Die Abschnitte
stammen aus der PDF-Gliederung mit gedruckten Seitenzahlen und liegen in einem
SQLite-FTS5-Index unter `.local/script_index.sqlite3` (Override:
`SCRIPT_INDEX_DB`). Er wird beim ersten Tipp gebaut (einige Sekunden) und neu
gebaut, sobald sich das PDF ändert. Gesucht wird mit Begriffen aus Frage,
Fehlerausgabe, Code und Aufgabenstellung; höchstens drei Abschnitte mit
zusammen ≤ 6000 Zeichen gehen mit Kapitel und Seite an FH-LiteLLM. Die Antwort
enthält sie als `sources` (Titel der letzten zwei Gliederungsebenen, Seiten,
die ersten 200 Zeichen, `pdf_page` = 1-basierte PDF-Seite des Abschnitts,
`heading` = Überschrift). Ohne `SCRIPT_PDF` oder bei Lesefehlern ist `sources`
leer und der Tipp entsteht wie bisher. `usage.context_characters.script_sent`
zeigt, wie viel Skripttext mitging.

Suche ohne KI ausprobieren bzw. Index vorab bauen:
`.venv/bin/python -m backend.script_index "Wie funktioniert meshgrid?"`

Das Skript gehört dem Professor und wird nie committet.

## Verbrauchsprotokoll

Erfolgreiche, lesbare Antworten werden unter `.local/hint_usage.sqlite3`
(Tabelle `hint_usage`) protokolliert. Optionaler Override: `HINT_USAGE_DB`.
Gespeichert werden Zeit, Teilaufgaben-ID und Verbrauchsmetadaten, keine
Schlüssel, Code, Fragen oder Antworten. Fehlgeschlagene Upstream-Aufrufe
werden derzeit nicht bilanziert; das Protokoll ist somit kein vollständiges
Abrechnungsbuch. Speicherfehler verwerfen keinen fertigen Tipp und erscheinen
in der Verbrauchsanzeige. In der Extension stehen die Angaben unter dem Tipp
im aufklappbaren Bereich „KI-Verbrauch“.
