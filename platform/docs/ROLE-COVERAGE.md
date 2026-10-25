# Coverage of the nine workstreams

This maps the original workload division to the delivered software and remaining gaps. It describes responsibilities covered by the project; it does not assert who authored every contribution or replace accurate contributor credit.

| Original workstream | Implemented evidence | Boundary or remaining work |
| --- | --- | --- |
| Souptik — AI/LLM lead and overall integration | `provider.py`, model evidence in `main.py`, configuration/verification helpers, integrated demo and submission kit | Live NVIDIA/Nebius verification needs the user's account. No benchmark or prize claim. |
| Sagnik — memory and personalization | Persistent CRUD, explicit chat memory capture, role/profile editing, keyword retrieval and consent for model context | No embedding retrieval, automatic importance ranking or encrypted storage. |
| Rounak — adaptive learning | `learning.py`, six curated problems, progressive hints, checked attempts, targeted feedback, revisit lists, saved sessions and distinct-problem progress | Bounded numerical practice, not arbitrary homework grading or validated mastery diagnosis. |
| Tirtho — skills and evolution | Skill CRUD, enable/disable, model instruction context, feedback proposals, explicit approval/rejection and version history | No autonomous training or arbitrary executable skill code. No-key mode previews instructions. |
| Smarto — integrations | Mock integration states, editable local calendar proposals, approved local events, conflicts and `.ics` export | No Gmail, Drive, GitHub or Google Calendar OAuth/API adapter. Importing an exported file is a separate user action. |
| Soumil — security and privacy | Server-owned payloads, permission/connection rechecks, expiry, conflict prevention, replay protection, strict validation, origin/host checks and audit | Local single-user model only. No login, tenant isolation, vault, encryption or independent audit. |
| Atreya — frontend | Responsive dashboard, AURA Chat, practice/profile, memory and skills editors, evolution review, integration mocks, approvals, event export and timeline | Browser/device coverage is limited to the documented verification. |
| Dipsikha — backend | FastAPI, Pydantic boundaries, SQLite repository, CORS, persistent APIs and local startup | No production migrations, hosted identity, operational monitoring or public deployment hardening. |
| Archisman — orchestration | Deterministic routing across memory, tutor, enabled skills, optional text generation and safe local tools; bounded fallback and decision traces | Keyword routing can misclassify ambiguous requests. No general autonomous planner or privileged model tool loop. |

## Extra work for a coherent submission

The build includes an easier Mac startup path, model readiness distinction, current-record insights, an exact demo journey, an API contract, tests, security explanations and submission preparation. These additions support a reviewable product rather than nine disconnected modules.

The final proof still depends on a real NVIDIA model request through the required provider, accessible judging artifacts, a truthful short video and the user's final submission. Consult HACKATHON.md for the remaining external steps.
