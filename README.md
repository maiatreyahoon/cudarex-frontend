# CUDAREX — Atreya's Frontend Module

A responsive React + TypeScript interface for **CUDAREX**, the profession-aware personal AI platform, powered by **AURA**, its AI assistant. Includes a **realistic, interactive demo mode** and a documented FastAPI adapter for integration with the team's backend.

## Naming and branding

- **CUDAREX** is the name of the platform, frontend application, and overall hackathon project.
- **AURA** is the AI assistant that users talk to inside CUDAREX.
- UI branding follows **“CUDAREX — Powered by AURA”**. Chat is **“Chat with AURA”**; memory and skills belong to AURA, while security enforcement belongs to the CUDAREX backend.
- This naming distinction is presentation-only; **existing API paths, request types, and integration contracts stay unchanged**.

## Start locally

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Visit **http://localhost:5173**.

The app defaults to `VITE_DEMO_MODE=true`. Its example data, chat responses, skill updates, and approval records are local in-memory simulations and reset on refresh. **No external service is contacted in demo mode.**

To check production compilation:

```bash
npm run build
npm run preview
```

## What is implemented

| UI area | Features |
| --- | --- |
| Command Center | Stats, quick actions, approval inbox, recent activity, memory preview |
| Chat with AURA | Message history, suggestions, assistant status indicators, scripted hint/memory/skill/permission demonstrations, live API adapter |
| Learning Studio | Guided learning journey UI, learning topics, launch a hint-based chat |
| Memory Centre | View, search, filter, add, edit and delete memory |
| Skills Centre | View, create, edit, delete, toggle skills, approve/decline versioned evolution suggestions |
| Integrations | OAuth connect/disconnect UI, descriptions, connection status |
| Security Centre | Approval queue, explicit allow/deny, decision history, explanatory permission flow |
| Activity Centre | Event timeline, filter by type, export visible events to JSON |
| Shared UX | Responsive desktop/mobile navigation, feedback toasts, dialog forms, backend failure state |

**Important:** The frontend is not a permission firewall. Soumil's backend authorization must validate every action even if a client sends `approved=true`. Real third-party OAuth/token handling belongs on the backend. A frontend approval does not prove an action completed.

## FastAPI integration

Edit `.env`:

```env
VITE_DEMO_MODE=false
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:8000
```

Restart Vite. Requests to `/api/...` are proxied to your FastAPI application during local development. In production, reverse-proxy `/api` to FastAPI, or set `VITE_API_BASE_URL` to your approved backend URL and configure CORS and authenticated sessions.

`src/lib/api.ts` is **the single integration boundary**. Mock/demo behavior is in `src/App.tsx` and `src/data/demo.ts`; no Nebius or provider credentials belong in frontend files.

### Proposed endpoints (coordinate with Dipsikha and Archisman)

This is a proposed contract, **not a claim that the FastAPI backend implements it**:

| Method | Route | Request / response |
| --- | --- | --- |
| `GET` | `/api/profile` | `Profile` |
| `GET` | `/api/memories` | `MemoryItem[]` |
| `POST` | `/api/memories` | `{category,text}` → `MemoryItem` |
| `PATCH` | `/api/memories/{id}` | `{category,text}` → `MemoryItem` |
| `DELETE` | `/api/memories/{id}` | → `{ok:true}` |
| `GET` | `/api/skills` | `Skill[]` |
| `POST` | `/api/skills` | `{name,purpose,instructions,workflow,tools,permissions,enabled}` → `Skill` |
| `PATCH` | `/api/skills/{id}` | partial `Skill` → `Skill` |
| `DELETE` | `/api/skills/{id}` | → `{ok:true}` |
| `POST` | `/api/skills/{id}/evolution/respond` | `{evolution_id,approved}` → `Skill` |
| `GET` | `/api/integrations` | `Integration[]` |
| `POST` | `/api/integrations/{id}/connect` | → `{authorization_url}` (backend OAuth start URL) |
| `POST` | `/api/integrations/{id}/disconnect` | → `Integration` |
| `GET` | `/api/approvals` | `Approval[]` |
| `POST` | `/api/approvals/{id}/decision` | `{approved}` → `Approval` |
| `GET` | `/api/activity` | `Activity[]` |
| `POST` | `/api/chat` | `{message,conversation_id?}` → `ChatResponse` |

Types are fully declared in [`src/types.ts`](src/types.ts).

Sample chat response:

```json
{
  "response": "Before scheduling the session, I need your approval.",
  "status": "awaiting_permission",
  "conversation_id": "conv_12",
  "approval": {
    "id": "approval_15",
    "tool": "Google Calendar",
    "action": "Create study session",
    "detail": "Physics at 5 PM tomorrow",
    "state": "pending",
    "created_at": "2026-10-21T04:00:00Z"
  },
  "activities": []
}
```

Supported statuses: `idle`, `thinking`, `retrieving_memory`, `using_skill`, `calling_tool`, `awaiting_permission`, `blocked`, `complete`. The server may return these in the chat response. For real-time step indicators, the team can add WebSocket/SSE later without changing the UI layout.

### Responsibilities / dependencies

- **Atreya:** UI screens, API adapter, forms, status display, responsive behavior.
- **Dipsikha:** FastAPI routing, sessions, database, request validation and CORS.
- **Archisman:** Real orchestration, intermediate agent status and tool selection.
- **Souptik:** LLM agent prompts and NVIDIA Nemotron integration through Nebius (server-side).
- **Sagnik:** Persistent memory logic and profile.
- **Tirtho:** Actual skill execution/version history and evolution proposals.
- **Rounak:** Adaptive lesson state, mistakes and capability metrics.
- **Smarto:** OAuth app connectors and external tool execution.
- **Soumil:** Server-enforced authorization, pending approvals and audit logs.

## Suggested hackathon demonstration

1. Open CUDAREX Dashboard to show the integrated UI.
2. Open Chat with AURA. Send **“Remember I prefer examples in explanations”**.
3. Visit AURA Memory Centre, edit that preference and return to chat.
4. In chat, send **“Help me study Newton’s laws with hints”** then **“next hint”**.
5. Visit AURA Skills Centre, create a skill, then approve the Research Assistant evolution.
6. In chat, send **“Schedule a physics study session tomorrow at 5 PM”**.
7. Visit Security Centre to approve/deny the request.
8. Visit Activity Centre to review what was simulated; show the JSON export.

This sequence works with no backend. Turn off demo mode when team API endpoints and security behavior are ready.

## Remaining production work

- Agree and implement backend API contracts and real authentication with the team.
- Have the backend serve persisted history and validated authorization outcomes.
- Replace AURA’s demo scripted chat with orchestration/Nemotron results.
- Build real OAuth callback completion, session expiration/reconnect UX and reliable error handling.
- Add true streaming statuses, paginated audit trails, E2E tests and accessibility review before launch.

## Design notes

Dark command-center aesthetic, Space Grotesk / DM Sans typography, lilac-and-violet accent, mobile off-canvas navigation, no UI framework needed beyond React and Lucide. External Google Fonts are optional and gracefully fall back to local system fonts.
