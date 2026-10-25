# Architecture and implementation boundaries

CUDAREX is one local application. AURA is its assistant. The current product focuses on a student's workflow: retain a chosen preference, practice with hints, reuse a skill, review an action, and inspect the evidence.

## Runtime

```text
Safari / React + TypeScript / Vite :5173
                   │ /api proxy
                   ▼
             FastAPI :8000
                   │
       Validation and deterministic routing
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  Memory/skills  Practice    Optional Nebius text
       │           │         No tool execution
       └───────────┼───────────┘
                   ▼
          SQLite and activity records

Calendar proposal → server permission check → user decision
                 → current permission / expiry / conflict check
                 → local mock event → optional .ics download
```

Both documented services bind to loopback. The launcher keeps the two processes together and stops its children on Control + C. The app operates while these processes run. It does not silently keep working after the user quits it.

## Modules

| File or folder | Responsibility |
| --- | --- |
| `frontend/src/App.tsx` | Workspace navigation, chat, profile, practice, memory, skills, proposals, approvals and activity |
| `frontend/src/lib/api.ts` | Typed requests and notifications that refresh shared state after writes |
| `backend/app/main.py` | API boundary, local browser checks, profile/CRUD endpoints, model evidence and computed insights |
| `backend/app/models.py` | Strict Pydantic request models and input bounds |
| `backend/app/db.py` | SQLite repository, transactions, first-run sample data and audit |
| `backend/app/orchestrator.py` | Explicit memory and skill routing, tutor requests, unsupported tools and fallback |
| `backend/app/learning.py` | Curated problem bank, sessions, numerical checks, hints and capability evidence |
| `backend/app/calendar_tools.py` | Editable proposal validation, local conflicts and calendar-file export |
| `backend/app/security.py` | Approval state, expiry, permission rechecks and the hardcoded local event adapter |
| `backend/app/provider.py` | Optional Nebius text requests, endpoint allowlist and response metadata |
| `backend/tests/` | Behavior and security checks using temporary data |
| `scripts/` | Local startup, private model configuration and runtime verification |
| `submission/` | Pitch and submission preparation materials |

## Persistence

SQLite uses a `records` table with a `(kind, id)` primary key and JSON values. Record kinds cover profile, memory, skill, integration, permission, approval, event, practice session, chat hint state, provider evidence and activity. This small repository keeps the local demo simple; it is not a production relational schema with versioned migrations.

The default path is `backend/data/cudarex.sqlite3`. `CUDAREX_DB` can select another server-side path. First startup inserts sample memories and skills once. Restarting does not overwrite user changes or recreate deleted sample records.

The browser holds its visible chat transcript temporarily. Explicit memories and practice sessions persist. Reloading the page starts a fresh visible chat, while the saved workspace remains. Prior skill instructions intentionally stay in version history.

## Practice and capability evidence

The curated bank covers net force, Ohm's law, kinetic energy, average speed, constant acceleration and a linear equation. Each problem carries its own stated quantities, accepted units, hints, answer and explanation. Arbitrary homework is not sent to this grader.

A session begins without exposing the expected answer. Three increasingly specific hints support a new attempt. Invalid text, non-finite numbers and unsupported units are rejected before updating evidence. Unit conversion and expression evaluation are not automatic.

Wrong numerical answers update the topic's revisit list and use specific feedback for recognized mistakes. Correct answers before a solution reveal update success evidence and the topic's strength record. Here, “independent” means the solution was not revealed; the learner may still have used hints. Correct answers after reveal count as assisted practice. Replaying an already solved session cannot add another success. Two distinct independently solved problems can move the practice-level label beyond Foundation.

These records support future practice recommendations. They do not establish general mastery, a diagnosis, or a validated assessment. An optional model can explain other questions, but its prose does not extend the numerical grader's scope.

## Skills and evolution

Enabled named skills supply instructions and workflow to the optional model. Without a real model response, the app returns a labeled preview. A workflow is text, not executable code. Listing tools or permissions in a skill cannot authorize them.

Feedback triggers a small deterministic proposal rule. A request for shorter answers proposes a concise-summary addition; other feedback proposes checking assumptions and results. Creating a proposal does not edit instructions. Approval appends the addition, increments the version and saves prior instructions. Rejection leaves the current instructions intact. A manual content edit invalidates an older proposal. Stale or replayed decisions fail on the server.

## Calendar approval boundary

The Security Centre form accepts a title and future start/end times in Asia/Kolkata. The server validates the timezone offset and a positive duration of at most twelve hours. A proposal stores the exact payload on the server and expires after fifteen minutes.

A mock connection plus `calendar.create` permits proposals. Every event still needs a separate user decision. The decision endpoint accepts a boolean rather than an arbitrary replacement payload. Approval checks that the proposal is pending, unexpired, still permitted, starts in the future, and does not overlap an existing local event. These checks run again at execution, protecting against conflicts introduced after a proposal was prepared.

The event insert and approval decision share a SQLite transaction. Competing decisions serialize, and the event ID derives from the approval ID. Replaying approval cannot create another event. Denial creates none. Expired pending requests can be denied but cannot execute.

The `.ics` endpoint exports an already approved local event. Downloading is not a provider API call. Importing the file into a calendar is a separate user action. Gmail, Drive and GitHub remain simulation switches with no read, write, token or OAuth capability.

## Model context, evidence and secrets

The optional adapter sends the current message, profession and selected skill instructions/workflow to Nebius. Stored memories stay out unless `model.context` is enabled. With consent, it includes at most three keyword-matched records. This is simple retrieval, not an embedding store or a proof that each selected record is necessary.

The API key remains in the backend environment. The configuration helper collects it through hidden Terminal entry and saves settings locally. It must never appear in frontend variables, memories, recordings or public source. The provider allows only known Nebius HTTPS base URLs and does not follow redirects with credentials.

A successful runtime call records the requested and returned model identifiers, provider base URL, time, latency and token counts where provided. The health endpoint distinguishes configured settings from a successful request for the current settings. Evidence is local metadata, not an independent certification of model identity or eligibility. No live provider access has been assumed without the user's credentials.

Provider network requests happen outside a database transaction. A slow model response therefore does not hold SQLite's write lock. Provider failures return a labeled deterministic fallback and omit raw internal errors and secrets. Switching off memory consent affects future requests only; it cannot retract data already sent.

## Insights and transparency

Dashboard insights derive from current local records: pending approvals, learning gaps, pending evolutions or an opportunity to start practice. The UI recomputes them when it loads or refreshes after a change. There is no background scheduler or external monitoring claim.

Activity entries identify routes, relevant record IDs and action outcomes. Full memory and chat text are omitted from audit entries. The UI returns the latest 300 entries; older entries remain in the database unless a retention feature is added. Calendar details and skill names can appear in this local audit.

## Injection and HTTP defenses

User, memory, skill and model text remain untrusted data. There is no shell executor, arbitrary code loader or model tool-call loop. SQL values use parameters, and React renders supplied text without evaluating HTML. A heuristic detector blocks some obvious attempts to override security and logs them, but it can miss attacks or flag benign requests.

The stronger action boundary is structural: model text has no privileged execution route. A frontend badge cannot create an event. Only the server's hardcoded local adapter can do so after the explicit decision checks.

Allowed browser origins are localhost and 127.0.0.1 on port 5173. Expected host checks, JSON writes and a custom client header reduce accidental cross-site forms. These are not authentication. Any trusted local process can call this single-user API.

## Operational gaps

There is no login, per-user ownership isolation, encrypted database, live OAuth, external integration vault, public deployment hardening, background scheduler, secure erase, robust quotas or independent security certification. Keep the app on loopback and use sample data in the demo. Memory deletion removes the active record and future retrieval, not filesystem backups, SQLite disk remnants or exported copies.

A production release needs an identity model, per-user authorization, migrations, retention and encryption controls, integration-specific scopes and token storage, idempotency, abuse limits and security review. A richer tutor needs problem-specific rubrics and evaluated feedback beyond this small bank. These are future extension points, not implemented features.
