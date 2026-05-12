# FEG Stage PRO v3.8.29 — Supabase schema draft

This release adds the first v4 database draft without changing the local UI flow.

## Files

- `supabase/migrations/202605120001_v4_schema_draft.sql`
- `supabase/manual/v4_schema_notes.md`

## Covered v4 entities

- profiles
- workspaces
- invite_keys
- equipment_categories
- equipment_items
- clients
- quotes
- quote_sections
- quote_items
- suppliers
- stock_movements
- reservations
- calendar_integrations
- audit_log

## Rule

The app still works locally through v3.8.x modules. This schema is only a backend foundation for the next migration phase.
