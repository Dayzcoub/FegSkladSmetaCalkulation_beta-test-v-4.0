# Documentation index

This folder contains active project documentation and archived historical notes.

## Active docs

### Product and workflow

- `APP_LOGIC.md` — core product logic: project-quote as the central entity, quick/quote modes, risk-based tech director checklist and confirmation flow.
- `PROJECT_LIFECYCLE.md` — project statuses, readiness checks and actions from draft to closeout.
- `ROLE_TASK_MATRIX.md` — role/task flow by project status.
- `PROJECT_EVENTS_AND_AUDIT.md` — project events, system audit and immutable history rules.
- `QUOTE_VERSIONING.md` — quote snapshots, confirmed versions and document versioning.
- `DOCUMENTS_AND_VISIBILITY.md` — document types, visibility by role and snapshot/export rules.

### Flexible project model

- `FLEXIBLE_QUOTE_SECTIONS.md` — flexible project-section model for tents, generators, decor, furniture, climate, FBS, manual constructions and future directions.
- `FLEXIBLE_RESOURCE_DATABASE.md` — category-aware resource database model with shared fields and category-specific technical specs.
- `DATA_QUALITY_RULES.md` — resource data quality status, required fields and automatic scenario restrictions.
- `DATA_IMPORT_AND_MIGRATION.md` — controlled import/migration for old data and external databases with mapping, dry-run and import batches.
- `WAREHOUSE_WORKFLOW.md` — warehouse flow from need and availability to reservation, issue, return and closeout.

### Access, security and integrations

- `ACCESS_CONTROL.md` — access model with base profiles, system permissions, project assignments, access keys and audit log.
- `SECURITY.md` — secrets, frontend limits, file access, demo data, audit and backup security rules.
- `INTEGRATIONS.md` — integration adapter principles for calendar, notifications, storage, email/SMS/push and future systems.

### Architecture and development

- `ARCHITECTURE_MIGRATION_V5.md` — staged migration roadmap from current prototype to typed domain architecture.
- `V5_DOMAIN_MODEL.md` — first domain model vocabulary and entity fields for v5 migration.
- `V5_FIRST_TECHNICAL_STEP.md` — safe first code step for domain schemas/snapshots.
- `DEFINITION_OF_DONE.md` — flexible readiness rules that protect core flows without blocking new ideas.
- `TESTING_STRATEGY.md` — practical testing levels and bounded aggregation/performance rules.
- `ERROR_HANDLING_AND_RECOVERY.md` — recovery rules for failed saves, partial confirmations, imports, documents, integrations and backend sync.
- `OFFLINE_AND_PWA_CONTRACT.md` — offline/PWA rules, local queues, warehouse offline events and sync conflict handling.
- `SINGLE_TENANT_DEPLOYMENT.md` — separate closed installation per company with company-specific config and customization rules.
- `LICENSE_AND_INSTALLATION.md` — company license, installation activation, grace period, migration and anti-copying principles.
- `DEPLOYMENT_AND_SCALING.md` — portable installation, VPS deployment, backup/restore and scaling contract.
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
