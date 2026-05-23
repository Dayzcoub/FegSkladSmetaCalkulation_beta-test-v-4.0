import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const required = [
  'backend/package.json',
  'backend/src/server.mjs',
  'backend/src/static-gateway.mjs',
  'db/postgres/001_packit_core_schema.sql',
  'db/postgres/002_packit_seed_core.sql',
  'backend/systemd/packit-company-main-api.service.example',
  'backend/systemd/packit-company-main-preview-gateway.service.example',
  'backend/env/company-main-api.env.example',
];

let ok = true;
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`[backend-check] missing: ${file}`);
    ok = false;
  }
}

for (const file of ['backend/src/server.mjs', 'backend/src/static-gateway.mjs']) {
  const syntax = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (syntax.status !== 0) ok = false;
}

if (!ok) process.exit(1);
console.log('[backend-check] OK');
