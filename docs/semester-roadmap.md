# CIRS Semester Roadmap

This roadmap translates each course module into a shippable CIRS milestone. Keep the application working after every graded task and do not pull deferred features into a module before its required work is stable.

## Module 1 — TypeScript Fundamentals

**Sessions:** July 4 and July 11  
**Assessment:** GT1, due July 18

### Deliverables

- Define the canonical CIRS enums and interfaces.
- Demonstrate generics and `Pick`, `Omit`, `Partial`, and `Record`.
- Define valid incident and response-action transition maps.
- Implement typed transition and resolution helpers.
- Keep the JavaScript-to-TypeScript conversion exercise isolated under `src/gt1`.
- Document the locked application concept in the README.

### Completion check

- `User`, `Incident`, `ResponseAction`, and `Evidence` compile under strict mode.
- Role and lifecycle values are not duplicated as arbitrary strings.
- Valid and invalid transitions can be demonstrated.
- `npx tsc --noEmit` passes.

## Module 2 — React and Component-Based UI

**Sessions:** July 18, July 25, and August 1  
**Assessment:** GT2, due August 8

### Deliverables

- Convert the project to Vite, React, and TypeScript without weakening strict checks.
- Configure Tailwind CSS and the shared visual foundation.
- Build a responsive incident list and incident command-room mockup.
- Create typed incident, action, evidence, severity, and status components.
- Use Zustand only for mock current-user state and client-only UI preferences.
- Use local mock data that conforms to the Module 1 types.

### Minimum UI

- Incident cards show title, severity, status, and reported time.
- The command room shows incident details, evidence, and response actions.
- Role switching demonstrates responder and commander controls.
- Small-screen layouts remain usable.
- Status and severity include text or icons instead of relying on color alone.

### Completion check

- Components have explicit typed props and events.
- Empty and loading placeholders exist even while data is mocked.
- Zustand does not become a duplicate server-state store.
- Production build and type checking pass.

## Module 3 — Frontend Architecture and API Integration

**Sessions:** August 8, August 15, and August 22  
**Assessment:** GT3 and MA1, due September 5

### Deliverables

- Add React Router and the required public/protected routes.
- Implement an Express REST API.
- Add persistent storage and migrations.
- Implement registration, login, logout, session verification, and role middleware.
- Hash passwords using a maintained server-side library.
- Connect pages through TanStack Query queries and mutations.
- Use React Hook Form and the selected validation library for forms.
- Add Shadcn UI components where they improve accessibility and consistency.
- Enforce lifecycle and permission rules in the API, not only the UI.

### Required API slices

- Authentication and current user
- Incident list, detail, create, edit, and transition
- Incident response actions and action transitions
- Incident evidence and evidence reveal

### Decision gates

Resolve these no later than August 15:

1. Confirm whether the instructor mandates Vercel for the API or only for the frontend/AI task.
2. Select the database and migration tool based on the confirmed hosting constraint.
3. Confirm the authenticated-session mechanism and production cookie/CORS configuration.

Record each decision in `docs/technical-reference.md`; do not leave competing approaches in the implementation.

### Completion check

- Refreshing a detail page reloads authoritative server data.
- Protected routes redirect unauthenticated users.
- Unauthorized API requests return `401` or `403` as appropriate.
- Mutations invalidate or update the correct TanStack Query cache.
- Invalid transitions and malformed payloads receive useful errors.

## Module 4 — Real-Time Features with WebSockets

**Sessions:** September 5, September 12, and September 19  
**Assessment:** GT4, due September 26

### Deliverables

- Add Socket.io to the existing HTTP server.
- Join and leave an `incident:{incidentId}` room with authentication.
- Broadcast response-action creation and status changes after successful REST mutations.
- Update TanStack Query caches or refetch affected queries on socket events.
- Show connection state and reconnect safely.

### Scope boundary

Only response-action creation and status changes are required live. Presence, notifications, evidence reveals, timers, and chat remain deferred.

### Hosting gate

Before implementation, reconfirm whether Vercel's WebSocket support is acceptable for assessment. Vercel announced WebSocket and Socket.IO support as a public beta on June 22, 2026, while older limits guidance may still conflict:

- [Vercel WebSocket public beta](https://vercel.com/changelog/websocket-support-is-now-in-public-beta)
- [Vercel limits](https://vercel.com/docs/limits)

If beta infrastructure is not acceptable and the instructor permits split hosting, use a persistent Node web service for Express and Socket.io.

### Completion check

- Two authenticated clients in the same incident see action changes without refreshing.
- Clients in another incident do not receive those updates.
- Failed REST mutations do not emit success events.
- Reconnection restores authoritative state through REST refetching.

## Module 5 — AI Integration with Gemini

**Sessions:** September 26 and October 3  
**Assessment:** GT5, due October 10

### Deliverables

- Add the Gemini SDK only to server-side code.
- Implement `POST /api/ai` for resolved incidents.
- Build a structured prompt from incident, evidence, action, and timestamp data.
- Save every successful generation as a new immutable report version.
- Add report-list and report-detail views.
- Show generation loading, error, and success states.

### Report sections

- Executive summary
- Incident overview and severity
- Evidence reviewed
- Response actions and timeline
- Containment and resolution
- Lessons learned and preventive recommendations

### Guardrails

- Treat output as a draft, not an operational decision.
- Never expose the Gemini key to the browser.
- Instruct the model to use only supplied fictional data.
- Do not save a report record when generation fails.
- Do not overwrite or mutate older report versions.

### Completion check

- Only commanders can generate reports.
- Only resolved incidents are eligible.
- Each successful regeneration increments the incident's report version.
- Older reports remain readable.
- AI downtime does not break non-AI incident workflows.

## Module 6 — Testing, CI/CD, and Deployment

**Sessions:** October 10, October 17, and October 24  
**Assessment:** GT6 and MA2, due October 30

### Deliverables

- Configure Vitest and React Testing Library.
- Test lifecycle rules, authorization behavior, forms, routing, and real-time cache updates.
- Add a GitHub Actions workflow for install, type-check, test, and build.
- Deploy the frontend, API, database, Socket.io server, and Gemini endpoint.
- Add seeded fictional accounts and incidents for evaluation.
- Finish README setup instructions and an architecture diagram.

### Final demonstration

1. Register or sign in as both roles.
2. Create and open a fictional incident.
3. Reveal evidence.
4. Propose and complete response actions across two clients.
5. Demonstrate an invalid transition being rejected.
6. Resolve the incident after all non-rejected actions finish.
7. Generate two report versions and open the older version.

### Completion check

- CI fails on type, test, or production-build failures.
- Production refreshes work on routed pages.
- Environment variables and secrets are configured outside Git.
- The deployed real-time workflow reconnects correctly.
- README and architecture diagram match the deployed system.

## Change control

When a new idea appears:

1. Check whether it is required by the current module or final acceptance criteria.
2. If not, add it to the deferred list in the product specification.
3. Implement it only after the current module's completion check passes.

Changes to roles, core entities, lifecycle values, or resolution rules require updates to the product specification, shared TypeScript types, tests, and any affected API contracts.
