# Design Decisions

Logbuch der Entscheidungen, die nicht aus dem Code selbst hervorgehen.
Neue Einträge oben anfügen, Datum im Format YYYY-MM-DD.

---

## 2026-11-04 — Skriptstellen im eingebetteten PDF-Viewer öffnen

**Kontext:** Unter einem KI-Tipp stehen die passenden Skriptstellen. Ein kurzer
Auszug reicht zum Nachlesen nicht; ein Klick soll das Skript genau an dieser
Stelle öffnen.

**Entscheidung:**
- **Das Backend liefert das PDF** (`GET /script`, Kurs-Token, ETag/304). So
  passen die Seiten immer zum Index, aus dem die Fundstellen stammen. Die
  Extension speichert die Kopie im `globalStorage` und lädt sie nur neu, wenn
  sich das PDF geändert hat; ohne Verbindung wird die vorhandene Kopie genutzt.
- **pdf.js in einem Webview-Panel** neben dem Notebook statt eines externen
  Viewers. Externe Viewer (Vorschau, Browser) können nicht verlässlich auf eine
  Seite springen und die Überschrift markieren; pdf.js kann beides
  (`currentPageNumber`, Suche mit `highlightAll`). `sources` enthalten dafür
  zusätzlich `pdf_page` (1-basierte PDF-Seite) und `heading`.
- **Neue Abhängigkeit `pdfjs-dist` (≥ 6.5):** Ältere Versionen haben eine
  Sicherheitslücke (Ausführung von JavaScript über präparierte PDFs). Zusätzlich
  `isEvalSupported: false`, XFA aus, strenge CSP. Der Worker wird über eine
  `blob:`-URL gestartet, weil Webviews Worker von Ressourcen-URLs blockieren.

**Offen:** Darf das Skript an Studierende verteilt werden (Erlaubnis des
Professors)? Paketgröße der Extension wächst um pdf.js (~ einige MB).

---

## 2026-11-04 — KI-Tipps mit Auszügen aus dem Vorlesungsskript (Volltextsuche)

**Kontext:** Tipps sollen auf die passende Stelle im Vorlesungsskript (ein
PDF, ~180 Seiten) verweisen und deren Inhalt einbeziehen. Das Skript gehört dem
Professor und liegt **nicht** im Repo.

**Entscheidung:**
- **Volltextsuche statt Vektordatenbank:** SQLite FTS5 mit BM25 (Teil von
  Pythons `sqlite3`, keine neue Laufzeitabhängigkeit). Ein Skript ergibt nur
  einige hundert Abschnitte; Fragen, Code und Fehlermeldungen enthalten genau die
  Fachbegriffe und Funktionsnamen, die BM25 gut findet. Embeddings bräuchten ein
  Embedding-Modell (bei FH-LiteLLM ungeklärt, lokal PyTorch) und kommen nur
  dazu, wenn eine Messung zeigt, dass die Volltextsuche danebenliegt.
- **Abschnitte aus der PDF-Gliederung** (Lesezeichen) mit gedruckten
  Seitenzahlen; lange Abschnitte werden an Absätzen geteilt. Inhalts- und
  Literaturverzeichnisse werden nicht indexiert.
- **Neue Abhängigkeit `pypdf`:** reines Python, liest Text, Gliederung und
  Seitennummern; `pdftotext`/PyMuPDF bräuchten Systembibliotheken.
- **Suchanfrage** aus Frage, Fehlerausgabe, Code-Bezeichnern und
  Aufgabenstellung, ohne Füllwörter und Python-Schlüsselwörter; längere Wörter
  als Präfix, damit deutsche Beugungen passen.
- **Einbindung:** Höchstens drei Auszüge (zusammen ≤ 6000 Zeichen) gehen mit
  Kapitel und Seite an FH-LiteLLM; der Tutor soll auf die Stelle verweisen,
  statt Beispielcode zu übernehmen. `/hint` liefert zusätzlich `sources`
  (Kapitel, Seiten, kurzer Anfang), die die Seitenleiste anzeigt.
- **Index** unter `.local/` (git-ignoriert), wird neu gebaut, wenn sich das PDF
  ändert (SHA-256). Pfad über `SCRIPT_PDF` in `.env`; ohne diesen Eintrag oder
  bei Fehlern gibt es Tipps wie bisher, nur ohne Skript.

**Offen:** Erlaubnis des Professors, Skriptauszüge an FH-LiteLLM zu senden und
anzuzeigen. Zuordnung Aufgabe → Kapitel als Vorfilter. Messung mit
realistischen Fragen pro Praktikum (Trefferquote unter den ersten drei).

---

## 2026-11-04 — Autosave: Arbeitsverlauf per Git auf GitLab (Prototyp)

**Kontext:** Lösungen sollen nicht verloren gehen, und es soll ein
nachvollziehbarer Arbeitsverlauf entstehen. Er dient als Gesprächsgrundlage,
wenn Code nicht selbst geschrieben wirkt, **nicht** der Bewertung.
Auffälligkeiten sollen später im Admin-Panel auswertbar sein.

**Entscheidung (Prototyp):**
- **Repo des Studenten:** Der Student legt ein privates Repo in seinem eigenen
  GitLab-Account an und trägt die HTTPS-URL ein. Er kann dort die Historie
  umschreiben; das ist akzeptiert, weil der Verlauf nicht bewertet wird. Für
  den Kursbetrieb ist ein Repo pro Student in einer Kursgruppe mit Rolle
  *Developer* und geschütztem Branch vorgesehen.
- **Anmeldung per Personal Access Token** (Scope `write_repository`) im
  `SecretStorage` von VS Code, nie in `settings.json`, in der Remote-URL oder in
  Logs. Git bekommt es nur zur Laufzeit über einen Credential-Helper in
  Umgebungsvariablen (`GIT_CONFIG_COUNT`, daher Git ≥ 2.31); andere Helper
  (z. B. Schlüsselbund) werden für diese Aufrufe abgeschaltet. Benutzername
  `oauth2`, damit später OAuth ohne Umbau des Git-Teils folgen kann.
  Das Repo legt der Student von Hand an; der Scope `api` wäre zu weit.
- **System-Git** statt `isomorphic-git` (keine neue Abhängigkeit) oder der
  `vscode.git`-API (Repo würde in der Quellcodeverwaltung des Studenten
  auftauchen). Das Autosave-Repo ist ein eigener Klon im globalen Speicher der
  Extension, getrennt vom Workspace und von eigenen Git-Repos des Studenten.
  Hineingeschrieben werden nur normalisierte Notebooks unter
  `<praktikum-id>/<notebook>.ipynb`; `.env`, Tests und Material können so nicht
  versehentlich ins Repo gelangen.
- **Inhalt:** Notebook ohne Ausgaben, Ausführungszähler, Zeitmessungen und
  Widget-Zustand. Tags und Aufgabentext bleiben, die Datei bleibt ein gültiges
  Notebook.
- **Auslöser:** Ausgangsstand beim Laden, alle 5 Minuten (einstellbar) nur bei
  Änderungen, jeder Testlauf und jede Abgabe auch ohne Änderung (Ergebnis als
  Trailer `Tests: x/y`). Abgaben erhalten zusätzlich ein annotiertes Tag
  `abgabe/<id>/<Zeitstempel>`. Ein Autosave speichert ein ungespeichertes
  Notebook vorher, wie es der Testlauf bereits tut.
- **Mehrere Geräte:** Vor jedem Push `fetch` und, falls nötig, ein Merge von
  `origin/main`, nie Force-Push. Ursprünglich war `pull --rebase` geplant; ein
  Rebase schreibt aber lokale Commits samt Abgabe-Tags um, die dann ins Leere
  zeigen. Der Merge lässt jeden Snapshot unverändert und macht parallele Arbeit
  auf zwei Geräten im Verlauf sichtbar. Konflikte löst der lokale Snapshot
  (`-X ours`), denn jeder Commit enthält den vollständigen Dateistand; der
  fremde Stand bleibt in der Historie. Ein neues Gerät übernimmt zuerst die
  vorhandene Historie.
- **Robustheit:** Commits entstehen immer lokal; schlägt der Push fehl (offline,
  Token fehlt/abgelaufen), wird beim nächsten Anlass erneut gepusht. Autosave
  blockiert weder Bearbeiten noch Testen oder Abgeben. Commit- und Tag-Zeiten
  stammen vom Client; GitLab protokolliert Pushes zusätzlich mit Serverzeit.

**Offen:** OAuth statt PAT für den Kursbetrieb, zentrale Repo-Anlage,
Auswertung im Admin-Panel, Datenschutz-Information der Studierenden und
Löschfristen. Unter Windows ungetestet.

**Nachtrag 2026-11-04 — Verlauf und Wiederherstellen (ROADMAP Punkt 7):**
- Eigene Seitenleiste „Autosave-Verlauf“ statt der VS-Code-Zeitachse: Deren
  Schnittstelle für eigene Einträge ist für Extensions nicht freigegeben, und
  das Autosave-Repo liegt bewusst außerhalb des Workspace. Frühere Stände
  öffnet ein schreibgeschütztes Dateisystem (`notebook-grader-autosave:`), weil
  Notebooks nur so im Notebook-Diff erscheinen.
- Wiederherstellen ersetzt das Notebook in `work/<id>/` nur nach Bestätigung und
  nur, wenn der aktuelle Stand vorher erfolgreich gesichert wurde. Es entsteht
  ein eigener Commit mit Trailer `Wiederhergestellt: <sha>`, damit im Verlauf
  sichtbar bleibt, dass Code übernommen und nicht getippt wurde.
- Beim ersten Laden eines Praktikums auf einem Gerät bietet die Extension den
  neuesten GitLab-Stand an, bevor das Notebook öffnet. So entsteht kein
  Rückschritt auf das leere Aufgaben-Notebook im Verlauf. Beim Start und über
  „Aktualisieren“ holt die Extension Stände anderer Geräte (ohne Push), ändert
  dabei aber nie den Arbeitsstand.
- Ausgaben werden nicht gesichert und sind nach dem Wiederherstellen weg; die
  Zellen müssen neu ausgeführt werden.

---

## 2026-10-09 — Praktika 1–4 und 6 als Pakete; conftest für Variablen-, Plot- und Dateiaufgaben

**Kontext:** Die Aufgabenversionen der Praktika 1, 2, 3, 4 und 6 sollen im Tool
laufen. Anders als Praktikum 5 entstehen Ergebnisse dort oft durch Verändern
statt Zuweisen (`P[0:3, 0:3] = X`, `speakers.add(...)`, `go_one_step(person)`),
viele Teilaufgaben sind reine Abbildungen, Praktikum 6 legt Ordner an und
enthält eine `while`-Schleife, und Bilder/Texte werden aus Dateien geladen.

**Entscheidung:**
- Notebooks inhaltlich unverändert übernommen; ergänzt nur Tags, eine
  Setup-Zelle `import numpy as np` in Praktikum 1 (Aufgabe 3 fordert `import math`
  ausdrücklich vom Studenten, deshalb nicht im Setup) und die Trennung von
  Aufgabenüberschrift und Teil a), wo beides in einer Zelle stand.
- `conftest.py`: Abhängigkeitsauswahl berücksichtigt Veränderungen (Element-/
  Attributzuweisung, Methodenaufruf, Übergabe an Funktion); importierte Module
  zählen nicht als verändert. Marker `run_all` für Notebook-artige Ausführung,
  Fixture `answer_ast` für Strukturprüfungen der eigenen Teilaufgabe, leere
  eigene Teilaufgabe = offen, Agg-Backend, 10 s Zeitlimit pro Test (SIGALRM,
  nicht unter Windows). Syntaxfehler früherer Teilaufgaben betreffen spätere
  nur noch, wenn deren Code gebraucht wird (hebt die Grenze vom 2026-09-29 auf).
- Extension: Gesamtlimit 120 s statt 30 s, damit einzelne Endlosschleifen nicht
  den ganzen Lauf verwerfen; Aufgaben ohne Tests zeigen „keine automatische
  Prüfung“.
- Neue Abhängigkeiten `matplotlib` und `Pillow`: für das Aufgabenmaterial
  zwingend (wie `numpy`) und von den Tests zum Prüfen von Abbildungen und
  Bildern benötigt.
- Nicht getestet: Textantworten/Auswahlfragen, Vibe Coding, Ausgaben ohne
  vorgegebenen Variablennamen (Liste in `tasks/README.md`).

**Nachtrag 2026-10-11:** `peppers.tiff`, `faust.txt` und `labyrinth.tiff` vom
Professor liegen in den Paketen; alle Tests sind damit gegen lokale
Referenzlösungen grün (Lösungen nicht committet), die Kontrollwerte OBERON 8 und
MEPHISTOPHELES 1331 bestätigt. Praktikum 5 nutzt jetzt das Original-Notebook des
Professors statt der zuvor umformulierten Fassung mit vorausgefüllten Startern;
leere Antwortzellen gelten als offen. Einzelne Erwartungen beruhen weiterhin auf
Auslegung der Aufgabentexte (Liste in `tasks/README.md`).

 — Tests lesen das Notebook direkt, pro Aufgabe isoliert

**Kontext:** Die Extension schrieb alle Setup-/Antwortzellen in eine `.py`,
und `grader_checks.py` parste diese Datei als Ganzes. Ein Syntaxfehler in einer
Aufgabe ließ alle Tests scheitern (am echten Paket geprüft: 1a gelöst, Tippfehler
in 3a → 19 Fehler, Meldung mit Zeile der für Studierende unsichtbaren `.py`).
Vom Studenten eingefügte Codezellen hatten keine Tags und wurden ignoriert.

**Entscheidung (mit dem Maintainer abgestimmt):**
- Keine generierte `.py` mehr. Jedes Paket enthält eine einheitliche
  `conftest.py` (kanonisch: `grader/praktikum_conftest.py`, nur Standardbibliothek
  + pytest). Sie liest das Notebook über `manifest.json`, ordnet jeden Test per
  `test_<task><part>_` einer Aufgabe zu und parst/führt nur Setup und die
  Antwortzellen dieser Task bis einschließlich des Parts aus, Zelle für Zelle.
- Tests nutzen `@pytest.mark.requires(...)` mit den Fixtures `solution` und
  `definitions`; die paketspezifische `REQUIRED`-Tabelle in `grader_checks.py`
  entfällt.
- Ungetaggte Codezellen gelten als `role:answer` der nächsten darüberliegenden
  Task/Part (in `conftest.py` und `extension/src/notebook.ts` gleich umgesetzt).

**Begründung:** Aufgaben sind laut Vorgabe atomar; die Ausführung bildet das
jetzt technisch ab. Das Paket bleibt selbstständig mit reinem `pytest` prüfbar
(Prof, CI), ohne dass die Extension Code erzeugen muss. Die Kopie der
`conftest.py` pro Paket hält Tests und Ausführungslogik versionsgleich; ein
Repository-Test erzwingt identische Kopien.

**Grenze:** Ein Syntaxfehler in einem früheren Part betrifft auch spätere Parts
derselben Task, weil diese die früheren Zellen mitladen.

 — Aufgaben, Teilaufgaben und Tipp-Kontext aus Notebook-Tags

**Kontext:** Nach der Umstellung auf getaggte Notebooks waren Teilaufgaben,
Tipp-Auswahl, Testnamen und Codezuordnung weiterhin fest für Praktikum 5 in
Extension und Backend hinterlegt. Das Backend las zudem noch die entfernte
`AUFGABEN.md`, wodurch jeder KI-Tipp fehlschlug.

**Entscheidung:**
- Aufgaben/Teilaufgaben werden ausschließlich aus `task:`/`part:`-Tags gelesen
  (`extension/src/notebook.ts`, `grader/notebook_cells.py`).
- Testnamen-Konvention `test_<task><part>_…` verbindet Tests mit Teilaufgaben.
- `/hint` erhält `task` und `part` getrennt. Die Aufgabenstellung stammt aus den
  `role:prompt`-Zellen des Pakets unter `tasks/<id>/`.
- Die Codeauswahl für Tipps erfolgt in der Extension: `role:setup` plus
  Antwortzellen derselben Task bis einschließlich des gewählten Parts. Die
  bisherige AST-Auswahl im Backend mit festen Namenslisten entfällt.

**Datenschutz:** An das Backend geht nicht mehr der Code des ganzen Notebooks,
sondern nur die gewählte Task. An LiteLLM gehen jetzt auch frühere Parts
derselben Task vollständig (vorher nur per AST erkannte Abhängigkeiten); andere
Tasks werden nie übertragen. Bei Syntaxfehlern wird der Code der Task gesendet,
statt den Tipp ohne Code zu erzeugen.

**Begründung:** Neue Praktika brauchen keine Codeänderungen. Die Atomarität
der Tasks macht die Task zur natürlichen Grenze des Kontexts.

 — Zusammenführung mit main, Version 0.3.0

Der lokale LiteLLM-Prototyp ersetzt die parallelen Extension-Implementierungen.
Notebook-Reader und Exporter bleiben erhalten. Die Extension erkennt beide
Aufgabenlayouts und verwendet für neue Bearbeitungen `work/<id>/`.
Das bisherige generierte Praktikum 5 bleibt unter `examples/exported/5_praktikum/`,
damit zwei unterschiedliche Bewertungsmodelle nicht gemeinsam ausgeführt werden.
Der Dependency-Lock von main einschließlich js-yaml-Sicherheitsfix wird übernommen.

---

## 2026-09-12 — Durchgängiger lokaler Prototyp für Praktikum 5

- Aufgaben aus dem bereitgestellten Notebook werden als `.py`-Starter plus `AUFGABEN.md` angeboten. Die persönliche Lösung bleibt außerhalb des Repositories. Kein Notebook-Parser in der Extension nötig.
- 19 gleich gewichtete Prüfungen für Fakultät, Laplace, Echo und Insertion-Sort. Strukturprüfungen mit `ast` prüfen direkte Selbstaufrufe und die geforderten Schleifen/Methoden; sie sind keine vollständige semantische Verifikation. Beispiel-Prints und leere Sortierlisten sind kein Pflichtpunkt.
- FastAPI war beschlossen; `uvicorn` führt den lokalen Server aus. `numpy` ist für das Aufgabenmaterial zwingend. `httpx` statt selbst gebauter urllib-Fehlerbehandlung für begrenzte synchrone LiteLLM-Aufrufe und HTTP-Mocktests. `python-dotenv` statt eigener .env-Syntax für robustes Laden der lokalen Schlüssel.
- LiteLLM wird über den bestehenden FH-Proxy angesprochen, nicht zusätzlich lokal installiert. Basis `https://litellm.fh-muenster.de/v1`, Modell `default_router`, Key nur im Backend. Quellen: FH-Confluence-Anleitung und LiteLLM Proxy-Dokumentation (geprüft 12.09.2026).
- Lokale SQLite-Abgaben enthalten nur Token-Hash, Praktikum, Ergebnis und Zeitstempel. Ein einzelnes Token ist eine lokale Demo-Identität, kein fertiger Mehrbenutzerbetrieb.
- pytest-Interpreter ist konfigurierbar; Laufzeit auf 30 Sekunden begrenzt, Abbruch möglich. Übersprungene Tests zählen nicht als bestanden. Bestehensprüfung nutzt ungerundete Werte. Geänderte Lösungen entwerten das Ergebnis.
- Server nur auf 127.0.0.1. Der lokale Desktop-Prototyp benötigt FH-Netz/VPN für KI-Tipps. Sechs Tipps pro Minute, kein automatischer Retry und keine Speicherung von Code oder KI-Dialogen.


---

## 2026-08-04 — Konverter prüft auch Funktions-Aufgaben

**Kontext:** Das 5. Praktikum ist anders aufgebaut als das erste. Statt
"Ergebnis in Variable speichern" verlangt es **Funktionen**
(`factorial_iter`, `echo`, `insertion_sort` …). Der Konverter prüfte
bisher nur einfache Variablenwerte und hätte hier fast nichts erzeugt.

**Alternativen:**
- Erwartungswerte von Hand pflegen — skaliert nicht über 5+ Praktika.
- Testfälle selbst erfinden (zufällige Eingaben) — bräuchte Wissen über
  die erlaubten Eingabebereiche und liefert keine Erwartungswerte.
- **Beispielaufrufe aus der Musterlösung ernten:** Der Prof ruft seine
  Funktionen in der Lösung ohnehin mit festen Werten auf
  (`print(factorial_iter(4))`), um sie vorzuführen.

**Entscheidung:** Der Konverter sammelt die Aufrufe aus dem Lösungscode,
bei denen **alle Argumente feste Werte** sind, führt sie aus und schreibt
das Ergebnis als Test fest. Zusätzlich wird der Vorspann des Notebooks
(Code-Zellen vor der ersten Aufgabe, z. B. `import numpy as np`)
ausgeführt und in jeden Stub übernommen.

**Begründung:** Die Testfälle stammen damit vom Prof selbst und sind
genau die, die er als aussagekräftig ansieht — ohne Zusatzaufwand.
Aufrufe mit Variablen als Argument (`factorial_rec(number - 1)`,
`det_laplace(A)`) lassen sich nicht nachstellen und fallen automatisch
heraus; rekursive Aufrufe damit ebenfalls.

**Grenze:** NumPy-Arrays werden weiterhin nicht geprüft (eine 5x5-Matrix
lässt sich nicht sinnvoll als Literal in eine Testdatei schreiben).
Beim 5. Praktikum betrifft das `A`, `A_00` und `A_12`; die daraus
berechnete Determinante `det_A` wird geprüft und deckt `submatrix` und
`det_laplace` indirekt mit ab. Ein späterer `np.allclose`-Vergleich
bleibt möglich.

**Folge:** Das Aufgaben-Notebook ist für den Export nicht mehr nötig
(die Lösung enthält dieselben Überschriften). Es kann mit `--aufgaben`
weiterhin zur Kontrolle angegeben werden. Neuer Aufruf:
`python -m grader.task_exporter <loesung.ipynb> <ziel>`.

---

## 2026-08-03 — Konverter: eine Datei pro Aufgabe, nur Variablen-Checks

**Kontext:** `grader/task_exporter.py` erzeugt aus dem Notebook-Paar die
`tasks/`-Ordner für die Extension. In den Notebooks verwenden mehrere
Aufgaben dieselben Variablennamen (`a`, `b`, `c` …) — in einer
gemeinsamen Datei würden sie sich überschreiben.

**Entscheidung (Maintainer):**
- **Eine Datei pro Aufgabe:** `aufgabe_<n>.py` + `test_aufgabe_<n>.py`.
- Die Stubs enthalten **None-Platzhalter** für die erwarteten Variablen.
  So schlägt der Import in den Tests nie fehl und eine ungelöste
  Aufgabe stoppt nicht den ganzen pytest-Lauf (die Extension ruft
  pytest zusätzlich mit `--continue-on-collection-errors` auf).
- Getestet werden nur **einfache Variablenwerte** (Zahlen, Strings,
  bool), die die Lösung der jeweiligen Aufgabe neu anlegt oder ändert.
  Floats mit `pytest.approx`.
- **Aufgaben mit Textantworten statt Code werden nicht über die
  Extension geprüft** — sie erzeugen keine Dateien und zählen nicht in
  die 80-%-Grenze. Die Kontrolle passiert anderswo (z. B. Leukipp).

**Begründung:** Einfachstes Layout, das die Variablen-Kollisionen löst;
der Studierenden-Fortschritt bleibt als Prozentwert über alle
generierten Tests korrekt messbar.

---

## 2026-08-03 — `grader/` bleibt: Basis für den Notebook-Konverter

**Kontext:** Nach dem Wechsel zur VS-Code-Extension war offen, ob die
alte Notebook-Pipeline (`grader/notebook_reader.py`) entfernt wird
("no dead code"). Jetzt ist geklärt: Der Prof pflegt die Praktika
weiterhin als Jupyter-Notebook-Paar — eine **Aufgaben-Version**
(Markdown-Aufgaben, leere Code-Zellen) und eine **Lösungs-Version**
(gleiche Zellen, ausgefüllt, mit Ausgaben).

**Entscheidung:** `notebook_reader.py` bleibt und wird die Basis des
Konverters Notebook → `tasks/<id>/` (Aufgaben-Stub + pytest-Tests).

**Begründung:** Der Reader parst genau dieses Format bereits
(verifiziert gegen das echte 1. Praktikum, Aufgaben- und
Lösungs-Version: je 7 Aufgaben sauber erkannt) und ist getestet.
Lösungs-Notebooks werden wie echte Abgaben NIE committet — sonst
könnten Studierende sie im Repo finden.

---

## 2026-08-03 — VS-Code-Extension statt LTI/ILIAS-Einbindung

**Kontext:** Ursprünglich war geplant, den Grader als Web-Tool über LTI
in ILIAS einzubinden (3-Stufen-Plan: lokal → FH-Webserver → LTI).

**Alternativen:**
- LTI-Web-Tool: Flask-Server an der FH, Registrierung durch den
  ILIAS-Admin, Server-Sandbox für Studierenden-Code, DSGVO-Klärung für
  Notebook-Uploads.
- VS-Code-Extension: Studierende arbeiten lokal in VS Code, die Tests
  laufen auf dem eigenen Rechner; nur das Ergebnis (bestanden ab 80 %)
  und — für KI-Tipps — der Code gehen an ein kleines FH-Backend.

**Entscheidung:** VS-Code-Extension. Der Client liegt in `extension/`,
das FH-Backend (`POST /submit`, `POST /hint`) folgt separat.

**Begründung:** Einfach zu installieren und zu verteilen, keine
Server-Sandbox nötig (der Code läuft beim Studierenden), kein
LTI-/ILIAS-Abstimmungsprozess. Trade-off: keine automatische Note im
ILIAS-Gradebook — das Backend sammelt die Bestanden-Status über ein
Kurs-Token.

---

## 2026-07-03 — Toolchain der VS-Code-Extension (`extension/`)

**Kontext:** Die Studierenden-Extension ist ein eigenes npm-Paket in
`extension/` und braucht eine TypeScript-Toolchain.

**Alternativen und Entscheidungen:**
- **TypeScript + ESLint (`typescript-eslint`)** — der offizielle
  Standard-Aufbau aus den VS-Code-Extension-Beispielen (`yo code`).
  Reines JavaScript wäre die einzige Alternative, verzichtet aber auf
  die Typen der VS-Code-API.
- **Unit-Tests mit `node --test`** (in Node eingebaut) statt
  mocha/jest: die reinen Funktionen (Score, JUnit-XML-Parsen) brauchen
  keinen VS-Code-Host, also reicht die Standard-Library — analog zur
  Python-Konvention „standard library first".
- **Kein HTTP-Paket** — das eingebaute `fetch` (Node 18+) deckt die
  zwei Backend-Endpoints ab.
- **Kein XML-Paket** — Node hat keinen eingebauten XML-Parser; die
  pytest-JUnit-Ausgabe ist aber eine feste, flache Struktur, die ein
  kleiner, unit-getesteter Regex-Parser (`grading/junitXml.ts`)
  zuverlässig liest. Sollte das je kippen, ist der Tausch auf eine
  Bibliothek auf dieses eine Modul begrenzt.

---

## 2026-06-30 — Aufgaben-Container wird `.py`; Inhalt bleibt identisch

**Kontext:** Klärung mit dem Maintainer nach Prüfung der echten Praktika
(1–3, Modul *Grundlagen der Programmierung*). "Aufgaben möglichst gleich
lassen" bedeutet: der *Inhalt* bleibt identisch (gleiche Aufgaben, gleiche
Variablennamen, Stil "Ergebnis in Variable speichern"), aber der
*Container* darf von `.ipynb` nach `.py` wechseln. (Korrigiert eine
zwischenzeitliche Lesart "Aufgaben bleiben `.ipynb`".)

**Entscheidung:** Aufgaben sind `.py`-Dateien. Inhalt unverändert.

**Offen (später entscheiden):** Ob Aufgabenstellung und Bilder *inline* in
der `.py` stehen (z. B. als Kommentare / `# %%`-Zellen) oder in einem
*separaten Programm* (Browser / Leukipp / ILIAS) abgerufen werden. Beides
wird noch nicht gebaut.

**Begründung:** `.py` ist für die Bewertung einfacher — Datei in frischem
Namespace ausführen (matplotlib-Backend `Agg`) und erwartete Variablen mit
`np.allclose` prüfen; `pytest` liefert das Inline-Grün/Rot in VS Code
nativ. Da der Aufgaben-Stil (feste Werte in Variablen) bleibt, ändert sich
am Bewertungsmodell nichts.

**Folge (unverändert):** `ast`-Checks decken strukturelle Vorgaben ab
(z. B. "`np.block` nicht verwenden", "per Indizierung"). Plot-Aufgaben
werden locker bewertet (Figure/Subplots/Labels) plus KI-Tutor; manche
Teile (Vibe Coding, Multiple-Choice im Browser) werden gar nicht
automatisch bewertet. Daten-Assets (z. B. `peppers.tiff`) gehören zur
Aufgabe und werden mit "Praktikum laden" abgelegt.

---

## 2026-06-30 — `Hypothesis` zurückgestellt (Zukunftsmusik)

**Kontext:** Hebt den Eintrag "`Hypothesis` jetzt zentral" auf.

**Entscheidung:** `Hypothesis` ist vorerst **kein** Bestandteil der
Bewertung. Später wieder aufnehmbar.

**Begründung:** Property-based Testing braucht Aufgaben, die als *Funktion
mit Eingaben* formuliert sind. Die echten Aufgaben speichern feste
Einzelwerte/Arrays in Variablen — da erzeugt Hypothesis keinen Mehrwert,
und Hardcoding-Schutz ist erklärtes Nicht-Ziel (Pass/Fail, low-stakes).
Greift erst, falls künftig Funktions-Aufgaben dazukommen.

---

## 2026-06-29 — Architektur-Pivot: VS-Code-Extension + FastAPI-Backend

**Kontext:** Das Projekt wird von einem serverseitigen Notebook-Grader
(CLI/LTI in ILIAS, Docker-Sandbox) auf eine VS-Code-Extension umgestellt,
die das manuelle Hochladen auf ILIAS (über Leukipp) ersetzt. Fokus: Lernen
in einem Programmier-Praktikum, nicht Betrugsabwehr.

**Entscheidung — drei Komponenten:**
- **Extension (Client):** TypeScript, VS Code API. Drei Commands
  (Praktikum laden, Tests ausführen, Abgeben) plus Sidebar mit Punktestand
  und Tipp-Button.
- **Tests laufen lokal** beim Studierenden. `pytest` als Engine.
- **Backend:** FastAPI, minimal. Zwei Endpoints `/submit` und `/hint`.

**Neue Abhängigkeiten und ihre Begründung:**
- **TypeScript / VS Code API** — vorgegeben durch das Ziel "Extension".
  Klein und konventionell halten (offizielle VS-Code-Beispiele).
- **FastAPI** — minimaler, gut dokumentierter HTTP-Layer für zwei
  Endpoints. Alternative `Flask` wäre auch möglich; FastAPI gewählt wegen
  Typ-Hints, automatischer Validierung und knapper Syntax.

**Vereinfachter Scope (bewusst weggelassen):**
- Keine serverseitige Neuausführung / Hidden Tests — das lokale
  Testergebnis zählt (vertretbar bei Labor-Abgaben).
- Kein SSO/OAuth — ein einfaches Kurs-Token (bei Anmeldung ausgegeben,
  serverseitig geprüft) reicht.
- Keine Plagiatsprüfung (eventuell später).

**Folge:** Der frühere Docker-Sandbox-Eintrag (2026-06-29) ist hinfällig —
es läuft kein nicht vertrauenswürdiger Code mehr auf unseren Servern, die
Ausführung passiert lokal. Die LTI/ILIAS-Integration entfällt; ILIAS wird
ersetzt, nicht eingebunden.

---

## 2026-06-29 — Bewertung: Bestanden/Nicht-bestanden ab 80 %

**Kontext:** Wie wird bewertet?

**Entscheidung:** Reine Bestanden/Nicht-bestanden-Wertung. Bestanden =
mindestens 80 % der Gesamtpunkte.

**Begründung:** Keine Klausur, kein Notendruck. Eine einfache Schwelle
genügt und hält Implementierung und Feedback unkompliziert.

---

## 2026-06-29 — `Hypothesis` jetzt zentral (statt zurückgestellt)

**Kontext:** Hebt den Eintrag "Hypothesis vorerst zurückgestellt" auf.

**Entscheidung:** `Hypothesis` (Property-based Testing) wird fester
Bestandteil der Aufgaben-Tests.

**Begründung:** Im neuen Scope gibt es keine serverseitigen Hidden Tests.
Hypothesis erzeugt pro Lauf zufällige Eingaben — "Bestehen" bedeutet damit
echtes Funktionieren und lässt sich nicht auf feste Testwerte hardcoden.
Das ersetzt die Hidden Tests didaktisch. Die Strategien schreibt die
Lehrperson pro Aufgabe; das liegt im überschaubaren Rahmen, weil pro
Aufgabe nur wenige Properties nötig sind.

---

## 2026-06-29 — `.py` statt `.ipynb` als Aufgabenformat

**Kontext:** Hebt den Eintrag "`json` statt `nbformat`" praktisch auf —
`notebook_reader.py` und seine Tests wurden entfernt.

**Entscheidung:** Aufgaben sind `.py`-Dateien. Notebooks nur, wenn eine
Aufgabe Visualisierung verlangt; dann mit `nbval` / `papermill` getestet.

**Begründung:** `.py` ist mit `pytest` und der VS-Code-Test-UI direkt
testbar, ohne Zwischenschicht zum Parsen von Zellen. Der frühere
`notebook_reader` (Aufgaben-Header-Parsing im Notebook) entfällt.

---

## 2026-06-29 — `ruff` aus dem Bewertungs-Scope entfernt

**Kontext:** Der ursprüngliche Plan nutzte `ruff` zur Stilbewertung von
Studierenden-Code. Der überarbeitete Plan bewertet nur Bestanden/Nicht-
bestanden auf Basis der Korrektheit (plus optionale `ast`-Struktur-Checks).

**Entscheidung:** Keine Stil-Bewertung der Abgaben. `ruff` darf weiterhin
fürs eigene Projekt-Linting genutzt werden, ist aber kein Teil der Note.

**Begründung:** Pass/Fail-Fokus aufs Funktionieren. Stilpunkte würden die
einfache 80-%-Schwelle verkomplizieren, ohne dem Lernziel zu dienen.

---

## 2026-06-29 — `nbgrader` als Gerüst verworfen

**Kontext:** Überlegung, `nbgrader` als Grundgerüst für Punktevergabe
und Notebook-Handling zu nutzen.

**Alternativen:**
- `nbgrader` — fertiges Autograding-Framework für Jupyter-Notebooks.
- Schlanke Eigenlösung: `notebook_reader.py` (Parsen) plus eine kleine
  `grading_scheme.py` (Aufgabe → max. Punkte).

**Entscheidung:** Kein `nbgrader`. Schlanke Eigenlösung.

**Begründung:** `nbgrader` bringt eine eigene Datenbank, ein
Zell-Metadaten-Schema und einen JupyterHub-Workflow mit. Das steht im
Widerspruch zu "Standard-Library zuerst" und liegt deutlich über dem
Skill-Level des Maintainers (traitlets-Config, nbconvert-Preprocessors,
versteckte Magie). Die beiden gewünschten Funktionen — Notebooks lesen
und Punkte vergeben — sind je wenige Dutzend Zeilen und teils schon
gebaut. Reversibel: bei echtem Bedarf später nachrüstbar.

---

## 2026-06-29 — `ruff` für die Stilprüfung (Dev-Dependency)

**Kontext:** Stil-Layer der Bewertung (die README nennt `ruff` bereits).

**Alternativen:**
- `flake8` + `pycodestyle` + Plugins — mehrere Pakete.
- `ruff` — eine einzelne, schnelle Binary, deckt Linting und Format ab.

**Entscheidung:** `ruff` als Dev-Dependency.

**Begründung:** Eine Abhängigkeit statt mehrerer, sehr schnell, einfache
Konfiguration. Prüft sowohl Studierenden-Code als auch das Projekt selbst.

---

## 2026-06-29 — `ast` (Standard-Library) für strukturelle Anforderungen

**Kontext:** Manche Aufgaben verlangen eine bestimmte Struktur (Schleife,
benannte Funktion, Modulo-Operator), nicht nur ein korrektes Ergebnis.

**Entscheidung:** Eigenes kleines Skript auf Basis des `ast`-Moduls aus
der Standard-Library. Einfache `ast.walk()`-+-`isinstance`-Prüfungen,
keine Visitor-Magie.

**Begründung:** Keine neue Abhängigkeit, gut lesbar, passt zum
Skill-Level. Trennt die strukturelle Prüfung sauber von Korrektheit
(pytest) und Stil (ruff).

---

## 2026-06-29 — Docker als Sandbox für Studierenden-Code

**Kontext:** `code_runner` und die Test-Läufe führen nicht
vertrauenswürdigen Code aus.

**Alternativen:**
- Direkter `subprocess`-Aufruf mit Limits — schwer wirklich abzusichern
  (Netzwerk, Dateisystem, Capabilities).
- `firejail` / `nsjail` / gVisor — wirksam, aber zusätzliche Tools und
  mehr Komplexität.
- Docker — verbreitet, isoliert Netzwerk/Dateisystem, CPU-/RAM-/Zeit-Limits.

**Entscheidung:** Docker-Container ohne Netzwerk, mit Ressourcen-Limits,
non-root und read-only Dateisystem.

**Begründung:** Pflicht für ein web-facing Tool (siehe README, LTI). Die
eigenen Unit-Tests des Graders laufen weiterhin normal auf dem Host.

---

## 2026-06-29 — `Hypothesis` vorerst zurückgestellt

**Kontext:** Idee, Property-based Testing für die Korrektheitsprüfung zu
nutzen.

**Entscheidung:** Noch nicht aufnehmen.

**Begründung:** Mächtig, aber das Schreiben von Strategien/Properties
liegt über dem aktuellen Skill-Level, und es gibt noch keinen konkreten
Anwendungsfall. Wird bei echtem Bedarf mit eigenem Eintrag nachgezogen.

---

## 2026-06-25 — `pytest` als Test-Runner (Dev-Dependency)

**Kontext:** Erster Test (`tests/test_notebook_reader.py`) braucht ein Framework.

**Alternativen:**
- `unittest` aus der Standard-Library — keine neue Dependency.
- `pytest` — kompakte Assertion-Syntax, Fixtures, gute Fehlermeldungen.

**Entscheidung:** `pytest` als Dev-Dependency in `requirements-dev.txt`.

**Begründung:** README-Konvention "no new dependency without a reason"
ist erfüllt durch diesen Eintrag. `pytest` ist De-facto-Standard, und
die Fixture-Syntax hält die Tests kurz, was zum Skill-Level passt.
`unittest`-Boilerplate (Klassen, `self.assertEqual`) wäre für Lernende
mehr Ballast als Hilfe.

---

## 2026-06-25 — `@dataclass` und `@property` erlaubt

**Kontext:** Erste Module (`notebook_reader.py`) modellieren Daten.

**Entscheidung:** `@dataclass` und `@property` aus der Standard-Library
sind erlaubt. Eigene Decorators schreiben weiterhin nicht.

**Begründung:** Beide ersetzen Boilerplate (`__init__`, Getter), ohne
versteckte Magie einzuführen. README-Skill-Level-Note wurde entsprechend
präzisiert (siehe README).

---

## 2026-06-25 — `json` statt `nbformat` zum Notebook-Parsen

**Kontext:** `notebook_reader.py` liest `.ipynb`-Dateien.

**Alternativen:**
- `nbformat` (offizielles Jupyter-Paket) — Validierung, Roundtrips.
- `json` aus der Standard-Library — `.ipynb` ist stabiles JSON.

**Entscheidung:** `json` aus der Standard-Library.

**Begründung:** Eine Dependency weniger. Wir brauchen aktuell weder
Validierung noch Schreib-Operationen. Wechsel auf `nbformat` ist ein
Einzeiler, falls später Roundtrips nötig werden.

## September 2026: Teilaufgaben und offene Versuche

Für den kuratierten Praktikum-5-Prototyp werden fehlende Namen und reine
Platzhalter vor jedem Test erkannt. Diese Prüfungen sind offen (pytest skip),
zählen aber weiter als nicht bestandene Punkte. Einzeltests werden mit
`-k test_<teilaufgabe>_` ausgewählt und niemals zur Gesamtabgabe freigegeben.
Die lokale Ausführung lädt benötigte AST-Definitionen und Abhängigkeiten;
unbeteiligte Beispielaufrufe werden ausgelassen. Das vermeidet eine Blockade
durch Laufzeitfehler anderer Aufgaben, verändert aber bewusst das bisherige
vollständige `runpy`-Ausführungsverhalten. Syntaxfehler der gemeinsamen Datei
bleiben global. Keine neuen Abhängigkeiten, kein serverseitiges Ausführen.
