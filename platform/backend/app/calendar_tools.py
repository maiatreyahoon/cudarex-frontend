"""Calendar proposals are immutable, local, and require single-use server approval."""
from datetime import datetime, timedelta, timezone
from typing import Literal
from pydantic import Field, field_validator, model_validator
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from .models import Strict
from . import db

router = APIRouter(prefix='/api')
IST = timezone(timedelta(hours=5, minutes=30))

class CalendarProposal(Strict):
    title: str = Field(min_length=1, max_length=120)
    start: datetime
    end: datetime
    timezone: Literal['Asia/Kolkata'] = 'Asia/Kolkata'

    @field_validator('start', 'end')
    @classmethod
    def aware(cls, value):
        if value.tzinfo is None or value.utcoffset() != timedelta(hours=5, minutes=30):
            raise ValueError('Use an ISO date and time with +05:30 for Asia/Kolkata')
        return value

    @model_validator(mode='after')
    def duration(self):
        if self.end <= self.start or self.end-self.start > timedelta(hours=12):
            raise ValueError('End must follow start and duration must be at most 12 hours')
        if self.start <= datetime.now(timezone.utc):
            raise ValueError('Choose a future start time')
        return self


def overlaps(c, payload):
    start, end = datetime.fromisoformat(payload['start']), datetime.fromisoformat(payload['end'])
    return [dict(id=e['id'], title=e['title'], start=e['start'], end=e['end']) for e in db.all_items(c, 'event')
            if start < datetime.fromisoformat(e['end']) and end > datetime.fromisoformat(e['start'])]


def make_proposal(c, payload):
    if not db.get(c, 'permission', 'calendar.create')['enabled'] or not db.get(c, 'integration', 'google-calendar')['connected']:
        raise HTTPException(403, 'Enable mock Google Calendar and calendar.create first')
    # Validate even internal callers; the LLM cannot provide a privileged payload.
    validated = CalendarProposal(**payload)
    payload = dict(title=validated.title, start=validated.start.isoformat(), end=validated.end.isoformat(), timezone=validated.timezone)
    conflicts = overlaps(c, payload)
    detail = f"MOCK ONLY • {payload['title']} • {payload['start']} to {payload['end']} • {payload['timezone']}. Local record only."
    item = db.put(c, 'approval', dict(id=db.uid(), tool='Mock Google Calendar', action='Create local calendar event', detail=detail, payload=payload, conflicts=conflicts, state='pending', created_at=db.now(), expires_at=(datetime.now(timezone.utc)+timedelta(minutes=15)).isoformat(), executed=False))
    db.log(c, 'security', 'Calendar approval requested', detail + (f' Conflicts: {len(conflicts)}; reschedule before approval.' if conflicts else ''), 'pending')
    return item


@router.post('/calendar/proposals', status_code=201)
def propose(body: CalendarProposal):
    with db.transaction() as c:
        return make_proposal(c, body.model_dump())


def escape_ics(value):
    return value.replace('\\', '\\\\').replace('\r\n', '\n').replace('\r', '\n').replace('\n', '\\n').replace(';', '\\;').replace(',', '\\,')


def folded(line):
    # RFC5545 physical lines max 75 octets; continuation begins with one space.
    lines, current = [], ''
    for char in line:
        if len((current + char).encode('utf-8')) > 74:
            lines.append(current)
            current = ' ' + char
        else:
            current += char
    lines.append(current)
    return '\r\n'.join(lines)


@router.get('/events/{ident}/ics')
def calendar_file(ident: str):
    with db.transaction() as c:
        item = db.get(c, 'event', ident)
        if not item:
            raise HTTPException(404, 'Approved local event not found')
    utc = lambda val: datetime.fromisoformat(val).astimezone(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CUDAREX//Local Calendar Export//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
             'UID:' + escape_ics(item['id']) + '@cudarex.local', 'DTSTAMP:' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'),
             'DTSTART:' + utc(item['start']), 'DTEND:' + utc(item['end']), 'SUMMARY:' + escape_ics(item['title']),
             'DESCRIPTION:Manually exported from a CUDAREX mock event. Importing this file is your own calendar action.',
             'END:VEVENT', 'END:VCALENDAR']
    content = '\r\n'.join(folded(line) for line in lines) + '\r\n'
    return Response(content, media_type='text/calendar', headers={'Content-Disposition': 'attachment; filename="cudarex-event.ics"'})
