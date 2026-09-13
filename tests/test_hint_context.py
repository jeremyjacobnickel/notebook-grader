from pathlib import Path

import pytest
from fastapi import HTTPException
from backend.hint_context import assignment_context, code_context, error_context, task_id

ASSIGNMENT = Path('tasks/5_praktikum/AUFGABEN.md').read_text()


def test_assignment_excludes_other_subtasks():
    text = assignment_context(ASSIGNMENT, '1a')
    assert 'factorial_iter' in text and 'ValueError' in text
    assert 'factorial_rec' not in text and 'Laplacescher' not in text
    assert 'a_00' in assignment_context(ASSIGNMENT, '2a/b')
    assert 'submatrix' not in assignment_context(ASSIGNMENT, '2a/b')


def test_dependencies_and_unrelated_code():
    code = '''import string
SECRET = "private unrelated material"
def remove_punctuation(sentence):
    return sentence.strip(string.punctuation)
def echo_word(word):
    return word.upper()
def echo(sentence):
    return echo_word(remove_punctuation(sentence))
def insertion_sort(values):
    return SECRET
'''
    text = code_context(code, '3c')
    assert 'import string' in text and 'def remove_punctuation' in text and 'def echo_word' in text
    assert 'SECRET' not in text and 'insertion_sort' not in text
    assert 'def echo(' not in code_context(code, '3b')


def test_wrong_name_and_syntax_error_do_not_send_whole_file():
    assert 'def factorial(' in code_context('def factorial(n): return n', '1a')
    assert 'nicht sicher zuordenbar' in code_context('def broken(:\n unrelated_secret', '1a')
    assert 'unrelated_secret' not in code_context('def broken(:\n unrelated_secret', '1a')
    with pytest.raises(HTTPException):
        task_id('Gesamtes Praktikum')


def test_filters_parameterized_test_failures():
    output = '''================ FAILURES ================
________ test_1a_iterative_values[4] ________
E assert 3 == 24
________ test_1b_recursive_values ________
E unrelated private text
================ short test summary info ================
FAILED test_1b_recursive_values
'''
    text = error_context(output, '1a')
    assert 'assert 3 == 24' in text
    assert '1b' not in text and 'private' not in text
