# CIRS Backend

This repository contains the backend half of CIRS (Cyber Incident Response Simulator), a fictional educational app for practicing incident-response workflows. Incidents, evidence, users, credentials, and organizations used in the app must remain fictional.

## Repository split

- `itelect4-project` contains the frontend.
- `itelect4-backend` contains the backend.

The repositories are maintained and deployed separately. Session 10 connects their REST boundary while keeping the two deployments separate.

## Shared project references

The documents in [`docs/`](docs/) mirror the frontend repository's canonical CIRS references:

- [Product specification](docs/product-spec.md)
- [Semester roadmap](docs/semester-roadmap.md)
- [Technical reference](docs/technical-reference.md)

The frontend copies remain authoritative. Keep these backend mirrors synchronized when a shared product or architecture decision changes.

## Course materials and notes

The local-only [`docs/project-journal/`](docs/project-journal/) directory is ignored by Git. The existing Session 9 and Session 10 HTML assignments remain at the repository root. Use `modules/` for future local course-material copies; save GT review and implementation notes in their matching subdirectories.

Use the `cirs-gt-workflow` skill for graded tasks. Read the assigned material and the three project references before changing backend behavior or API contracts.

## Backend setup

Requirements: Node.js 22 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env
```

Set `MONGODB_URI` in the local `.env` file to the MongoDB Atlas connection string for your cluster and database user. If Atlas leaves a password placeholder in the URI, put the raw password in `MONGODB_PASSWORD`; the server URL-encodes and substitutes it at startup. Set `JWT_SECRET` to a random secret of at least 32 characters. `.env` is ignored by Git; never commit Atlas credentials or signing secrets.

The Action creation and incident deletion guard use MongoDB transactions so concurrent requests cannot leave an orphaned action. Use an Atlas replica-set or sharded deployment that supports transactions; standalone MongoDB deployments do not support them.

Set `CORS_ORIGIN` to the exact browser origin allowed to call the API. For local Vite development, use `http://localhost:5173`. Multiple origins may be comma-separated. When deploying, set the frontend's exact Vercel origin in the backend project's environment variables and redeploy the backend for the change to take effect.

```powershell
npm run dev
```

The local API listens on port `4000` by default. `GET /api/health` waits for MongoDB and returns `{ "ok": true, "db": true }` when connected, or HTTP 503 with `{ "ok": true, "db": false }` when the database is unavailable. The Express app is also exported for Vercel's serverless handler; do not configure `PORT` for the Vercel deployment. Use `npm run build` to compile to `dist/`, `npm start` to run the compiled local server, and `npm run typecheck` to check TypeScript without emitting files.

## Current API scope (GT4 Parts 1 and 2)

All successful incident responses use the shared CIRS `Incident` shape. Errors use a JSON object with a `message` and optional `code` or `fieldErrors`.

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API and MongoDB connection state |
| POST | `/api/auth/register` | Public | Create an account; role defaults to `responder` |
| POST | `/api/auth/login` | Public | Return a two-hour Bearer token and safe user |
| GET | `/api/incidents` | Bearer token | List incidents created by the signed-in user |
| GET | `/api/incidents/:incidentId` | Bearer token | Read a creator-owned incident |
| POST | `/api/incidents` | Incident commander | Create a `DETECTED` incident |
| PATCH | `/api/incidents/:incidentId` | Incident commander | Edit title, summary, description, or severity on a creator-owned incident |
| DELETE | `/api/incidents/:incidentId` | Incident commander | Delete a creator-owned `DETECTED` incident without actions or evidence |
| GET | `/api/incidents/:incidentId/actions` | Bearer token | List response actions for a creator-owned incident |
| POST | `/api/incidents/:incidentId/actions` | Bearer token | Propose an action using title, description, and priority; the server sets proposer and initial status |
| GET | `/api/incidents/:incidentId/evidence` | Bearer token | List creator-owned evidence; responders receive revealed evidence only |
| PATCH | `/api/evidence/:evidenceId/reveal` | Incident commander | Reveal creator-owned evidence and record the revealing commander |

All incident, Action, and Evidence reads are scoped to `createdById`. The server controls owner, commander, status, identifiers, and timestamps. ResponseAction status transitions, evidence creation or general edits, and the canonical HTTP-only session target remain outside this graded task.

After registering a fictional incident commander, seed one fictional incident and unrevealed evidence item for that owner with `npm run seed -- --owner <fictional-commander-email>`. The command does not create accounts or passwords and is safe to rerun for the same owner.

## Session 10 deployment handoff

The student configures the external accounts and deployment secrets. Keep secrets in ignored local `.env` or Vercel environment settings; commit only `.env.example` placeholders.

1. In MongoDB Atlas, retain the local IP access entry and add `0.0.0.0/0` as required by the assignment. Use a dedicated fictional demo database and a unique database-user password.
2. Import this repository into Vercel from GitHub with the repository root as the project root and the Express preset. For Production and Preview, set `MONGODB_URI`, `JWT_SECRET` (at least 32 characters), and `CORS_ORIGIN`. Initially set `CORS_ORIGIN=http://localhost:5173`. Set `MONGODB_PASSWORD` only if the connection URI includes its password placeholder. Do not set `PORT` for Vercel.
3. Open `<backend-origin>/api/health` and continue once it returns `{ "ok": true, "db": true }`.
4. In the frontend Vercel project, set `VITE_API_URL` to the backend origin without `/api` or a trailing slash. After the frontend has a deployment URL, set this backend's `CORS_ORIGIN` to that exact frontend origin and redeploy this backend.

Register a fictional commander in the frontend before running the seed command from this backend checkout. The local `.env` used for the command must point to the same Atlas database as the deployment. The required submission contains the backend GitHub repository, frontend GitHub repository, backend live URL, and frontend live URL.
