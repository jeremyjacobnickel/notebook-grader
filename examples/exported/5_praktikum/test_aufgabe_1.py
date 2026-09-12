"""Automatisch generierte Tests für Aufgabe 1 -- nicht von Hand ändern."""

from aufgabe_1 import factorial_iter, factorial_rec


def test_factorial_iter_beispiel_1():
    assert factorial_iter(0) == 1

def test_factorial_iter_beispiel_2():
    assert factorial_iter(1) == 1

def test_factorial_iter_beispiel_3():
    assert factorial_iter(2) == 2

def test_factorial_iter_beispiel_4():
    assert factorial_iter(3) == 6

def test_factorial_iter_beispiel_5():
    assert factorial_iter(4) == 24

def test_factorial_rec_beispiel_1():
    assert factorial_rec(0) == 1

def test_factorial_rec_beispiel_2():
    assert factorial_rec(1) == 1

def test_factorial_rec_beispiel_3():
    assert factorial_rec(2) == 2

def test_factorial_rec_beispiel_4():
    assert factorial_rec(3) == 6

def test_factorial_rec_beispiel_5():
    assert factorial_rec(4) == 24
