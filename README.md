# CIRS Backend

This repository contains the backend half of CIRS (Cyber Incident Response Simulator), a fictional educational app for practicing incident-response workflows. Incidents, evidence, users, credentials, and organizations used in the app must remain fictional.

## Repository split

- `itelect4-project` contains the frontend.
- `itelect4-backend` contains the backend.

The repositories are maintained and deployed separately. The course plans to connect them in Session 11.

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

```powershell
npm run dev
```

The API listens on port `4000` by default. `GET /api/health` reports the API and database connection state. Use `npm run build` to compile to `dist/`, `npm start` to run the compiled server, and `npm run typecheck` to check TypeScript without emitting files.

## Current API scope (GT4 Part 1)

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

All incident routes are scoped to `createdById`. The server controls owner, commander, status, identifiers, and timestamps. Status transitions, response-action/evidence APIs, HTTP-only sessions, and deployment are outside this graded task.
