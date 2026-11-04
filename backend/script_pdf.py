"""Vorlesungsskript (PDF) anhand seiner Gliederung in Abschnitte mit Seitenangaben zerlegen."""

import re
from dataclasses import dataclass

from pypdf import PdfReader

# Verzeichnisse passen auf fast jede Suchanfrage und enthalten keinen Lehrinhalt.
SKIPPED_TITLES = re.compile(r"inhaltsverzeichnis|stichwortverzeichnis|literaturverzeichnis|^index$", re.IGNORECASE)
MAX_CHUNK_CHARS = 2500


@dataclass(frozen=True)
class OutlineEntry:
    level: int
    title: str
    page: int  # 0-basierter PDF-Seitenindex


@dataclass(frozen=True)
class Section:
    title: str      # z. B. "6 Arrays › 6.3 Gitter"
    pages: str      # gedruckte Seiten, z. B. "87" oder "87–88"
    text: str
    pdf_page: int   # 1-basierte PDF-Seite, auf der der Abschnitt beginnt (zum Öffnen an dieser Stelle)


def read_pdf(path):
    """Gliederung, Seitentexte und gedruckte Seitennummern eines PDFs."""
    reader = PdfReader(path)
    outline = []

    def walk(items, level):
        for item in items:
            if isinstance(item, list):
                walk(item, level + 1)
            else:
                outline.append(OutlineEntry(level, " ".join(item.title.split()), reader.get_destination_page_number(item)))

    walk(reader.outline, 0)
    pages = [page.extract_text() or "" for page in reader.pages]
    labels = list(reader.page_labels) or [str(index + 1) for index in range(len(pages))]
    return outline, pages, labels


def split_sections(outline, pages, labels):
    """Ein Abschnitt reicht von seiner Überschrift bis zur nächsten Überschrift der Gliederung."""
    starts = [0]
    for text in pages:
        starts.append(starts[-1] + len(text) + 1)
    full = "\n".join(pages)

    positions = []
    for entry in outline:
        page_start = starts[min(entry.page, len(pages) - 1)]
        page_text = pages[min(entry.page, len(pages) - 1)]
        # Überschrift auf ihrer Seite suchen, sonst Seitenanfang; nie vor dem vorherigen Abschnitt.
        match = re.search(r"\s+".join(map(re.escape, entry.title.split())), page_text)
        position = page_start + match.start() if match else page_start
        positions.append(max(position, positions[-1] if positions else 0))

    sections, trail = [], []
    for index, entry in enumerate(outline):
        trail = trail[:entry.level] + [entry.title]
        end = positions[index + 1] if index + 1 < len(outline) else len(full)
        body = full[positions[index]:end]
        if SKIPPED_TITLES.search(entry.title) or len(body.strip()) - len(entry.title) < 40:
            continue
        first, last = page_of(starts, positions[index]), page_of(starts, max(end - 1, positions[index]))
        pages_label = labels[first] if first == last else f"{labels[first]}–{labels[last]}"
        sections.append(Section(" › ".join(trail), pages_label, normalize(body), first + 1))
    return sections


def chunk_sections(sections, max_chars=MAX_CHUNK_CHARS):
    """Lange Abschnitte an Zeilengrenzen teilen; jeder Teil behält Titel und Seiten."""
    chunks = []
    for section in sections:
        current = ""
        for line in section.text.split("\n"):
            # Überlange Zeilen notfalls hart teilen, damit kein Text verloren geht.
            for piece in [line[start:start + max_chars] for start in range(0, len(line), max_chars)] or [""]:
                if current and len(current) + len(piece) + 1 > max_chars:
                    chunks.append(Section(section.title, section.pages, current.strip(), section.pdf_page))
                    current = ""
                current = f"{current}\n{piece}" if current else piece
        if current.strip():
            chunks.append(Section(section.title, section.pages, current.strip(), section.pdf_page))
    return chunks


def page_of(starts, position):
    for index in range(len(starts) - 1):
        if starts[index] <= position < starts[index + 1]:
            return index
    return len(starts) - 2


def normalize(text):
    """Leerzeichen vereinheitlichen, Absätze (Leerzeilen) erhalten."""
    lines = [" ".join(line.split()) for line in text.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()
