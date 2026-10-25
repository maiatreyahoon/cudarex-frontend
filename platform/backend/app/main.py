"""Local single-user HTTP boundary. Run on loopback only; no public deployment."""
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / '.env')

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from . import db, orchestrator, provider, security, calendar_tools, learning
from .models import MemoryIn, SkillIn, SkillPatch, Decision, EvolutionDecision, Feedback, ChatIn, ProfileIn, PermissionIn

ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

@asynccontextmanager
async def lifespan(app):
    db.initialize()
    yield

app = FastAPI(title='CUDAREX hackathon build', version='2.0.0', lifespan=lifespan)
app.include_router(calendar_tools.router)
app.include_router(learning.router)
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_credentials=False, allow_methods=['GET','POST','PATCH','DELETE'], allow_headers=['Content-Type', 'X-Cudarex-Client'])
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['localhost','127.0.0.1','testserver'])

@app.middleware('http')
async def local_guard(request: Request, call_next):
    # Custom header + JSON boundary: third-party sites cannot submit writes via HTML forms.
    # This is origin/CSRF hardening, NOT authentication. Local processes are trusted in this MVP.
    origin = request.headers.get('origin')
    if origin and origin not in ORIGINS:
        return JSONResponse({'detail': 'Untrusted browser origin'}, status_code=403)
    if request.method in ['POST', 'PATCH', 'DELETE']:
        if request.headers.get('x-cudarex-client') != 'local-ui':
            return JSONResponse({'detail': 'Missing local client header'}, status_code=403)
        if request.method != 'DELETE' and not request.headers.get('content-type', '').startswith('application/json'):
            return JSONResponse({'detail': 'JSON required'}, status_code=415)
        try:
            size = int(request.headers.get('content-length', '0'))
        except ValueError:
            return JSONResponse({'detail': 'Invalid content length'}, status_code=400)
        if size > 32768:
            return JSONResponse({'detail': 'Request too large'}, status_code=413)
    return await call_next(request)

def required(c, kind, ident):
    result = db.get(c, kind, ident)
    if not result:
        raise HTTPException(404, kind + ' not found')
    return result

def model_state(c):
    import os
    evidence = db.get(c, 'provider_state', 'nebius')
    valid = bool(provider.configured() and evidence and evidence.get('requested_model') == os.getenv('NEBIUS_MODEL') and evidence.get('base_url') == os.getenv('NEBIUS_BASE_URL', provider.ALLOWED_BASES[0]).rstrip('/'))
    return dict(status='nebius-verified' if valid else 'nebius-configured-unverified' if provider.configured() else 'deterministic-demo',
                configured=provider.configured(), evidence=evidence if valid else None,
                nvidia_model_requested=bool(os.getenv('NEBIUS_MODEL', '').lower().startswith('nvidia/')),
                note='Successful runtime evidence is local metadata, not certification of hackathon eligibility.')


@app.get('/api/model/status')
def model_status():
    with db.transaction() as c:
        return model_state(c)


@app.get('/api/health')
def health():
    with db.transaction() as c:
        count = len(db.all_items(c, 'memory'))
        state = model_state(c)
    return dict(ok=True, mode='local-mock-tools', model=state['status'], model_evidence=state, memories=count)

@app.get('/api/profile')
def profile():
    with db.transaction() as c:
        return required(c, 'profile', 'me')

@app.patch('/api/profile')
def update_profile(body: ProfileIn):
    with db.transaction() as c:
        result = required(c, 'profile', 'me')
        result.update(body.model_dump())
        db.put(c, 'profile', result)
        db.log(c, 'memory', 'Profile updated', 'Profession and preferences changed by user')
        return result

@app.get('/api/memories')
def memories():
    with db.transaction() as c:
        return db.all_items(c, 'memory')

@app.post('/api/memories', status_code=201)
def create_memory(body: MemoryIn):
    with db.transaction() as c:
        item = db.put(c, 'memory', dict(id=db.uid(), **body.model_dump(), updated_at=db.now()))
        db.log(c, 'memory', 'Memory created', 'Content omitted from audit')
        return item

@app.patch('/api/memories/{ident}')
def update_memory(ident: str, body: MemoryIn):
    with db.transaction() as c:
        required(c, 'memory', ident)
        item = db.put(c, 'memory', dict(id=ident, **body.model_dump(), updated_at=db.now()))
        db.log(c, 'memory', 'Memory corrected', 'Content omitted from audit')
        return item

@app.delete('/api/memories/{ident}')
def delete_memory(ident: str):
    with db.transaction() as c:
        required(c, 'memory', ident)
        db.remove(c, 'memory', ident)
        db.log(c, 'memory', 'Memory deleted', 'Removed from active SQLite records; no content retained in audit')
        return {'ok': True}

@app.get('/api/skills')
def skills():
    with db.transaction() as c:
        return db.all_items(c, 'skill')

@app.post('/api/skills', status_code=201)
def create_skill(body: SkillIn):
    with db.transaction() as c:
        item = db.put(c, 'skill', dict(id=db.uid(), **body.model_dump(), executions=0, version=1, evolution=None, history=[]))
        db.log(c, 'skill', 'Skill created', item['name'])
        return item

@app.patch('/api/skills/{ident}')
def edit_skill(ident: str, body: SkillPatch):
    changes = body.model_dump(exclude_unset=True)
    if any(v is None for v in changes.values()):
        raise HTTPException(422, 'Null fields not supported')
    with db.transaction() as c:
        item = required(c, 'skill', ident)
        # A human edit is explicit; existing evolution is invalidated by any content edit.
        if any(k != 'enabled' and item.get(k) != v for k, v in changes.items()):
            item['history'].append(dict(version=item['version'], instructions=item['instructions'], changed_at=db.now(), reason='manual edit'))
            item['version'] += 1
            item['evolution'] = None
        item.update(changes)
        db.put(c, 'skill', item)
        db.log(c, 'skill', 'Skill updated', item['name'])
        return item

@app.delete('/api/skills/{ident}')
def delete_skill(ident: str):
    with db.transaction() as c:
        required(c, 'skill', ident)
        db.remove(c, 'skill', ident)
        db.log(c, 'skill', 'Skill deleted', ident)
        return {'ok': True}

@app.post('/api/skills/{ident}/feedback')
def suggest(ident: str, body: Feedback):
    with db.transaction() as c:
        item = required(c, 'skill', ident)
        if item['evolution']:
            raise HTTPException(409, 'Review existing suggestion first')
        # Deterministic heuristic, not an autonomous training/evolution claim.
        change = 'Begin with a concise summary; offer details only when requested.' if any(w in body.feedback.lower() for w in ['long','short','concise','verbose']) else 'Check assumptions, ask for missing information, and verify the result before responding.'
        item['evolution'] = dict(id=db.uid(), proposed_change=change, feedback=body.feedback, base_version=item['version'])
        db.put(c, 'skill', item)
        db.log(c, 'skill', 'Improvement proposed from feedback', item['name'] + '; instructions unchanged until approval', 'pending')
        return item

@app.post('/api/skills/{ident}/evolution/respond')
def evolve(ident: str, body: EvolutionDecision):
    with db.transaction() as c:
        item = required(c, 'skill', ident)
        proposal = item['evolution']
        if not proposal or proposal['id'] != body.evolution_id or proposal['base_version'] != item['version']:
            raise HTTPException(409, 'Stale or already decided suggestion')
        if body.approved:
            item['history'].append(dict(version=item['version'], instructions=item['instructions'], changed_at=db.now(), reason='approved evolution'))
            item['instructions'] += '\n' + proposal['proposed_change']
            item['version'] += 1
        item['evolution'] = None
        db.put(c, 'skill', item)
        db.log(c, 'skill', 'Evolution approved' if body.approved else 'Evolution rejected', item['name'])
        return item

@app.get('/api/integrations')
def integrations():
    with db.transaction() as c:
        return db.all_items(c, 'integration')

@app.post('/api/integrations/{ident}/connect')
def connect(ident: str):
    with db.transaction() as c:
        item = required(c, 'integration', ident)
        item['connected'] = True
        db.put(c, 'integration', item)
        db.log(c, 'tool', 'Mock connection enabled', item['name'] + ': simulation flag only. No OAuth or account access.', 'info')
        return item

@app.post('/api/integrations/{ident}/disconnect')
def disconnect(ident: str):
    with db.transaction() as c:
        item = required(c, 'integration', ident)
        item['connected'] = False
        db.put(c, 'integration', item)
        db.log(c, 'security', 'Mock connection disabled', item['name'])
        return item

@app.get('/api/permissions')
def permissions():
    with db.transaction() as c:
        return db.all_items(c, 'permission')

@app.patch('/api/permissions/{ident}')
def permission_change(ident: str, body: PermissionIn):
    with db.transaction() as c:
        item = required(c, 'permission', ident)
        item['enabled'] = body.enabled
        db.put(c, 'permission', item)
        db.log(c, 'security', 'Permission changed', ident + ': ' + str(body.enabled))
        return item

@app.get('/api/approvals')
def approvals():
    with db.transaction() as c:
        return db.all_items(c, 'approval')

@app.post('/api/approvals/{ident}/decision')
def approval_decision(ident: str, body: Decision):
    try:
        with db.transaction() as c:
            return security.decide(c, ident, body.approved)
    except HTTPException as error:
        # The failed decision transaction rolls back. Record the rejection separately.
        with db.transaction() as c:
            db.log(c, 'security', 'Approval decision blocked', f'Request ID: {ident}. HTTP {error.status_code}. No event created.', 'blocked')
        raise

@app.get('/api/events')
def events():
    with db.transaction() as c:
        return db.all_items(c, 'event')

@app.get('/api/activity')
def activity():
    with db.transaction() as c:
        return db.all_items(c, 'activity')[:300]

@app.post('/api/chat')
def chat(body: ChatIn):
    with db.transaction() as c:
        result = orchestrator.run(c, body.message, body.conversation_id)
    context = result.pop('_provider_request', None)
    # Network generation happens after committing: a slow model never holds a DB lock.
    if context:
        try:
            answer = provider.generate(**context)
            if answer:
                text = answer.text if isinstance(answer, provider.Generation) else answer
                result['response'] = 'Nebius model • text only; no tool actions executed.\n\n' + text
                with db.transaction() as c:
                    if isinstance(answer, provider.Generation):
                        db.put(c, 'provider_state', dict(id='nebius', requested_model=answer.requested_model, returned_model=answer.model, base_url=answer.base_url, verified_at=db.now(), latency_ms=answer.latency_ms, input_tokens=answer.input_tokens, output_tokens=answer.output_tokens))
                    db.log(c, 'chat', 'Nebius text generated', f'Relevant memories shared: {len(context["memories"])}. No tool execution.')
        except Exception:
            result['response'] = 'Nebius unavailable; switched to deterministic demo. Provider details are hidden.\n\n' + result['response']
            with db.transaction() as c:
                db.log(c, 'chat', 'Model fallback', 'Provider failed or configuration invalid; details omitted.', 'info')
    with db.transaction() as c:
        result['activities'] = db.all_items(c, 'activity')[:20]
    return result


@app.get('/api/insights')
def insights():
    with db.transaction() as c:
        profile = required(c, 'profile', 'me')
        pending = [a for a in db.all_items(c, 'approval') if a['state'] == 'pending']
        proposals = [s for s in db.all_items(c, 'skill') if s.get('evolution')]
        output = []
        if pending:
            output.append(dict(id='approvals', title=f'{len(pending)} action request(s) need a decision', detail='Inspect exact payloads. Expired proposals can be denied. No action runs automatically.', target='security'))
        if profile.get('weak_topics'):
            output.append(dict(id='learning', title='Revisit a recorded learning gap', detail=', '.join(profile['weak_topics']), target='learning'))
        if proposals:
            output.append(dict(id='evolution', title='Skill improvements are waiting', detail='Feedback created a proposal. Only your approval changes instructions.', target='skills'))
        if not db.all_items(c, 'memory'):
            output.append(dict(id='memory', title='Add a preference for AURA', detail='Save only information you want retained. You can edit and delete it.', target='memory'))
        if not output:
            output.append(dict(id='practice', title='Build evidence of your progress', detail='Choose a practice problem, try an answer, and use hints if needed.', target='learning'))
        return output
