# Backend First Write Dry Run+

`BackendWriteDryRun` is the v3.9.9 safety layer before the first real Supabase write.

It does not write anything to Supabase. It builds a deterministic write plan from `backend_sync_payload` and checks:

- write order by table;
- row counts;
- required fields;
- duplicate ids;
- workspace consistency;
- quote references;
- equipment and supplier references where possible;
- dry-run SQL preview.

The output is intended for the admin `Backend / Sync` section before enabling real remote writes.

## Safety rule

Real write remains blocked unless the runtime config explicitly enables Supabase mode, remote sync and non-dry-run mode. This module only produces validation and preview artifacts.
