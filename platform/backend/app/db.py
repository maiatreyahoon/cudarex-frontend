"""Small transactional SQLite repository. Every write uses the caller's transaction."""
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

DB_PATH = Path(os.getenv('CUDAREX_DB', str(Path(__file__).resolve().parents[1] / 'data' / 'cudarex.sqlite3')))

def now():
    return datetime.now(timezone.utc).isoformat()

def uid():
    return str(uuid4())

@contextmanager
def transaction():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(DB_PATH), timeout=10)
    try:
        connection.execute('BEGIN IMMEDIATE')
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def put(c, kind, item):
    c.execute('INSERT INTO records(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data', (kind, item['id'], json.dumps(item)))
    return item

def get(c, kind, ident):
    row = c.execute('SELECT data FROM records WHERE kind=? AND id=?', (kind, ident)).fetchone()
    return json.loads(row[0]) if row else None

def all_items(c, kind):
    return [json.loads(r[0]) for r in c.execute('SELECT data FROM records WHERE kind=? ORDER BY rowid DESC', (kind,))]

def remove(c, kind, ident):
    c.execute('DELETE FROM records WHERE kind=? AND id=?', (kind, ident))

def log(c, kind, title, detail='', status='success'):
    return put(c, 'activity', dict(id=uid(), type=kind, title=title, detail=detail, status=status, created_at=now()))

def initialize():
    with transaction() as c:
        c.execute('CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(kind,id))')
        if get(c, 'meta', 'seeded'):
            return
        put(c, 'profile', dict(id='me', display_name='Atreya', profession='Student', tagline='Learning with examples, building with confidence.', learning_focus=['Newton’s laws', 'React'], attempts=0, successes=0, mistakes=0, hint_requests=0, strengths=[], weak_topics=[], difficulty='Foundation'))
        for category, text in [('Preference', 'I prefer short explanations with practical examples.'), ('Goal', 'Prepare for physics and finish the CUDAREX hackathon MVP.')]:
            put(c, 'memory', dict(id=uid(), category=category, text=text, updated_at=now()))
        skills = [
            ('physics', 'Physics Solver', 'Teach Newton’s laws with progressive hints.', 'Ask for an attempt before giving the final answer.', 'Identify → hint → attempt → feedback'),
            ('code', 'Code Reviewer', 'Review code pasted by the user.', 'Start with the most serious bug and explain a small fix.', 'Read → assess → suggest'),
            ('research', 'Research Assistant', 'Organize research supplied by the user.', 'Separate sourced facts from uncertainty. Do not invent citations.', 'Read provided text → summarize → list gaps')]
        for ident, name, purpose, instructions, workflow in skills:
            put(c, 'skill', dict(id=ident, name=name, purpose=purpose, instructions=instructions, workflow=workflow, tools=[], permissions=[], enabled=True, executions=0, version=1, evolution=None, history=[]))
        for ident, name in [('google-calendar', 'Google Calendar'), ('gmail', 'Gmail'), ('google-drive', 'Google Drive'), ('github', 'GitHub')]:
            put(c, 'integration', dict(id=ident, name=name, description='Local simulation only. No provider account access or OAuth tokens.', connected=False, provider='Mock adapter', mock=True))
        put(c, 'permission', dict(id='calendar.create', enabled=True, description='Allow requests for local mock calendar events. Each event still needs approval.'))
        put(c, 'permission', dict(id='model.context', enabled=False, description='Allow up to three relevant memories in optional Nebius requests. Off by default.'))
        log(c, 'security', 'Local demo initialized', 'Seed memories and skills are sample data. No external accounts connected.', 'info')
        put(c, 'meta', dict(id='seeded'))
