# Praktikum 1 — einfache Funktionen
#
# Mini-Fixture für die Extension-Entwicklung: damit lässt sich
# "Praktikum laden" und "Tests ausführen" durchspielen, ohne den
# echten Autograder. Zum Testen des Rot-Falls einfach eine der
# Funktionen kaputt machen.


def add(a, b):
    """Addiert zwei Zahlen."""
    return a + b


def is_even(n):
    """Gibt True zurück, wenn n gerade ist."""
    return n % 2 == 0
