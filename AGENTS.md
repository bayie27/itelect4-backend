# AGENTS.md

Repository guidance for agents working on the CIRS backend.

## Repository and product boundary

- This is the backend half of CIRS, a fictional educational incident-response simulator. Keep all incidents, users, evidence, credentials, and organizations fictional.
- The frontend lives in the separate `itelect4-project` repository. Keep work in this backend repository unless the user explicitly asks for a cross-repository change.
- The two repositories are maintained separately and are planned to connect in Session 11.
- Implement only the current graded task and the roadmap scope. Do not pull future features forward speculatively.

## Shared project references

`docs/product-spec.md`, `docs/semester-roadmap.md`, and `docs/technical-reference.md` are mirrors of the frontend repository's canonical project documents. Read them before changing domain behavior or API contracts. The frontend copies remain authoritative; keep the backend mirrors synchronized when shared product or architecture decisions change. Report conflicts instead of silently choosing between the current code, the assignment, and the product documents.

The server is authoritative for authentication, authorization, validation, and lifecycle enforcement. Keep the REST API as the source of truth for persisted reads and mutations. Use the shared CIRS domain vocabulary and rules from the project references.

## Graded-task workflow

- Use the `cirs-gt-workflow` skill for each graded task.
- Resolve the assignment artifact from the current repository tree and read the complete relevant material, including its checklist, commands, warnings, verification, and Git instructions.
- Before a new GT, inspect the current worktree and Git baseline, identify predecessor requirements, and preserve all existing changes and assignment materials.
- Present the task-specific implementation proposal and wait for its explicit approval before editing implementation files, installing packages, creating a branch, or making other GT mutations.
- Verify the implementation against the assignment checklist and report limitations. Do not commit, push, open a PR, merge, or tag without the approvals required by the workflow.

## Session 9 / GT4 Part 1 handoff

The current assignment is `docs/project-journal/modules/ITELECT4_Session9_Backend.html`. It specifies MongoDB Atlas, Mongoose, and JWT Bearer authentication for this graded task. The selected CIRS resource is `Incident`, scoped by `createdById`; writes are commander-only. Deletion is limited to a creator-owned `DETECTED` incident with no response actions or evidence.

The current technical reference targets an HTTP-only session, while the roadmap leaves the database and migration choices as decision gates. Record the course-driven implementation choice in the GT notes, and revisit those target-architecture gates when planning frontend integration. Do not silently rewrite the canonical target documents.

The assignment specifies branch `gt4-part1` and says not to tag until Session 11. Re-read the assignment and verify the current baseline before creating that branch.

## Secrets and data safety

- Never commit real secrets, credentials, or `.env` files. Commit `.env.example` with placeholder values only.
- Do not scan systems, execute commands against real targets, analyze real malware, ingest real logs, or use real organizational or personal data.
- Preserve existing untracked files. Do not move or remove course materials unless the user asks.
