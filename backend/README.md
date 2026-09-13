# Lokales FastAPI-Backend

Start: `.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8765`
aus dem Projektstamm. Einrichtung und Vorführung: [PROTOTYP.md](../PROTOTYP.md).

- `GET /health`: Erreichbarkeit und ob ein LiteLLM-Key konfiguriert ist.
- `POST /hint`: Bearer-Token prüfen, maximal sechs Anfragen pro Minute,
  Aufgabenbeschreibung + Code + Fehler + Frage an den FH-LiteLLM-Proxy.
  Antwort: `{"hint": "…"}`. Kein Code wird im Backend ausgeführt.
- `POST /submit`: Konsistente Punktestände in `.local/submissions.sqlite3`
  speichern. Antwort: `{"ok": true, "submission_id": 1}`.

Unterstütztes Praktikum: `5_praktikum`. Ein Kurs-Token entspricht im lokalen
Prototyp einer Demo-Identität; mehrere Studierende sind noch nicht umgesetzt.

Die `.env` im Projektstamm enthält `COURSE_TOKEN`, `LITELLM_API_KEY`,
`LITELLM_BASE_URL` und `LITELLM_MODEL`. Sie wird bei Anfragen frisch gelesen.
Weder Schlüssel noch Code/Dialogsätze werden geloggt oder in SQLite gespeichert.

## Gezielte Tipps und Verbrauch

`POST /hint` benötigt eine konkrete `task`: `1a`, `1b`, `2a/b`, `2c`,
`2d`, `3a`, `3b`, `3c` oder `4` (die bisherigen deutschen Auswahllabels
werden ebenfalls akzeptiert). Die Extension sendet den Praktikumscode an
unser Backend; erst dort erfolgt die AST-Auswahl vor der Weitergabe an
FH-LiteLLM. Es werden keine studentischen Funktionen ausgeführt.

Übertragen werden die gemeinsame Einleitung der Aufgabe, die ausgewählte
Teilaufgabe, passende Definitionen samt transitiven Abhängigkeiten sowie
zugeordnete pytest-Fehler. Die Frage wird unverändert übernommen. Bei
Syntaxfehlern oder unbekannten Funktionsnamen wird die fehlende Zuordnung
explizit gemeldet; es gibt keinen Fallback auf den gesamten Code. `factorial`
wird für 1a/1b als mögliche abweichende Benennung berücksichtigt. Globale
Collection-Fehler und nicht zuordenbare Exporter-Testnamen werden ausgelassen.

Die Antwort enthält zusätzlich `usage`: `requested_model`, `reported_model`,
`deployment_id`, `input_tokens`, `output_tokens`, `total_tokens`, `cost_usd`,
`duration_ms`, `context_characters` und `recorded`. Dauer: bis zur Verarbeitung
der LiteLLM-Antwort, ohne lokale Speicherung. Tokens/Kosten stammen aus der
Antwort, fehlende Werte sind `null`, nicht null Dollar. Ein gemeldeter
`default_router` ist kein Beleg für ein konkretes Modell. Die Deployment-ID
kann von der FH einem Modell zugeordnet werden; wir erfinden diese Zuordnung
nicht. Die ausgewiesenen LiteLLM-Kosten sind keine persönliche Rechnung.

Erfolgreiche, lesbare Antworten werden unter `.local/hint_usage.sqlite3`
(Tabelle `hint_usage`) protokolliert. Optionaler Override: `HINT_USAGE_DB`.
Gespeichert werden Zeit, Teilaufgaben-ID und Verbrauchsmetadaten, keine
Schlüssel, Code, Fragen oder Antworten. Fehlgeschlagene Upstream-Aufrufe
werden derzeit nicht bilanziert; das Protokoll ist somit kein vollständiges
Abrechnungsbuch. Speicherfehler verwerfen keinen fertigen Tipp und erscheinen
in der Verbrauchsanzeige. In der Extension stehen die Angaben unter dem Tipp
im aufklappbaren Bereich „KI-Verbrauch“.
