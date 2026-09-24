import json

import pytest

from grader.notebook_cells import extract_code, has_answer, package_notebook, read_cells


def write_package(folder, notebook_name='p.ipynb'):
    (folder / 'manifest.json').write_text(json.dumps({'version': 1, 'id': 'p', 'notebook': notebook_name}))
    (folder / 'p.ipynb').write_text(json.dumps({'cells': [
        {'cell_type': 'code', 'metadata': {'tags': ['role:setup']}, 'source': ['import math\n']},
        {'cell_type': 'code', 'metadata': {'tags': ['role:answer', 'task:1', 'part:a']}, 'source': 'x = 1'},
        {'cell_type': 'code', 'metadata': {}, 'source': 'raise RuntimeError()'},
        {'cell_type': 'markdown', 'metadata': {'tags': ['role:prompt', 'task:1']}, 'source': 'Text'},
    ]}))


def test_extracts_only_setup_and_answer_code(tmp_path):
    write_package(tmp_path)
    cells = read_cells(package_notebook(tmp_path))
    code = extract_code(cells)
    assert 'import math' in code and 'x = 1' in code and 'RuntimeError' not in code
    assert has_answer(cells, '1', 'a') and not has_answer(cells, '1')


def test_manifest_cannot_point_outside_package(tmp_path):
    write_package(tmp_path, '../p.ipynb')
    with pytest.raises(ValueError):
        package_notebook(tmp_path)
