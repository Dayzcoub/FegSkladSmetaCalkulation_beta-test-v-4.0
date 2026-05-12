# Security Notes

## Cloud data

Apply `supabase/migrations/202605110001_security_hardening.sql` with Supabase CLI:

```bash
npm install
npm run db:migrate
```

The migration enables forced RLS, blocks anonymous table access, scopes rows to authenticated users, and adds `owner`, `editor`, and `viewer` membership roles for future shared projects.

## External scripts

Runtime CDN scripts are pinned to exact versions and protected with Subresource Integrity. Recheck hashes after any CDN version change:

```bash
npm run security:sri
```

## Local data

Backup exports intentionally omit the Supabase anon key. Imported backups are size-limited and normalized before replacing local data.

## Legacy Supabase data migration note

If `projects` already contains rows created before `owner_id` existed, backfill `owner_id` before enabling strict RLS. Use `supabase/manual/owner_id_backfill_template.sql` as a template and verify there are no rows with `owner_id is null` for active workspaces.

