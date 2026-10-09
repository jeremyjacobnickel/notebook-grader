"""Praktikum 1 – je Test ein Punkt.

Nicht automatisch geprüft: 1c und 2d (Textantworten), Aufgabe 7 (Vibe Coding)
und die print-Ausgaben.
"""

import ast

import numpy as np
import pytest

# Fixtures solution/definitions/answer_ast und Marker requires stammen aus conftest.py.


def approx(value):
    return pytest.approx(value, rel=1e-9, abs=1e-12)


@pytest.mark.requires("a")
def test_1_product_sum(solution):
    assert solution["a"] == 156


@pytest.mark.requires("b")
def test_1_square_root(solution):
    assert solution["b"] == approx(16)


@pytest.mark.requires("a")
def test_2_sin_zero(solution):
    assert solution["a"] == approx(0)


@pytest.mark.requires("b")
def test_2_sin_pi(solution):
    # Der Rundungsfehler von np.sin(np.pi) ist gerade der Lerninhalt der Aufgabe.
    assert solution["b"] == np.sin(np.pi), "np.sin und np.pi aus NumPy verwenden."


@pytest.mark.requires("c")
def test_2_cos_pi(solution):
    assert solution["c"] == approx(-1)


@pytest.mark.requires("x", "y")
def test_3_variables(solution):
    assert (solution["x"], solution["y"]) == (10, 4)


@pytest.mark.requires("a", "b")
def test_3_product_and_power(solution):
    assert solution["a"] == 100
    assert solution["b"] == approx(10 ** 10), "Potenz in Python mit ** berechnen (^ ist XOR)."


@pytest.mark.requires("c", "d")
def test_3_difference_and_quotient(solution):
    assert solution["c"] == approx(8)
    assert solution["d"] == approx(2.5)


@pytest.mark.requires("e")
def test_3_factorial(solution, answer_ast):
    assert solution["e"] == 720
    assert any(isinstance(node, ast.Attribute) and node.attr == "factorial"
               and isinstance(node.value, ast.Name) and node.value.id == "math"
               for node in ast.walk(answer_ast)), "math.factorial verwenden."


@pytest.mark.requires("n")
def test_4_pieces(solution):
    assert solution["n"] == approx(5)


@pytest.mark.requires("v")
def test_4_offcut_in_cm(solution):
    assert solution["v"] == approx(10), "Verschnitt in Zentimetern angeben."


def deg(value):
    return np.deg2rad(value)


EXPRESSIONS = {
    "a": (14.5 + 2.8 ** 3) / np.sqrt(19.2 + 4.5 / 0.8 ** 2) + 12.4 * (5.1 - 2.9) ** 4,
    "b": np.sin(deg(45)) * np.cos(deg(30)) + np.tan(deg(60)) / np.sqrt(1 + np.sin(deg(15)) ** 2),
    "c": np.exp(-4.2 / 1.5) * np.log(100) + np.log10(250 * np.sqrt(np.exp(3))),
    "d": np.cbrt((15.2 ** 2 - 4.8) * np.pi / (np.log10(1000) + np.exp(2.1)))
         * (1 / (1 / 2.5 + 1 / 3.8)) ** 1.5,
    "e": np.cbrt((np.sin(deg(60)) ** 2 + np.cos(deg(60)) ** 2) / (np.log(50) * np.log10(100)))
         * np.exp(2.5 / 1.2)
         / ((15.8 * np.pi / np.sqrt(144)) ** -0.5
            + (np.sqrt(np.exp(4) + 2 * np.pi) / (np.tan(deg(60)) + 4.2 / 0.8 ** 2)) ** 2)
         * np.sqrt((12.5 ** 3 - 4.2) * np.log(np.exp(2)) / (np.log10(1000) + 16 ** 0.25)),
}


@pytest.mark.requires("a")
def test_5_expression_a(solution):
    assert solution["a"] == pytest.approx(EXPRESSIONS["a"], rel=1e-6)


@pytest.mark.requires("b")
def test_5_expression_b(solution):
    assert solution["b"] == pytest.approx(EXPRESSIONS["b"], rel=1e-6), "Winkel in Radiant umrechnen."


@pytest.mark.requires("c")
def test_5_expression_c(solution):
    assert solution["c"] == pytest.approx(EXPRESSIONS["c"], rel=1e-6)


@pytest.mark.requires("d")
def test_5_expression_d(solution):
    assert solution["d"] == pytest.approx(EXPRESSIONS["d"], rel=1e-6)


@pytest.mark.requires("e")
def test_5_expression_e(solution):
    assert solution["e"] == pytest.approx(EXPRESSIONS["e"], rel=1e-6)


M, G, ALPHA = 1250, 9.81, np.deg2rad(35)


@pytest.mark.requires("F_g", "alpha_rad")
def test_6_weight_and_angle(solution):
    assert solution["F_g"] == approx(M * G)
    assert solution["alpha_rad"] == approx(ALPHA)


@pytest.mark.requires("F_par", "F_perp")
def test_6_force_components(solution):
    assert solution["F_par"] == approx(M * G * np.sin(ALPHA)), "Komponente parallel zum Ausleger."
    assert solution["F_perp"] == approx(M * G * np.cos(ALPHA)), "Komponente senkrecht zum Ausleger."


@pytest.mark.requires("F_perp_max")
def test_6_specification(solution):
    assert solution["F_perp_max"] == approx(11000)


@pytest.mark.requires("F_a")
def test_6_maximum_accelerating_force(solution):
    # Senkrechte Last (F_g + F_a)·cos(α) darf F_perp_max nicht überschreiten.
    assert solution["F_a"] == pytest.approx(11000 / np.cos(ALPHA) - M * G, rel=1e-6)


@pytest.mark.requires("s")
def test_6_lifting_distance(solution):
    acceleration = (11000 / np.cos(ALPHA) - M * G) / M
    assert solution["s"] == pytest.approx(0.5 * acceleration * 2 ** 2, rel=1e-6)
