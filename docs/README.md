# Documentation index

This folder contains active project documentation and archived historical notes.

## Active docs

- `APP_LOGIC.md` — core product logic: project-quote as the central entity, quick/quote modes, risk-based tech director checklist and confirmation flow.
- `PROJECT_LIFECYCLE.md` — project statuses, readiness checks and actions from draft to closeout.
- `FLEXIBLE_QUOTE_SECTIONS.md` — flexible project-section model for tents, generators, decor, furniture, climate, FBS, manual constructions and future directions.
- `FLEXIBLE_RESOURCE_DATABASE.md` — category-aware resource database model with shared fields and category-specific technical specs.
- `ARCHITECTURE_MIGRATION_V5.md` — staged migration roadmap from current prototype to typed domain architecture.
- `ARCHITECTURE.md` — current runtime structure and module ownership.
- `DEVELOPMENT.md` — local development flow, commands and checks.
- `DOCUMENTATION_POLICY.md` — what belongs in docs, changelog and code comments.
- `CHANGELOG_POLICY.md` — rules for keeping release history readable.
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
