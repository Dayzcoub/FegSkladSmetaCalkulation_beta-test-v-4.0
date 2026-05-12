# FEG Stage PRO v3.8.30 — Backend Sync Adapter Draft

This layer prepares local v4-preview data for the future Supabase backend without enabling remote writes by default.

## Module

`src/modules/BackendSyncAdapter.js`

## Purpose

The adapter converts current local project data into Supabase-ready rows for:

- `clients`
- `quotes`
- `quote_sections`
- `quote_items`
- `equipment_items`
- `suppliers`
- `audit_log`

It also builds a single `backend_sync_payload` object that is included in project export packs.

## Safety rule

Remote sync is not active by default. The adapter stays in `local` mode unless all conditions are met:

1. runtime config asks for `backendMode: "supabase"`;
2. `enableRemoteSync: true`;
3. `supabaseUrl` and `supabaseAnonKey` are provided;
4. the Supabase SDK is available.

## Local dry-run

The adapter can save local snapshots into `fegV4BackendSyncSnapshots` for debugging and migration review.

## Next backend step

The next safe layer can add a guarded repository service for reading/writing a small subset of records after a real Supabase project is configured.
