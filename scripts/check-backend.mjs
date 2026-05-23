import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const required = [
  'backend/package.json',
  'backend/src/server.mjs',
  'db/postgres/001_packit_core_schema.sql',
  'db/postgres/002_packit_seed_core.sql',
  'backend/systemd/packit-company-main-api.service.example',
  'backend/env/company-main-api.env.example',
];

let ok = true;
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`[backend-check] missing: ${file}`);
    ok = false;
  }
}

const syntax = spawnSync(process.execPath, ['--check', 'backend/src/server.mjs'], { stdio: 'inherit' });
if (syntax.status !== 0) ok = false;

if (!ok) process.exit(1);
console.log('[backend-check] OK');
