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

const context = vm.createContext({ console, window: {}, globalThis: {} });
context.window = context;
context.globalThis = context;

await loadScript(context, 'src/modules/QuoteModel.js');
await loadScript(context, 'src/domain/DomainSchemas.js');
await loadScript(context, 'src/domain/ProjectSnapshotBuilder.js');
await loadScript(context, 'src/domain/ProjectSectionOutputNormalizer.js');

const quote = context.FEGModules.QuoteModel.createQuoteDraft({
  id: 'quote-section-output-smoke',
  workspaceId: 'company-section-output',
  status: 'draft',
  client: { id: 'client-1', name: 'Section Output Client' },
  project: { name: 'Section Output Project', manager: 'Manager' },
  venue: { name: 'Venue', address: 'Address', date: '2026-06-02' },
  scope: { stage: true, truss: true, led: true, sound: true, transport: true },
  sections: {
    stage: { status: 'configured', total: 11000, weightKg: 140 },
    truss: { status: 'configured', total: 16000, weightKg: 250, bomRows: [{ code: 'TRUSS-2M', name: 'Truss 2m', qty: 6, weightKg: 13 }] },
    led: { status: 'configured', total: 22000, weightKg: 190, powerW: 3000, bomRows: [{ code: 'LED-CAB', name: 'LED cabinet', qty: 15, weightKg: 8 }] },
    equipment: { items: [{ id: 'speaker-1', name: 'Speaker', qty: 2, rentalPrice: 2500, weightKg: 16 }] }
  },
  transport: { mode: 'city', vehicleType: 'cargo', cityPrice: 4500 }
});

const snapshot = context.PackitDomain.ProjectSnapshotBuilder.buildProjectSnapshot(quote, {
  companyId: 'company-section-output',
  installationId: 'installation-section-output'
});

const outputs = context.PackitDomain.ProjectSectionOutputNormalizer.normalizeProjectSectionOutputs(snapshot);

assert(outputs.source.readOnly === true, 'project outputs must be read-only');
assert(outputs.projectId === snapshot.id, 'outputs should reference project id');
assert(outputs.companyId === snapshot.companyId, 'outputs should keep company scope');
assert(Array.isArray(outputs.outputs) && outputs.outputs.length === snapshot.sections.length, 'each project section should have output');
assert(outputs.quoteRows.length === snapshot.quoteRows.length, 'normalized quoteRows should match snapshot rows');
assert(outputs.bomRows.length === snapshot.bomRows.length, 'normalized bomRows should match snapshot rows');
assert(outputs.warehouseRows.length === snapshot.warehouseRows.length, 'normalized warehouseRows should match snapshot rows');
assert(outputs.outputs.every(output => output.technicalSummary && output.documentContext), 'each output should include technicalSummary and documentContext');
assert(outputs.outputs.every(output => output.validation && output.validation.ok === true), 'each section output validation should pass');
assert(outputs.validation && outputs.validation.ok === true, 'project output validation should pass');

console.log('ProjectSection output normalization smoke check passed:', {
  sections: outputs.outputs.length,
  quoteRows: outputs.quoteRows.length,
  bomRows: outputs.bomRows.length,
  warehouseRows: outputs.warehouseRows.length,
  totalClientPrice: outputs.totals.totalClientPrice
});
