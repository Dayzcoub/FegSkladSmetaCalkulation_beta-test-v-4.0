# Documentation index

This folder contains active project documentation and archived historical notes.

## Active docs

- `ARCHITECTURE.md` — current runtime structure and module ownership.
- `DEVELOPMENT.md` — local development flow, commands and checks.
- `DOCUMENTATION_POLICY.md` — what belongs in docs, changelog and code comments.
- `UI_SYSTEM.md` — durable UI rules and technical canvas constraints.
- `CONSTRUCTORS.md` — durable Stage, Truss and LED constructor rules.
- `BACKEND_CONTRACT.md` — backend, sync, auth and controlled-write rules.
- `CLEANUP_AUDIT_2026_05_21.md` — cleanup pass notes and follow-up queue.

## Historical notes

Files named like `V4_*_3_17_*.md` are release or task notes from previous iterations. Keep them only when they document a real invariant, migration or decision that is still useful.

During cleanup, move durable decisions into active docs and remove duplicated one-off task briefs after review.

## Rules

- Do not use the root `README.md` as a changelog.
- Do not commit chat handoff text as permanent documentation.
- Keep release history in `CHANGELOG.md`.
- Keep architecture and workflow rules in active docs.
- Keep code comments short and focused on non-obvious constraints.
