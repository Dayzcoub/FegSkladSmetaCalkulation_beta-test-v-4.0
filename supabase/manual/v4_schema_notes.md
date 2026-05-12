# FEG Stage PRO v3.8.29 — Supabase schema draft notes

This is a planning/draft migration for the v4 architecture. It is intentionally additive and does not wire the UI to the backend yet.

## Main tables

- `workspaces` — organizations and workspace settings.
- `profiles` — users, roles and workspace membership.
- `invite_keys` — invite-key registration layer.
- `equipment_categories` — category tree for the equipment database.
- `equipment_items` — unified equipment/inventory table.
- `clients` — client database.
- `quotes` — project/quote master rows.
- `quote_sections` — stage/truss/LED/audio/light/services/transport sections.
- `quote_items` — commercial and warehouse lines.
- `suppliers` — suppliers/subrent directory.
- `stock_movements` — inventory movement log.
- `reservations` — equipment reservations by quote/project.
- `calendar_integrations` — calendar provider settings.
- `audit_log` — action history.

## Security assumptions

- All business data is scoped by `workspace_id`.
- `profiles.role` controls access: `admin`, `manager`, `technician`, `warehouse`, `viewer`.
- Admin-only operations should later move to Edge Functions.
- Invite-key values should never be stored in plaintext; use `key_hash`.

## Next backend step

Before connecting the UI to Supabase, review the migration in a disposable Supabase project, seed one workspace/admin profile, and test RLS with each role.
