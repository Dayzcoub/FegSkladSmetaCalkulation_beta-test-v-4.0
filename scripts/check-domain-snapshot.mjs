import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function repoPath(...parts) {
  return path.join(root, ...parts);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadScript(context, filePath) {
  const source = await readFile(repoPath(filePath), 'utf8');
  vm.runInContext(source, context, { filename: filePath });
}

const context = vm.createContext({
  console,
  window: {},
  globalThis: {}
});
context.window = context;
context.globalThis = context;

await loadScript(context, 'src/modules/QuoteModel.js');
await loadScript(context, 'src/domain/DomainSchemas.js');
await loadScript(context, 'src/domain/ProjectSnapshotBuilder.js');

const quote = context.FEGModules.QuoteModel.createQuoteDraft({
  id: 'quote-smoke-001',
  workspaceId: 'company-smoke',
  status: 'draft',
  client: { id: 'client-1', name: 'Smoke Client' },
  project: { name: 'Smoke Project', manager: 'Manager' },
  venue: { name: 'Smoke Venue', address: 'Smoke Address', date: '2026-06-01' },
  scope: { stage: true, truss: true, led: true, sound: true, transport: true },
  sections: {
    stage: { status: 'configured', total: 10000, weightKg: 120, powerW: 0, notes: 'stage smoke' },
    truss: { status: 'configured', total: 15000, weightKg: 240, bomRows: [{ code: 'TRUSS-3M', name: 'Truss 3m', qty: 4, weightKg: 17.9 }] },
    led: { status: 'configured', total: 20000, weightKg: 180, powerW: 2500, bomRows: [{ code: 'LED-CAB', name: 'LED cabinet', qty: 12, weightKg: 8 }] },
    equipment: { items: [{ id: 'mic-1', name: 'Microphone', qty: 2, rentalPrice: 500, weightKg: 1 }] }
  },
  transport: { mode: 'city', vehicleType: 'cargo', cityPrice: 4000 }
});

const snapshot = context.PackitDomain.ProjectSnapshotBuilder.buildProjectSnapshot(quote, {
  companyId: 'company-smoke',
  installationId: 'installation-smoke'
});

assert(snapshot.entity === 'Project', 'snapshot should be a Project entity');
assert(snapshot.source && snapshot.source.readOnly === true, 'snapshot must be read-only');
assert(snapshot.companyId === 'company-smoke', 'snapshot should keep company scope');
assert(snapshot.installationId === 'installation-smoke', 'snapshot should keep installation scope');
assert(Array.isArray(snapshot.sections) && snapshot.sections.length >= 5, 'snapshot should include enabled sections');
assert(Array.isArray(snapshot.quoteRows) && snapshot.quoteRows.length >= 4, 'snapshot should expose quoteRows');
assert(Array.isArray(snapshot.bomRows) && snapshot.bomRows.length >= 3, 'snapshot should expose bomRows');
assert(Array.isArray(snapshot.warehouseRows) && snapshot.warehouseRows.length >= 3, 'snapshot should expose warehouseRows');
assert(snapshot.validation && snapshot.validation.ok === true, 'snapshot validation should pass');

console.log('Domain snapshot smoke check passed:', {
  sections: snapshot.sections.length,
  quoteRows: snapshot.quoteRows.length,
  bomRows: snapshot.bomRows.length,
  warehouseRows: snapshot.warehouseRows.length
});
