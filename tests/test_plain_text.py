from backend.plain_text import plain_text


def test_reported_hint_and_python_names():
    assert plain_text('Dein Ansatz funktioniert für den Sonderfall $0$.') == 'Dein Ansatz funktioniert für den Sonderfall 0.'
    assert plain_text('Prüfe **factorial_iter** und `n ** 2`.') == 'Prüfe factorial_iter und n ** 2.'


def test_math_forms_and_fractions():
    assert plain_text(r'\(n \geq 0\), $$0! = 1$$ und $\frac{n}{2}$.') == 'n ≥ 0, 0! = 1 und (n)/(2).'


def test_code_and_ordinary_text_preserved():
    text = 'a_00 und factorial_iter; x * y; Budget 30 USD.'
    assert plain_text(text) == text
    assert plain_text('```python\nx ** 2\n```') == 'x ** 2'
    assert plain_text('Der String `"$0$"` bleibt so.') == 'Der String "$0$" bleibt so.'
