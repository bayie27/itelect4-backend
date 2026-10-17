# CIRS Product Specification

## Purpose

CIRS is a collaborative training simulator for fictional cybersecurity incidents. It gives the semester project a stable domain for TypeScript modeling, React UI work, routing, REST APIs, real-time updates, generative AI, testing, and deployment.

The product should remain small enough for one student to finish. A complete incident workflow is more important than a large feature count.

## Product goals

- Model a meaningful domain with strict TypeScript types.
- Demonstrate role-based controls and server-side authorization.
- Enforce incident and response-action lifecycle rules.
- Separate local UI state, server state, and real-time events.
- Use generative AI for a reviewable, non-authoritative report.
- Finish with a tested, documented, deployed application.

## Safety and non-goals

All incidents, users, evidence, credentials, and organizations must be fictional.

CIRS will not include:

- Real scanning, exploitation, malware analysis, or command execution
- Real log ingestion or security-platform integrations
- Real personal, employee, health, or organizational data
- Automated security decisions or incident-response actions
- Payments, messaging, audio/video calls, or a mobile application
- Production-grade identity verification or enterprise administration

## Roles

### Responder

A responder investigates incidents and carries out response actions.

They can:

- View accessible incidents and revealed evidence
- Propose response actions
- Start and complete actions assigned to them
- View incident updates and generated reports

They cannot approve actions, reveal evidence, change incident status, or create incidents.

### Incident Commander

The incident commander combines scenario-facilitator and team-coordination duties.

They can:

- Create and manage fictional incidents
- Create and reveal evidence
- Approve, reject, and assign response actions
- Change severity and move incidents through valid statuses
- Resolve eligible incidents
- Generate and review versioned post-incident reports

They cannot bypass lifecycle rules, alter historical report versions, or treat AI output as an automatic decision.

### Permission matrix

| Action | Responder | Incident commander |
|---|---:|---:|
| View an incident | Yes | Yes |
| Propose a response action | Yes | Yes |
| Approve, reject, or assign an action | No | Yes |
| Start or complete an assigned action | Yes | Yes |
| Create an incident | No | Yes |
| Create or reveal evidence | No | Yes |
| Change severity or incident status | No | Yes |
| Generate a report | No | Yes |
| View saved reports | Yes | Yes |

The frontend should hide or disable unauthorized controls, but the API remains authoritative.

## Domain model

### Core entities

| Entity | Purpose | Important fields |
|---|---|---|
| `User` | Represents an authenticated participant | identity, role, active state |
| `Incident` | Represents a fictional scenario and its lifecycle | severity, status, commander, timestamps |
| `ResponseAction` | Represents a proposed unit of response work | incident, assignee, priority, status |
| `Evidence` | Represents a fictional artifact attached to an incident | type, reveal state, reveal timestamps |

Relationships:

- One incident has one commander.
- One incident has many response actions.
- One incident has many evidence records.
- A user may propose, approve, or receive response actions.
- A resolved incident may have many generated report versions.

`IncidentReport` is introduced in Module 5 as a supporting persisted resource. It is not part of the four GT1 core entities.

## Lifecycle rules

### Incident lifecycle

```text
DETECTED → TRIAGING → INVESTIGATING → CONTAINED → RESOLVED
                           ↑             |
                           └─────────────┘
```

Rules:

- Only an incident commander may change incident status.
- Stages cannot be skipped.
- `CONTAINED → INVESTIGATING` is the only regression.
- `RESOLVED` is terminal.
- Resolution is allowed only from `CONTAINED`.
- Every response action for the incident must be `COMPLETED` or `REJECTED` before resolution.

### Response-action lifecycle

```text
PROPOSED → APPROVED → IN_PROGRESS → COMPLETED
    |
    └──────────────→ REJECTED
```

Rules:

- Only a commander may approve, reject, or assign an action.
- An approved action needs an assignee before it can start.
- Only the assignee or commander may start and complete an action.
- Completed and rejected actions are terminal.
- A resolved incident cannot accept new response actions.

### Evidence behavior

- Commanders create evidence as unrevealed by default.
- Responders only see evidence after it is revealed.
- Revealing evidence records the actor and timestamp.
- Evidence reveal does not need a separate status enum or real-time event in the MVP.

## Core workflows

### Authentication

1. A user registers as a responder or incident commander.
2. The server validates input and stores a password hash, never the raw password.
3. The user signs in and receives an authenticated session.
4. Protected pages and API routes verify both identity and role.
5. Signing out invalidates the active session.

### Incident creation and investigation

1. A commander creates an incident in `DETECTED` status.
2. The incident appears in the incident list.
3. A user opens `/incidents/:incidentId`.
4. The page loads incident details, actions, and role-visible evidence.
5. The client joins the incident's Socket.io room.

### Response action

1. A responder or commander proposes an action.
2. A commander approves and assigns it or rejects it.
3. The assignee starts an approved action.
4. The assignee completes the action.
5. Creation and status changes appear live for other users in the incident room.

### Resolution and report generation

1. The incident reaches `CONTAINED`.
2. Every non-rejected response action reaches `COMPLETED`.
3. A commander resolves the incident.
4. The commander requests a Gemini-generated report.
5. The server builds the prompt from fictional incident data.
6. The generated draft is saved as a new immutable version.
7. Users may view the latest or an earlier report version.

## Required pages

- `/register`
- `/login`
- `/incidents`
- `/incidents/new`
- `/incidents/:incidentId`
- `/incidents/:incidentId/reports`

The incident list is the natural list view. The incident command room is its detail view.

## MVP and deferred features

### Required MVP

- Full local registration and login
- Two-role authorization
- Incident list and command room
- Incident and response-action lifecycle enforcement
- Evidence CRUD and reveal behavior
- Validated forms backed by REST APIs
- Live response-action creation and status updates
- Versioned saved Gemini reports
- Meaningful tests, CI, deployment, README, and architecture diagram

### Deferred unless the MVP is stable

- Presence indicators and online counts
- General notification center
- Real-time evidence reveals
- Live incident timer
- Timeline as a separate persisted entity
- Drag-and-drop boards
- Scenario templates
- Report editing or PDF export
- Analytics, theme switching, or generic chat

## Acceptance criteria

The semester project is complete when:

- Every course requirement maps to a working feature.
- Unauthorized API operations are rejected.
- Invalid status transitions are rejected on the server.
- Resolution is blocked while a non-rejected action remains incomplete.
- Two clients in one incident see action changes without refreshing.
- Report generation failures leave incident data and older reports intact.
- No secret or password hash is sent in public user responses.
- Loading, empty, error, and success states are visible where relevant.
- Automated checks pass and the deployed workflow can be demonstrated.

## Reference scenario

**Suspicious OAuth Application Access:** fictional accounts authorize an unknown application requesting email and profile access. Evidence can include an OAuth consent alert, a fictional log excerpt, and a simulated user report. Potential actions include reviewing affected accounts, revoking sessions, disabling the simulated application, and documenting lessons learned.
