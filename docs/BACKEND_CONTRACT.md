# Backend and sync contract

This document collects durable backend rules from the historical release notes.

## Current mode

The app is browser-first and local-first. Supabase/backend modules exist as readiness, dry-run, sync queue and controlled-write layers.

Direct browser writes to production backend data must remain guarded. Backend mutation flows should use explicit dry-run, approval and controlled execution steps.

## Main backend-ready areas

- Workspaces and profiles.
- Invite keys and role access.
- Equipment catalog sync.
- Clients and quotes sync.
- Quote sections and quote items.
- Suppliers and subrentors.
- Stock movements and reservations.
- Audit log.
- Communication and notifications schema.

## Controlled write rules

- Remote writes must be explicit, reviewed and gated.
- Dry-run must be available before write execution.
- Approval packages/checksums must become stale when source payload changes.
- Test keys and confirmation phrases must not be stored in localStorage.
- Rollback hints may be generated, but automatic destructive rollback should not run from the browser.
- Post-write verification should be read-only and should compare expected rows with backend state.

## Sync queue rules

- Local queues may stage payloads and export JSON.
- Staged payloads must preserve local ids and workspace scope.
- Sync reports should classify rows as ready, warning or blocked.
- Missing weights, power, stock, suppliers, categories or prices are manual data-quality tasks, not auto-filled guesses.

## Warehouse and reservations

- Stock movement and reservation logic must not change automatically during documentation or UI cleanup.
- Reservation plans are planning artifacts until an explicit warehouse workflow action records movement.
- Deficit and subrent rows must keep source information for internal planning and documents.

## Auth and roles

- Demo/local auth is for development and role testing.
- Real auth/profile/invite mutation requires backend review and controlled action gates.
- Role guards must be enforced at runtime for visible sections.
- Admin-only panels must stay hidden from non-admin roles.

## Supabase migrations

- Migrations live in `supabase/migrations/`.
- New migrations should be additive unless a dedicated migration/release task reviews data impact.
- RLS helpers and policies must preserve workspace scope.

## Cleanup rule

Historical docs that only describe one intermediate dry-run or approval step can be removed after the durable backend rule is captured here and the release remains represented in `CHANGELOG.md`.
