"""Praktikum 6 – je Test ein Punkt.

Benötigt faust.txt (Aufgabe 2) und labyrinth.tiff (Aufgabe 4) im Paket.
Nicht automatisch geprüft: die Auswahlfrage in 1b, print-Ausgaben und die
Anzahl der Labyrinth-Iterationen (kein Variablenname vorgegeben).
Aufgabe 3 läuft in einem leeren temporären Ordner, damit die angelegte
Ordnerstruktur den Arbeitsordner nicht verändert.
"""

import ast
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pytest
from PIL import Image

# Fixtures solution/definitions und Marker requires/run_all stammen aus conftest.py.


def all_axes():
    return [ax for number in plt.get_fignums() for ax in plt.figure(number).axes]


def calls_itself(node):
    return any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == node.name
               for n in ast.walk(node))


def original_loop():
    for time in np.arange(0, 1000, 0.1):
        if time == 30.4:
            break
    return time


def variant_1():
    time = 0
    while time < 100000:
        time += 0.1
    return time


def variant_2():
    i, time = 0, 0
    while time < 100000:
        i += 1
        time = i * 0.1
    return time


@pytest.mark.requires("value_of_time_original")
def test_1a_original_loop(solution):
    assert solution["value_of_time_original"] == original_loop(), "Den Quellcode unverändert übernehmen."


@pytest.mark.requires("value_of_time_fix")
def test_1a_fixed_loop(solution):
    assert solution["value_of_time_fix"] == pytest.approx(30.4, abs=1e-9), "Die Schleife soll bei 30.4 abbrechen."


@pytest.mark.requires("time_variant_1", "time_variant_2")
def test_1b_variants(solution):
    assert solution["time_variant_1"] == variant_1()
    assert solution["time_variant_2"] == variant_2()


def faust_text():
    return Path("faust.txt").read_text(encoding="utf-8")


@pytest.mark.requires("faust", "type_of_faust")
def test_2a_load_text(solution):
    assert solution["faust"] == faust_text()
    assert solution["type_of_faust"] is str


@pytest.mark.requires("faust_lines", "faust_nof_lines")
def test_2b_lines(solution):
    lines = faust_text().splitlines()
    assert solution["faust_lines"] == lines
    assert solution["faust_nof_lines"] == len(lines)


@pytest.mark.requires("gretchens_question_lines", "gretchens_question")
def test_2c_gretchen_question(solution):
    lines = faust_text().splitlines()[4218:4226]
    assert solution["gretchens_question_lines"] == lines, "Zeilen 4218 bis einschließlich 4225."
    assert solution["gretchens_question"] == "\n".join(lines)


@pytest.mark.requires("get_speaker")
def test_2d_get_speaker(solution):
    get_speaker = solution["get_speaker"]
    assert get_speaker("    MARGARETE:") == "MARGARETE"
    assert get_speaker("    MARGARETE (sich auf dem Lager verbergend):") == "MARGARETE"
    assert get_speaker("    MEPHISTOPHELES (ab)") == "MEPHISTOPHELES"
    assert get_speaker("    FAUST") == "FAUST"
    assert get_speaker("    DER HERR:") == "DER HERR", "Sprecher können aus mehreren Wörtern bestehen."
    assert not get_speaker("    Nun sage, wie hast du's mit der Religion?")
    assert not get_speaker("    (Er geht ab.)")


@pytest.mark.requires("speakers", "nof_speakers")
def test_2d_speakers(solution):
    get_speaker = solution["get_speaker"]
    expected = {get_speaker(line) for line in faust_text().splitlines() if get_speaker(line)}
    assert set(solution["speakers"]) == expected
    assert solution["nof_speakers"] == len(expected)


@pytest.mark.requires("spoken_by_speaker", "spoken_lines_by_speaker")
def test_2e_lines_per_speaker(solution):
    spoken, counts = solution["spoken_by_speaker"], solution["spoken_lines_by_speaker"]
    assert counts == {speaker: len(lines) for speaker, lines in spoken.items()}
    assert not any(line.strip().startswith("(") and line.strip().endswith(")")
                   for lines in spoken.values() for line in lines), "Reine Regie-Zeilen nicht zuordnen."
    assert (counts.get("OBERON"), counts.get("MEPHISTOPHELES")) == (8, 1331), "Kontrollwerte aus der Aufgabe."


@pytest.mark.requires("spoken_lines_by_speaker_sorted")
def test_2f_sorted(solution):
    counts = solution["spoken_lines_by_speaker"]
    expected = sorted(counts.items(), key=lambda item: -item[1])  # stabil: Gleichstand behält Reihenfolge
    assert list(solution["spoken_lines_by_speaker_sorted"].items()) == expected


TREE = ["folder/subfolder_a/file_a1.txt", "folder/subfolder_a/file_a2.txt", "folder/subfolder_b/file_b1.txt",
        "folder/subfolder_b/subsubfolder_b/file_b2.txt", "folder/subfolder_b/subsubfolder_b/file_b3.txt"]
B_FILES = {"file_b1.txt", "file_b2.txt", "file_b3.txt"}


@pytest.fixture
def empty_dir(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    return tmp_path


def names(paths):
    return {Path(path).name for path in paths}


def test_3a_folder_structure(empty_dir, solution):
    created = {path.relative_to(empty_dir).as_posix() for path in empty_dir.rglob("*") if path.is_file()}
    assert created == set(TREE), "Ordnerstruktur und Dateinamen prüfen."


@pytest.mark.run_all
@pytest.mark.requires("files")
def test_3b_glob(empty_dir, solution):
    assert names(solution["files"]) == B_FILES
    assert len(solution["files"]) == len(B_FILES)


@pytest.mark.run_all
@pytest.mark.requires("find_txt_with_b", "files_rec")
def test_3c_recursive_search(empty_dir, solution, definitions):
    assert names(solution["files_rec"]) == B_FILES
    assert len(solution["files_rec"]) == len(B_FILES)
    assert calls_itself(definitions["find_txt_with_b"]), "find_txt_with_b soll sich selbst aufrufen."


def person(position, orientation, shape=(4, 4)):
    return {"map": np.full(shape, 255.0), "position": np.array(position), "orientation": orientation}


@pytest.mark.requires("labyrinth")
def test_4a_load_labyrinth(solution):
    expected = np.array(Image.open("labyrinth.tiff"))
    np.testing.assert_array_equal(solution["labyrinth"], expected)
    assert any(ax.images for ax in all_axes()), "Das Labyrinth mit imshow darstellen."


@pytest.mark.requires("init_person")
def test_4b_init_person(solution):
    created = solution["init_person"]((5, 6), [0, 1])
    expected = np.full((5, 6), 255)
    expected[0, 1] = 205
    np.testing.assert_array_equal(created["map"], expected)
    np.testing.assert_array_equal(created["position"], [0, 1])
    assert isinstance(created["position"], np.ndarray), "position als 1D-Array speichern."
    assert created["orientation"] == 0


@pytest.mark.requires("get_direction")
def test_4c_get_direction(solution):
    for orientation, direction in enumerate(([-1, 0], [0, 1], [1, 0], [0, -1])):
        np.testing.assert_array_equal(solution["get_direction"](person([2, 2], orientation)), direction)


@pytest.mark.requires("get_next_position")
def test_4d_get_next_position(solution):
    np.testing.assert_array_equal(solution["get_next_position"](person([2, 2], 2)), [3, 2])
    np.testing.assert_array_equal(solution["get_next_position"](person([2, 2], 3)), [2, 1])


@pytest.mark.requires("is_step_possible")
def test_4e_is_step_possible(solution):
    is_step_possible = solution["is_step_possible"]
    labyrinth = np.full((4, 4), 255)
    labyrinth[2, 2] = 0
    assert is_step_possible(person([1, 2], 1), labyrinth), "Freies Feld voraus."
    walker = person([1, 2], 2)
    assert not is_step_possible(walker, labyrinth), "Wand voraus."
    assert walker["map"][2, 2] == 0, "Erkannte Wand in person['map'] mit 0 markieren."
    for position, orientation in (([0, 1], 0), ([3, 1], 2), ([1, 0], 3), ([1, 3], 1)):
        assert not is_step_possible(person(position, orientation), labyrinth), "Außerhalb des Labyrinths."


@pytest.mark.requires("go_one_step")
def test_4f_go_one_step(solution):
    walker = person([1, 1], 1)
    walker["map"][1, 2] = 30
    solution["go_one_step"](walker)
    np.testing.assert_array_equal(walker["position"], [1, 2])
    assert walker["map"][1, 2] == 1, "Wert um 50 reduzieren, aber nicht unter 1."
    solution["go_one_step"](walker)
    assert walker["map"][1, 3] == 205


@pytest.mark.requires("turn_right")
def test_4g_turn_right(solution):
    for start, expected in ((0, 1), (1, 2), (3, 0)):
        walker = person([1, 1], start)
        solution["turn_right"](walker)
        assert walker["orientation"] == expected


@pytest.mark.requires("turn_left")
def test_4h_turn_left(solution):
    for start, expected in ((0, 3), (2, 1), (3, 2)):
        walker = person([1, 1], start)
        solution["turn_left"](walker)
        assert walker["orientation"] == expected


@pytest.mark.requires("is_at_end_position")
def test_4i_is_at_end_position(solution):
    assert solution["is_at_end_position"](person([16, 17], 0))
    assert not solution["is_at_end_position"](person([16, 16], 0))
    assert not solution["is_at_end_position"](person([17, 16], 0))


@pytest.mark.run_all
@pytest.mark.requires("person")
def test_4j_reaches_exit(solution):
    walker = solution["person"]
    np.testing.assert_array_equal(walker["position"], [16, 17])
    assert walker["map"][16, 17] < 255 and walker["map"][0, 1] < 255, "Start und Ausgang wurden besucht."


@pytest.mark.run_all
@pytest.mark.requires("person")
def test_4j_plot(solution):
    titled = {ax.get_title(): ax for ax in all_axes() if ax.images}
    assert {"Labyrinth", "Karte"} <= set(titled), "Subplots mit den Titeln Labyrinth und Karte erwartet."
    assert titled["Labyrinth"].get_position().x0 < titled["Karte"].get_position().x0, "Nebeneinander anordnen."
    np.testing.assert_array_equal(titled["Karte"].images[0].get_array(), solution["person"]["map"])
