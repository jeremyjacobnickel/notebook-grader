"""Mini-Beispiel-Praktikum für die Extension-Entwicklung.

Zwei triviale Funktionen, damit `Notebook Grader: Tests ausführen`
end-to-end ausprobiert werden kann, ohne den echten Autograder.
"""


def add(a, b):
    # Addiert zwei Zahlen
    return a + b


def is_even(n):
    # True, wenn n gerade ist
    return n % 2 == 0
