# CUDAREX Devpost draft

Status: product draft ready for review. Live Nebius/NVIDIA verification, repository publication, video recording and final links remain pending. Do not describe the current no-key build as satisfying the required model runtime.

## Project name

CUDAREX

## Tagline

A personal AI workspace that keeps learning context visible and puts the user in control of actions.

## Track

Personal AI

## Inspiration

A student’s learning preferences, practice history and plans often live in separate tools. We wanted one place where an assistant could use the context a person chooses to keep, help them work through a problem, and propose a next step that the person can inspect.

CUDAREX is the platform. AURA is its assistant. The first audience is students who want guided practice and control over what their assistant remembers. This is our product hypothesis, not a claim of measured user demand or improved exam results.

## What it does

A user saves a preference in Memory Centre, chooses a practice problem, attempts an answer, requests progressive hints, and reviews the evidence in their capability profile. Six curated numerical problems have deterministic grading. Revealing a solution does not award independent success credit.

Skills Centre lets the user define reusable instructions, a workflow, and descriptive tool requirements. Feedback creates an evolution proposal. The original instructions remain unchanged until the user approves. The backend preserves version history and rejects stale decisions.

AURA can prepare a local calendar proposal. The user can choose the exact title and time, inspect conflicts, and approve or deny. The server rechecks permission and schedule conflicts at decision time. An approved local event can be downloaded as an ICS file for the user to import manually.

Activity Centre shows routing and action outcomes. All provider account connections in this build are labeled mocks. CUDAREX has no Gmail, Drive or real Google Calendar access.

## How we built it

React and TypeScript provide the responsive interface. FastAPI validates requests and owns action authority. SQLite persists memories, profile evidence, skills, approvals and the audit trail. Model text has no executable tool channel.

The Nebius adapter uses server-side credentials and a configured model ID. The general assistant and custom skill paths can request generated text. Memory sharing is off by default and can include up to three relevant records only with the user’s permission. A successful request records the requested and returned model identifiers, endpoint and time without retaining the key or full prompt.

**Current verification disclosure:** no Nebius key was available while preparing this draft. The adapter exists, but we have not verified a live NVIDIA model call. The no-key mode uses deterministic practice and skill previews. Replace this paragraph only after a genuine runtime request succeeds, and name the exact NVIDIA model used.

## Challenges

The important design boundary was separating useful model output from action authority. A skill may describe a tool, but that text cannot grant permission. A calendar proposal may look correct, but approval must still be current, single-use and valid against the latest schedule.

Learning evidence needed a similar boundary. A copied revealed answer should not appear as independent progress. The practice engine records assisted work separately and limits its claims to the curated problem bank.

## Accomplishments

The build combines the intended modules in one persistent local application. It provides inspectable memory CRUD, skill versioning with explicit evolution decisions, numerical practice with hints, and a proposal-to-approval-to-audit workflow. The local calendar export gives a useful handoff without pretending that OAuth or external account execution exists.

## What we learned

A coherent user journey makes the product easier to understand than separate feature demos. Data visibility and action review must be part of the main flow, not hidden settings. Deterministic checks also give the user evidence they can inspect when generated text would be difficult to verify.

## Next steps

First verify an available NVIDIA open-source model through Nebius Token Factory and show the actual call in the demo. Then evaluate the workflow with students, expand the practice bank with problem-specific rubrics, and introduce live integrations only after identity, ownership, token storage and permission checks are ready. The present build runs while the local service is open. It does not provide an always-on hosted agent.

## Built with

React, TypeScript, Vite, FastAPI, Pydantic, SQLite, Python, HTTPX. Nebius Token Factory and the exact NVIDIA model should be listed as used only after successful live verification.

## Provider feedback

We implemented an adapter for the documented text completion interface. We have not yet completed a live provider test, so we cannot responsibly rate latency, output quality, onboarding or reliability. After the real test, add concrete observations including model ID, what worked, and one reproducible issue or improvement request. Avoid invented feedback.

## Existing project disclosure

CUDAREX began with an existing React frontend in the supplied project. This work adds the persistent FastAPI backend, server approval boundary, memory and skill APIs, versioned evolution decisions, practice engine, calendar proposal/export workflow, integration mock labeling, tests and beginner setup. Confirm the project’s actual history and contribution ownership before publishing this statement.

## Final links

- Public repository: pending
- Working demo or downloadable test build URL: pending
- Public YouTube video under three minutes: pending
- Exact verified NVIDIA model and evidence: pending

Before final submission, use SUBMISSION-CHECKLIST.md and verify the current [official rules](https://nebiusglobalaihackathon.devpost.com/rules).
