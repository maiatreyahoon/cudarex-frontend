# Verification report for the hackathon build

Verified locally on 25 October 2026 with Node v24.22.1, npm 11.19.1 and Python 3.9.6. This is a local single-user build. The report is not a production security certification or proof of live NVIDIA model use.

## Automated checks

`python3 scripts/check.py` runs the backend suite and the frontend TypeScript/production build. The current suite has **61 passing tests**. Covered paths include memory CRUD, privacy in audit entries, custom skills, versioned evolution with stale/replayed decision rejection, browser host/origin/header checks, provider context consent and generic error fallback, plus these additions:

- All six curated practice problems, numerical and unit validation, non-finite inputs, progressive hints, saved session resumption and profile counters.
- Separate assisted work after solution reveal, no repeated credit within a solved session, and practice-level progression based on distinct solved problems.
- Shared chat and Learning Studio practice evidence, including solution reveal and replay handling.
- Editable exact calendar proposals, validation of future times and duration, permission revocation and disconnection, expiry, concurrent decisions, conflicts checked again at execution, and rejection audit events after transaction rollback.
- Calendar export escaping for CR/LF, punctuation and Unicode line folding. Only approved local event IDs can export.
- Provider endpoint allowlisting, no redirects, no executable model tools, malformed-response fallback, and model runtime metadata recorded only after a successful typed generation result matching the active settings.

Tests use temporary SQLite databases and provider stubs. They make no live model requests or external account actions. The frontend build checks TypeScript and bundles local assets. The GitHub Actions workflow is prepared but does not count as a completed remote CI run until GitHub reports its result.

## Browser and launcher checks

The one-command launcher successfully started both services on loopback and reported their ready URLs. In the in-app browser, the following real UI flow passed:

1. Start a Newton’s-law practice session. Submit 20, receive specific feedback, request a hint personalized to the recorded gap, then submit `5 m/s²`.
2. Confirm the worked solution becomes visible after a correct answer, the success counter changes, and the topic leaves the revisit list.
3. Enable the explicit calendar mock. Edit the title to Hackathon rehearsal, request approval, and confirm there is no event before approval.
4. Approve and inspect the local event and manual calendar-file download link.
5. Propose an overlapping time, try approval, observe the server’s conflict rejection, then deny that request without adding another event.

The screenshot in practice-preview.png records sample QA data only. No personal QA database is included in the ZIP. Narrow layout was inspected at approximately 662 pixels. Other device/browser sizes and Safari-specific behavior were not exhaustively tested.

## Live verification still required

No API key was available. Actual Nebius availability, NVIDIA model identity, model output quality, pricing, credit use and real latency remain unverified. The setup and verification scripts make that final step explicit. Historical model metadata is not a promise that the provider remains available. A new verification must show a new successful request rather than reuse an earlier record.

All account integrations are mocks. Gmail, Drive and GitHub account adapters are not implemented inside the product. The development assistant’s GitHub connection used to prepare source is separate from the product’s mock GitHub switch. The app neither sends email nor creates Google Calendar events. Calendar-file import is a separate action the user may choose.
