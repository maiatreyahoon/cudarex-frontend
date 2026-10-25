"""Exact calendar payloads, conflict checks, and safe manual exports."""
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from app import db
from app.main import app

HEADERS = {'X-Cudarex-Client': 'local-ui', 'Content-Type': 'application/json'}
IST = timezone(timedelta(hours=5, minutes=30))

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', tmp_path / 'calendar.sqlite3')
    monkeypatch.delenv('NEBIUS_API_KEY', raising=False)
    monkeypatch.delenv('NEBIUS_MODEL', raising=False)
    with TestClient(app, headers=HEADERS) as c:
        yield c

def payload(title='Study mechanics', hours=0):
    start = (datetime.now(IST) + timedelta(days=2, hours=hours)).replace(microsecond=0)
    return dict(title=title, start=start.isoformat(), end=(start+timedelta(hours=1)).isoformat(), timezone='Asia/Kolkata')

def connect(client):
    assert client.post('/api/integrations/google-calendar/connect', json={}).status_code == 200

def propose(client, body):
    response = client.post('/api/calendar/proposals', json=body)
    assert response.status_code == 201, response.text
    return response.json()

def decide(client, proposal, approved=True):
    return client.post('/api/approvals/' + proposal['id'] + '/decision', json={'approved': approved})

def test_proposal_owns_exact_user_reviewed_payload_and_requires_scope(client):
    body = payload('Electricity practice')
    assert client.post('/api/calendar/proposals', json=body).status_code == 403
    connect(client)
    client.patch('/api/permissions/calendar.create', json={'enabled': False})
    assert client.post('/api/calendar/proposals', json=body).status_code == 403
    client.patch('/api/permissions/calendar.create', json={'enabled': True})
    item = propose(client, body)
    assert item['payload'] == body and item['state'] == 'pending' and not item['executed']
    assert item['conflicts'] == [] and 'MOCK ONLY' in item['detail']
    assert client.get('/api/events').json() == []
    assert client.get('/api/events/' + item['id'] + '/ics').status_code == 404
    assert decide(client, item).status_code == 200
    event = client.get('/api/events').json()[0]
    assert event['title'] == body['title'] and event['start'] == body['start'] and event['mock'] is True

@pytest.mark.parametrize('change', [
    {'start': '2020-01-01T17:00:00+05:30', 'end': '2020-01-01T18:00:00+05:30'},
    {'start': '2030-01-01T17:00:00', 'end': '2030-01-01T18:00:00'},
    {'start': '2030-01-01T17:00:00Z', 'end': '2030-01-01T18:00:00Z'},
    {'start': '2030-01-01T17:00:00+05:30', 'end': '2030-01-01T16:00:00+05:30'},
    {'start': '2030-01-01T00:00:00+05:30', 'end': '2030-01-02T00:00:00+05:30'},
    {'timezone': 'UTC'}, {'title': '   '}, {'action': 'send_email'}])
def test_calendar_rejects_invalid_or_unreviewed_payload_fields(client, change):
    connect(client)
    body = payload()
    body.update(change)
    assert client.post('/api/calendar/proposals', json=body).status_code == 422
    assert client.get('/api/approvals').json() == [] and client.get('/api/events').json() == []

def test_conflict_is_visible_and_execution_rechecks_newly_created_events(client):
    connect(client)
    body = payload()
    first = propose(client, body)
    competing = propose(client, dict(body, title='Competing study session'))
    assert not first['conflicts'] and not competing['conflicts']
    assert decide(client, first).status_code == 200
    # The second proposal was conflict-free when created; execution must re-evaluate.
    assert decide(client, competing).status_code == 409
    assert len(client.get('/api/events').json()) == 1
    later = propose(client, dict(body, title='Known conflict'))
    assert later['conflicts'][0]['id'] == first['id']
    assert decide(client, later).status_code == 409
    assert decide(client, later, False).json()['state'] == 'denied'
    assert len(client.get('/api/events').json()) == 1

def test_adjacent_events_are_allowed_without_overlap(client):
    connect(client)
    body = payload()
    first = propose(client, body)
    assert decide(client, first).status_code == 200
    start = datetime.fromisoformat(body['end'])
    second = propose(client, dict(body, start=start.isoformat(), end=(start+timedelta(hours=1)).isoformat()))
    assert not second['conflicts']
    assert decide(client, second).status_code == 200
    assert len(client.get('/api/events').json()) == 2

def test_ics_export_preserves_time_and_escapes_title_instead_of_injecting_fields(client):
    connect(client)
    title = 'Revision, science; notes\\folder\r\nATTENDEE:mailto:unwanted@example.test ' + '力' * 30
    item = propose(client, payload(title))
    assert decide(client, item).status_code == 200
    response = client.get('/api/events/' + item['id'] + '/ics')
    assert response.status_code == 200
    assert response.headers['content-type'].startswith('text/calendar')
    assert 'attachment;' in response.headers['content-disposition']
    content = response.content.decode('utf-8')
    assert content.count('BEGIN:VEVENT\r\n') == 1 and content.count('END:VEVENT\r\n') == 1
    assert '\r\nATTENDEE:' not in content
    unfolded = content.replace('\r\n ', '')
    assert 'SUMMARY:Revision\\, science\\; notes\\\\folder\\nATTENDEE:' in unfolded
    expected_start = datetime.fromisoformat(item['payload']['start']).astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    assert 'DTSTART:' + expected_start in content
    assert all(len(line.encode('utf-8')) <= 75 for line in content.split('\r\n'))
    assert client.get('/api/events/not-found/ics').status_code == 404
