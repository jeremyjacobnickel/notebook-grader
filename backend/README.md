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
