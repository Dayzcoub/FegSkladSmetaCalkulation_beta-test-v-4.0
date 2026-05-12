# FEG Stage PRO v3.9.3 — Access & Onboarding Hub

This layer turns the welcome screen into a working local onboarding hub.

## What is included

- local email login through AdminShell profiles;
- invite-key registration through local invite_keys;
- first-admin bootstrap screen;
- OAuth placeholders for Google and Apple ID;
- Demo Auth remains available for build checks and role testing;
- all data stays local until Supabase Auth is explicitly wired.

## Safety

The bootstrap key is not hard-coded in client code. In local/dev mode first-admin creation expects a runtime/backend config value. Demo Auth is still the recommended way to validate builds without creating a real admin.

## Future Supabase mapping

- AdminShell profiles → `profiles`
- AdminShell invite keys → `invite_keys`
- LocalAuthProvider current user → Supabase Auth session/profile join
