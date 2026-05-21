# FEG Stage PRO / PACK.IT

FEG Stage PRO is a browser-based event production planning app. The current runtime is the v4-only shell: quick technical constructors, the quote wizard, equipment database, warehouse and reservation workflows, document generation, visual previews and Supabase-ready sync modules are loaded from `index.html`.

Historical migration notes from earlier v3.x builds belong in `CHANGELOG.md` or archived docs, not in the main entry README.

## Current baseline

- App package: `feg-stage-pro`.
- Current package version: `3.17.50`.
- Runtime: static Vite app with browser modules exposed through `window.FEGModules`.
- Main entry: `index.html`.
- Main stylesheet: `src/styles/main.css`.
- Service worker: `sw.js`.
- PWA manifest: `manifest.json`.

## Main product areas

- Quick constructors: stage, truss and LED technical calculators.
- Quote wizard: client/project flow, stage/truss/LED sections, equipment rows, transport, crew and final summary.
- Equipment and warehouse: equipment database, availability, reservations, stock movement planning and warehouse operations.
- Documents: quote documents, technical sheets, PDF/export helpers and document center.
- Visuals: top/front/isometric preview adapters and renderers.
- Access and operations: auth shell, roles, admin panels, command center, reports, communication center and project readiness tools.
- Backend readiness: Supabase adapters, sync queues, audit log, migrations and dry-run tools.

## Repository map

```text
index.html                 Runtime script order and app shell mount
src/modules/               Browser runtime modules
src/modules/visual/        Visual model adapters and renderers
src/styles/main.css        Shared UI layer and design tokens
scripts/                   Static/dev checks and helper scripts
supabase/migrations/       Supabase schema migrations
tests/e2e/                 Playwright checks
assets/icons/textures      PWA icons and constructor textures
docs/                      Active documentation and historical notes
CHANGELOG.md               Release history
```

## Local development

```bash
npm install
npm run dev
npm run check
npm run build
```

Use `npm run preview` for a local Vite preview and `npm run serve:static` for the project static server helper when needed.

## Documentation

Start from:

- `docs/README.md` — documentation index.
- `docs/ARCHITECTURE.md` — current runtime architecture map.
- `docs/DEVELOPMENT.md` — local workflow and checks.
- `docs/DOCUMENTATION_POLICY.md` — documentation rules.
- `docs/CLEANUP_AUDIT_2026_05_21.md` — first cleanup pass notes.

## Cleanup rules

- The main `README.md` describes the current project, not historical release notes.
- `CHANGELOG.md` stores release history.
- Temporary briefs, task notes and chat handoff text should not be committed as root documentation.
- Code comments should explain non-obvious contracts only.
- Test/demo fixtures must not be loaded by production `index.html`.
