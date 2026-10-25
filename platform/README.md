# CUDAREX

AURA is the assistant inside CUDAREX, a local personal AI workspace for students who want help without losing control of their information or actions.

This hackathon build brings persistent memory, reusable skills, bounded practice, and reviewed calendar actions into one React + FastAPI app. It extends the earlier frontend. Your older `cudarex-mvp` folder can stay where it is.

**Start with [MAC-START-HERE.md](MAC-START-HERE.md).** No AI key is needed to run the local demonstration. A real Nebius request using an NVIDIA model is still required before treating the project as ready for this hackathon.

## Start the app

Keep the extracted folder at `~/Downloads/cudarex-hackathon`. Stop any old frontend using port 5173 with Control + C in its Terminal. Then run:

```bash
cd ~/Downloads/cudarex-hackathon
python3 scripts/start.py
```

The launcher prepares missing dependencies, then starts both services on loopback. The first run needs internet access for package downloads. Leave its Terminal open and visit [http://localhost:5173](http://localhost:5173) in Safari. Control + C stops the services it started.

Requirements: Node.js and npm, Python 3.9 or later. The user's Node v24.22.1 is suitable for the supplied frontend. No Docker or system-wide Python package installation is needed. The Mac guide includes a two-Terminal fallback and troubleshooting.

## What the product does

| Area | Working behavior |
| --- | --- |
| AURA Chat | Routes explicit memory operations, tutoring requests, named skills, mock calendar requests, and blocked tools. Optional Nebius provides generated text. |
| Memory Centre | Create, search, correct, delete and retrieve saved records. User changes survive refresh and backend restart. |
| Skills Centre | Create, edit, delete and enable skills. Inspect instructions, workflow, tool metadata and previous instructions. |
| Skill Evolution | User feedback creates a proposed addition. Approval applies it and increments the version. Rejection preserves the current instructions. |
| Learning Studio | Six curated numerical problems, three progressive hints, checked attempts, solution reveal, saved sessions and capability evidence. |
| Security Centre | Editable calendar proposals, explicit decisions, permission checks, expiry, conflict checks and local event history. |
| Calendar export | Download an approved local event as an `.ics` file. Importing it into a calendar remains a separate action you choose. |
| Integrations | Clearly labeled mock switches. No Google or GitHub credentials, OAuth or account access. |
| Dashboard insights | Local suggestions based on pending decisions, recorded learning gaps and skill proposals. Computed when the UI refreshes. |
| Activity Centre | Inspect route and action outcomes; filter the timeline and export the returned log. |

## One coherent demonstration

Save a learning preference, then attempt a practice problem. Use a hint, correct an error and inspect the updated evidence. Create a skill and approve an improvement. Propose study time, inspect its exact payload, and approve a local event. Finish in Activity Centre to show how AURA made each decision.

Follow [docs/DEMO.md](docs/DEMO.md) for the full flow. The [submission folder](submission/) contains the pitch, recording script and draft submission material. It is preparation material, not evidence that a submission has been published.

## Real AI and honest fallback

Without credentials, the application uses deterministic routes. The practice bank actually checks its own stated problems; it is not a general homework grader. A named custom skill returns an explicit instruction preview when there is no model response. It does not pretend to have completed arbitrary generated work.

The server-side provider adapter can request NVIDIA Nemotron text generation through Nebius Token Factory. Configure an exact model offered by your account rather than assuming one is available:

```bash
python3 scripts/configure_ai.py
```

The helper requests the key privately in your Terminal, discovers NVIDIA model choices and saves backend settings. Never paste the key into chat, frontend files, a `VITE_` variable, a memory or a recording. Restart the app after changing its environment. With it running, verify an actual call:

```bash
python3 scripts/verify_ai.py
```

The verification helper asks before sending a harmless test prompt. A successful call records model metadata, not the key or prompt. The health status distinguishes deterministic mode, configured but unverified mode, and a successful runtime request for the current configuration. These records are local evidence rather than certification of eligibility. No credentials have been bundled, and live model behavior has not been verified without your account access.

You can also copy `backend/.env.example` to `backend/.env` and fill it locally. The adapter permits the documented Nebius HTTPS endpoints only. See the [official Nebius API reference](https://api.tokenfactory.nebius.com/docs).

## Privacy and action boundaries

The model text channel has no executable tools. User text, saved memories, skill instructions and model output cannot approve an action. The server owns calendar payloads and checks the current connection, permission, expiry and conflicts before creating a local record. Listing a tool in a skill never grants access to it.

The current message, profession and selected skill instructions can go to Nebius when configured. Stored memories are excluded by default. `model.context` in Security Centre allows up to three keyword-matched records in future calls. Turning it off does not retract information already transmitted.

SQLite is unencrypted and there is one local user with no login or ownership isolation. Deleting a memory removes the active record, not forensic disk remnants or your exports. Skill history keeps prior instructions. Do not expose the development server publicly. The app runs while its process stays open; it does not silently operate after you quit it. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Project layout

```text
cudarex-hackathon/
├── frontend/        React, TypeScript and Vite
├── backend/
│   ├── app/         API, persistence, orchestration, practice and security
│   ├── tests/       Behavior and security checks
│   └── .env.example Optional server-side model settings
├── scripts/         Local launcher and AI setup/verification helpers
├── docs/            Setup, architecture, demo and requirement mapping
└── submission/      Pitch and submission preparation
```

Data is created at `backend/data/cudarex.sqlite3` by default. `CUDAREX_DB` can choose another server-side path. Keep the file to preserve your work. Do not package it or a `.env` file into a public repository. The visible chat transcript is temporary; explicit memories and practice sessions persist.

## Verification and next steps

From `backend`, activate `.venv` and run `python -m pytest -q`. From `frontend`, run `npm run build`. Read [docs/TESTING.md](docs/TESTING.md) for the actual checked environment and verification limits, and [docs/API.md](docs/API.md) for the API contract.

[docs/ROLE-COVERAGE.md](docs/ROLE-COVERAGE.md) maps the nine workstreams to implementation files. [docs/HACKATHON.md](docs/HACKATHON.md) separates prepared deliverables from the remaining account, recording and publication steps. The project does not guarantee a prize or replace the need to demonstrate an actual required NVIDIA model call.
