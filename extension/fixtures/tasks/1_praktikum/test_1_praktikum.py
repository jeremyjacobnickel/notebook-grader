# Tests zum Mini-Fixture (3 triviale pytest-Tests).

import importlib

# Der Modulname beginnt mit einer Ziffer, daher importlib statt import.
praktikum = importlib.import_module("1_praktikum")


def test_add():
    assert praktikum.add(2, 3) == 5


def test_add_negative():
    assert praktikum.add(-1, 1) == 0


def test_is_even():
    assert praktikum.is_even(4) is True
    assert praktikum.is_even(3) is False
