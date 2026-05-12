-- FEG Stage PRO 3.7.4 - manual owner_id backfill template
--
-- Use this BEFORE enabling strict RLS if the database already contains rows in public.projects
-- created by older FEG Stage PRO versions without owner_id.
--
-- 1) Find the authenticated user UUID that should own the existing workspace.
--    Supabase Dashboard -> Authentication -> Users -> copy the user's id.
-- 2) Replace the placeholders below.
-- 3) Run only the UPDATE statements that match your migration plan.

-- Backfill one workspace for one owner:
-- update public.projects
-- set owner_id = '00000000-0000-0000-0000-000000000000'::uuid
-- where workspace_key = 'your-workspace-key'
--   and owner_id is null;

-- Optional: backfill all legacy rows to one owner only when this is a single-user database:
-- update public.projects
-- set owner_id = '00000000-0000-0000-0000-000000000000'::uuid
-- where owner_id is null;

-- Verify before enabling strict RLS:
-- select workspace_key, count(*) as rows_without_owner
-- from public.projects
-- where owner_id is null
-- group by workspace_key
-- order by workspace_key;
