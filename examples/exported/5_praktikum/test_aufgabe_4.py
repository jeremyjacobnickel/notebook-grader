"""Automatisch generierte Tests für Aufgabe 4 -- nicht von Hand ändern."""

from aufgabe_4 import insertion_sort


def test_insertion_sort_beispiel_1():
    assert insertion_sort([1, 6, 8, 3, 4, 2, 6, 1]) == [1, 1, 2, 3, 4, 6, 6, 8]
