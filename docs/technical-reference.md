# CIRS Technical Reference

This document records the target architecture and contracts that later modules should implement. Decisions not yet supported by course or hosting requirements are marked as decision gates instead of being presented as settled facts.

## Architecture principles

- REST APIs perform authoritative reads and mutations.
- Socket.io broadcasts the results of successful mutations.
- The server enforces authentication, authorization, and lifecycle rules.
- Shared TypeScript types define stable domain vocabulary.
- Generated text is reviewable data, never an automated command.
- The smallest complete implementation wins over speculative infrastructure.

## Target runtime shape

```text
React client
  ├── REST/JSON ──────── Express API ───── persistent database
  ├── Socket.io ──────── Socket.io server
  └── authenticated session

Express API
  └── Gemini SDK ─────── POST /api/ai ─── versioned report records
```

The Express API and Socket.io server should share the same HTTP server when the selected host supports a persistent Node process. The final topology remains a Module 3 decision gate because the instructor's Vercel requirement has not been confirmed.

## Canonical TypeScript contracts

The source of truth for current domain types is `src/types/index.ts`.

### Core resources

- `User`
- `Incident`
- `ResponseAction`
- `Evidence`

### Supporting report resource

Add this contract during Module 5:

```ts
export interface IncidentReport {
  id: string;
  incidentId: string;
  version: number;
  content: string;
  generatedById: string;
  generatedAt: string;
}
```

Report versions are immutable. A new successful generation creates the next version; it does not update an older record.

### Data exposure

The public `User` contract must never contain a password or password hash. Authentication persistence should use a private server-side record or field that is removed before serialization.

Validate every network payload at runtime even when the client and server share TypeScript types.

## Frontend architecture

### State ownership

Use TanStack Query for server state:

- Current authenticated user
- Incident lists and details
- Response actions
- Evidence
- Saved reports

Use Zustand only for client-only state:

- Temporary role switching before authentication exists
- Sidebar or command-room layout state
- Non-server UI preferences

Use component state or React Hook Form for local interactions and unsaved form input.

Do not copy query data into Zustand. Socket events should update or invalidate TanStack Query caches.

### Required routes

```text
/register
/login
/incidents
/incidents/new
/incidents/:incidentId
/incidents/:incidentId/reports
```

Unauthenticated users may access only registration and login. Commander-only controls remain protected in both route/UI logic and the API.

### UI states

Every network-backed view must handle:

- Loading
- Empty data
- Recoverable error and retry
- Successful mutation feedback
- Permission denial

Severity and status must be communicated with readable labels, not color alone.

## Authentication and authorization

The target is full local authentication, with no external identity provider.

Required behavior:

- Registration accepts name, email, password, and one of the two roles.
- Email is unique after normalization.
- Passwords are hashed with a maintained server-side password library.
- Login establishes a signed, HTTP-only authenticated session.
- Logout invalidates or expires the session.
- `GET /api/auth/me` returns the safe current-user shape.
- Protected API middleware distinguishes unauthenticated (`401`) from unauthorized (`403`) requests.

Before Module 3 implementation, choose the exact session library and cross-origin cookie configuration alongside the deployment topology. Do not store a long-lived bearer token in browser local storage by default.

## REST API

All successful mutation responses return the authoritative updated resource. Errors use a consistent shape such as `ApiError`.

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Incidents

```http
GET   /api/incidents
GET   /api/incidents/:incidentId
POST  /api/incidents
PATCH /api/incidents/:incidentId
PATCH /api/incidents/:incidentId/status
```

`POST` and general `PATCH` operations are commander-only. The status endpoint validates the transition map and the resolution gate.

### Response actions

```http
GET   /api/incidents/:incidentId/actions
POST  /api/incidents/:incidentId/actions
PATCH /api/actions/:actionId
PATCH /api/actions/:actionId/status
```

Creation is available to both roles. Approval, rejection, and assignment are commander-only. Start and completion require the assignee or a commander.

### Evidence

```http
GET   /api/incidents/:incidentId/evidence
POST  /api/incidents/:incidentId/evidence
PATCH /api/evidence/:evidenceId
PATCH /api/evidence/:evidenceId/reveal
```

All evidence mutations are commander-only. Responders receive only revealed evidence; commanders may receive all evidence.

### AI reports

```http
POST /api/ai
GET  /api/incidents/:incidentId/reports
GET  /api/reports/:reportId
```

`POST /api/ai` accepts an incident identifier, verifies commander access and resolution eligibility, generates the report server-side, and saves the next immutable version. It returns the saved `IncidentReport`.

## Validation and domain enforcement

### Incident creation

- Title, summary, description, severity, and commander are required.
- New incidents start at `DETECTED` regardless of client input.
- The server creates timestamps and identifiers.

### Response actions

- Title and description are required.
- Priority is `1`, `2`, or `3`.
- The incident must exist and must not be resolved.
- The assignee must be an active user.
- Status changes must follow the canonical transition map.

### Incident resolution

- The actor must be an incident commander.
- The current incident status must be `CONTAINED`.
- Every action for the incident must be `COMPLETED` or `REJECTED`.
- The server sets `resolvedAt` only after all checks pass.

The reusable rules begin in `src/domain/rules.ts`. The server should call the same domain logic or an equivalent shared package rather than reimplementing transitions in route handlers.

## Real-time contract

### Room lifecycle

The room name is:

```text
incident:{incidentId}
```

An authenticated client joins when the incident page mounts and leaves when it unmounts. The server verifies that the user may view the incident before joining the room.

### Client-to-server events

```text
incident:join
incident:leave
```

Business mutations remain REST calls.

### Server-to-client events

```text
action:created
action:status-changed
```

Example status payload:

```ts
interface ActionStatusChangedEvent {
  incidentId: string;
  actionId: string;
  previousStatus: ResponseActionStatus;
  status: ResponseActionStatus;
  changedById: string;
  changedAt: string;
}
```

Emit only after the database transaction succeeds. Clients should update the matching query cache or invalidate it. Reconnection must trigger a REST refetch because socket events are not the source of truth.

Presence, notifications, incident status, evidence reveal, and chat events are outside the required MVP.

## Gemini report generation

The server assembles a structured prompt from:

- Incident title, summary, description, severity, and timestamps
- Revealed evidence
- Response actions and their final statuses
- Resolution information
- The requested report sections

Prompt rules:

- State that all data is fictional.
- Require the model to use only supplied facts.
- Ask it to label uncertainty or missing information.
- Request predictable headings suitable for display.
- Do not include password data, session tokens, secrets, or unrevealed evidence.

Generation is all-or-nothing: save a new report version only after Gemini returns valid content. A failed request must leave existing reports unchanged.

## Testing strategy

### Domain tests

- Allow `DETECTED → TRIAGING` and reject `DETECTED → RESOLVED`.
- Allow `CONTAINED → INVESTIGATING` and reject transitions out of `RESOLVED`.
- Allow `PROPOSED → APPROVED` and `PROPOSED → REJECTED`.
- Reject starting proposed or rejected actions.
- Allow resolution with completed and rejected actions.
- Reject resolution if any action is proposed, approved, or in progress.

### API tests

- Authentication success, failure, logout, and safe user serialization
- Role-based `401` and `403` responses
- Incident and action validation
- Evidence visibility by role and reveal state
- Monotonic report version creation
- No report record after a Gemini failure

### Component and integration tests

- Incident list navigates to the command room.
- Role-restricted controls are hidden or disabled.
- Forms show validation and API errors.
- Socket events update the relevant action view.
- Reconnection refetches authoritative data.
- Resolved incidents enable report generation for commanders.

### CI

The final GitHub Actions pipeline runs dependency installation, type checking, tests, and the production build. Any failure stops the workflow.

## Deployment decision gate

The final architecture must support HTTP APIs, authenticated sessions, persistent storage, Socket.io connections, and server-side Gemini calls.

Confirm the instructor's hosting requirement before choosing infrastructure. As of July 2026, Vercel has announced WebSocket and Socket.IO support in public beta, but related documentation may still reflect older limits. Do not make the project depend on beta behavior without confirming that it is acceptable for assessment.

Environment variables will include values equivalent to:

```text
DATABASE_URL=
SESSION_SECRET=
GEMINI_API_KEY=
CLIENT_ORIGIN=
VITE_API_BASE_URL=
VITE_SOCKET_URL=
PORT=
```

Never commit real credentials. Deployment documentation must record migration, seeding, build, start, health-check, and demonstration-account steps after the hosting decision is made.
