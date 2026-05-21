# Documentation policy

## Purpose

Documentation must help a developer understand the current product, architecture and workflow without reading old chat history.

## Where information belongs

### Root `README.md`

Use for the current project overview, local start commands and links to active docs.

Do not use it as a release log or task dump.

### `CHANGELOG.md`

Use for versioned release history. Keep newest entries at the top.

### `docs/README.md`

Use as an index for active docs and historical notes.

### Active docs

Use active docs for durable rules:

- architecture and module ownership;
- development workflow;
- UI system rules;
- backend/schema contracts;
- packaging and release procedure;
- important product decisions.

### Historical docs

Keep old task/release docs only when they explain useful decisions or migration context. Remove duplicates after their durable points are moved into active docs.

## Code comments

Keep comments only when they explain:

- non-obvious business rules;
- safety or data-loss boundaries;
- browser/PWA compatibility constraints;
- dependency/order requirements;
- TODOs that are tracked and actionable.

Remove comments that only repeat obvious code, old task text, chat notes or temporary debug remarks.

## Cleanup process

1. Read the file before deleting or rewriting it.
2. Move durable information to an active doc before deleting a historical note.
3. Avoid mixing documentation cleanup with business logic changes.
4. Use a cleanup branch and pull request for review.
5. Keep a cleanup audit file for what was changed and what still needs review.
