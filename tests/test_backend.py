import importlib
import sqlite3

import httpx
import pytest
from fastapi.testclient import TestClient

backend = importlib.import_module("backend.app")
tutor = importlib.import_module("backend.tutor")


@pytest.fixture
def client(monkeypatch, tmp_path):
    config = {"COURSE_TOKEN": "test-token", "SUBMISSIONS_DB": str(tmp_path / "results.db")}
    monkeypatch.setattr(backend, "settings", lambda: config)
    backend.hint_times.clear()
    return TestClient(backend.app)


AUTH = {"Authorization": "Bearer test-token"}
RESULT = {"praktikum": "5_praktikum", "passed": True, "score": 16, "total": 19, "percentage": 84.2}


def test_authentication_required(client):
    assert client.post("/submit", json=RESULT).status_code == 401
    assert client.post("/hint", json={"praktikum": "5_praktikum", "code": "", "task": "1a"}).status_code == 401


def test_submission_persists(client):
    response = client.post("/submit", headers=AUTH, json=RESULT)
    assert response.status_code == 200
    assert response.json()["ok"] is True
    with sqlite3.connect(backend.settings()["SUBMISSIONS_DB"]) as db:
        row = db.execute("SELECT score, total, passed, student FROM submissions").fetchone()
    assert row[:3] == (16, 19, 1)
    assert "test-token" not in row[3]


def test_inconsistent_and_unknown_submissions_rejected(client):
    assert client.post("/submit", headers=AUTH, json={**RESULT, "passed": False}).status_code == 422
    assert client.post("/submit", headers=AUTH, json={**RESULT, "praktikum": "../../etc"}).status_code == 422
    assert client.post("/submit", headers=AUTH, json={**RESULT, "total": 0}).status_code == 422


def test_hint_context_and_rate_limit(client, monkeypatch):
    seen = []
    monkeypatch.setattr(backend, "get_hint", lambda payload: seen.append(payload) or {"hint": "Prüfe den Basisfall."})
    payload = {"praktikum": "5_praktikum", "task": "1b", "question": "Warum?", "code": "def factorial_rec(n): pass"}
    for _ in range(6):
        assert client.post("/hint", headers=AUTH, json=payload).status_code == 200
    assert seen[0].task == "1b"
    assert client.post("/hint", headers=AUTH, json=payload).status_code == 429


def test_oversized_hint_rejected(client):
    assert client.post("/hint", headers=AUTH, json={"praktikum": "5_praktikum", "code": "x" * 40001}).status_code == 422


def test_missing_key_is_explicit(client, monkeypatch):
    monkeypatch.setattr(tutor, "settings", lambda: {})
    response = client.post("/hint", headers=AUTH, json={"praktikum": "5_praktikum", "code": "", "task": "1a"})
    assert response.status_code == 503
    assert "Schlüssel" in response.json()["detail"]


@pytest.mark.parametrize("status, expected", [(401, 502), (403, 502), (429, 429), (500, 502)])
def test_upstream_errors(client, monkeypatch, status, expected):
    original = httpx.Client
    transport = httpx.MockTransport(lambda request: httpx.Response(status, json={"secret": "never show"}))
    monkeypatch.setattr(tutor, "settings", lambda: {"LITELLM_API_KEY": "secret", "HINT_USAGE_DB": backend.settings()["SUBMISSIONS_DB"]})
    monkeypatch.setattr(tutor.httpx, "Client", lambda **kwargs: original(transport=transport, **kwargs))
    response = client.post("/hint", headers=AUTH, json={"praktikum": "5_praktikum", "code": "", "task": "1a"})
    assert response.status_code == expected
    assert "secret" not in response.text


def test_real_request_format(client, monkeypatch):
    original = httpx.Client
    seen = []
    def respond(request):
        seen.append(request)
        return httpx.Response(200, json={"choices": [{"message": {"content": "Welcher Basisfall fehlt?"}}]})
    monkeypatch.setattr(tutor, "settings", lambda: {"LITELLM_API_KEY": "secret", "HINT_USAGE_DB": backend.settings()["SUBMISSIONS_DB"]})
    monkeypatch.setattr(tutor.httpx, "Client", lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    response = client.post("/hint", headers=AUTH, json={"praktikum": "5_praktikum", "code": "pass", "task": "1a"})
    assert response.json()["hint"] == "Welcher Basisfall fehlt?"
    assert str(seen[0].url) == "https://litellm.fh-muenster.de/v1/chat/completions"
    assert seen[0].headers["Authorization"] == "Bearer secret"
    assert b"system" in seen[0].content and b"factorial_iter" in seen[0].content


def test_hint_filters_upstream_and_records_metadata(client, monkeypatch):
    import json
    original = httpx.Client
    seen = []
    def respond(request):
        seen.append(json.loads(request.content))
        return httpx.Response(200, headers={'x-litellm-response-cost': '0.0002',
                                           'x-litellm-model-id': 'deployment-1'}, json={
            'model': 'fhms/example',
            'usage': {'prompt_tokens': 100, 'completion_tokens': 20, 'total_tokens': 120},
            'choices': [{'message': {'content': 'Was passiert bei null?'}}]})
    path = backend.settings()['SUBMISSIONS_DB']
    monkeypatch.setattr(tutor, 'settings', lambda: {'LITELLM_API_KEY': 'secret', 'HINT_USAGE_DB': path})
    monkeypatch.setattr(tutor.httpx, 'Client', lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    response = client.post('/hint', headers=AUTH, json={
        'praktikum': '5_praktikum', 'task': '1a – Fakultät iterativ',
        'code': 'def factorial_iter(n): return n\ndef echo_word(word): return "private-unrelated"',
        'question': 'my-private-question',
    })
    assert response.status_code == 200
    prompt = seen[0]['messages'][1]['content']
    assert 'factorial_iter' in prompt and 'echo_word' not in prompt
    usage = response.json()['usage']
    assert usage['cost_usd'] == 0.0002 and usage['total_tokens'] == 120 and usage['recorded']
    with sqlite3.connect(path) as db:
        stored = db.execute('SELECT metadata FROM hint_usage').fetchone()[0]
    assert 'my-private-question' not in stored and 'secret' not in stored and 'def ' not in stored


def test_usage_storage_failure_keeps_hint(client, monkeypatch):
    original = httpx.Client
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={
        'choices': [{'message': {'content': 'Ein Hinweis'}}]}))
    monkeypatch.setattr(tutor, 'settings', lambda: {'LITELLM_API_KEY': 'secret'})
    monkeypatch.setattr(tutor.httpx, 'Client', lambda **kwargs: original(transport=transport, **kwargs))
    def fail(*args):
        raise sqlite3.OperationalError('disk full')
    monkeypatch.setattr(tutor, 'save_usage', fail)
    response = client.post('/hint', headers=AUTH, json={'praktikum': '5_praktikum', 'task': '1a', 'code': ''})
    assert response.json()['hint'] == 'Ein Hinweis'
    assert response.json()['usage']['recorded'] is False
