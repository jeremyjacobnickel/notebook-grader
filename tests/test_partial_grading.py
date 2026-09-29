"""Echte pytest-Läufe gegen synthetische Notebooks, ohne Musterlösungen."""
import json
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

SOURCE = Path('tasks/5_praktikum')
CONFTEST = Path('grader/praktikum_conftest.py')


def run_attempt(tmp_path, answers=None, extra_cells=(), selection=None):
    """answers: {(task, part): code} ersetzt Antwortzellen; extra_cells: (nach Zellindex, Zelle)."""
    for name in ('manifest.json', 'test_5_praktikum.py', 'conftest.py'):
        shutil.copy(SOURCE / name, tmp_path / name)
    notebook = json.loads((SOURCE / '5_praktikum.ipynb').read_text(encoding='utf-8'))
    for cell in notebook['cells']:
        tags = cell['metadata'].get('tags', [])
        for (task, part), code in (answers or {}).items():
            if 'role:answer' in tags and f'task:{task}' in tags and (f'part:{part}' in tags or not part):
                cell['source'] = code
    for after, cell in sorted(extra_cells, reverse=True):
        notebook['cells'].insert(after + 1, cell)
    (tmp_path / '5_praktikum.ipynb').write_text(json.dumps(notebook), encoding='utf-8')
    args = [sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--junitxml=report.xml']
    if selection:
        args += ['-k', selection]
    result = subprocess.run(args, cwd=tmp_path, capture_output=True, text=True, timeout=30)
    assert result.returncode in (0, 1), result.stdout + result.stderr
    return list(ET.parse(tmp_path / 'report.xml').iter('testcase'))


def outcome(case):
    child = next(iter(case), None)
    return 'passed' if child is None else child.tag


def by_prefix(cases, prefix):
    return [case for case in cases if case.get('name').startswith(prefix)]


def untagged(code):
    return {'cell_type': 'code', 'metadata': {}, 'source': code, 'outputs': [], 'execution_count': None}


def answer_index(task, part=''):
    cells = json.loads((SOURCE / '5_praktikum.ipynb').read_text(encoding='utf-8'))['cells']
    return next(i for i, cell in enumerate(cells) if {'role:answer', f'task:{task}'} <= set(cell['metadata']['tags'])
                and (not part or f'part:{part}' in cell['metadata']['tags']))


ITERATIVE = '''def factorial_iter(number):
    if number < 0:
        raise ValueError()
    result = 1
    for i in range(1, number + 1):
        result *= i
    return result
'''


def test_package_conftest_is_canonical_copy():
    for package in Path('tasks').glob('*/manifest.json'):
        assert (package.parent / 'conftest.py').read_text() == CONFTEST.read_text(), package.parent


def test_starter_is_open_including_structure_checks(tmp_path):
    cases = run_attempt(tmp_path)
    assert len(cases) == 19
    assert all(outcome(case) == 'skipped' for case in cases)


def test_full_run_counts_unsolved_tasks_as_open(tmp_path):
    cases = run_attempt(tmp_path, {('1', 'a'): ITERATIVE})
    assert [outcome(case) for case in by_prefix(cases, 'test_1a_')] == ['passed'] * 3
    others = [case for case in cases if not case.get('name').startswith('test_1a_')]
    assert len(others) == 16 and all(outcome(case) == 'skipped' for case in others)
    assert all(case.find('skipped').get('message').startswith(('OPEN:', 'MISSING:')) for case in others)


def test_syntax_error_stays_in_its_task(tmp_path):
    cases = run_attempt(tmp_path, {('1', 'a'): ITERATIVE, ('3', 'a'): 'def remove_punctuation(sentence)\n    return 1\n'})
    assert [outcome(case) for case in by_prefix(cases, 'test_1a_')] == ['passed'] * 3
    # Spätere Teilaufgaben derselben Aufgabe laden 3a mit und sind ebenfalls betroffen.
    broken = by_prefix(cases, 'test_3')
    assert len(broken) == 4 and all(outcome(case) == 'error' for case in broken)
    assert all('Syntaxfehler in Notebook-Zelle' in case.find('error').get('message') for case in broken)
    assert all(outcome(case) == 'skipped' for case in by_prefix(cases, 'test_2') + by_prefix(cases, 'test_4'))


def test_runtime_error_in_other_task_is_ignored(tmp_path):
    cases = run_attempt(tmp_path, {('1', 'a'): ITERATIVE, ('4', ''): 'other = 1 / 0\n'}, selection='test_1a_')
    assert [outcome(case) for case in cases] == ['passed'] * 3


def test_example_calls_in_answer_cell_are_not_executed(tmp_path):
    cases = run_attempt(tmp_path, {('1', 'a'): ITERATIVE + 'print(factorial_iter(-1))\n'}, selection='test_1a_')
    assert [outcome(case) for case in cases] == ['passed'] * 3


def test_wrong_answer_is_failure_not_open(tmp_path):
    cases = run_attempt(tmp_path, {('1', 'a'): 'def factorial_iter(number):\n    return 42'}, selection='test_1a_')
    assert all(outcome(case) == 'failure' for case in cases)


def test_selected_dependencies_are_executed(tmp_path):
    cases = run_attempt(tmp_path, {('1', 'a'): '''BASE = 1
def helper(n):
    result = BASE
    for i in range(1, n + 1):
        result *= i
    return result
def factorial_iter(number):
    if number < 0: raise ValueError()
    for _ in range(1):
        return helper(number)
'''}, selection='test_1a_')
    assert [outcome(case) for case in cases] == ['passed'] * 3


def test_untagged_student_cell_belongs_to_task_above(tmp_path):
    helper = untagged('def helper(n):\n    return 1 if n <= 1 else n * helper(n - 1)\n')
    solution = 'def factorial_iter(number):\n    if number < 0: raise ValueError()\n    for _ in [0]:\n        return helper(number)\n'
    cases = run_attempt(tmp_path, {('1', 'a'): solution}, [(answer_index('1', 'a'), helper)], selection='test_1a_')
    assert [outcome(case) for case in cases] == ['passed'] * 3


def test_untagged_cell_in_other_task_does_not_leak(tmp_path):
    # Die Hilfsfunktion steht unter Aufgabe 4 und darf 1a nicht helfen.
    helper = untagged('def helper(n):\n    return 1\n')
    solution = 'def factorial_iter(number):\n    for _ in [0]:\n        return helper(number)\n'
    cases = run_attempt(tmp_path, {('1', 'a'): solution}, [(answer_index('4'), helper)], selection='test_1a_iterative_values')
    assert [outcome(case) for case in cases] == ['failure']


@pytest.mark.parametrize('magic', ['%matplotlib inline\n', '!pip list\n'])
def test_notebook_magics_are_ignored(tmp_path, magic):
    cases = run_attempt(tmp_path, {('1', 'a'): magic + ITERATIVE}, selection='test_1a_')
    assert [outcome(case) for case in cases] == ['passed'] * 3


def test_test_name_without_task_fails_explicitly(tmp_path):
    run_attempt(tmp_path)
    (tmp_path / 'test_extra.py').write_text('def test_9z_unknown(solution):\n    pass\n')
    result = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', 'test_extra.py'],
                            cwd=tmp_path, capture_output=True, text=True, timeout=30)
    assert result.returncode == 1 and 'passt zu keiner Aufgabe' in result.stdout
