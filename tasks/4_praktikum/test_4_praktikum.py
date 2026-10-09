"""Praktikum 4 – je Test ein Punkt.

Benötigt peppers.tiff im Paket (Aufgabe 1). Abbildungen werden locker geprüft:
Inhalt, Beschriftungen und Anordnung, nicht das Aussehen.
"""

import ast

import matplotlib.pyplot as plt
import numpy as np
import pytest
from matplotlib.collections import QuadMesh
from PIL import Image

# Fixtures solution/answer_ast und Marker requires stammen aus conftest.py.

KERNEL = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])


def plain(label):
    return label.replace("$", "").replace("\\", "").replace(" ", "").lower()


def all_axes():
    return [ax for number in plt.get_fignums() for ax in plt.figure(number).axes]


def grid_on(ax):
    return ax.xaxis.get_gridlines()[0].get_visible() and ax.yaxis.get_gridlines()[0].get_visible()


def nested_for(tree):
    return any(isinstance(inner, ast.For) and inner is not outer
               for outer in ast.walk(tree) if isinstance(outer, ast.For) for inner in ast.walk(outer))


def peppers():
    return np.array(Image.open("peppers.tiff").convert("L"))


def sobel(image):
    windows = np.lib.stride_tricks.sliding_window_view(image.astype(float), (3, 3))
    return np.clip(np.abs(np.sum(windows * KERNEL, axis=(2, 3))), 0, 255)


def image_axes(data):
    return [ax for ax in all_axes() for shown in ax.images
            if np.shape(shown.get_array()) == np.shape(data) and np.allclose(shown.get_array(), data)]


@pytest.mark.requires("image")
def test_1a_load_image(solution):
    np.testing.assert_array_equal(solution["image"], peppers())


def test_1b_show_image(solution):
    axes = image_axes(peppers())
    assert axes, "image mit imshow darstellen."
    assert plain(axes[0].get_xlabel()) == "pixelindexx" and plain(axes[0].get_ylabel()) == "pixelindexy"


@pytest.mark.requires("filter_kernel", "image_fold")
def test_1c_sobel_values(solution):
    np.testing.assert_array_equal(solution["filter_kernel"], KERNEL)
    np.testing.assert_allclose(solution["image_fold"], sobel(peppers()))


@pytest.mark.requires("image_fold")
def test_1c_nested_loops(answer_ast):
    assert nested_for(answer_ast), "Zwei ineinander geschachtelte for-Schleifen verwenden."


def test_1d_show_result(solution):
    axes = image_axes(sobel(peppers()))
    assert axes, "image_fold mit imshow darstellen."
    assert plain(axes[0].get_xlabel()) == "pixelindexx" and plain(axes[0].get_ylabel()) == "pixelindexy"


GRID_X, GRID_Y = np.meshgrid(np.linspace(-np.pi, np.pi, 50), np.linspace(-2 * np.pi, 2 * np.pi, 50))


@pytest.mark.requires("x", "y", "X", "Y", "Z")
def test_2_grid_values(solution):
    np.testing.assert_allclose(solution["X"], GRID_X)
    np.testing.assert_allclose(solution["Y"], GRID_Y)
    np.testing.assert_allclose(solution["Z"], np.sin(GRID_X) * np.cos(GRID_Y), atol=1e-12)


@pytest.mark.requires("Z")
def test_2_nested_loops(answer_ast):
    assert nested_for(answer_ast), "Z mit zwei ineinander geschachtelten for-Schleifen berechnen."


def test_2_heatmap_and_contour(solution):
    axes = sorted(all_axes(), key=lambda ax: ax.get_position().x0)
    heatmaps = [ax for ax in axes if any(isinstance(c, QuadMesh) for c in ax.collections)]
    contours = [ax for ax in axes if ax not in heatmaps and ax.collections]
    assert heatmaps and contours, "Heatmap (pcolormesh) und Konturplot (contour) erwartet."
    left, right = heatmaps[0], contours[0]
    assert left.get_position().x0 < right.get_position().x0, "Heatmap links, Konturplot rechts."
    assert (left.get_title(), right.get_title()) == ("Heatmap", "Konturplot")
    for ax in (left, right):
        assert (plain(ax.get_xlabel()), plain(ax.get_ylabel())) == ("x", "y"), "Achsen mit x und y beschriften."


def sigma(x):
    return 1 / (1 + np.exp(-x))


X_3 = np.linspace(-5, 5, 30)


@pytest.mark.requires("sigmoid", "dsigmoid_dx")
def test_3a_functions(solution):
    values = np.array([-3.0, 0.0, 0.5, 4.0])
    np.testing.assert_allclose(solution["sigmoid"](values), sigma(values))
    np.testing.assert_allclose(solution["dsigmoid_dx"](values), sigma(values) * (1 - sigma(values)))


@pytest.mark.requires("x", "y")
def test_3b_samples(solution):
    np.testing.assert_allclose(solution["x"], X_3)
    np.testing.assert_allclose(solution["y"], sigma(X_3))


@pytest.mark.requires("dy_dx", "dy_dx_approx")
def test_3c_derivatives(solution, answer_ast):
    np.testing.assert_allclose(solution["dy_dx"], sigma(X_3) * (1 - sigma(X_3)))
    np.testing.assert_allclose(solution["dy_dx_approx"], np.diff(sigma(X_3)) / np.diff(X_3))
    assert any(isinstance(n, ast.Attribute) and n.attr == "diff" for n in ast.walk(answer_ast)), "np.diff verwenden."


def test_3d_plot(solution):
    lines = [line for ax in all_axes() for line in ax.get_lines()]
    assert len(lines) >= 3, "Drei Kurven erwartet."
    ax = lines[0].axes
    labels = [r"$\sigma(x)$", r"$\frac{\mathrm{d}\,\sigma(x)}{\mathrm{d}\,x}$", r"$\frac{\Delta \sigma(x)}{\Delta x}$"]
    assert [line.get_label() for line in lines[:3]] == labels, "Labels und Reihenfolge der Kurven prüfen."
    np.testing.assert_allclose(lines[0].get_ydata(), sigma(X_3))
    np.testing.assert_allclose(lines[1].get_ydata(), sigma(X_3) * (1 - sigma(X_3)))
    np.testing.assert_allclose(lines[2].get_xdata(), X_3[:-1], err_msg="Vorwärts-Differenz: x ohne letztes Element.")
    assert plain(ax.get_xlabel()) == "x"
    assert ax.get_legend() is not None, "Legende hinzufügen."
    assert grid_on(ax), "Seitengitter hinzufügen."


def multiples(number):
    return sum(value for value in range(1, number + 1) if value % 5 == 0 or value % 7 == 0)


@pytest.mark.requires("calc_multiples_of_5_or_7")
def test_4_sum_of_multiples(solution):
    calc = solution["calc_multiples_of_5_or_7"]
    assert calc(20) == 71, "Beispiel aus der Aufgabe: 20 -> 71."
    for number in (4, 5, 35, 100, 1000):
        assert calc(number) == multiples(number), f"Summe bis {number} prüfen."


@pytest.mark.requires("calc_multiples_of_5_or_7")
def test_4_modulo(definitions):
    node = definitions["calc_multiples_of_5_or_7"]
    assert any(isinstance(n, ast.BinOp) and isinstance(n.op, ast.Mod) for n in ast.walk(node)), \
        "Den Modulo-Operator % verwenden."


@pytest.mark.requires("matmul")
def test_5_products(solution):
    matmul = solution["matmul"]
    a = np.array([[1, 2, 3]])
    np.testing.assert_allclose(matmul(a, np.array([[4], [5], [6]])), [[32]])
    b = np.array([[1, 2, 3], [4, 5, 6]])
    np.testing.assert_allclose(matmul(b, b.T), b @ b.T)
    rng = np.random.default_rng(5)
    left, right = rng.random((3, 4)), rng.random((4, 2))
    np.testing.assert_allclose(matmul(left, right), left @ right)


@pytest.mark.requires("matmul")
def test_5_errors(solution):
    matmul = solution["matmul"]
    with pytest.raises(ValueError, match="invalid matrix dimensions"):
        matmul(np.array([1, 2, 3]), np.array([[1], [2], [3]]))
    with pytest.raises(ValueError, match="shapes do not match"):
        matmul(np.ones((2, 3)), np.ones((2, 3)))


@pytest.mark.requires("matmul")
def test_5_loops_without_library_product(definitions):
    node = definitions["matmul"]
    assert any(isinstance(n, (ast.For, ast.While)) for n in ast.walk(node)), "Mit Schleifen berechnen."
    assert not any(isinstance(n, ast.BinOp) and isinstance(n.op, ast.MatMult) for n in ast.walk(node)), "@ ist nicht erlaubt."
    assert not any(isinstance(n, ast.Attribute) and n.attr in ("dot", "matmul", "inner", "einsum", "tensordot")
                   for n in ast.walk(node)), "dot/matmul sind nicht erlaubt."


def f_6(x):
    return 4 * (x - 2) ** 3 + x


def secant():
    previous, current, iterations = -2.0, 5.0, 0
    while True:
        following = current - (current - previous) / (f_6(current) - f_6(previous)) * f_6(current)
        previous, current, iterations = current, following, iterations + 1
        if abs(current - previous) < 1e-6:
            return current, iterations


@pytest.mark.requires("f")
def test_6a_function(solution):
    values = np.array([-2.0, 0.0, 1.5, 5.0])
    np.testing.assert_allclose(solution["f"](values), f_6(values))


def test_6a_plot(solution):
    x = np.linspace(-2, 5, 100)
    lines = [line for ax in all_axes() for line in ax.get_lines()
             if len(line.get_xdata()) == 100 and np.allclose(line.get_xdata(), x)]
    assert lines, "f(x) mit 100 Stützstellen zwischen -2 und 5 plotten."
    np.testing.assert_allclose(lines[0].get_ydata(), f_6(x))
    ax = lines[0].axes
    assert (plain(ax.get_xlabel()), plain(ax.get_ylabel())) == ("x", "f(x)")
    assert grid_on(ax), "Seitengitter hinzufügen."


@pytest.mark.requires("root", "value", "nof_iterations")
def test_6b_secant_method(solution):
    root, iterations = secant()
    assert solution["root"] == pytest.approx(root, abs=1e-6)
    assert solution["value"] == pytest.approx(f_6(solution["root"]), abs=1e-9)
    assert abs(solution["value"]) < 1e-4, "Der Funktionswert an der Nullstelle ist nahe 0."
    assert abs(solution["nof_iterations"] - iterations) <= 1, f"Etwa {iterations} Iterationen erwartet."
