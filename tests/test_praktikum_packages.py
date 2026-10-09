"""Alle Pakete unter tasks/ und die Mechanik der Paket-conftest.py, ohne Musterlösungen."""
import json
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

CONFTEST = Path('grader/praktikum_conftest.py')
PACKAGES = sorted(path.parent for path in Path('tasks').glob('*/manifest.json'))


def run_pytest(folder, *args):
    result = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider',
                             '--junitxml=report.xml', *args], cwd=folder, capture_output=True, text=True, timeout=60)
    assert result.returncode in (0, 1), result.stdout + result.stderr
    return {case.get('name'): next(iter(case), None) for case in ET.parse(folder / 'report.xml').iter('testcase')}


@pytest.mark.parametrize('package', PACKAGES, ids=lambda path: path.name)
def test_starter_notebook_is_completely_open(package, tmp_path):
    shutil.copytree(package, tmp_path, dirs_exist_ok=True)
    cases = run_pytest(tmp_path)
    assert cases, 'Paket enthält keine Tests.'
    for name, result in cases.items():
        assert result is not None and result.tag == 'skipped', name
        assert result.get('message').startswith(('OPEN:', 'MISSING:')), (name, result.get('message'))


@pytest.mark.parametrize('package', PACKAGES, ids=lambda path: path.name)
def test_package_layout(package):
    manifest = json.loads((package / 'manifest.json').read_text())
    assert manifest['id'] == package.name and (package / manifest['notebook']).is_file()
    assert (package / 'conftest.py').read_text() == CONFTEST.read_text()
    notebook = json.loads((package / manifest['notebook']).read_text(encoding='utf-8'))
    for cell in notebook['cells']:
        tags = cell['metadata'].get('tags', [])
        assert any(tag.startswith('role:') for tag in tags), f'Zelle ohne role-Tag: {cell["source"][:1]}'
        if cell['cell_type'] == 'code' and 'role:answer' in tags:
            assert not cell.get('outputs'), 'Ausgaben gehören nicht ins Starter-Notebook.'


def code(source, task, part=''):
    tags = ['role:answer', f'task:{task}'] + ([f'part:{part}'] if part else [])
    return {'cell_type': 'code', 'metadata': {'tags': tags}, 'source': source, 'outputs': [], 'execution_count': None}


def make_package(folder, cells, tests):
    setup = {'cell_type': 'code', 'metadata': {'tags': ['role:setup']}, 'outputs': [], 'execution_count': None,
             'source': '%matplotlib inline\nimport numpy as np\nimport matplotlib.pyplot as plt\n'}
    (folder / 'manifest.json').write_text(json.dumps({'version': 1, 'id': 'demo', 'notebook': 'demo.ipynb'}))
    (folder / 'demo.ipynb').write_text(json.dumps({'cells': [setup, *cells], 'metadata': {}, 'nbformat': 4,
                                                  'nbformat_minor': 5}))
    shutil.copy(CONFTEST, folder / 'conftest.py')
    (folder / 'test_demo.py').write_text('import numpy as np\nimport pytest\n' + tests)
    return run_pytest(folder)


def test_mutations_belong_to_the_required_variable(tmp_path):
    cases = make_package(tmp_path, [code('''P = np.zeros((2, 2))
P[0, 0] = 1
seen = set()
for value in [1, 2]:
    seen.add(value)
log = []
def record(target):
    target.append("x")
record(log)
print(1 / 0)
''', '1')], '''
@pytest.mark.requires("P", "seen", "log")
def test_1_values(solution):
    assert solution["P"][0, 0] == 1 and solution["seen"] == {1, 2} and solution["log"] == ["x"]
''')
    assert cases == {'test_1_values': None}


def test_run_all_executes_every_statement_and_plots_headless(tmp_path):
    cases = make_package(tmp_path, [code('counter = [0]\n', '1', 'a'),
                                    code('counter[0] = 5\nfig, ax = plt.subplots()\nax.set_title("Bild")\n', '1', 'b')],
                         '''
import matplotlib.pyplot as plt

@pytest.mark.run_all
@pytest.mark.requires("counter")
def test_1b_everything(solution):
    assert solution["counter"] == [5]
    assert [ax.get_title() for n in plt.get_fignums() for ax in plt.figure(n).axes] == ["Bild"]
''')
    assert cases == {'test_1b_everything': None}


def test_empty_own_part_is_open_even_without_requires(tmp_path):
    cases = make_package(tmp_path, [code('x = 1\n', '1', 'a'), code('', '1', 'b')], '''
def test_1b_plot(solution):
    raise AssertionError("darf nicht laufen")
''')
    assert cases['test_1b_plot'].tag == 'skipped' and cases['test_1b_plot'].get('message').startswith('OPEN:')
