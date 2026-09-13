import json
import sqlite3

import httpx
import pytest
from backend.hint_usage import response_usage, save_usage


def test_metadata_preserves_zero_and_missing_values(tmp_path):
    response = httpx.Response(200, headers={'x-litellm-response-cost': '0', 'x-litellm-model-id': 'deployment-42'})
    data = {'model': 'default_router', 'usage': {'prompt_tokens': 30, 'completion_tokens': 12, 'total_tokens': 42}}
    usage = response_usage(response, data, 'default_router', 123)
    assert usage['cost_usd'] == 0 and usage['total_tokens'] == 42
    assert usage['reported_model'] == 'default_router' and usage['deployment_id'] == 'deployment-42'
    path = tmp_path / 'usage.db'
    save_usage({'HINT_USAGE_DB': str(path)}, '1a', usage)
    with sqlite3.connect(path) as db:
        metadata = json.loads(db.execute('SELECT metadata FROM hint_usage').fetchone()[0])
    assert metadata == usage
    missing = response_usage(httpx.Response(200), {}, 'default_router', 10)
    assert missing['cost_usd'] is None and missing['total_tokens'] is None


@pytest.mark.parametrize('value', ['NaN', 'inf', '-2', 'nonsense'])
def test_invalid_cost_is_unknown(value):
    usage = response_usage(httpx.Response(200, headers={'x-litellm-response-cost': value}), {}, 'router', 1)
    assert usage['cost_usd'] is None
