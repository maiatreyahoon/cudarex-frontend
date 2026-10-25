# Start CUDAREX on your Mac

You can run the full local app from one Terminal window. This guide assumes the downloaded folder is named **cudarex-hackathon** and is inside **Downloads**. Keep your old project; you do not need to replace or delete it.

## 1. Open the new project

1. Download the new ZIP and double-click it in Finder.
2. Put the extracted **cudarex-hackathon** folder in Downloads.
3. If Finder calls it `cudarex-hackathon 2`, rename this new folder or use the folder-location method below. Do not rename your old project to make room.
4. Open VS Code, choose **File → Open Folder…**, and select the new folder.
5. The file list should contain **backend**, **frontend**, **scripts**, **docs** and this guide.

If your old app is still running at localhost:5173, find its Terminal window and press **Control + C**. That stops its running server without deleting anything.

## 2. Check the two tools you need

Press Command + Space, type **Terminal**, and press Return. Copy each line separately and press Return:

```bash
node -v
```

Your Node v24.22.1 is suitable. Do not reinstall it.

```bash
npm -v
```

```bash
python3 --version
```

Use Python 3.9 or later. If Python is missing, install a current Python 3 release from [python.org's Mac downloads](https://www.python.org/downloads/macos/), open a new Terminal and check again. You do not need `sudo` for this project.

## 3. Start both parts together

In Terminal, run:

```bash
cd ~/Downloads/cudarex-hackathon
```

Then:

```bash
python3 scripts/start.py
```

The first run installs missing packages and needs the internet. Let it finish. It starts the backend that stores your records and the frontend that displays the app. Leave the window open while using CUDAREX.

Open Safari and visit:

[http://localhost:5173](http://localhost:5173)

You should see CUDAREX, AURA, and a label explaining that external tools are mocks. To check the backend separately, open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health). Text containing `"ok":true` means it is responding.

No AI key is required for the local demonstration. Without one, broad AI questions return a labeled fallback rather than a real model answer.

## 4. Check that it works

1. Open **Chat with AURA** and send `Remember I prefer examples and short steps`.
2. Open **Memory Centre** and find the record. Press Command + R to refresh Safari. It should remain.
3. Open **Learning Studio**, select **Net force and acceleration**, and choose **Start practice**.
4. Enter `20` and choose **Check answer**. Read the feedback. Choose **Next hint**, then enter `5 m/s²` and check it.
5. Inspect the practice evidence and your saved attempt history. Try another problem to confirm that grading is tied to its stated values.
6. In **Skills Centre**, create a skill or choose **Suggest improvement** on an existing one. Enter `The response is too long`. Review the current instructions and proposed addition above. Only **Approve change** updates the skill.
7. In **Integrations**, enable the Google Calendar mock. This does not sign you into Google.
8. Open **Security Centre**. Ensure `calendar.create` is on. In the calendar form, choose a future start and end time, then **Request approval**.
9. Inspect the proposal. No event exists yet. Choose **Approve** to create a local mock event.
10. The event's **Download calendar file** link creates an `.ics` file. You decide separately whether to import it into a real calendar. It is not an automatic Google Calendar action.
11. Open **Activity Centre** and inspect the decisions.

Read [docs/DEMO.md](docs/DEMO.md) for the full presentation flow.

## 5. Stop and restart

Click inside the launcher Terminal and press **Control + C**. It stops the services it started. Closing Safari alone does not stop them.

Next time, run the same two lines:

```bash
cd ~/Downloads/cudarex-hackathon
python3 scripts/start.py
```

Saved memories, skills, profile, practice sessions, permissions, approvals and local events remain in SQLite. The visible chat transcript starts fresh when you reload the page.

## 6. Add real Nebius generation when you have a key

This is still needed for the hackathon's required NVIDIA model demonstration. You can finish the no-key checks first.

1. Use the links in [docs/HACKATHON.md](docs/HACKATHON.md) to obtain your own Nebius access. Never share your key in this chat.
2. In a new Terminal tab, enter the project folder:

```bash
cd ~/Downloads/cudarex-hackathon
```

3. Run:

```bash
python3 scripts/configure_ai.py
```

4. Follow its prompts. Key entry is hidden. Choose an NVIDIA model actually available to your account. The helper saves backend settings locally; it does not put the key in the browser.
5. Stop the app's launcher with Control + C and start it again so it loads the new settings.
6. While the app runs, use another Terminal tab:

```bash
cd ~/Downloads/cudarex-hackathon
python3 scripts/verify_ai.py
```

7. Read its prompt and confirm if you want it to send the harmless test request. A successful call records runtime metadata. If it fails, the app remains usable in no-key mode, but do not claim the required model use is verified.
8. In Chat, ask a general question or name an enabled custom skill. `Ask AI:` selects optional generation for a broader physics explanation. Check that the answer is labeled as a Nebius model response, rather than fallback text.

Do not record your key, `.env` contents or account details in the demo video. Stored memories stay out of model requests unless you explicitly enable `model.context` in Security Centre.

## Two-Terminal fallback

If you want to start each part yourself, stop the combined launcher first. Then open two Terminal tabs with Command + T.

Terminal 1:

```bash
cd ~/Downloads/cudarex-hackathon/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Leave it running. Terminal 2:

```bash
cd ~/Downloads/cudarex-hackathon/frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). On later starts, skip creation and installation if dependencies have not changed. Activate the backend environment before starting it. Stop each tab with Control + C when finished.

## Troubleshooting

### The folder cannot be found

In Terminal, type `cd ` including its space. Drag the **cudarex-hackathon** folder from Finder into the Terminal window, then press Return. This inserts its exact location. For the manual fallback, drag the backend or frontend folder instead.

### Port 5173 or 8000 is already in use

Another copy may still be running. Find a Terminal you used to start CUDAREX and press Control + C. Then try again. Do not terminate unfamiliar programs blindly. Both this app and the older frontend use port 5173; run one at a time.

### Safari cannot connect

Check that the launcher is still running and read its last error. Open the backend health address first, then the frontend address. Use `http://`, not `https://`. Do not double-click `frontend/index.html`; it needs the running server.

### “Cannot reach backend” appears in the app

Confirm that [the health address](http://127.0.0.1:8000/api/health) works. If it does not, restart the launcher from the project folder. The frontend does not silently switch to temporary fake data when its backend is down.

### An installation fails

Check your internet connection and the final error lines. Retry after reconnecting. Avoid random repair commands that delete files or change system permissions. Use the two-Terminal fallback to see which package installation failed. Keep project packages inside its environment; do not use `sudo pip`.

### My answer is rejected before grading

Use a finite number, optionally followed by the unit requested by the selected problem. For example, use `5 m/s²` for acceleration or `3 A` for current. The bank does not automatically convert units or evaluate expressions such as `10/2`. Invalid input does not update your attempt counters.

### The solution was revealed before I answered

A later correct answer is recorded as assisted practice. It does not award a new independent success for that session. Start another session to practice before opening the solution. These labels describe evidence from the curated bank, not a validated assessment of your ability.

### A calendar request cannot be approved

The mock connection and `calendar.create` must still be enabled. The proposal must not be expired, its start must be in the future, and it must not overlap an existing local event. Deny an old proposal and create a new one with different times. Each proposal can be decided only once.

### My custom skill shows a preview

That is expected without a successful model response. The preview shows the saved instructions and workflow; it is not generated work. Configure and verify Nebius using the steps above for model text. Tool names inside a skill do not grant permissions.

## Checks for the team or judges

Backend checks, in a separate Terminal:

```bash
cd ~/Downloads/cudarex-hackathon/backend
source .venv/bin/activate
python -m pytest -q
```

Frontend check:

```bash
cd ~/Downloads/cudarex-hackathon/frontend
npm run build
```

Tests use temporary databases. Keep your normal `backend/data/cudarex.sqlite3` to preserve your local work. Never publish that database or your `backend/.env` file. This is a local single-user test build, with no login or encrypted storage.
