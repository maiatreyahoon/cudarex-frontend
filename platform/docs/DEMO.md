# CUDAREX demo flow

Use sample data and a running local app. A complete rehearsal takes about six minutes; the submission recording script in `submission/VIDEO-SCRIPT.md` selects the strongest moments for a video under three minutes.

Say at the beginning: **CUDAREX is the platform, AURA is the assistant. Workspace data persists locally. External integrations are mocks. Optional Nebius text is real only after a successful configured model request.**

## 1. Personal memory

In Chat, send:

```text
I am a student
```

Then:

```text
Remember I prefer examples and short explanations
```

Open Memory Centre. Show the new preference, edit it and refresh the page. The record remains. Explain that explicit memories are user-controlled records, not a hidden archive of every conversation.

## 2. Learning with evidence

Open Learning Studio. Choose **Net force and acceleration**, then **Start practice**. Read the question: 2 kg under a 10 N net force.

Enter `20` and check the answer. Show the targeted feedback, then request a hint. Enter `5 m/s²` and check again. Inspect the attempt history and capability counters.

Select **Current through a resistor**, start a new session and use its own stated values. This demonstrates that grading belongs to a selected problem rather than a universal hardcoded answer.

For the assisted-practice boundary, start another session, choose **Show solution**, then enter its correct answer. The app records assisted practice rather than another independent success. Invalid input such as `5 bananas` must not be graded. Resume a saved session after reload.

Describe the scope accurately: six curated numerical exercises and a simple evidence profile. It does not grade arbitrary homework or diagnose general ability.

## 3. Reusable skill and approved evolution

In Skills Centre choose **Create skill**:

- Name: `Project Planner`
- Purpose: `Break a student project into achievable steps`
- Instructions: `Start with three small steps. Ask one question if the goal is unclear.`
- Workflow: `Clarify, plan, then check`
- Tools and permissions: leave blank

In Chat, send:

```text
Use Project Planner to organize my hackathon work
```

With a verified model, show generated text. Without one, show the labeled instruction preview and explain the limit. Disable the skill and repeat its name to show the server blocks its use, then enable it again.

Choose **Suggest improvement** for Project Planner and enter `The response is too long`. The Evolution section shows existing instructions separately from the addition. Approve it, inspect the new version and previous instructions, then refresh. A rejected suggestion should leave the instructions unchanged.

The proposal comes from a feedback rule. Do not call it autonomous training.

## 4. Controlled scheduling

Enable the Google Calendar mock in Integrations. Explain that this switch creates no Google connection and stores no credentials.

In Security Centre, ensure `calendar.create` is on. Fill a future study session in the calendar form. Show the title, start/end and Asia/Kolkata timezone. Choose **Request approval** and point out that the event list has not changed yet.

Review the exact proposal, then choose **Approve**. One local mock event appears. Download its calendar file if useful, but do not import it during a short recording unless you intend to create a real calendar entry manually.

Make a second proposal that overlaps the first. Show the conflict and that it cannot execute. Deny it and choose another time. Revoking the connection or permission also prevents an existing pending proposal from executing. Every event needs its own decision.

State plainly: **The backend created a local record. It did not contact Google Calendar.**

## 5. Transparency and persistence

Open Activity Centre. Filter by Security, Tool, Learning and Skill. Show that the audit explains the routes and outcomes while omitting full memory/chat text.

Reload the page. Show saved memory, skill version, practice sessions and the approved local event. For rehearsal, stop and restart the backend, then show these records again. The visible chat transcript itself is temporary.

## 6. Required live model segment

Before recording this segment, obtain your own Nebius access, run the configuration helper, restart the app and run the verification helper. Do not expose the key or `.env` file. Without a successful required model call, leave this segment unfinished rather than claiming compliance.

Use a general request or an enabled skill. For a broader explanation outside the curated bank, send:

```text
Ask AI: Explain conservation of momentum using a simple example
```

Show a Nebius response and the verified runtime status/metadata. Explain the actual role of the model: personalized text and skill instructions. The model cannot authorize actions or run tools. If the request fails, the app labels fallback text; do not present that fallback as a live NVIDIA demonstration.

## Recording discipline

Use the actual working app, large readable windows and a clean sample workspace. Keep personal memories, credentials and account pages out of frame. Do not invent users, saved time, benchmark scores or model measurements. Show the strongest complete journey rather than clicking every menu.

The pitch should connect one concrete student problem to the demonstrated workflow: retaining chosen context, learning through attempts, and reviewing consequential actions. Submission publication and ownership/credit details must reflect what actually happened.
