"""Praktikum 3 – je Test ein Punkt.

Benötigt peppers.tiff im Paket (Aufgabe 2). Abbildungen werden locker geprüft:
Inhalt, Beschriftungen und Anordnung, nicht das Aussehen.
"""

import ast

import matplotlib.pyplot as plt
import numpy as np
import pytest
from PIL import Image

# Fixtures solution/definitions/answer_ast und Marker requires stammen aus conftest.py.


def plain(label):
    return label.replace("$", "").replace("\\", "").replace(" ", "").lower()


def all_axes():
    return [ax for number in plt.get_fignums() for ax in plt.figure(number).axes]


def grid_on(ax):
    return ax.xaxis.get_gridlines()[0].get_visible() and ax.yaxis.get_gridlines()[0].get_visible()


def by_position(axes):
    """Oben links, oben rechts, unten links, unten rechts."""
    return sorted(axes, key=lambda ax: (-round(ax.get_position().y0, 2), round(ax.get_position().x0, 2)))


def indexed(definitions, name):
    node = definitions[name]
    return isinstance(node, ast.Assign) and isinstance(node.value, ast.Subscript)


def peppers():
    return np.array(Image.open("peppers.tiff").convert("L"))


def test_1_sine_plot(solution):
    lines = [(ax, line) for ax in all_axes() for line in ax.get_lines()]
    assert lines, "Keine Kurve gefunden. Mit ax.plot bzw. plt.plot zeichnen."
    ax, line = lines[0]
    x, y = line.get_xdata(), line.get_ydata()
    assert len(x) == 100, "100 Stützstellen mit np.linspace verwenden."
    np.testing.assert_allclose([x[0], x[-1]], [-np.pi, np.pi])
    np.testing.assert_allclose(y, np.sin(x))
    assert plain(ax.get_xlabel()) == "x" and "sin" in plain(ax.get_ylabel()), "Achsen beschriften."
    assert grid_on(ax), "Seitengitter hinzufügen."


@pytest.mark.requires("Image")
def test_2a_pil_import(solution):
    assert solution["Image"] is Image


@pytest.mark.requires("image")
def test_2b_load_image(solution):
    np.testing.assert_array_equal(solution["image"], peppers())


@pytest.mark.requires("image_mv")
def test_2c_mirror_vertical_axis(solution, definitions):
    np.testing.assert_array_equal(solution["image_mv"], np.fliplr(peppers()))
    assert indexed(definitions, "image_mv"), "Durch Indizierung spiegeln."


@pytest.mark.requires("image_mh")
def test_2d_mirror_horizontal_axis(solution, definitions):
    np.testing.assert_array_equal(solution["image_mh"], np.flipud(peppers()))
    assert indexed(definitions, "image_mh"), "Durch Indizierung spiegeln."


@pytest.mark.requires("image_mvh")
def test_2e_point_reflection(solution, definitions):
    np.testing.assert_array_equal(solution["image_mvh"], np.rot90(peppers(), 2))
    assert indexed(definitions, "image_mvh"), "Durch Indizierung spiegeln."


def test_2f_subplots(solution):
    axes = by_position([ax for ax in all_axes() if ax.images])
    assert len(axes) == 4, "Vier Unterabbildungen mit imshow erwartet."
    image = peppers()
    expected = {"image": image, "image_mv": np.fliplr(image), "image_mh": np.flipud(image),
                "image_mvh": np.rot90(image, 2)}
    assert [ax.get_title() for ax in axes] == list(expected), "Titel und Anordnung prüfen."
    for ax, data in zip(axes, expected.values()):
        np.testing.assert_array_equal(ax.images[0].get_array(), data)


@pytest.mark.requires("image_coll")
def test_2g_collage(solution):
    image = peppers()
    collage = solution["image_coll"]
    assert collage.dtype == np.uint8, "Datentyp np.uint8 verwenden."
    np.testing.assert_array_equal(collage, np.block([[image, np.fliplr(image)],
                                                     [np.flipud(image), np.rot90(image, 2)]]))


A_3 = np.arange(1, 10).reshape(3, 3)
X_3 = np.array([[1], [4], [7]])
Y_3 = np.array([1, 4, 7])


@pytest.mark.requires("A", "x", "a1", "a2", "a3")
def test_3_column_vector_products(solution):
    np.testing.assert_array_equal(solution["A"], A_3)
    np.testing.assert_array_equal(solution["x"], X_3)
    np.testing.assert_array_equal(solution["a1"], A_3 @ X_3)
    np.testing.assert_array_equal(solution["a2"], X_3.T @ A_3)
    np.testing.assert_array_equal(solution["a3"], X_3.T @ A_3 @ X_3)


@pytest.mark.requires("a4", "a5", "a6")
def test_3_column_vector_shapes(solution):
    assert tuple(solution["a4"]) == (1, 1)
    np.testing.assert_array_equal(solution["a5"], X_3.T @ A_3.T @ A_3 @ X_3)
    assert tuple(solution["a6"]) == (1, 1)


@pytest.mark.requires("y", "b1", "b2", "b3")
def test_3_flat_vector_products(solution):
    np.testing.assert_array_equal(solution["y"], Y_3)
    assert np.ndim(solution["y"]) == 1, "y als 1D-Array definieren."
    np.testing.assert_array_equal(solution["b1"], A_3 @ Y_3)
    np.testing.assert_array_equal(solution["b2"], Y_3 @ A_3)
    assert solution["b3"] == Y_3 @ A_3 @ Y_3


@pytest.mark.requires("b4", "b5", "b6")
def test_3_flat_vector_shapes(solution):
    assert tuple(solution["b4"]) == ()
    assert solution["b5"] == Y_3 @ A_3.T @ A_3 @ Y_3
    assert tuple(solution["b6"]) == ()


X_4 = np.arange(1, 10).reshape(3, 3)
Y_4 = np.array([[10, 11, 12], [13, 14, 15]]).T
Z_4 = np.array([[14, 15, 16]])


@pytest.mark.requires("X", "Y", "Z")
def test_4a_matrices(solution):
    np.testing.assert_array_equal(solution["X"], X_4)
    np.testing.assert_array_equal(solution["Y"], Y_4)
    np.testing.assert_array_equal(solution["Z"], Z_4)
    assert np.ndim(solution["Z"]) == 2, "Z als 2D-Array definieren."


def loads(definitions, name, *sources):
    return {n.id for n in ast.walk(definitions[name]) if isinstance(n, ast.Name)} >= set(sources)


@pytest.mark.requires("nof_rows")
def test_4b_rows(solution, definitions):
    assert solution["nof_rows"] == 4
    assert loads(definitions, "nof_rows", "X", "Z"), "Mit .shape von X und Z berechnen."


@pytest.mark.requires("nof_columns")
def test_4c_columns(solution, definitions):
    assert solution["nof_columns"] == 5
    assert loads(definitions, "nof_columns", "X", "Y"), "Mit .shape von X und Y berechnen."


@pytest.mark.requires("P")
def test_4d_block_matrix(solution, answer_ast):
    expected = np.zeros((4, 5))
    expected[:3, :3], expected[:3, 3:], expected[3:, :3] = X_4, Y_4, Z_4
    np.testing.assert_array_equal(solution["P"], expected)
    assert not any(isinstance(node, ast.Attribute) and node.attr == "block" for node in ast.walk(answer_ast)), \
        "np.block soll nicht verwendet werden."


POINTS = np.array([[1, 3, 1, 3, 2], [1, 1, 3, 3, 4.7]]).T
R_90 = np.array([[np.cos(np.pi / 2), -np.sin(np.pi / 2)], [np.sin(np.pi / 2), np.cos(np.pi / 2)]])


@pytest.mark.requires("points")
def test_5a_points(solution):
    np.testing.assert_allclose(solution["points"], POINTS)


@pytest.mark.requires("R")
def test_5b_rotation_matrix(solution):
    np.testing.assert_allclose(solution["R"], R_90, atol=1e-12)


@pytest.mark.requires("points2")
def test_5c_rotated_points(solution):
    np.testing.assert_allclose(solution["points2"], POINTS @ R_90.T, atol=1e-12)


def test_5d_scatter_plot(solution):
    axes = [ax for ax in all_axes() if len(ax.collections) >= 2]
    assert axes, "Zwei Scatter-Plots in einer Abbildung erwartet."
    ax = axes[0]
    offsets = [np.asarray(c.get_offsets()) for c in ax.collections[:2]]
    np.testing.assert_allclose(offsets[0], POINTS)
    np.testing.assert_allclose(offsets[1], POINTS @ R_90.T, atol=1e-12)
    assert [c.get_label() for c in ax.collections[:2]] == ["Punkte", "Punkte gedreht"]
    assert ax.get_title() == "Drehung mit Drehmatrix"
    assert ax.get_legend() is not None, "Legende hinzufügen."
    assert grid_on(ax), "Seitengitter hinzufügen."
    assert plain(ax.get_xlabel()) == "x" and plain(ax.get_ylabel()) == "y"
    assert tuple(ax.get_xlim()) == (-6, 4) and tuple(ax.get_ylim()) == (-2, 8)
    assert ax.get_aspect() == 1.0, "ax.set_aspect('equal') verwenden."


A_6 = np.array([[1, 1, 1], [0, 2, 5], [0, 6, 5]])


@pytest.mark.requires("A", "F")
def test_6a_triangle_area(solution):
    np.testing.assert_allclose(solution["A"], A_6)
    assert solution["F"] == pytest.approx(abs(0.5 * np.linalg.det(A_6)))


@pytest.mark.requires("ab", "bc", "ca")
def test_6b_side_lengths(solution):
    assert solution["ab"] == pytest.approx(np.sqrt(40))
    assert solution["bc"] == pytest.approx(np.sqrt(10))
    assert solution["ca"] == pytest.approx(np.sqrt(50))


M_7, G_7, F_7, ALPHA, BETA, A_7 = 5000, 3000, 4000, np.deg2rad(40), np.deg2rad(30), 2
FX = F_7 * np.cos(ALPHA) * np.cos(BETA)
FY = F_7 * np.cos(ALPHA) * np.sin(BETA)
FZ = F_7 * np.sin(ALPHA)
GAMMA = np.arctan(A_7 / (2 * A_7))


def truss_system():
    a, t = A_7, np.tan(GAMMA)
    matrix = np.array([
        [1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, -t, 1, 0, 0],
        [0, 0, 1, 0, 1, 1, 1],
        [0, 0, 0, -a, 0, 2 * a, 2 * a],
        [0, 0, 0, 0, 0, 0, -3 * a],
        [0, -2 * a, 0, 0, 0, 0, 0],
    ])
    rhs = np.array([FX, -FY, 0, -FZ - G_7, -a * G_7, -M_7 + 1.5 * a * G_7 + 3 * a * FZ, -3 * a * FY])
    return matrix, rhs


@pytest.mark.requires("M", "G", "F", "alpha", "beta", "a")
def test_7a_given_values(solution):
    values = [solution[name] for name in ("M", "G", "F", "alpha", "beta", "a")]
    assert values == pytest.approx([M_7, G_7, F_7, ALPHA, BETA, A_7]), "SI-Einheiten (N, Nm, m) und Radiant."


@pytest.mark.requires("F_x", "F_y", "F_z")
def test_7b_force_components(solution):
    assert [solution["F_x"], solution["F_y"], solution["F_z"]] == pytest.approx([FX, FY, FZ])


@pytest.mark.requires("gamma")
def test_7c_gamma(solution):
    assert solution["gamma"] == pytest.approx(GAMMA)


@pytest.mark.requires("A", "b")
def test_7d_equation_system(solution):
    matrix, rhs = np.asarray(solution["A"], dtype=float), np.asarray(solution["b"], dtype=float)
    assert matrix.shape == (7, 7), "A ist eine 7x7-Matrix."
    forces = np.linalg.solve(*truss_system())
    np.testing.assert_allclose(matrix @ forces, rhs.ravel(), atol=1e-6)


@pytest.mark.requires("forces")
def test_7e_solution(solution):
    np.testing.assert_allclose(np.ravel(solution["forces"]), np.linalg.solve(*truss_system()), rtol=1e-9)
