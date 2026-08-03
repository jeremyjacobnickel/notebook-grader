# Design Decisions

Logbuch der Entscheidungen, die nicht aus dem Code selbst hervorgehen.
Neue Einträge oben anfügen, Datum im Format YYYY-MM-DD.

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
