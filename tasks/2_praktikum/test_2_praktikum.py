"""Praktikum 2 – je Test ein Punkt.

Nicht automatisch geprüft: Aufgabe 3 (Genauigkeit von binary32 ohne
vorgegebene Variablennamen) und optionale Ausgaben.
"""

import ast

import numpy as np
import pytest

# Fixtures solution/definitions und Marker requires stammen aus conftest.py.


def approx(value):
    return pytest.approx(value, rel=1e-9, abs=1e-12)


def same_array(actual, expected):
    np.testing.assert_allclose(np.asarray(actual, dtype=float), np.asarray(expected, dtype=float))
    assert np.shape(actual) == np.shape(expected), f"Form {np.shape(expected)} erwartet."


def indexes(definitions, name, source="a"):
    """Wert entsteht per Indizierung von `source`, nicht als Literal."""
    node = definitions[name]
    value = node.value if isinstance(node, ast.Assign) else None
    return isinstance(value, ast.Subscript) and isinstance(value.value, ast.Name) and value.value.id == source


@pytest.mark.requires("decimal_number")
def test_1a_decimal_number(solution):
    assert solution["decimal_number"] == approx(8.6875)


@pytest.mark.requires("number_of_numbers_uint", "maximum_number_uint")
def test_1b_unsigned_12bit(solution):
    assert solution["number_of_numbers_uint"] == 4096
    assert solution["maximum_number_uint"] == 4095


@pytest.mark.requires("number_of_numbers_int", "maximum_number_int")
def test_1c_signed_12bit(solution):
    assert solution["number_of_numbers_int"] == 4096
    assert solution["maximum_number_int"] == 2047


@pytest.mark.requires("nof_bits_m", "nof_bits_n")
def test_1d_fixed_point_bits(solution):
    assert solution["nof_bits_m"] == 4, "Schrittweite 2^-m darf höchstens 0.1 sein."
    assert solution["nof_bits_n"] == 10, "Der Wertebereich bis 1000 muss abgedeckt sein."


@pytest.mark.requires("max_value", "approximate_number")
def test_1d_fixed_point_values(solution):
    assert solution["max_value"] == approx(2 ** 10 - 2 ** -4)
    assert solution["approximate_number"] == approx(int(500.1 * 2 ** 4) * 2 ** -4)


@pytest.mark.requires("deviation_in_percent", "complain")
def test_2a_terabyte_deviation(solution):
    assert solution["deviation_in_percent"] == pytest.approx((2 ** 40 / 10 ** 12 - 1) * 100, rel=1e-9)
    assert not solution["complain"], "Sie haben mehr Speicher erhalten als ausgewiesen."


@pytest.mark.requires("transfer_time", "smart")
def test_2b_transfer_time(solution):
    assert solution["transfer_time"] == pytest.approx(100e12 * 8 / 1e9 / 86400, rel=1e-9), "Dauer in Tagen."
    assert not solution["smart"], "Die Übertragung dauert länger als die Luftfracht."


@pytest.mark.requires("frame_size", "sequence_size")
def test_2c_video_size(solution):
    frame = 7680 * 4320 * 24
    assert solution["frame_size"] == approx(frame), "Größe eines Frames in bit."
    assert solution["sequence_size"] == pytest.approx(frame * 60 * 60 / 8 / 2 ** 30, rel=1e-9), "Größe in GiB."


V = np.array([2, 4, 6])


@pytest.mark.requires("v", "a", "b", "c")
def test_4_scaling(solution):
    same_array(solution["v"], V)
    same_array(solution["a"], 2 * V)
    same_array(solution["b"], V / 2)
    same_array(solution["c"], V + V / 2)


@pytest.mark.requires("d", "e", "f")
def test_4_hadamard_and_dot(solution):
    same_array(solution["d"], V * V)
    same_array(solution["e"], V / V)
    assert solution["f"] == approx(56), "Skalarprodukt ⟨v, v⟩."


A_5 = np.arange(1, 11).reshape(2, 5)
G = np.array([[1, 2, 3, 4], [3, 4, 5, 6]])


@pytest.mark.requires("a", "b", "c", "d")
def test_5a_arrays(solution):
    same_array(solution["a"], A_5)
    same_array(solution["b"], A_5.T)
    same_array(solution["c"], np.ones((2, 4)))
    same_array(solution["d"], np.diag([1, 2, 3, 4, 5]))


@pytest.mark.requires("e", "f")
def test_5b_calculation(solution):
    same_array(solution["e"], 2 * A_5.T - A_5.T)
    assert solution["f"] == approx(55)


@pytest.mark.requires("h1", "h2")
def test_5c_broadcasting(solution):
    target = np.array([[4, 14, 3, 4], [12, 28, 5, 6]])
    h1, h2 = np.asarray(solution["h1"]), np.asarray(solution["h2"])
    assert h1.ndim == 1, "h1 soll ein 1D-Array sein."
    assert h2.ndim == 2 and min(h2.shape) > 1, "h2 soll ein 2D-Array mit mehr als einer Zeile und Spalte sein."
    np.testing.assert_array_equal(G * h1, target)
    np.testing.assert_array_equal(G * h2, target)


@pytest.mark.requires("k")
def test_5d_row_factors(solution):
    k = np.asarray(solution["k"])
    assert k.shape == (2, 1), "k soll zwei Zeilen und eine Spalte haben."
    np.testing.assert_array_equal(G * k, [[2, 4, 6, 8], [9, 12, 15, 18]])


A_6 = np.arange(2, 21)


@pytest.mark.requires("a")
def test_6_arange(solution):
    same_array(solution["a"], A_6)


@pytest.mark.requires("b", "c", "d")
def test_6_single_elements(solution, definitions):
    assert (solution["b"], solution["c"], solution["d"]) == (7, 2, 20)
    assert all(indexes(definitions, name) for name in "bcd"), "b, c und d durch Indizierung von a erzeugen."


@pytest.mark.requires("e", "f", "g", "h")
def test_6_slices(solution):
    same_array(solution["e"], [2, 3, 4])
    same_array(solution["f"], [4, 3, 2])
    same_array(solution["g"], [4, 8, 12, 16, 20])
    same_array(solution["h"], [20, 16, 12, 8, 4])


@pytest.mark.requires("i")
def test_6_index_list(solution, definitions):
    same_array(solution["i"], [2, 3, 11])
    assert indexes(definitions, "i"), "i durch Indizierung von a mit einer Indexliste erzeugen."


A_7 = np.linspace(1, 12, 12).reshape(3, 4)


@pytest.mark.requires("a")
def test_7_array(solution):
    same_array(solution["a"], A_7)


@pytest.mark.requires("b", "c", "d")
def test_7_rows_and_blocks(solution):
    same_array(solution["b"], [1, 2, 3, 4])
    np.testing.assert_allclose(np.ravel(solution["c"]), [1, 5, 9])
    same_array(solution["d"], [[2, 3], [6, 7]])


@pytest.mark.requires("e", "f", "g")
def test_7_steps_and_reverse(solution):
    same_array(solution["e"], [[1, 3], [5, 7]])
    same_array(solution["f"], [[2, 4], [10, 12]])
    same_array(solution["g"], [[3, 1], [7, 5]])


@pytest.mark.requires("h")
def test_7_assignment(solution):
    same_array(solution["h"], [[0, 2, 3, 4], [5, 6, 1, 1], [9, 47, 11, 12]])
    if "a" in solution:
        same_array(solution["a"], A_7)  # h = a.copy(): a bleibt unverändert
