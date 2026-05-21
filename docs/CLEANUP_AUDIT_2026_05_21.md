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

### Production demo/test data

`index.html` loads `src/modules/TestFixtures.js` directly before auth modules. `TestFixtures.js` contains demo users, invite keys and a large fixture catalog. Demo auth itself has an environment guard, but the fixture payload is still loaded by the production entry.

Action planned in this branch: remove `TestFixtures.js` from production `index.html` and `sw.js` core precache. Keep fallback behavior in `DemoAuthProvider.js` so local/demo sign-in still works without the fixture file.

## Follow-up queue

1. Review all `docs/V4_*` files and decide which are durable docs, which should be archived and which can be removed.
2. Search indexed repository after GitHub code search is available; remove stale TODO/task comments from source files in focused batches.
3. Add or update a release checklist if packaging continues from GitHub instead of local zip handoff.
4. Consider a dedicated `docs/UI_SYSTEM.md` for current UI rules and anti-hack constraints.
5. Consider a dedicated `docs/BACKEND_CONTRACT.md` for Supabase tables, sync queues and controlled write rules.
6. Consider a dedicated `docs/SECURITY.md` for demo auth, production fixtures, invite keys, RLS, PWA cache and secrets.

## Non-goals for this pass

- No calculation changes.
- No BOM, warehouse, reservation or quote-output changes.
- No UI restyling.
- No deletion of historical docs without a file-by-file review.
