"""Behavior checks for the curated practice engine, using isolated databases."""
import pytest
from fastapi.testclient import TestClient
from app import db
from app.main import app

HEADERS = {'X-Cudarex-Client': 'local-ui', 'Content-Type': 'application/json'}

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, 'DB_PATH', tmp_path / 'practice.sqlite3')
    monkeypatch.delenv('NEBIUS_API_KEY', raising=False)
    monkeypatch.delenv('NEBIUS_MODEL', raising=False)
    with TestClient(app, headers=HEADERS) as c:
        yield c

def start(client, problem_id='newton-net-force'):
    response = client.post('/api/learning/sessions', json={'problem_id': problem_id})
    assert response.status_code == 201, response.text
    return response.json()

def attempt(client, session, answer):
    return client.post('/api/learning/sessions/' + session['id'] + '/attempt', json={'answer': answer})

def profile(client):
    return client.get('/api/profile').json()

def test_problem_bank_has_no_hidden_answer_or_solution(client):
    problems = client.get('/api/learning/problems').json()
    assert len(problems) >= 6
    assert len({p['id'] for p in problems}) == len(problems)
    for problem in problems:
        assert {'prompt', 'topic', 'unit', 'difficulty', 'recommended'} <= set(problem)
        assert not {'answer', 'solution', 'diagnoses'} & set(problem)
    session = start(client)
    assert not {'answer', 'solution', 'diagnoses'} & set(session)
    assert not {'answer', 'solution', 'diagnoses'} & set(session['problem'])
    assert not session['solved'] and not session['solution_shown']

def test_progressive_hints_cap_and_diagnosis_adapt_to_gap(client):
    session = start(client)
    response = attempt(client, session, '20 m/s²')
    assert response.status_code == 200
    assert 'multiplied' in response.json()['feedback']
    assert not response.json()['solved']
    assert 'Newton’s second law' in profile(client)['weak_topics']
    for level in (1, 2, 3):
        response = client.post('/api/learning/sessions/' + session['id'] + '/hint', json={})
        assert response.status_code == 200
        assert response.json()['level'] == level
        assert 'revisit list' in response.json()['hint']
        assert 'solution' not in response.json()
    before = profile(client)['hint_requests']
    assert client.post('/api/learning/sessions/' + session['id'] + '/hint', json={}).json()['level'] == 3
    assert profile(client)['hint_requests'] == before

@pytest.mark.parametrize('answer', ['NaN', 'Infinity', '1e999', '5 bananas', '5 kg', '5/1', '', '   ', '<script>5</script>', '__import__("os")'])
def test_invalid_answers_do_not_mutate_learning_evidence(client, answer):
    session = start(client)
    before = profile(client)
    response = attempt(client, session, answer)
    assert response.status_code == 422, response.text
    assert profile(client) == before
    saved = client.get('/api/learning/sessions/' + session['id']).json()
    assert saved['attempts'] == [] and not saved['solved']

@pytest.mark.parametrize('problem_id,answer', [
    ('newton-net-force', '5 m/s²'), ('ohms-law', '+3e0 A'),
    ('kinetic-energy', '9 joules'), ('constant-speed', '5 m/s'),
    ('uniform-acceleration', '14'), ('linear-equation', '5')])
def test_problem_answers_check_independently_and_cannot_replay(client, problem_id, answer):
    session = start(client, problem_id)
    result = attempt(client, session, answer)
    assert result.status_code == 200, result.text
    solved = result.json()
    assert solved['solved'] and solved['credit_awarded'] and solved.get('solution')
    assert not solved['solution_shown']
    assert profile(client)['attempts'] == 1 and profile(client)['successes'] == 1
    assert attempt(client, session, answer).status_code == 409
    assert profile(client)['successes'] == 1
    # Opening a worked solution after solving does not erase independent credit.
    revealed = client.post('/api/learning/sessions/' + session['id'] + '/solution', json={}).json()
    assert revealed['credit_awarded'] and not revealed['solution_shown']

def test_revealing_solution_awards_no_independent_mastery(client):
    session = start(client, 'ohms-law')
    revealed = client.post('/api/learning/sessions/' + session['id'] + '/solution', json={})
    assert revealed.status_code == 200 and revealed.json()['solution_shown']
    assert revealed.json()['solution']
    assert profile(client)['successes'] == 0
    solved = attempt(client, session, '3 A').json()
    assert solved['solved'] and not solved['credit_awarded']
    p = profile(client)
    assert p['attempts'] == 1 and p['assisted_successes'] == 1 and p['successes'] == 0
    assert not p['strengths'] and p['difficulty'] == 'Foundation'

def test_distinct_problem_evidence_drives_practice_level(client):
    first = start(client)
    attempt(client, first, '5')
    repeated = start(client)
    attempt(client, repeated, '5')
    assert profile(client)['difficulty'] == 'Foundation'
    second = start(client, 'ohms-law')
    attempt(client, second, '3')
    assert profile(client)['difficulty'] == 'Practice'
    assert len(profile(client)['strengths']) == 2

def test_sessions_resume_after_database_initialization_without_reseeding(client):
    session = start(client, 'kinetic-energy')
    attempt(client, session, '18 J')
    db.initialize()
    saved = client.get('/api/learning/sessions/' + session['id']).json()
    assert saved['attempts'][0]['answer'] == '18 J'
    assert not saved['solved']
    assert client.get('/api/learning/sessions').json()[0]['id'] == session['id']
    assert profile(client)['mistakes'] == 1

def test_learning_request_schema_and_missing_resources(client):
    assert client.post('/api/learning/sessions', json={'problem_id': 'missing'}).status_code == 404
    assert client.post('/api/learning/sessions', json={'problem_id': 'ohms-law', 'solved': True}).status_code == 422
    session = start(client)
    path = '/api/learning/sessions/' + session['id']
    assert client.post(path + '/attempt', json={'answer': '5', 'correct': True}).status_code == 422
    assert client.post(path + '/hint', json={'level': 3}).status_code == 422
    assert client.get('/api/learning/sessions/not-found').status_code == 404
