"""Automatisch generierte Tests für Aufgabe 3 -- nicht von Hand ändern."""

from aufgabe_3 import remove_punctuation, echo_word, echo


def test_remove_punctuation_beispiel_1():
    assert remove_punctuation('Entschuldigung, wie spät ist es?') == 'Entschuldigung wie spät ist es'

def test_echo_word_beispiel_1():
    assert echo_word('Echo') == 'E-C-H-O ECHO echo'

def test_echo_beispiel_1():
    assert echo('Das Echo!') == 'D-A-S DAS das ... E-C-H-O ECHO echo'
