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

const context = vm.createContext({ console, window: {}, globalThis: {}, localStorage: undefined });
context.window = context;
context.globalThis = context;

await loadScript(context, 'src/modules/QuoteModel.js');
await loadScript(context, 'src/modules/EquipmentDatabase.js');
await loadScript(context, 'src/domain/DomainSchemas.js');
await loadScript(context, 'src/domain/ProjectSnapshotBuilder.js');
await loadScript(context, 'src/domain/ProjectSectionOutputNormalizer.js');
await loadScript(context, 'src/domain/ResourceDatabaseMapper.js');
await loadScript(context, 'src/domain/WarehouseNeedNormalizer.js');
await loadScript(context, 'src/domain/DocumentSnapshotBuilder.js');
await loadScript(context, 'src/domain/LifecycleTaskGenerator.js');

const equipment = [
  { id: 'truss-3m', workspaceId: 'company-pipeline', category: 'truss', subcategory: 'прямые фермы', type: 'truss_segment', code: 'TRS-001', name: 'Truss 3m', stockQty: 2, reservedQty: 0, weightKg: 17.9, rentalPrice: 900 },
  { id: 'led-cab', workspaceId: 'company-pipeline', category: 'led', subcategory: 'кабинеты', type: 'led_cabinet', code: 'LED-001', name: 'LED cabinet', stockQty: 6, reservedQty: 0, weightKg: 8, powerW: 220, rentalPrice: 700 },
  { id: 'mic-1', workspaceId: 'company-pipeline', category: 'backline', subcategory: 'микрофоны', type: 'backline', code: 'BKL-001', name: 'Microphone', stockQty: 4, reservedQty: 0, weightKg: 1, rentalPrice: 500 }
];

const quote = context.FEGModules.QuoteModel.createQuoteDraft({
  id: 'quote-pipeline',
  workspaceId: 'company-pipeline',
  status: 'confirmed',
  client: { id: 'client-pipeline', name: 'Pipeline Client' },
  project: { name: 'Pipeline Project', manager: 'Manager' },
  venue: { name: 'Venue', address: 'Address', date: '2026-06-03' },
  scope: { truss: true, led: true, sound: true, transport: true },
  sections: {
    truss: { status: 'configured', total: 16000, weightKg: 250, bomRows: [{ resourceItemId: 'truss-3m', code: 'TRS-001', name: 'Truss 3m', qty: 4, weightKg: 17.9 }] },
    led: { status: 'configured', total: 22000, weightKg: 190, powerW: 3000, bomRows: [{ resourceItemId: 'led-cab', code: 'LED-001', name: 'LED cabinet', qty: 8, weightKg: 8 }] },
    equipment: { items: [{ resourceItemId: 'mic-1', code: 'BKL-001', id: 'mic-1', name: 'Microphone', qty: 2, rentalPrice: 500, weightKg: 1 }] }
  },
  transport: { mode: 'city', vehicleType: 'cargo', cityPrice: 4500 }
});

const resources = context.PackitDomain.ResourceDatabaseMapper.mapEquipmentDatabaseToResourceDatabase(equipment, { companyId: 'company-pipeline', workspaceId: 'company-pipeline' });
const snapshot = context.PackitDomain.ProjectSnapshotBuilder.buildProjectSnapshot(quote, { companyId: 'company-pipeline', installationId: 'installation-pipeline' });
const outputs = context.PackitDomain.ProjectSectionOutputNormalizer.normalizeProjectSectionOutputs(snapshot);
const warehouseNeeds = context.PackitDomain.WarehouseNeedNormalizer.normalizeWarehouseNeedsFromProjectOutputs(outputs, resources.resourceItems);
const documents = context.PackitDomain.DocumentSnapshotBuilder.buildDocumentSnapshots(snapshot, outputs, warehouseNeeds);
const tasks = context.PackitDomain.LifecycleTaskGenerator.generateTasks(snapshot, warehouseNeeds, { includeConfirmedTasks: true, includeWarehouseTasks: true });

assert(resources.validation.ok === true, 'resource mapping should pass');
assert(snapshot.validation.ok === true, 'project snapshot should pass');
assert(outputs.validation.ok === true, 'section outputs should pass');
assert(warehouseNeeds.validation.ok === true, 'warehouse needs should pass');
assert(documents.validation.ok === true, 'document snapshots should pass');
assert(tasks.validation.ok === true, 'task generation should pass');
assert(warehouseNeeds.summary.deficitNeeds >= 1, 'pipeline should detect warehouse deficits');
assert(documents.documents.length === 3, 'pipeline should build 3 document snapshots');
assert(tasks.tasks.length >= 2, 'pipeline should generate lifecycle tasks');
assert([resources, outputs, warehouseNeeds, documents, tasks].every(part => part.source && part.source.readOnly === true), 'all pipeline outputs must be read-only');

console.log('V5 domain pipeline smoke check passed:', {
  resourceItems: resources.resourceItems.length,
  sections: outputs.outputs.length,
  warehouseNeeds: warehouseNeeds.summary.totalNeeds,
  deficits: warehouseNeeds.summary.deficitNeeds,
  documents: documents.documents.length,
  tasks: tasks.tasks.length
});
