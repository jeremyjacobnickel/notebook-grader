"""Automatisch generierte Tests für Aufgabe 2 -- nicht von Hand ändern."""

import pytest

from aufgabe_2 import a_00, a_12, det_A


def test_a_00():
    assert a_00 == pytest.approx(0.14286904513783283)

def test_a_12():
    assert a_12 == pytest.approx(0.952356419531331)

def test_det_A():
    assert det_A == pytest.approx(0.03153077806687998)
