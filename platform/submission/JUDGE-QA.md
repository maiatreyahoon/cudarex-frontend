# Judge questions and concrete answers

## What is the specific user problem?

A student has learning preferences, practice evidence and next actions in separate places. CUDAREX explores whether one inspectable workspace can connect those activities. We have not measured learning outcomes or product demand yet.

## Why does this need a language model?

The model supports open-ended explanations and user-defined skills whose instructions cannot be represented by a fixed problem grader. The deterministic engine handles known numerical practice and action authorization. This gives the model a meaningful text-generation role without letting generated prose become authority.

## How do you use NVIDIA and Nebius?

The backend adapter sends text generation requests to the configured Nebius endpoint with an exact model ID. Before submission we must verify a real NVIDIA model call and show it in the video. No key was available during this preparation, so live verification is still pending. We do not claim a model we have not run.

## Does all the app run on Nebius?

The present frontend and stateful backend run locally. The intended model runtime uses Nebius Token Factory. Hosting the entire app is a separate deployment decision. The official [FAQ](https://nebiusglobalaihackathon.devpost.com/details/faqs) explains the runtime requirement.

## What makes the assistant personal?

The user controls persistent memories, profession and learning focus. AURA can retrieve saved information, use a selected skill, and adapt practice recommendations from recorded gaps. Sharing saved memory with the optional model requires a separate setting and includes at most three keyword-matched records.

## What is the skill evolution mechanism?

A feedback rule creates a proposed instruction addition. It does not retrain a model. Approval appends the addition, increments the version and preserves history. Rejection does not change instructions. A manual edit invalidates an older proposal.

## Can a malicious skill bypass approval?

No executable tool path comes from skill or model text. The only calendar action adapter is hardcoded server-side. The decision endpoint accepts a boolean against a stored payload, rechecks current permission and conflicts, and executes atomically. Pattern matching adds warnings, but safety does not depend on the pattern detector catching every injection.

## What happens if two approvals race?

SQLite serializes the decision transaction. Once a request has a decision, another use fails. The local event uses the approval ID as its identifier. The server also checks schedule conflicts again at execution time.

## Is the calendar real?

The local event is real application data. Google Calendar account access is not implemented. The UI labels the adapter as a mock. Downloading an ICS file is a manual handoff. Importing it into a calendar remains the user’s own action.

## How adaptive is learning?

The curated six-problem bank provides progressive hints and specific numerical mistake feedback. The profile records attempts, successes, assisted work and topics to revisit. Progress is evidence from these problems, not a diagnosis of general ability. Revealed answers cannot add independent success credit.

## Where is the data?

SQLite in the local backend folder. The database is unencrypted. Memory deletion removes the active record and future retrieval, not forensic disk remnants or user backups. The audit omits full memory and chat content. Prior skill instructions remain in version history.

## Is there authentication?

No. This release is a local single-user test build. Loopback binding, host and origin checks, JSON validation and a client header reduce browser misuse but do not authenticate local processes. A public service needs proper identity and record ownership before deployment.

## Does AURA work while the Mac app is closed?

The assistant is available while the backend service runs. Local insights compute suggestions from saved state. This build does not provide a hosted always-on agent or background external actions.

## What happens when Nebius is unavailable?

The response labels the deterministic fallback. Known practice, memory CRUD, skill editing and local approval flows remain usable. The app does not present a fallback as a live model result.

## How will you evaluate impact?

Next, test whether students can understand and complete the combined workflow, whether they can identify what data the assistant used, and whether they notice the difference between a proposal and an executed action. Compare assisted and independent practice evidence. These are planned evaluations, not completed results.

## What would you build next?

Verify the required model runtime, evaluate the workflow with actual students, add problem-specific rubrics and broader retrieval evaluation, then introduce one live integration with authentication, a token vault, provider scope checks, idempotency and security review. Do not add many untested integrations to inflate the demo.
