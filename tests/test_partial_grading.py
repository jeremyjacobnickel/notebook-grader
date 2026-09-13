"""Echte pytest-Läufe mit synthetischen Versuchen, ohne Musterlösungen."""
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

SOURCE = Path('tasks/5_praktikum')


def run_attempt(tmp_path, code, selection=None):
    for name in ('test_5_praktikum.py', 'grader_checks.py'):
        shutil.copy(SOURCE / name, tmp_path / name)
    (tmp_path / '5_praktikum.py').write_text(code)
    args = [sys.executable, '-m', 'pytest', '-q', '--junitxml=report.xml']
    if selection:
        args += ['-k', selection]
    result = subprocess.run(args, cwd=tmp_path, capture_output=True, text=True, timeout=30)
    assert result.returncode in (0, 1), result.stdout + result.stderr
    return list(ET.parse(tmp_path / 'report.xml').iter('testcase'))


ITERATIVE = '''def factorial_iter(number):
    if number < 0:
        raise ValueError()
    result = 1
    for i in range(1, number + 1):
        result *= i
    return result
'''


def test_single_task_ignores_other_runtime_errors(tmp_path):
    cases = run_attempt(tmp_path, ITERATIVE + '\nother = 1 / 0\ndef echo(sentence):\n    raise RuntimeError("unrelated")\n', 'test_1a_')
    assert len(cases) == 3
    assert all(len(case) == 0 for case in cases)


def test_full_run_counts_missing_tasks_as_open(tmp_path):
    cases = run_attempt(tmp_path, ITERATIVE)
    assert len(cases) == 19
    assert sum(len(case) == 0 for case in cases) == 3
    assert sum(case.find('skipped') is not None for case in cases) == 16
    assert all('MISSING:' in case.find('skipped').get('message') for case in cases if case.find('skipped') is not None)


def test_starter_is_open_including_structure_checks(tmp_path):
    cases = run_attempt(tmp_path, (SOURCE / '5_praktikum.py').read_text())
    assert len(cases) == 19
    assert all(case.find('skipped') is not None for case in cases)


def test_wrong_answer_is_failure_not_open(tmp_path):
    cases = run_attempt(tmp_path, 'def factorial_iter(number):\n    return 42', 'test_1a_')
    assert all(case.find('failure') is not None for case in cases)


def test_selected_dependencies_are_executed(tmp_path):
    cases = run_attempt(tmp_path, '''BASE = 1
def helper(n):
    result = BASE
    for i in range(1, n + 1):
        result *= i
    return result
def factorial_iter(number):
    if number < 0: raise ValueError()
    for _ in range(1):
        return helper(number)
''', 'test_1a_')
    assert all(len(case) == 0 for case in cases)
