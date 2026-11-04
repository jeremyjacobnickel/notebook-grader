import importlib
import json
import sqlite3

import httpx

from backend import script_index
from backend.script_pdf import OutlineEntry, Section, chunk_sections, split_sections

tutor = importlib.import_module("backend.tutor")

# Synthetisches Mini-Skript; das echte Vorlesungsskript liegt nie im Repo.
PAGES = [
    "Inhaltsverzeichnis\n1 Arrays ....... 1\n1.1 Gitter ....... 2\n2 Schleifen ....... 3",
    "1 Arrays\nArrays speichern viele Zahlen gleichen Typs.\n1.1 Gitter\nMit np.meshgrid entstehen Koordinatenmatrizen.",
    "Gitter werden mit pcolormesh als Heatmap dargestellt.",
    "2 Schleifen\nDie for-Schleife wiederholt Anweisungen für jedes Element einer Sequenz.",
]
LABELS = ["i", "1", "2", "3"]
OUTLINE = [OutlineEntry(0, "Inhaltsverzeichnis", 0), OutlineEntry(0, "1 Arrays", 1),
           OutlineEntry(1, "1.1 Gitter", 1), OutlineEntry(0, "2 Schleifen", 3)]


def test_sections_follow_outline_with_printed_pages_and_skip_contents():
    sections = split_sections(OUTLINE, PAGES, LABELS)
    assert [(s.title, s.pages, s.pdf_page) for s in sections] == [
        ("1 Arrays", "1", 2), ("1 Arrays › 1.1 Gitter", "1–2", 2), ("2 Schleifen", "3", 4)]
    assert "meshgrid" in sections[1].text and "pcolormesh" in sections[1].text
    assert "meshgrid" not in sections[0].text


def test_long_sections_are_split_without_losing_text():
    text = "\n".join(f"Zeile {index} " + "x" * 40 for index in range(60))
    chunks = chunk_sections([Section("Kapitel", "5–7", text, 9)], max_chars=500)
    assert len(chunks) > 1 and all(len(chunk.text) <= 500 for chunk in chunks)
    assert all((chunk.title, chunk.pages, chunk.pdf_page) == ("Kapitel", "5–7", 9) for chunk in chunks)
    assert "".join(chunk.text.replace("\n", "") for chunk in chunks) == text.replace("\n", "")


def test_query_terms_drop_noise_and_split_identifiers():
    terms = script_index.query_terms(
        "Wie nutze ich meshgrid?", "AssertionError", "# Notebook-Zelle 3: role:answer, task:2\nZ = np.zeros(X.shape)\n"
        "def calc_multiples(n):\n    return n % 5")
    assert terms[:1] == ["meshgrid"]
    assert {"zeros", "shape", "calc", "multiples"} <= set(terms)
    assert not {"wie", "ich", "nutze", "notebook", "zelle", "def", "return", "np", "assertionerror"} & set(terms)
    assert script_index.fts_query(["meshgrid", "for"]) == '"meshgrid"* OR "for"'


def test_search_ranks_matching_section_and_respects_budget(tmp_path):
    target = tmp_path / "index.sqlite3"
    script_index.build_index(split_sections(OUTLINE, PAGES, LABELS), target, "hash")
    found = script_index.search(target, script_index.query_terms("Heatmap mit pcolormesh und meshgrid"))
    assert (found[0].title, found[0].pages, found[0].pdf_page) == ("1 Arrays › 1.1 Gitter", "1–2", 2)
    assert script_index.search(target, ["schleifen"])[0].title == "2 Schleifen"
    assert script_index.search(target, []) == []
    assert script_index.search(target, ["gitter", "arrays", "schleifen"], max_chars=10) == []


def test_index_is_rebuilt_only_when_pdf_changes(tmp_path, monkeypatch):
    pdf, target, reads = tmp_path / "skript.pdf", tmp_path / "index.sqlite3", []
    monkeypatch.setattr(script_index, "read_pdf", lambda path: reads.append(path) or (OUTLINE, PAGES, LABELS))
    pdf.write_bytes(b"Version 1")
    script_index.ensure_index(pdf, target)
    script_index.ensure_index(pdf, target)
    assert len(reads) == 1
    pdf.write_bytes(b"Version 2")
    script_index.ensure_index(pdf, target)
    assert len(reads) == 2
    with sqlite3.connect(target) as db:
        assert db.execute("SELECT count(*) FROM chunks").fetchone()[0] == 3


def test_missing_or_broken_script_never_breaks_a_hint(tmp_path, monkeypatch):
    assert script_index.script_passages({}, "meshgrid") == []
    config = {"SCRIPT_PDF": str(tmp_path / "fehlt.pdf"), "SCRIPT_INDEX_DB": str(tmp_path / "i.sqlite3")}
    assert script_index.script_passages(config, "meshgrid") == []
    (tmp_path / "kaputt.pdf").write_bytes(b"kein pdf")
    config["SCRIPT_PDF"] = str(tmp_path / "kaputt.pdf")
    assert script_index.script_passages(config, "meshgrid") == []


def test_hint_includes_script_passages_and_returns_sources(monkeypatch, tmp_path):
    seen = []
    original = httpx.Client

    def respond(request):
        seen.append(json.loads(request.content))
        return httpx.Response(200, json={"choices": [{"message": {"content": "Lies Kapitel 1.1, Seite 1."}}]})

    monkeypatch.setattr(tutor, "settings", lambda: {"LITELLM_API_KEY": "secret", "HINT_USAGE_DB": str(tmp_path / "u.db")})
    monkeypatch.setattr(tutor.httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    monkeypatch.setattr(tutor, "script_passages", lambda config, *texts: [
        script_index.Passage("Teil I › 1 Arrays › 1.1 Gitter", "1–2", "Mit np.meshgrid entstehen Koordinatenmatrizen.", 2)])
    payload = type("Payload", (), {"praktikum": "5_praktikum", "code": "pass", "traceback": "", "task": "1",
                                   "part": "a", "question": "Wie geht meshgrid?"})()
    result = tutor.get_hint(payload)

    prompt = seen[0]["messages"][1]["content"]
    assert "Auszüge aus dem Vorlesungsskript:\n[1] 1 Arrays › 1.1 Gitter (S. 1–2)" in prompt
    assert "Skript" in seen[0]["messages"][0]["content"]
    assert result["sources"] == [{"title": "1 Arrays › 1.1 Gitter", "pages": "1–2",
                                  "excerpt": "Mit np.meshgrid entstehen Koordinatenmatrizen.",
                                  "pdf_page": 2, "heading": "1.1 Gitter"}]
    assert result["usage"]["context_characters"]["script_sent"] > 0

