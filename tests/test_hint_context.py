import pytest
from fastapi import HTTPException

from backend.hint_context import build_context, error_context, package_cells, failure_prefix
from backend.app import HintRequest
from grader.notebook_cells import task_prompt


def request(**values):
    return HintRequest(**{'praktikum': '5_praktikum', 'code': 'def factorial_iter(n): pass', **values})


def test_prompt_contains_task_intro_and_selected_part_only():
    cells = package_cells('5_praktikum')
    text = task_prompt(cells, '1', 'a')
    assert '1. Aufgabe' in text and 'factorial_iter' in text
    assert 'factorial_rec' not in text and 'Laplace' not in text
    assert 'submatrix' not in task_prompt(cells, '2', 'b')
    assert 'Insertion' in task_prompt(cells, '4')


def test_context_uses_notebook_tags_and_forwards_scoped_code():
    key, assignment, code, _ = build_context(request(task='1', part='a'))
    assert key == '1a' and 'Iterative' in assignment and code == 'def factorial_iter(n): pass'
    assert build_context(request(task='4'))[0] == '4'


@pytest.mark.parametrize('task, part', [('1', ''), ('9', ''), ('1', 'z')])
def test_unknown_task_or_part_rejected(task, part):
    with pytest.raises(HTTPException):
        build_context(request(task=task, part=part))


def test_unknown_package_rejected():
    with pytest.raises(HTTPException):
        package_cells('does_not_exist')


def test_filters_parameterized_test_failures():
    output = '''================ FAILURES ================
________ test_1a_iterative_values[4] ________
E assert 3 == 24
________ test_1b_recursive_values ________
E unrelated private text
================ short test summary info ================
FAILED test_1b_recursive_values
'''
    text = error_context(output, failure_prefix('1', 'a'))
    assert 'assert 3 == 24' in text
    assert '1b' not in text and 'private' not in text
