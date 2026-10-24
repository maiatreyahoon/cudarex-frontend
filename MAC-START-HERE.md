# CUDAREX — Skill Evolution update for Mac

Your original project has not been changed. This update was made from the existing Downloads/cudarex-frontend project.

## Safest way to try the update

1. Before closing or refreshing your current browser page, save any demo work you want to keep. Open each custom skill with its pencil button and copy its name, purpose, instructions, workflow, tools and permissions into a text document. Record any memories you need too. The existing demo keeps these in the browser page only; copying the project folder does not save them. If Activity Centre offers export, save that as well.
2. In VS Code, choose File > Save All to save any code changes.
3. In Finder, find your original cudarex-frontend folder. Select it, press Command-D to make a backup, and rename the copy cudarex-frontend-backup. Keep both folders.
4. Download cudarex-frontend-evolution.zip. Double-click it in Finder. It creates a separately named cudarex-frontend-evolution folder. Keep it separate from your original folder. If Finder asks to replace a folder, choose Stop and move the ZIP to a new empty folder before opening it again.
5. In VS Code choose File > New Window, then File > Open Folder and select cudarex-frontend-evolution.
6. Choose Terminal > New Terminal. Enter this and press Return:

   npm install

7. When that finishes, enter:

   npm run dev

8. Open the Local address printed in that terminal. If your original demo is still running, the new address may use a different number. Use the new terminal's address.
9. Keep your original folder and browser tab until you are happy with the update. Recreate custom demo skills using the details you saved in step 1.

Do not drag the new src folder onto your old src folder: that could replace your edits. Running this separate copy is the safest option if you have edited code. If you have custom connection settings in a .env file, copy those settings into the new folder yourself; private settings are not included in this ZIP.

## Try Skill Evolution

1. Open AURA Skills Centre in the left menu. Skill Evolution is always visible near the top.
2. Review the existing Research Assistant suggestion. Current instructions and the proposed addition appear together.
3. Click Reject suggestion. The suggestion disappears; the skill's instructions and version stay the same. Activity Centre > Skill records the rejection.
4. Return to Skills Centre. On any skill, click Suggest improvement. This creates a mock suggestion only. It does not alter the instructions or version.
5. Click Approve change. A confirmation appears. Click Cancel first: the suggestion remains pending and the skill stays unchanged.
6. Click Approve change again, then confirm. Open View skill details on that skill. The proposed sentence is appended and the version increases once.
7. Open Activity Centre > Skill to see the suggestion and approval details.
8. Create a new skill, such as Physics Solver, and repeat the test. Multiple skills can have pending suggestions at the same time.

Demo changes last only until you reload or close the page. This update does not add permanent saving, real AI learning, external actions or new permissions.

## If you want to stop or go back

In the new VS Code window's terminal press Control-C. Close that window. Return to your original project and its original browser address. If it is no longer running, open its folder in VS Code, choose Terminal > New Terminal, and run npm run dev. Your original code files have not been replaced.

## What changed and what was checked

Changed files: src/App.tsx and src/styles.css only, plus this guide. No dependencies or backend contracts changed. A small existing TypeScript issue in the class-name helper was also corrected so the build passes.

The production check npm run build passed (TypeScript and Vite). Browser interaction and a live FastAPI backend were not tested here; use the steps above to check the interface.

Live mode continues to use POST /skills/{id}/evolution/respond with evolution_id and approved. Skill Evolution lists every suggestion returned by the backend; mock suggestion buttons appear only in demo mode. Live updates use the backend's returned skill, and Activity Centre still loads the backend's activity records. Server-side authorization and activity logging remain the backend's responsibility.
