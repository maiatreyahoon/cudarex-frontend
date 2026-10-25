# CUDAREX API contract

Base URL: `http://127.0.0.1:8000/api`. The Vite frontend proxies `/api` to this address. JSON in and out. The checked-in `openapi.json` contains exact request schemas; interactive documentation is at `http://127.0.0.1:8000/docs` while running.

This is one local user's workspace. There is no login, multi-tenant isolation, or production authentication. Bind only to loopback. The request header below prevents simple cross-site form writes; it is **not a password or an authentication token**. Any local process can use the API.

All POST, PATCH, DELETE requests require `X-Cudarex-Client: local-ui`. POST/PATCH also require `Content-Type: application/json`. Browser origins are limited to `http://localhost:5173` and `http://127.0.0.1:5173`; use those exact addresses. Allowed hosts: localhost, 127.0.0.1 (plus testserver for tests). No cookies or OAuth tokens are used. CORS is not authentication.

| Method | Path | Body / result |
|---|---|---|
| GET | `/health` | `{ok, mode, model, memories}`. Configured model is unverified until a successful request. |
| GET / PATCH | `/profile` | PATCH requires `display_name`, profession, tagline, learning_focus. Returns profile plus learning counters. |
| GET / POST | `/memories` | POST `{category,text}` → created record (201). |
| PATCH / DELETE | `/memories/{id}` | PATCH replaces category and text. DELETE → `{ok:true}`. |
| GET / POST | `/skills` | POST skill input → new record (201). |
| PATCH / DELETE | `/skills/{id}` | PATCH editable fields only. Version/executions/history cannot be supplied. |
| POST | `/skills/{id}/feedback` | `{feedback}` → skill with a pending evolution; original instructions/version unchanged. |
| POST | `/skills/{id}/evolution/respond` | `{evolution_id,approved}` → updated skill. Approval appends addition, increments version, preserves prior instructions in history. Reject clears proposal. |
| GET | `/integrations` | Mock adapter flags only. |
| POST | `/integrations/{id}/connect` | `{}` → mock enabled. No OAuth redirect or account connection. |
| POST | `/integrations/{id}/disconnect` | `{}` → mock disabled. |
| GET | `/permissions` | `calendar.create` and `model.context`. |
| PATCH | `/permissions/{id}` | `{enabled:bool}` → permission. No implicit approval of calendar events. |
| GET | `/approvals` | Pending and previously decided calendar requests. |
| POST | `/approvals/{id}/decision` | `{approved:bool}`. Extra fields forbidden; server owns action payload. |
| GET | `/events` | Local mock events created by approved requests. |
| GET | `/activity` | Latest 300 audit entries, newest first. |
| POST | `/chat` | `{message,conversation_id?:string}` → response, status, route, conversation_id, optional approval, memories, activities. |

`profession`: Student, Developer, Researcher, Teacher, Office professional.

`category`: Preference, Goal, Profile, Learning, Project.

Skill input: `{name,purpose,instructions,workflow,tools:string[],permissions:string[],enabled:bool}`. Limits and required fields are in OpenAPI. A skill's listed tools/permissions are metadata, never authorization. Supported integration IDs: `google-calendar`, `gmail`, `google-drive`, `github`. Only calendar has an action adapter.

Memory: `{id,category,text,updated_at}`. Skill additionally has `{id,version,executions,evolution,history}`. Activity: `{id,type,title,detail,status,created_at}`. Timestamp strings are ISO 8601. Calendar payloads explicitly use `Asia/Kolkata`, +05:30.

A chat route records the actual decision: firewall, unsupported_tool, memory_write, memory_read, calendar, tutoring, tutor_reset, skill_disabled, skill, assistant. Transient UI “thinking” is a request indicator; there is no token streaming or background agent. Hint state is stored by conversation ID, but raw conversation text is not persisted. Starting a new conversation resets hints; records in memory/skills/profile remain.

Example:

```sh
curl http://127.0.0.1:8000/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Cudarex-Client: local-ui' \
  -d '{"message":"Remember I prefer examples"}'
```

For the calendar demo: enable mock Google Calendar, send `Schedule study time`, inspect returned approval payload, POST its decision, then GET `/events`. The exact server-held proposal is **tomorrow 17:00–18:00 Asia/Kolkata**, titled Physics study session. Other requested times are not parsed. Approval expires after 15 minutes; expired requests can still be denied. Approval and local event creation share an atomic SQLite transaction. Replaying, concurrent duplicate approval, revoked permissions, or disconnected mock calendar cannot produce duplicate/unauthorized events. No general execute endpoint exists.

Errors: FastAPI JSON `detail`, 404 unknown resource, 409 decided/stale/expired/conflicting proposal, 403 invalid origin/header/permission, 415 non-JSON write, 413 oversized declared request, 422 validation failure. Provider failures return a labeled deterministic fallback; internal errors and credentials are not included. Writes with unsupported fields are rejected, including attempts to overwrite approval payload or skill version.

SQLite stores application records and metadata in a `records(kind,id,data)` table, with `(kind,id)` as its primary key and JSON values validated at the API boundary. This lightweight repository is intentional for the local MVP; there are no migrations or large-scale query guarantees.

## Version 2 additions

| Method | Route | Contract |
| --- | --- | --- |
| GET | `/api/learning/problems` | Public bank of six curated physics/algebra problems. No answers or worked solutions. `recommended` uses recorded gaps and practice level. |
| POST | `/api/learning/sessions` | `{problem_id}` creates a persistent session with level 0 and no answer exposed. |
| GET | `/api/learning/sessions` | Latest 20 sessions, including the learner's saved attempts. |
| GET | `/api/learning/sessions/{id}` | Resume the saved session. |
| POST | `/api/learning/sessions/{id}/hint` | `{}` progresses through three hints. |
| POST | `/api/learning/sessions/{id}/attempt` | `{answer:string}` validates a finite numerical value and optional supported unit. Invalid expressions/units return 422 without changing counters. |
| POST | `/api/learning/sessions/{id}/solution` | `{}` explicitly reveals the solution. Future correct attempts in this session receive assisted credit only. |
| POST | `/api/calendar/proposals` | `{title,start,end,timezone:"Asia/Kolkata"}` creates an approval proposal, not an event (201). Future ISO timestamps must include +05:30. Duration 0–12 hours. |
| GET | `/api/events/{id}/ics` | Download an approved local event as an escaped/folded RFC5545 calendar file. The user chooses whether to import it. |
| GET | `/api/insights` | Computed local suggestions from learning gaps, pending decisions and memory state. No external data or background monitoring. |
| GET | `/api/model/status` | Configuration status plus metadata of the last successful runtime generation matching the current model and endpoint. No key, full prompt or model text stored as evidence. |

`health.model_evidence` contains the model status. A configured key alone yields `nebius-configured-unverified`; a successful validated response can yield `nebius-verified`. This records historical runtime evidence, not continuous availability or organizer approval. The requested model's `nvidia/` prefix is a useful indicator, not independent proof of NVIDIA ownership.

Calendar proposals include immutable `payload`, `expires_at`, and `conflicts`. The server blocks overlap against approved local events at decision time, including events approved after a proposal was made. Deny the conflicting proposal and prepare a new time. Rejections are audited after rollback. The chat calendar shortcut retains its explicitly disclosed default of tomorrow 17:00–18:00 Asia/Kolkata; the form supports exact user choices.

Chat tutoring and Learning Studio now share the same practice records and counters. Correct repeats in a solved chat session do not earn additional credit. A solution reveal does not earn independent credit. A practice-level increase requires two distinct problems solved before reveal. These are modest practice signals, not a validated estimate of student ability.
