"""Bounded practice engine: curated problems, deterministic grading, inspectable evidence.

This module does not grade arbitrary homework or infer general student ability.
Expected values and worked solutions never enter a public session before the
learner requests the solution or submits a correct answer.
"""
import math
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import Field

from . import db
from .models import Strict

router = APIRouter(prefix='/api/learning', tags=['learning'])

PROBLEMS = {
    'newton-net-force': {
        'id': 'newton-net-force', 'title': 'Net force and acceleration',
        'topic': 'Newton’s second law', 'difficulty': 'Foundation', 'unit': 'm/s²',
        'prompt': 'A 2 kg block experiences a net horizontal force of 10 N. Find its acceleration. The stated force is already the net force.',
        'answer': 5.0, 'units': ['m/s²', 'm/s^2', 'm/s2', 'ms^-2', 'm s^-2'],
        'hints': [
            'List the net force and mass. You need the rate at which the block’s velocity changes.',
            'Newton’s second law is F_net = ma. Rearrange it to isolate acceleration.',
            'Use a = F_net / m = 10 N / 2 kg. Check that N/kg is equivalent to m/s².'
        ],
        'solution': 'Newton’s second law gives a = F_net/m = 10 N ÷ 2 kg = 5 m/s², along the net force. N/kg = (kg·m/s²)/kg = m/s².',
        'diagnoses': {20.0: 'You may have multiplied force by mass. To isolate a in F = ma, divide force by mass.', 0.2: 'The ratio appears reversed. Acceleration is force divided by mass, not mass divided by force.'},
        'check': 'Use net force divided by mass and check the units.'
    },
    'ohms-law': {
        'id': 'ohms-law', 'title': 'Current through a resistor', 'topic': 'Ohm’s law',
        'difficulty': 'Foundation', 'unit': 'A',
        'prompt': 'An ideal 4 Ω resistor has 12 V across it. Find the current through the resistor using Ohm’s law.',
        'answer': 3.0, 'units': ['a', 'amp', 'amps', 'ampere', 'amperes'],
        'hints': [
            'Identify the voltage across the resistor and its resistance. The unknown is current.',
            'Ohm’s law relates voltage, current and resistance: V = IR.',
            'Rearrange to I = V/R = 12 V / 4 Ω. Express the result in amperes.'
        ],
        'solution': 'From V = IR, current I = V/R = 12 V ÷ 4 Ω = 3 A. This uses the ideal constant-resistance model stated in the question.',
        'diagnoses': {48.0: 'You may have multiplied voltage by resistance. To isolate current in V = IR, divide voltage by resistance.'},
        'check': 'Rearrange V = IR to I = V/R before substituting.'
    },
    'kinetic-energy': {
        'id': 'kinetic-energy', 'title': 'Kinetic energy of a moving object', 'topic': 'Kinetic energy',
        'difficulty': 'Practice', 'unit': 'J',
        'prompt': 'A 2 kg object moves at 3 m/s. Find its translational kinetic energy using the classical formula.',
        'answer': 9.0, 'units': ['j', 'joule', 'joules'],
        'hints': [
            'Kinetic energy depends on mass and speed. Speed has a stronger effect because it is squared.',
            'Use E_k = ½mv². Square the speed before multiplying.',
            'Substitute E_k = ½ × 2 kg × (3 m/s)². Remember the factor of one half.'
        ],
        'solution': 'E_k = ½mv² = ½ × 2 kg × (3 m/s)² = ½ × 2 × 9 = 9 J. This is translational kinetic energy in the classical model.',
        'diagnoses': {18.0: 'You may have omitted the factor of one half.', 3.0: 'You may have used speed without squaring it. In E_k = ½mv², v² means 3 × 3.'},
        'check': 'Check both the squared speed and the factor of one half.'
    },
    'constant-speed': {
        'id': 'constant-speed', 'title': 'Average speed', 'topic': 'Speed and distance',
        'difficulty': 'Foundation', 'unit': 'm/s',
        'prompt': 'A runner covers a total distance of 150 m in 30 s. Find the runner’s average speed.',
        'answer': 5.0, 'units': ['m/s', 'ms^-1', 'm s^-1'],
        'hints': [
            'Average speed compares total distance with the total time for that distance.',
            'Use average speed = total distance / total elapsed time.',
            'Substitute speed = 150 m / 30 s. Your result should have units of m/s.'
        ],
        'solution': 'Average speed = total distance / elapsed time = 150 m ÷ 30 s = 5 m/s. This does not require the runner to move at a constant instantaneous speed.',
        'diagnoses': {4500.0: 'You may have multiplied distance by time. Average speed is distance divided by elapsed time.', 0.2: 'The ratio appears reversed. Divide distance by time.'},
        'check': 'Divide the total distance by the total elapsed time.'
    },
    'uniform-acceleration': {
        'id': 'uniform-acceleration', 'title': 'Velocity after constant acceleration',
        'topic': 'Constant acceleration', 'difficulty': 'Practice', 'unit': 'm/s',
        'prompt': 'A cart has initial velocity +2 m/s. It accelerates at a constant +3 m/s² for 4 s. Find its final velocity along the same axis.',
        'answer': 14.0, 'units': ['m/s', 'ms^-1', 'm s^-1'],
        'hints': [
            'The final velocity includes both the initial velocity and the change during the 4 seconds.',
            'With constant acceleration, the change in velocity is a × t.',
            'Use v = u + at = 2 m/s + (3 m/s² × 4 s). Keep the positive direction consistent.'
        ],
        'solution': 'v = u + at = 2 m/s + (3 m/s² × 4 s) = 2 + 12 = +14 m/s. All quantities use the same positive axis.',
        'diagnoses': {12.0: 'That is the change in velocity, at. Add the initial velocity to find the final velocity.'},
        'check': 'Add initial velocity to acceleration multiplied by elapsed time.'
    },
    'linear-equation': {
        'id': 'linear-equation', 'title': 'Solve a linear equation', 'topic': 'Linear equations',
        'difficulty': 'Foundation', 'unit': '',
        'prompt': 'Solve 3x + 6 = 21 for x. Enter the numerical value of x.',
        'answer': 5.0, 'units': [],
        'hints': [
            'Keep the equation balanced: perform the same operation on both sides.',
            'Subtract 6 from both sides before undoing the multiplication by 3.',
            'After subtracting 6, 3x = 15. Divide both sides by 3.'
        ],
        'solution': '3x + 6 = 21. Subtract 6 from both sides: 3x = 15. Divide both sides by 3: x = 5. Check: 3 × 5 + 6 = 21.',
        'diagnoses': {9.0: 'Subtract the constant from the right-hand side rather than adding it.', 15.0: 'You have removed the constant. Now divide by the coefficient 3.'},
        'check': 'Subtract 6 from both sides, then divide both sides by 3.'
    }
}


class StartInput(Strict):
    problem_id: str = Field(min_length=1, max_length=80)


class AttemptInput(Strict):
    answer: str = Field(min_length=1, max_length=120)


class EmptyInput(Strict):
    pass


def _problem(ident):
    problem = PROBLEMS.get(ident)
    if not problem:
        raise HTTPException(404, 'Practice problem not found')
    return problem


def _public_problem(problem):
    return {key: problem[key] for key in ('id', 'title', 'topic', 'prompt', 'unit', 'difficulty')}


def _profile(c):
    profile = db.get(c, 'profile', 'me')
    if not profile:
        raise HTTPException(409, 'Profile is unavailable')
    for key in ('attempts', 'successes', 'mistakes', 'hint_requests', 'assisted_successes'):
        profile.setdefault(key, 0)
    profile.setdefault('strengths', [])
    profile.setdefault('weak_topics', [])
    profile.setdefault('difficulty', 'Foundation')
    return profile


def list_problems(c):
    profile = _profile(c)
    weak_topics = set(profile.get('weak_topics', []))
    completed = {s['problem_id'] for s in db.all_items(c, 'learning_session') if s.get('solved') and not s.get('solution_shown')}
    results = []
    for problem in PROBLEMS.values():
        item = _public_problem(problem)
        item['recommended'] = problem['topic'] in weak_topics or (problem['id'] not in completed and problem['difficulty'] == profile.get('difficulty', 'Foundation'))
        results.append(item)
    return results


def get_session(c, ident):
    item = db.get(c, 'learning_session', ident)
    if not item:
        raise HTTPException(404, 'Practice session not found')
    return item


def start(c, problem_id):
    problem = _problem(problem_id)
    session = dict(id=db.uid(), problem_id=problem_id, problem=_public_problem(problem), level=0,
                   hint='Try a first attempt, or request hint 1 for a small direction.', feedback='',
                   solved=False, solution_shown=False, attempts=[], created_at=db.now())
    db.put(c, 'learning_session', session)
    db.log(c, 'learning', 'Practice session started', f"Problem: {problem_id}. Curated problem with deterministic grading.", 'info')
    return session


def give_hint(c, ident):
    session = get_session(c, ident)
    problem = _problem(session['problem_id'])
    if session['solved']:
        raise HTTPException(409, 'This session is solved. Start a fresh practice session.')
    if session['level'] >= 3:
        return session
    session['level'] += 1
    session['hint'] = problem['hints'][session['level'] - 1]
    profile = _profile(c)
    profile['hint_requests'] += 1
    if problem['topic'] in profile['weak_topics']:
        session['hint'] += ' This topic is on your revisit list. Work through the units before calculating.'
    db.put(c, 'profile', profile)
    db.put(c, 'learning_session', session)
    db.log(c, 'learning', 'Practice hint requested', f"Problem: {problem['id']}. Level {session['level']}.", 'info')
    return session


_NUMBER = re.compile(r'^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)$')


def _normalize_unit(unit):
    return re.sub(r'\s+', '', unit.strip().lower().replace('²', '^2').replace('⁻¹', '^-1').replace('⁻²', '^-2').replace('·', ''))


def parse_answer(answer, problem):
    if not isinstance(answer, str) or not answer.strip() or len(answer) > 120:
        raise HTTPException(422, 'Enter a finite number with the requested unit, or just the number.')
    text = answer.strip().replace('−', '-')
    match = _NUMBER.fullmatch(text)
    if not match:
        raise HTTPException(422, 'Enter a number, for example 5 or 5 m/s². Expressions and arbitrary text are not graded.')
    value = float(match.group(1))
    if not math.isfinite(value):
        raise HTTPException(422, 'Answer must be a finite number.')
    unit = _normalize_unit(match.group(2))
    allowed = {_normalize_unit(u) for u in problem['units']}
    if unit and unit not in allowed:
        expected = problem['unit'] or 'no unit'
        raise HTTPException(422, f'Use {expected}, or enter only the number. Unit conversions are not automatic.')
    return value


def _feedback(problem, value):
    for wrong, diagnosis in problem['diagnoses'].items():
        if math.isclose(value, wrong, rel_tol=1e-6, abs_tol=1e-6):
            return diagnosis
    return 'That value does not match this problem. ' + problem['check']


def submit_attempt(c, ident, answer):
    session = get_session(c, ident)
    if session['solved']:
        raise HTTPException(409, 'This session is already solved. A repeated submission cannot add success credit.')
    problem = _problem(session['problem_id'])
    value = parse_answer(answer, problem)  # Invalid input never alters evidence or counters.
    correct = math.isclose(value, problem['answer'], rel_tol=1e-4, abs_tol=1e-4)
    profile = _profile(c)
    profile['attempts'] += 1
    if correct:
        session['solved'] = True
        session['solution'] = problem['solution']
        if session['solution_shown']:
            profile['assisted_successes'] += 1
            session['credit_awarded'] = False
            feedback = 'Correct after the solution reveal. Recorded as assisted practice, with no new independent success credit.'
        else:
            profile['successes'] += 1
            session['credit_awarded'] = True
            evidence = problem['topic'] + ' (practice evidence)'
            if evidence not in profile['strengths']:
                profile['strengths'].append(evidence)
            profile['weak_topics'] = [topic for topic in profile['weak_topics'] if topic != problem['topic']]
            feedback = 'Correct for this problem. Explain the method and units to check your understanding. The worked solution is now available.'
        # Progress label uses distinct independently solved problems, not repeated submissions.
        solved_ids = {s['problem_id'] for s in db.all_items(c, 'learning_session') if s.get('credit_awarded')}
        if session['credit_awarded']:
            solved_ids.add(session['problem_id'])
        profile['difficulty'] = 'Practice' if len(solved_ids) >= 2 else 'Foundation'
    else:
        profile['mistakes'] += 1
        if problem['topic'] not in profile['weak_topics']:
            profile['weak_topics'].append(problem['topic'])
        feedback = _feedback(problem, value)
    session['feedback'] = feedback
    session['attempts'].append(dict(answer=answer.strip(), correct=correct, feedback=feedback, created_at=db.now()))
    db.put(c, 'profile', profile)
    db.put(c, 'learning_session', session)
    db.log(c, 'learning', 'Practice attempt checked', f"Problem: {problem['id']}. {'Correct' if correct else 'Revisit topic'}. {'Assisted' if session['solution_shown'] else 'Solution not revealed'}.")
    return session


def reveal_solution(c, ident):
    session = get_session(c, ident)
    problem = _problem(session['problem_id'])
    # Revealing a solution after an independent solve does not retract earned evidence.
    if not session['solved']:
        session['solution_shown'] = True
        session['feedback'] = 'Worked solution revealed. Future correct answers in this session count as assisted practice.'
    session['solution'] = problem['solution']
    db.put(c, 'learning_session', session)
    db.log(c, 'learning', 'Practice solution opened', f"Problem: {problem['id']}. No success credit awarded by reveal.", 'info')
    return session


@router.get('/problems')
def problems_endpoint():
    with db.transaction() as c:
        return list_problems(c)


@router.get('/sessions')
def sessions_endpoint():
    with db.transaction() as c:
        return db.all_items(c, 'learning_session')[:20]


@router.post('/sessions', status_code=201)
def start_endpoint(body: StartInput):
    with db.transaction() as c:
        return start(c, body.problem_id)


@router.get('/sessions/{ident}')
def session_endpoint(ident: str):
    with db.transaction() as c:
        return get_session(c, ident)


@router.post('/sessions/{ident}/hint')
def hint_endpoint(ident: str, body: EmptyInput):
    with db.transaction() as c:
        return give_hint(c, ident)


@router.post('/sessions/{ident}/attempt')
def attempt_endpoint(ident: str, body: AttemptInput):
    with db.transaction() as c:
        return submit_attempt(c, ident, body.answer)


@router.post('/sessions/{ident}/solution')
def solution_endpoint(ident: str, body: EmptyInput):
    with db.transaction() as c:
        return reveal_solution(c, ident)
