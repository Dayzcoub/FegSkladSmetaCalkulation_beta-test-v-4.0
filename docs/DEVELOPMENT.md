# Development workflow

## Requirements

- Node.js compatible with the current Vite toolchain.
- npm.
- Browser with clean-cache testing for PWA/service worker changes.
- Supabase CLI only when working with migrations or backend schema.

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

The default dev server uses `127.0.0.1:4173`.

## Build and preview

```bash
npm run build
npm run preview
```

## Checks

```bash
npm run check
npm run build
```

For end-to-end checks:

```bash
npm run test:e2e
```

## Static server helper

```bash
npm run serve:static
```

Use this only when the task needs the static server path instead of Vite.

## Supabase migrations

```bash
npm run db:migrate
```

Only run migrations for tasks that intentionally change backend schema.

## Before committing

1. Review the affected module group in `docs/ARCHITECTURE.md`.
2. Keep UI-only, calculation, warehouse and backend changes separated when possible.
3. Run the checks that match the changed area.
4. Update `CHANGELOG.md` for release-level changes.
5. Update active docs when the architecture, workflow or product contract changes.
6. Do not commit temporary task notes, local env files, build output or one-off chat handoff files.

## PWA cache note

After changing `index.html`, `sw.js`, `manifest.json` or asset paths, test with a cleared browser cache or by clearing the service worker cache from the app/browser devtools.
