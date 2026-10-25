import re
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from . import db

# Heuristic alerts add transparency; safety does NOT depend on matching this list.
INJECTION = re.compile(r'ignore.{0,30}(instructions|rules|security)|bypass.{0,30}(approval|permission|firewall)|reveal.{0,20}(secret|api.key)|system prompt|without (my )?(approval|permission)', re.I)

def request_calendar(c, message):
    permission = db.get(c, 'permission', 'calendar.create')
    integration = db.get(c, 'integration', 'google-calendar')
    if not permission['enabled'] or not integration['connected']:
        db.log(c, 'security', 'Calendar request blocked', 'Enable the mock calendar connection and calendar.create permission first.', 'blocked')
        return None
    from .calendar_tools import make_proposal
    tomorrow = datetime.now(timezone(timedelta(hours=5, minutes=30))).date() + timedelta(days=1)
    return make_proposal(c, dict(title='Physics study session', start=f'{tomorrow}T17:00:00+05:30', end=f'{tomorrow}T18:00:00+05:30', timezone='Asia/Kolkata'))

def decide(c, ident, approved):
    item = db.get(c, 'approval', ident)
    if not item:
        raise HTTPException(404, 'Approval not found')
    if item['state'] != 'pending':
        raise HTTPException(409, 'Already decided; approvals cannot be replayed')
    if approved and datetime.fromisoformat(item['expires_at']) < datetime.now(timezone.utc):
        raise HTTPException(409, 'Approval expired; request a new proposal')
    if approved:
        if not db.get(c, 'permission', 'calendar.create')['enabled'] or not db.get(c, 'integration', 'google-calendar')['connected']:
            raise HTTPException(403, 'Permission or mock connection revoked; deny this request or reconnect')
        # Only this hardcoded local adapter exists; no user-provided action/URL is executable.
        if item['tool'] != 'Mock Google Calendar':
            raise HTTPException(403, 'Unsupported tool')
        from .calendar_tools import overlaps
        if overlaps(c, item['payload']):
            raise HTTPException(409, 'Schedule conflict: deny this proposal and choose a different time')
        if datetime.fromisoformat(item['payload']['start']) <= datetime.now(timezone.utc):
            raise HTTPException(409, 'Event start has passed; request a new proposal')
        db.put(c, 'event', dict(id=item['id'], **item['payload'], mock=True))
        item['executed'] = True
        db.log(c, 'tool', 'Mock calendar event created', item['detail'] + ' No external action occurred.')
    item['state'] = 'approved' if approved else 'denied'
    db.put(c, 'approval', item)
    db.log(c, 'security', 'Approval ' + item['state'], item['id'], 'success' if approved else 'blocked')
    return item
