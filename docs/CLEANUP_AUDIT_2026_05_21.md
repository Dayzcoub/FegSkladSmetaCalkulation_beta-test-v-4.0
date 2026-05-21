# Cleanup audit — 2026-05-21

## Scope

First safe cleanup pass for repository documentation and production entry hygiene.

## Findings

### Root README

The previous root `README.md` contained old v3.6 migration notes and repeated release history. It did not describe the current v4-only runtime.

Action: replaced with a current project overview and links to active documentation.

### Source README

The previous `src/README.md` also contained old migration notes and planned-module text from earlier v3.6 work.

Action: replaced with a module map for the current `src/modules` runtime.

### Documentation index

There was no `docs/README.md` index.

Action: added a documentation index with rules for active and historical docs.

### Architecture and workflow docs

Current architecture and local workflow were implicit in code and old notes.

Action: added `ARCHITECTURE.md`, `DEVELOPMENT.md` and `DOCUMENTATION_POLICY.md`.

### Durable rules from old V4 notes

Old V4 release notes contain many repeated one-off task descriptions, but they also preserve real project rules.

Action: added active rule documents:

- `UI_SYSTEM.md` for UI, layout, theme and technical canvas rules.
- `CONSTRUCTORS.md` for Stage, Truss and LED constructor rules.
- `BACKEND_CONTRACT.md` for backend, sync, auth and controlled-write rules.

This makes the next cleanup step safer: old release notes can be reviewed against active docs instead of being kept only because they may contain hidden decisions.

### Production demo/test data

`index.html` loaded `src/modules/TestFixtures.js` directly before auth modules. `TestFixtures.js` contains demo users, invite keys and a large fixture catalog. Demo auth itself has an environment guard, but the fixture payload was still loaded by the production entry.

Action: removed `TestFixtures.js` from production `index.html` and from `sw.js` core precache. Kept the file in the repository for a later guarded dev/demo loading strategy. `DemoAuthProvider.js` already has a fallback demo user path when `ROOT.TestFixtures` is unavailable.

### Repository hygiene

There was no `.gitignore` in the repository.

Action: added `.gitignore` for dependencies, build output, logs, local env files, editor files, temporary archives and local Supabase runtime data.

## Follow-up queue

1. Review all `docs/V4_*` files and decide which are durable docs, which should be archived and which can be removed.
2. Search indexed repository after GitHub code search is available; remove stale TODO/task comments from source files in focused batches.
3. Add or update a release checklist if packaging continues from GitHub instead of local zip handoff.
4. Consider a dedicated `docs/SECURITY.md` for demo auth, production fixtures, invite keys, RLS, PWA cache and secrets.
5. Consider a dedicated `docs/RELEASE.md` for version bump, cache bump, build, PR and packaging procedure.
6. Consider a dedicated changelog compaction pass because `CHANGELOG.md` contains repeated `# Changelog` sections from previous archive merges.

## Non-goals for this pass

- No calculation changes.
- No BOM, warehouse, reservation or quote-output changes.
- No UI restyling.
- No deletion of historical docs without a file-by-file review.
