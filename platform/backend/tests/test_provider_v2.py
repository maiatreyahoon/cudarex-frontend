"""Provider boundary uses synthetic responses, never credentials or live API calls."""
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from app import db, provider
from app.main import app

HEADERS = {'X-Cudarex-Client': 'local-ui', 'Content-Type': 'application/json'}

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', tmp_path / 'provider.sqlite3')
    monkeypatch.delenv('NEBIUS_API_KEY', raising=False)
    monkeypatch.delenv('NEBIUS_MODEL', raising=False)
    monkeypatch.delenv('NEBIUS_BASE_URL', raising=False)
    with TestClient(app, headers=HEADERS) as c:
        yield c

def configured(monkeypatch):
    monkeypatch.setenv('NEBIUS_API_KEY', 'synthetic-test-secret')
    monkeypatch.setenv('NEBIUS_MODEL', 'nvidia/synthetic-test-model')
    monkeypatch.setenv('NEBIUS_BASE_URL', provider.ALLOWED_BASES[0])

def stub_http(monkeypatch, handler):
    original = httpx.Client
    settings = []
    def factory(**kwargs):
        settings.append(kwargs)
        return original(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr(provider.httpx, 'Client', factory)
    return settings

def test_no_key_performs_no_network_request(monkeypatch):
    monkeypatch.delenv('NEBIUS_API_KEY', raising=False)
    monkeypatch.delenv('NEBIUS_MODEL', raising=False)
    def unexpected(**kwargs):
        raise AssertionError('No-key fallback must not open a network client')
    monkeypatch.setattr(provider.httpx, 'Client', unexpected)
    assert provider.generate('hello', 'Student') is None

def test_provider_uses_allowlisted_text_endpoint_without_tool_channel(monkeypatch):
    configured(monkeypatch)
    requests = []
    def handler(request):
        requests.append(request)
        return httpx.Response(200, json={'model': 'nvidia/synthetic-returned-model', 'choices': [{'message': {'content': 'A small explanation'}}], 'usage': {'prompt_tokens': 19, 'completion_tokens': 7}})
    settings = stub_http(monkeypatch, handler)
    result = provider.generate('Explain fractions', 'Student', {'name': 'Tutor', 'instructions': 'Use examples'}, ['Prefer small steps'])
    assert isinstance(result, provider.Generation) and result.text == 'A small explanation'
    assert result.model == 'nvidia/synthetic-returned-model' and result.requested_model == 'nvidia/synthetic-test-model'
    assert result.input_tokens == 19 and result.output_tokens == 7 and result.latency_ms >= 0
    request = requests[0]
    assert str(request.url) == provider.ALLOWED_BASES[0] + '/chat/completions'
    assert request.headers['authorization'] == 'Bearer synthetic-test-secret'
    body = json.loads(request.content)
    assert 'tools' not in body and 'tool_choice' not in body
    assert body['messages'][0]['role'] == 'system'
    assert 'Prefer small steps' in body['messages'][1]['content']
    assert 'synthetic-test-secret' not in request.content.decode()
    assert settings[0]['follow_redirects'] is False

def test_invalid_provider_host_never_receives_a_credential(monkeypatch):
    configured(monkeypatch)
    monkeypatch.setenv('NEBIUS_BASE_URL', 'https://attacker.example/v1')
    def unexpected(**kwargs):
        raise AssertionError('Disallowed URL must be rejected before opening the client')
    monkeypatch.setattr(provider.httpx, 'Client', unexpected)
    with pytest.raises(ValueError, match='Unsupported provider URL'):
        provider.generate('hello', 'Student')

@pytest.mark.parametrize('body', [
    {'choices': [{'message': {'content': ''}}]},
    {'choices': [{'message': {'content': None}}]},
    {'choices': []},
    {'unexpected': 'shape'}])
def test_malformed_provider_reply_is_not_success_evidence(client, monkeypatch, body):
    configured(monkeypatch)
    stub_http(monkeypatch, lambda request: httpx.Response(200, json=body))
    response = client.post('/api/chat', json={'message': 'Hello AURA'})
    assert response.status_code == 200 and 'unavailable' in response.json()['response']
    assert 'synthetic-test-secret' not in response.text
    state = client.get('/api/model/status').json()
    assert state['status'] == 'nebius-configured-unverified' and state['evidence'] is None

def test_runtime_evidence_only_appears_after_success_and_matches_configuration(client, monkeypatch):
    assert client.get('/api/model/status').json()['status'] == 'deterministic-demo'
    configured(monkeypatch)
    before = client.get('/api/model/status').json()
    assert before['status'] == 'nebius-configured-unverified' and before['evidence'] is None
    stub_http(monkeypatch, lambda request: httpx.Response(200, json={'model': 'nvidia/synthetic-returned-model', 'choices': [{'message': {'content': 'Synthetic model result'}}], 'usage': {'prompt_tokens': 10, 'completion_tokens': 5}}))
    response = client.post('/api/chat', json={'message': 'Hello AURA'})
    assert response.status_code == 200 and 'Synthetic model result' in response.json()['response']
    state = client.get('/api/model/status').json()
    assert state['status'] == 'nebius-verified' and state['nvidia_model_requested'] is True
    assert state['evidence']['returned_model'] == 'nvidia/synthetic-returned-model'
    assert state['evidence']['verified_at'] and state['evidence']['input_tokens'] == 10
    assert 'synthetic-test-secret' not in str(state)
    monkeypatch.setenv('NEBIUS_MODEL', 'nvidia/a-different-model')
    changed = client.get('/api/model/status').json()
    assert changed['status'] == 'nebius-configured-unverified' and changed['evidence'] is None

def test_redirect_and_provider_error_do_not_follow_or_expose_credentials(client, monkeypatch):
    configured(monkeypatch)
    requests = []
    def handler(request):
        requests.append(str(request.url))
        return httpx.Response(302, headers={'location': 'https://attacker.example/collect'})
    stub_http(monkeypatch, handler)
    response = client.post('/api/chat', json={'message': 'Hello AURA'})
    assert len(requests) == 1
    assert response.status_code == 200 and 'unavailable' in response.json()['response']
    assert 'synthetic-test-secret' not in response.text and 'attacker.example' not in response.text
    assert client.get('/api/model/status').json()['evidence'] is None
