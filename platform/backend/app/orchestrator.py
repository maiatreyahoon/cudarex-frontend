import re
from . import db, security, learning

def run(c, message, conversation_id=None):
    lower = message.lower()
    profile = db.get(c, 'profile', 'me')
    session = db.get(c, 'session', conversation_id) if conversation_id else None
    if not session:
        session = dict(id=db.uid(), hint=0, active=False)
    route, status, approval, used_memories, selected = 'fallback', 'complete', None, [], None
    response = ''
    provider_request = None
    memory_intent = bool(re.search(r'^(remember\b|i prefer\b|my goal is\b|i am (a |an )?)', lower))
    recall_intent = bool(re.search(r'what.*(remember|prefer)|recall|my memories', lower))
    ai_intent = lower.startswith('ask ai:')
    if security.INJECTION.search(message):
        route, status = 'firewall', 'blocked'
        response = 'Blocked: text instructions cannot override permissions, approve actions, or expose secrets. Use Security Centre for decisions.'
        db.log(c, 'security', 'Suspicious instruction blocked', 'Heuristic warning; no tool was invoked.', 'blocked')
    elif not memory_intent and not recall_intent and re.search(r'\b(schedule|calendar|meeting|remind)\b', lower):
        route = 'calendar'
        approval = security.request_calendar(c, message)
        status = 'awaiting_permission' if approval else 'blocked'
        response = ('Prepared a local mock proposal for physics study tomorrow, 5–6 PM Asia/Kolkata. Review the exact details in Security Centre. For a different title or time, deny this request and use the editable calendar form there. Nothing has been created yet.' if approval else 'Calendar request blocked. Open Integrations, enable the mock calendar, and check calendar.create in Security Centre. No real account access is available.')
    elif not memory_intent and not recall_intent and re.search(r'\b(send|delete|email|gmail|drive|browse|web search|run command|execute code)\b', lower):
        route, status = 'unsupported_tool', 'blocked'
        response = 'This MVP cannot read accounts, send messages, browse, delete external files, or execute code. No external action occurred. Paste text for analysis, or try the approval-gated mock calendar.'
        db.log(c, 'security', 'Unsupported external tool blocked', 'No provider data accessed.', 'blocked')
    elif memory_intent:
        route = 'memory_write'
        category = 'Goal' if 'goal' in lower else 'Profile' if re.search(r'i am', lower) else 'Preference'
        item = db.put(c, 'memory', dict(id=db.uid(), category=category, text=message[:1000], updated_at=db.now()))
        if category == 'Profile':
            for word, role in [('student', 'Student'), ('developer', 'Developer'), ('researcher', 'Researcher'), ('teacher', 'Teacher'), ('office', 'Office professional')]:
                if word in lower:
                    profile['profession'] = role
                    break
        used_memories = [item]
        response = f'Saved to your {category.lower()} memories. Your role is {profile["profession"]}. Review, correct, or delete it in Memory Centre.'
        db.log(c, 'memory', 'Memory saved', f'Category: {category}. Content omitted from audit for privacy.')
    elif recall_intent:
        route = 'memory_read'
        used_memories = db.all_items(c, 'memory')[:8]
        response = 'Here are your saved memories:\n' + '\n'.join('• ' + m['text'] for m in used_memories) if used_memories else 'You have no saved memories.'
    elif lower.strip() in ['stop tutoring', 'reset tutoring']:
        session.update(active=False, hint=0)
        session.pop('learning_id', None)
        route, response = 'tutor_reset', 'Guided demo session reset. Ask a new question or start physics again.'
    else:
        skills = db.all_items(c, 'skill')
        selected = next((s for s in skills if s['name'].lower() in lower), None)
        physics = db.get(c, 'skill', 'physics')
        tutor = not ai_intent and bool(re.search(r'physics|newton|hint|study|solve|my answer|my attempt|solution|final answer', lower))
        if selected and not selected['enabled']:
            route, status = 'skill_disabled', 'blocked'
            response = 'That skill is disabled. Enable it in Skills Centre first.'
        elif tutor and (not selected or selected['id'] == 'physics'):
            selected = physics
            route = 'tutoring'
            if not physics or not physics['enabled']:
                response, status = 'Physics Solver is disabled or deleted. Restore or enable it to use this demo tutor.', 'blocked'
            else:
                practice = db.get(c, 'learning_session', session.get('learning_id', ''))
                attempt = re.search(r'(?:my answer|my attempt)(?:\s+is)?\s*[:=]?\s*(.+)$', message, re.I)
                command_hint = bool(re.search(r'next hint|another hint|hint [23]', lower))
                solution = bool(re.search(r'show solution|final answer|explain the answer', lower))
                if not practice or (not attempt and not command_hint and not solution):
                    problem_id = 'newton-net-force'
                    for term, ident in [('ohm', 'ohms-law'), ('kinetic', 'kinetic-energy'), ('average speed', 'constant-speed'), ('uniform acceleration', 'uniform-acceleration'), ('linear equation', 'linear-equation')]:
                        if term in lower:
                            problem_id = ident
                            break
                    practice = learning.start(c, problem_id)
                    session['learning_id'] = practice['id']
                    session['active'] = True
                if practice['solved'] and not solution:
                    response = 'This practice session is already solved. Repeated answers do not earn extra credit. Ask to study another problem, or open Learning Studio.'
                elif attempt:
                    practice = learning.submit_attempt(c, practice['id'], attempt.group(1))
                    response = practice['feedback']
                    if practice['solved']:
                        response += '\n\n' + practice['solution']
                        session['active'] = False
                elif solution:
                    practice = learning.reveal_solution(c, practice['id'])
                    response = practice['feedback'] + '\n\n' + practice['solution']
                else:
                    practice = learning.give_hint(c, practice['id'])
                    response = f'Hint {practice["level"]}/3: ' + practice['hint']
                response = 'Curated practice • ' + practice['problem']['title'] + '\n' + practice['problem']['prompt'] + '\n\n' + response + '\n\nFor arbitrary questions, use “Ask AI:” with configured Nebius. Learning Studio has the full problem bank.'
                profile = db.get(c, 'profile', 'me')
        else:
            if not selected:
                selected = next((s for s in skills if s['enabled'] and ((s['id'] == 'code' and 'review' in lower) or (s['id'] == 'research' and 'research' in lower))), None)
            route = 'skill' if selected else 'assistant'
            consent = db.get(c, 'permission', 'model.context')['enabled']
            if consent:
                words = set(re.findall(r'\w{4,}', lower))
                used_memories = [m for m in db.all_items(c, 'memory') if words.intersection(re.findall(r'\w{4,}', m['text'].lower()))][:3]
            provider_request = dict(message=message, profession=profile['profession'], skill={k: selected[k] for k in ['name', 'instructions', 'workflow']} if selected else None, memories=[m['text'] for m in used_memories])
            if selected:
                response = f'Deterministic skill preview • {selected["name"]}\nInstructions: {selected["instructions"]}\nWorkflow: {selected["workflow"]}\n\nThese instructions are being previewed, not executed by a language model. Configure Nebius for generated skill responses. Tools and listed permissions never grant authority.'
            else:
                response = f'Deterministic demo • {profile["profession"]} mode. Try “Remember I prefer examples”, “What do you remember?”, “Help me study physics”, or “Schedule study time”. Arbitrary AI answers require optional Nebius configuration. With Nebius configured, prefix broader physics questions with “Ask AI:”.'
        if selected and status != 'blocked':
            selected['executions'] += 1
            db.put(c, 'skill', selected)
            db.log(c, 'skill', 'Skill routed', selected['name'] + '; no external tools invoked')
    if used_memories:
        db.log(c, 'memory', 'Memory context selected', 'Record IDs: ' + ', '.join(m['id'] for m in used_memories), 'info')
    db.put(c, 'session', session)
    db.put(c, 'profile', profile)
    db.log(c, 'chat', 'Route: ' + route, 'User content omitted. No hidden tool calls.', 'blocked' if status == 'blocked' else 'info')
    return dict(_provider_request=provider_request, response=response, status=status, route=route, conversation_id=session['id'], approval=approval, memories=used_memories, activities=db.all_items(c, 'activity')[:20])
