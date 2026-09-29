import json

import pytest

from grader.notebook_cells import has_answer, package_notebook, read_cells, task_prompt


def write_package(folder, notebook_name='p.ipynb'):
    (folder / 'manifest.json').write_text(json.dumps({'version': 1, 'id': 'p', 'notebook': notebook_name}))
    (folder / 'p.ipynb').write_text(json.dumps({'cells': [
        {'cell_type': 'code', 'metadata': {'tags': ['role:setup']}, 'source': ['import math\n']},
        {'cell_type': 'code', 'metadata': {'tags': ['role:answer', 'task:1', 'part:a']}, 'source': 'x = 1'},
        {'cell_type': 'code', 'metadata': {}, 'source': 'raise RuntimeError()'},
        {'cell_type': 'markdown', 'metadata': {'tags': ['role:prompt', 'task:1']}, 'source': 'Text'},
    ]}))


def test_reads_tags_of_package_notebook(tmp_path):
    write_package(tmp_path)
    cells = read_cells(package_notebook(tmp_path))
    assert [cell.role for cell in cells] == ['setup', 'answer', '', 'prompt']
    assert has_answer(cells, '1', 'a') and not has_answer(cells, '1')
    assert task_prompt(cells, '1', 'a') == 'Text'


def test_manifest_cannot_point_outside_package(tmp_path):
    write_package(tmp_path, '../p.ipynb')
    with pytest.raises(ValueError):
        package_notebook(tmp_path)
