"""Je Test ein Punkt. Funktionsverhalten und geforderte Grundstruktur getrennt."""

import ast
import math
from pathlib import Path

import numpy as np
import pytest
from grader_checks import load_for_test

SOURCE = Path(__file__).with_name("5_praktikum.py")


@pytest.fixture(autouse=True)
def solution(request):
    return load_for_test(SOURCE, request.node.originalname)


def function_node(name):
    tree = ast.parse(SOURCE.read_text(encoding="utf-8"))
    return next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name)


def calls(node, name):
    return any(isinstance(item, ast.Call) and isinstance(item.func, ast.Name)
               and item.func.id == name for item in ast.walk(node))


def test_1a_iterative_values(solution):
    for number in (0, 1, 2, 3, 4, 7, 10):
        assert solution["factorial_iter"](number) == math.factorial(number), f"Fakultät von {number} prüfen."


def test_1a_negative_number(solution):
    with pytest.raises(ValueError):
        solution["factorial_iter"](-2)


def test_1a_iteration():
    node = function_node("factorial_iter")
    assert any(isinstance(item, (ast.For, ast.While)) for item in ast.walk(node)), "Eine iterative Schleife fehlt."
    assert not calls(node, "factorial_iter"), "Aufgabe 1a soll nicht rekursiv sein."


def test_1b_recursive_values(solution):
    for number in (0, 1, 2, 3, 4, 7, 10):
        assert solution["factorial_rec"](number) == math.factorial(number), f"Fakultät von {number} prüfen."


def test_1b_negative_number(solution):
    with pytest.raises(ValueError):
        solution["factorial_rec"](-2)


def test_1b_recursion():
    assert calls(function_node("factorial_rec"), "factorial_rec"), "Der rekursive Selbstaufruf fehlt."


def test_2a_matrix(solution):
    expected = np.random.default_rng(seed=124823).random((5, 5))
    np.testing.assert_allclose(solution["A"], expected, err_msg="Seed 124823 und Form (5, 5) prüfen.")


def test_2b_elements(solution):
    expected = np.random.default_rng(seed=124823).random((5, 5))
    assert solution["a_00"] == pytest.approx(expected[0, 0])
    assert solution["a_12"] == pytest.approx(expected[1, 2])


def test_2c_submatrix_function(solution):
    matrix = np.arange(16).reshape(4, 4)
    for i, j in ((0, 0), (1, 2), (3, 3)):
        expected = np.delete(np.delete(matrix, i, axis=0), j, axis=1)
        np.testing.assert_array_equal(solution["submatrix"](matrix.copy(), i, j), expected)


def test_2c_submatrix_variables(solution):
    matrix = np.random.default_rng(seed=124823).random((5, 5))
    for name, i, j in (("A_00", 0, 0), ("A_12", 1, 2)):
        np.testing.assert_allclose(solution[name], np.delete(np.delete(matrix, i, axis=0), j, axis=1))


def test_2d_determinants(solution):
    for matrix in (np.array([[3.0]]), np.array([[1., 2.], [3., 4.]]),
                   np.zeros((3, 3)), np.eye(4), np.random.default_rng(42).random((5, 5))):
        assert solution["det_laplace"](matrix) == pytest.approx(np.linalg.det(matrix), abs=1e-9)


def test_2d_determinant_variable(solution):
    expected = np.linalg.det(np.random.default_rng(seed=124823).random((5, 5)))
    assert solution["det_A"] == pytest.approx(expected, abs=1e-9)


def test_2d_recursion():
    node = function_node("det_laplace")
    assert calls(node, "det_laplace"), "Laplace benötigt einen rekursiven Selbstaufruf."
    assert not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                   and n.func.attr == "det" for n in ast.walk(node)), "Die Determinante selbst berechnen, nicht det aufrufen."


def test_3a_punctuation(solution):
    for original, expected in (("Entschuldigung, wie spät ist es?", "Entschuldigung wie spät ist es"),
                               ("Hallo!?., Welt", "Hallo Welt"), ("", "")):
        assert solution["remove_punctuation"](original) == expected


def test_3b_word(solution):
    assert solution["echo_word"]("Echo") == "E-C-H-O ECHO echo"
    assert solution["echo_word"]("Hi") == "H-I HI hi"


def test_3c_sentence(solution):
    assert solution["echo"]("Das Echo!") == "D-A-S DAS das ... E-C-H-O ECHO echo"
    assert solution["echo"]("Hi, du!") == "H-I HI hi ... D-U DU du"


def test_3c_reuses_functions():
    node = function_node("echo")
    assert calls(node, "remove_punctuation"), "remove_punctuation verwenden."
    assert calls(node, "echo_word"), "echo_word verwenden."


def test_4_sort_values(solution):
    # Leere Listen sind im vorgegebenen Ablauf nicht definiert und kein Pflichtpunkt.
    for values in ([1, 6, 8, 3, 4, 2, 6, 1], [3], [5, 4, 3, 2, 1], [-2, 4, -2, 0], [1, 2, 3]):
        original = values.copy()
        result = solution["insertion_sort"](values)
        assert result == sorted(original)
        assert result is not values, "Eine neue Liste zurückgeben."
        assert values == original, "Die Eingabeliste nicht verändern."


def test_4_insertion_structure():
    node = function_node("insertion_sort")
    attributes = [n.func.attr for n in ast.walk(node) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)]
    assert "insert" in attributes and "append" in attributes, "insert und append wie in der Aufgabe verwenden."
    assert not calls(node, "sorted") and "sort" not in attributes, "Insertion-Sort selbst umsetzen."
    loops = [n for n in ast.walk(node) if isinstance(n, (ast.For, ast.While))]
    assert any(any(isinstance(child, (ast.For, ast.While)) and child is not loop
                   for child in ast.walk(loop)) for loop in loops), "Die innere Suchschleife fehlt."
