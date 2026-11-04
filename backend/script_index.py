"""Volltextindex (SQLite FTS5, BM25) über das Vorlesungsskript und Suche für KI-Tipps.

Aufruf zum Vorab-Bauen und Ausprobieren:
    .venv/bin/python -m backend.script_index "Wie funktioniert meshgrid?"
"""

import hashlib
import logging
import os
import re
import sqlite3
import sys
import threading
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path

from backend.script_pdf import chunk_sections, read_pdf, split_sections
from backend.settings import ROOT, settings

SCHEMA_VERSION = "2"
MAX_PASSAGES = 3
MAX_CONTEXT_CHARS = 6000
MAX_TERMS = 30
EXCERPT_CHARS = 200

# Füllwörter der Aufgabentexte, Python-Schlüsselwörter und Notebook-Markierungen
# aus dem extrahierten Code tragen nichts zur Suche bei.
STOPWORDS = set("""
aber alle als also auch auf aus bei bis das dass dem den der des die dies diese diesem diesen dieser dieses
durch ein eine einem einen einer eines für hat haben ich ihre ihr ist kann können man mit muss nach nicht
noch nur oder sein sich sie sind soll sollen über und uns unter vom von vor was weil welche wenn werden
wie wird wir zu zum zur jeweils zunächst sowie bzw etwa dabei damit dann denn hier mehr ohne wobei
aufgabe teilaufgabe hinweis nutzen verwenden erstellen weisen beschriften stellen berechnen variable
geben gibt schritt nächster nächste frage mein meine meinen mir warum klappt funktioniert fehler
nutze verwende mache brauche erstelle geht bekomme kommt muss sehe verstehe richtig falsch immer
and def return import from for while if elif else in not or none true false pass print self class
lambda try except with as is the of to np plt notebook zelle role answer setup task part test tests
assert assertionerror traceback line file error
""".split())
WORD = re.compile(r"[A-Za-zÄÖÜäöüß_][A-Za-zÄÖÜäöüß0-9_]{2,}")

build_lock = threading.Lock()


@dataclass(frozen=True)
class Passage:
    title: str
    pages: str
    text: str
    pdf_page: int


def query_terms(*texts):
    """Suchbegriffe in Reihenfolge der Texte (wichtigste zuerst), ohne Füllwörter und Dubletten."""
    terms = []
    for text in texts:
        for word in WORD.findall(text or ""):
            # Bezeichner wie calc_multiples zerlegen; jeder Teil kann im Skript vorkommen.
            for part in word.lower().split("_"):
                if len(part) >= 3 and part not in STOPWORDS and not part.isdigit() and part not in terms:
                    terms.append(part)
    return terms[:MAX_TERMS]


def fts_query(terms):
    """ODER-Verknüpfung; Wörter ab 5 Zeichen als Präfix, damit Beugungen passen (Schleife → Schleifen)."""
    return " OR ".join(f'"{term}"*' if len(term) >= 5 else f'"{term}"' for term in terms)


def build_index(sections, target, source_hash):
    """Baut den Index in eine temporäre Datei und ersetzt den alten erst danach."""
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".building")
    temporary.unlink(missing_ok=True)
    with closing(sqlite3.connect(temporary)) as db, db:
        db.execute("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        db.execute("""CREATE VIRTUAL TABLE chunks USING fts5(
            title, body, pages UNINDEXED, pdf_page UNINDEXED, tokenize = 'unicode61 remove_diacritics 2')""")
        db.executemany("INSERT INTO chunks (title, body, pages, pdf_page) VALUES (?, ?, ?, ?)",
                       [(section.title, section.text, section.pages, section.pdf_page) for section in sections])
        db.executemany("INSERT INTO meta VALUES (?, ?)", [("source_sha256", source_hash), ("schema", SCHEMA_VERSION)])
    os.replace(temporary, target)


def ensure_index(pdf, target):
    """Index bauen, wenn er fehlt oder zu einem anderen PDF gehört."""
    source_hash = hashlib.sha256(Path(pdf).read_bytes()).hexdigest()
    with build_lock:
        if index_matches(target, source_hash):
            return
        outline, pages, labels = read_pdf(pdf)
        build_index(chunk_sections(split_sections(outline, pages, labels)), target, source_hash)


def index_matches(target, source_hash):
    if not target.exists():
        return False
    try:
        with closing(sqlite3.connect(target)) as db:
            meta = dict(db.execute("SELECT key, value FROM meta"))
        return meta.get("source_sha256") == source_hash and meta.get("schema") == SCHEMA_VERSION
    except sqlite3.Error:
        return False


def search(target, terms, limit=MAX_PASSAGES, max_chars=MAX_CONTEXT_CHARS):
    """Beste Abschnitte nach BM25; Überschriften zählen dreifach. Gleicher Abschnitt nur einmal."""
    if not terms:
        return []
    with closing(sqlite3.connect(target)) as db:
        rows = db.execute("""SELECT title, pages, body, pdf_page FROM chunks WHERE chunks MATCH ?
                             ORDER BY bm25(chunks, 3.0, 1.0) LIMIT ?""", (fts_query(terms), limit * 4)).fetchall()
    passages, used = [], 0
    for title, pages, body, pdf_page in rows:
        if any(passage.title == title for passage in passages) or used + len(body) > max_chars:
            continue
        passages.append(Passage(title, pages, body, int(pdf_page)))
        used += len(body)
        if len(passages) == limit:
            break
    return passages


def index_path(config):
    return Path(config.get("SCRIPT_INDEX_DB", str(ROOT / ".local" / "script_index.sqlite3")))


def script_passages(config, *texts):
    """Passende Skriptauszüge oder [] (kein Skript konfiguriert oder Fehler); ein Tipp scheitert nie daran."""
    pdf = config.get("SCRIPT_PDF", "")
    if not pdf:
        return []
    try:
        target = index_path(config)
        ensure_index(pdf, target)
        return search(target, query_terms(*texts))
    except (OSError, sqlite3.Error, ValueError) as error:
        logging.getLogger(__name__).warning("Skriptsuche nicht verfügbar: %s", error)
        return []
    except Exception as error:  # pypdf meldet beschädigte PDFs mit eigenen Fehlertypen
        logging.getLogger(__name__).warning("Skript konnte nicht gelesen werden: %s", type(error).__name__)
        return []


def excerpt(passage):
    """Kurzer Anfang des Abschnitts für die Quellenangabe in der Seitenleiste."""
    text = " ".join(passage.text.split())
    return text if len(text) <= EXCERPT_CHARS else text[:EXCERPT_CHARS - 1].rstrip() + "…"


def main(arguments):
    config = settings()
    if not config.get("SCRIPT_PDF"):
        print("SCRIPT_PDF fehlt in der .env.")
        return 1
    target = index_path(config)
    ensure_index(config["SCRIPT_PDF"], target)
    with closing(sqlite3.connect(target)) as db:
        print(f"Index {target}: {db.execute('SELECT count(*) FROM chunks').fetchone()[0]} Abschnitte")
    if arguments:
        terms = query_terms(" ".join(arguments))
        print("Suchbegriffe:", ", ".join(terms))
        for passage in search(target, terms):
            print(f"- {passage.title} (S. {passage.pages}): {excerpt(passage)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
