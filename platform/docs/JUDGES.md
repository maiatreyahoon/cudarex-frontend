# Judge testing handoff

CUDAREX is the platform. AURA is its assistant. The prepared build combines a React interface, FastAPI and persistent SQLite storage for one local user.

## Current access and readiness

The [repository](https://github.com/maiatreyahoon/cudarex-frontend) is currently **private**. The integrated platform is in `platform/` on branch `cudarex/full-platform`, proposed in [draft pull request #1](https://github.com/maiatreyahoon/cudarex-frontend/pull/1). Public repository access and a reliable public test-build link remain pending.

A successful packaging job uploads an artifact named **cudarex-hackathon-test-build**, retained for 90 days. Download and unzip the artifact, then unzip its inner `cudarex-hackathon.zip` to get the project folder. Check the run result before relying on an artifact. GitHub artifact downloads may require a GitHub account and repository access; they do not replace the pending public test-build link.

A genuine NVIDIA model request through Nebius and the actual public demo video also remain pending. Deterministic fallback is not evidence of the required model runtime.

## Run the source checkout

Prerequisites: Python 3.9 or later, Node.js and npm. Node v24.22.1 was used for local verification. First setup needs internet access for dependencies. Stop another app using ports 5173 or 8000 first.

```bash
git clone --branch cudarex/full-platform https://github.com/maiatreyahoon/cudarex-frontend.git
cd cudarex-frontend/platform
python3 scripts/start.py
```

Keep the Terminal open and visit [http://localhost:5173](http://localhost:5173). The launcher starts both local services. Control+C stops them. The private checkout requires authorized repository access until publication.

For the standalone test-build ZIP, extract it, enter its `cudarex-hackathon` folder and run `python3 scripts/start.py`. See [the Mac guide](../MAC-START-HERE.md) for detailed setup and troubleshooting.

## Test without a provider key

Judges do not need to supply a personal provider key for these checks:

1. In Chat, send `Remember I prefer short explanations`. Inspect, edit and refresh the record in Memory Centre.
2. In Learning Studio, start **Net force and acceleration**. Check `20`, read the feedback, request a hint, then check `5 m/s²`. Inspect the worked solution and saved attempts. Six curated problems have their own grading rules.
3. Start another session, reveal its solution, then answer correctly. The profile records assisted work separately. It does not claim a general assessment of ability.
4. Create a skill. Request an improvement using `The response is too long`. Verify that instructions change only after **Approve change**, with the previous version retained. Without a configured model, skill invocation shows a labeled instruction preview.
5. Enable the Google Calendar mock. In Security Centre, request a future calendar proposal. No event should exist before approval. Approve it, then try an overlapping proposal and inspect the conflict rejection.
6. Inspect Activity Centre. Restart the app and verify that saved records remain.

All account integrations are mocks. Calendar approval creates a local record. Downloading an ICS file does not create an external event; manual import is a separate user choice.

## Automated checks and live evidence

After first setup, stop the launcher and run:

```bash
python3 scripts/check.py
```

The release has **62 backend tests**, plus the frontend TypeScript/production build. The runner’s actual output is authoritative. See [TESTING.md](TESTING.md) and [API.md](API.md).

The entrant must configure and verify their own available NVIDIA model through Nebius before claiming live model use. No credentials are bundled. Model status records successful runtime metadata rather than certification of eligibility. This local build has no production login or encrypted database and should remain bound to loopback.
