# CIRS 10-Minute Demo Playbook

**Audience:** Course instructor<br>
**Primary target:** Deployed CIRS app<br>
**Purpose:** Show what changed in Sessions 9–12: a real backend and database, deployed frontend/API integration, Gemini report drafting, and automated tests/CI.

## Before the demo

The backend health endpoint returned `{ "ok": true, "db": true }` on October 30, 2026. Recheck it on demo day.

A fictional commander account has been created and tested on the deployed app:

- **Name:** Professor X
- **Email:** `professor.x.cirs.demo.20261030@example.test`
- **Role:** Incident commander
- Use the one-off password provided to the presenter separately; it is intentionally not stored in this playbook.

The rehearsal used the same database as the deployed app. Its incident is now terminal: the evidence is revealed, the proposal is rejected, the incident is resolved, and AI Review report version 1 is saved. The seed is idempotent and will not reset this record, so this account cannot replay the lifecycle walkthrough. Use a fresh commander and incident in a verified demo database to rehearse the full flow; do not point a seed command at a shared database without checking its target.

The lifecycle controls and the AI prompt clarification are implemented locally in the two repositories but have not been deployed. Until deployment, the public app still has the earlier lifecycle UI. After deployment, a corrected AI report for this resolved incident would be saved as version 2; report versions are immutable.

**AI readiness:** AI Review requires a `RESOLVED` incident. The commander controls follow `DETECTED → TRIAGING → INVESTIGATING → CONTAINED → RESOLVED`; resolution stays disabled until every associated action is completed or rejected. For this demo slice, commanders can reject a proposed action. A real Gemini report was saved during rehearsal, but version 1 incorrectly says the evidence was hidden even though Atlas marks it revealed. The local prompt now explicitly marks supplied evidence as revealed; verify a new version after deployment before presenting its contents as accurate. This uses Gemini quota.

The terminal `npm run try-ai` command uses the real Gemini service but prints a draft without saving an app report. It received a Gemini `503 UNAVAILABLE` response during rehearsal. Use it only if it succeeds during pre-demo preparation. Do not show a sample as a live AI result.

## Commands and URLs

### Deployed app preflight

Run these in PowerShell before the demo:

```powershell
Invoke-RestMethod "https://itelect4-backend-roan.vercel.app/api/health" | Format-List
Start-Process "https://itelect4-project-roan.vercel.app/login"
```

Expected health fields are `ok: True` and `db: True`. The app links are [CIRS frontend](https://itelect4-project-roan.vercel.app/) and [CIRS backend health](https://itelect4-backend-roan.vercel.app/api/health).

### Local run, if the deployed account or data is not ready

The local backend still connects to the database named by its `.env`. Localhost does not make that database private. Use a dedicated demo Atlas database for rehearsal and demo writes; do not point the seed command at shared production data by accident. Atlas transactions are required by the seed and action paths.

Check Node first; Sessions 12 materials require Node 22.12 or newer:

```powershell
node --version
```

If dependencies are missing, run `npm ci` once in each repository. Create the environment files only if they do not already exist, then fill in the local values without putting secrets in this playbook:

```powershell
# Backend
Set-Location "C:\Users\Dani\OneDrive - dlsl.edu.ph\Desktop\ACADEMICS\itelect4-backend"
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env

# Frontend
Set-Location "C:\Users\Dani\OneDrive - dlsl.edu.ph\Desktop\ACADEMICS\itelect4-project"
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
notepad .env.local
```

Set the backend’s `MONGODB_URI`, a `JWT_SECRET` of at least 32 characters, `CORS_ORIGIN=http://localhost:5173`, and `PORT=4000`. For live AI from the local app, set `GEMINI_API_KEY` in the backend `.env`. Set the frontend’s `VITE_API_URL=http://localhost:4000` in `.env.local`. The current source uses Atlas/Mongoose and Bearer JWTs; local startup needs a reachable Atlas database.

Start the API and frontend in separate PowerShell terminals:

```powershell
# Terminal 1: backend
Set-Location "C:\Users\Dani\OneDrive - dlsl.edu.ph\Desktop\ACADEMICS\itelect4-backend"
npm run dev
```

```powershell
# Terminal 2: frontend
Set-Location "C:\Users\Dani\OneDrive - dlsl.edu.ph\Desktop\ACADEMICS\itelect4-project"
npm run dev
```

Open `http://localhost:5173`. Check the local API with:

```powershell
Invoke-RestMethod "http://localhost:4000/api/health" | Format-List
```

If the demo commander has no incident in this isolated database, register that fictional commander in the local app first, then seed one incident and hidden evidence item:

```powershell
Set-Location "C:\Users\Dani\OneDrive - dlsl.edu.ph\Desktop\ACADEMICS\itelect4-backend"
npm run seed -- --owner "demo.commander@example.test"
```

The email must match an existing incident commander account in that database. This seed creates the fictional `[CIRS Session 10] Stark Industries mail gateway alert` and an unrevealed evidence item. It does **not** create a resolved incident, so it cannot by itself power AI Review.

### Optional Gemini smoke check

This terminal command can check Gemini independently of Atlas and incident status. Run it only if you want a separate provider smoke check and `GEMINI_API_KEY` is configured locally:

```powershell
Set-Location "C:\Users\Dani\OneDrive - dlsl.edu.ph\Desktop\ACADEMICS\itelect4-backend"
npm run try-ai
```

This sends a fixed fictional resolved OAuth scenario to Gemini and prints a structured draft in the terminal. It does not save an app report and uses Gemini quota. It is not a substitute for generating a report through AI Review.

**Latest rehearsal result:** on October 30, 2026, one run returned Gemini `503 UNAVAILABLE` due to high demand. A retry produced no output for over a minute and was stopped. The AI smoke path is unverified; do not rely on it unless it succeeds during pre-demo preparation.

## UI map for the presenter

After login, the header has **Dashboard**, **Evidence**, **Actions**, **AI Review**, and **Logout**. The dashboard lists incidents for the signed-in owner. Click **Open incident** to reach incident detail and expand **Show description**. In a fresh rehearsal, reveal the seeded evidence, reject the saved proposal on **Actions**, then use the incident page status controls to advance through the valid lifecycle. The existing Professor X incident is already resolved; use it only to inspect the current saved report and end state. The report page offers only incidents the server has resolved.

This demo slice does not include action assignment, approval, or completion controls. The UI exposes rejection for proposed actions because that is enough to satisfy the resolution gate for this walkthrough. The backend remains authoritative for commander role, incident ownership, valid status changes, and the resolution gate.

## Ten-minute run of show

### 0:00–0:45 — Introduction

**Read:**

> “CIRS is the Cyber Incident Response Simulator, a browser-based training app for fictional incident-response scenarios. Since my last presentation, Sessions 9 through 12 took it from a frontend exercise to a deployed full-stack app: Atlas-backed data and server authentication, frontend-to-API integration, Gemini-assisted reports, and automated tests with CI. I’ll walk through one commander scenario, then generate an AI report and show how the commander reviews it.”

### 0:45–1:15 — Sign in

Log in with the prepared fictional commander account.

**Say:** “The frontend sends the sign-in request to our backend. The backend verifies the account and returns a short-lived Bearer token; role and ownership checks are enforced on the server.”

### 1:15–2:00 — Dashboard and incident detail

On **Dashboard**, point out the incident title, severity, and status. Click **Open incident**, then **Show description**.

**Say:** “This list is loaded from the API and backed by MongoDB Atlas. It shows incidents owned by the signed-in user. The incident itself is fictional; this is a training simulator, not a security scanner.”

### 2:00–2:30 — Review evidence

Open **Evidence** and inspect the seeded fictional alert excerpt. Reveal it if this is a fresh scenario; the **Reveal evidence** button is already consumed for the Professor X rehearsal record.

**Say:** “The commander revealed this item, and the server now returns its details. The API enforces the reveal permission; the interface alone is not the security boundary.”

### 2:30–3:15 — Reject the proposed action

Open **Actions** and show the saved proposal, `Review training account consent activity`, with its `proposed` status. In a fresh scenario, click **Reject proposal**. The Professor X rehearsal proposal is already rejected, so do not expect another rejection on that account.

**Say:** “A commander can reject a proposal that is no longer needed. This demo slice supports that transition; the other action workflow stages remain outside today’s walkthrough.”

### 3:15–4:00 — Advance the incident

Return to incident detail. In a fresh scenario, click **Move to triaging**, **Move to investigating**, **Move to contained**, then **Move to resolved**. If an action is still open, the resolve control stays disabled and the page explains what needs to be done. The Professor X incident is already resolved and cannot replay these transitions.

**Say:** “The server accepts only valid lifecycle transitions. Resolution also checks that every response action is completed or rejected, and it records the resolution time.”

### 4:00–7:30 — AI Review (main feature)

Open **AI Review**, select the resolved incident, and enter a fictional supplemental note of at least 20 characters, for example: `Focus on what the revealed evidence supports and what remains uncertain.` On a fresh scenario, click **Generate report**. Show the saved version and its executive summary, evidence reviewed, response timeline, lessons, recommendations, and data-coverage label. On the Professor X account, version 1 already exists and contains the evidence visibility error described above; do not present that text as an accurate summary. Generating a corrected report after deployment will create version 2.

**Say:**

> “AI Review is a post-incident step. The browser sends the incident ID and a supplemental note to the backend. The backend checks commander ownership and resolution, then builds the prompt from the incident, revealed evidence, and response actions. Gemini runs server-side, its JSON response is schema-checked, and a valid draft is saved as a new report version. The commander reviews it. The AI cannot change incident status or perform response actions.”

Generating a report writes a new version and uses Gemini quota. If the provider returns an error, use the page’s retry path and do not claim a report was generated until a saved version appears.

### 7:30–8:45 — Testing and CI

Open the merged Session 12 PRs or the repository CI badges: [backend PR #6](https://github.com/bayie27/itelect4-backend/pull/6) and [frontend PR #8](https://github.com/bayie27/itelect4-project/pull/8).

**Say:** “Session 12 made checks repeatable. The frontend tests cover a typed component, a hook, invalid login input, and lifecycle rules. The backend test exercises authentication and request validation on the AI route without calling Atlas or Gemini. GitHub Actions runs the checks on pushes.”

The PRs are merged in GitHub. Their PR descriptions report green Actions checks; the latest combined commit status also reports successful Vercel deployments. Recheck the PR checks before presenting. The local `GT6-NOTES.md` still says the PRs were pending, so use the current GitHub PR pages as the source of truth.

### 8:45–9:30 — Close

**Say:**

> “The main change since my last presentation is that CIRS now has a real, owner-scoped API and persistent data, a deployed frontend/backend connection, lifecycle controls enforced by the server, a server-side AI report-generation feature with structured validation, and tests that run automatically. Reports are intended for commander review; the AI does not make decisions.”

Use 9:30–10:00 as transition or question buffer.

## Session and PR guide

| Session | New topic to emphasize | Merged PR evidence |
| --- | --- | --- |
| 9 — Backend foundations | Atlas/Mongoose persistence, password hashing, JWT Bearer auth, server validation, and creator-scoped `Incident` routes. | [Backend #1](https://github.com/bayie27/itelect4-backend/pull/1) |
| 10 — Deployment and integration | Vercel backend/frontend, CORS, environment-based API origin, real login, and API-backed incident/action/evidence data. | [Backend #2](https://github.com/bayie27/itelect4-backend/pull/2), [#3](https://github.com/bayie27/itelect4-backend/pull/3), [#4](https://github.com/bayie27/itelect4-backend/pull/4); [frontend #4](https://github.com/bayie27/itelect4-project/pull/4), [#5](https://github.com/bayie27/itelect4-project/pull/5), [#6](https://github.com/bayie27/itelect4-project/pull/6) |
| 11 — Gemini AI | Server-side Gemini call, bounded prompt, structured response validation, role-gated report generation, and immutable report versions. | [Backend #5](https://github.com/bayie27/itelect4-backend/pull/5); [frontend #7](https://github.com/bayie27/itelect4-project/pull/7) |
| 12 — Testing and CI/CD | Frontend and backend test coverage, GitHub Actions on push, repository secret handling, and CI badges. | [Backend #6](https://github.com/bayie27/itelect4-backend/pull/6); [frontend #8](https://github.com/bayie27/itelect4-project/pull/8) |

## If the instructor asks

- **Why Atlas and Bearer JWTs?** Session 9’s graded task required MongoDB Atlas, Mongoose, and JWT Bearer auth. The canonical technical reference still has an HTTP-only-session target; describe Atlas/JWT as the course implementation choice, not a silent rewrite of that target.
- **What enables AI Review?** An owned `RESOLVED` incident. The server rejects invalid transitions and blocks resolution until every action is completed or rejected.
- **Which action status change is shown?** A commander rejects a still-proposed action. Approval, assignment, starting, and completion are outside this 10-minute slice.
- **Does the AI decide the response?** No. It drafts a structured report from fictional records. A human reviews it; the AI cannot change incident status or carry out actions.
- **Is live collaboration shown?** No. The walkthrough uses one commander account.
