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
  globalThis: {},
  localStorage: undefined
});
context.window = context;
context.globalThis = context;

await loadScript(context, 'src/modules/EquipmentDatabase.js');
await loadScript(context, 'src/domain/DomainSchemas.js');
await loadScript(context, 'src/domain/ResourceDatabaseMapper.js');

const items = [
  {
    id: 'truss-3m',
    workspaceId: 'company-resource-smoke',
    category: 'truss',
    subcategory: 'прямые фермы',
    type: 'truss_segment',
    code: 'TRS-001',
    name: 'T29Q 3m',
    manufacturer: 'FEG',
    unit: 'шт',
    stockQty: 12,
    reservedQty: 2,
    weightKg: 17.9,
    rentalPrice: 900,
    replacementCost: 25000,
    meta: { trussFamily: 'T29Q', trussCompatibilityGroup: '29Q', trussInterface: 'C2', trussLengthM: 3 }
  },
  {
    id: 'led-cab',
    workspaceId: 'company-resource-smoke',
    category: 'led',
    subcategory: 'кабинеты',
    type: 'led_cabinet',
    code: 'LED-001',
    name: 'LED Cabinet P3.91',
    unit: 'шт',
    stockQty: 64,
    weightKg: 8,
    powerW: 220,
    rentalPrice: 700,
    meta: { pixelPitch: 'P3.91', cabinetSize: '500x500' }
  },
  {
    id: 'subrent-speaker',
    workspaceId: 'company-resource-smoke',
    category: 'sound_pa',
    subcategory: 'line array',
    type: 'sound',
    sourceType: 'subrent',
    supplierName: 'Supplier Co',
    code: 'SND-EXT-001',
    name: 'External Speaker',
    unit: 'шт',
    stockQty: 0,
    rentalPrice: 3000
  }
];

const mapped = context.PackitDomain.ResourceDatabaseMapper.mapEquipmentDatabaseToResourceDatabase(items, {
  companyId: 'company-resource-smoke',
  workspaceId: 'company-resource-smoke'
});

assert(mapped.source.readOnly === true, 'mapping result must be read-only');
assert(mapped.companyId === 'company-resource-smoke', 'mapping should keep company scope');
assert(Array.isArray(mapped.resourceItems) && mapped.resourceItems.length === 3, 'should map all resource items');
assert(Array.isArray(mapped.resourceCategories) && mapped.resourceCategories.length >= 3, 'should map active resource categories');
assert(mapped.resourceItems.every(item => item.entity === 'ResourceItem'), 'all mapped items should be ResourceItem entities');
assert(mapped.resourceCategories.every(category => category.entity === 'ResourceCategory'), 'all mapped categories should be ResourceCategory entities');
assert(mapped.resourceItems.find(item => item.id === 'subrent-speaker').resourceType === 'subrent', 'subrent source should map to subrent resource type');
assert(mapped.resourceItems.find(item => item.id === 'truss-3m').technicalSpecs.trussFamily === 'T29Q', 'truss metadata should map to technicalSpecs');
assert(mapped.resourceItems.find(item => item.id === 'led-cab').technicalSpecs.pixelPitch === 'P3.91', 'LED metadata should map to technicalSpecs');
assert(mapped.validation && mapped.validation.ok === true, 'resource mapping validation should pass');
assert(mapped.summary.resourceItemCount === 3, 'summary should include item count');

console.log('Resource database mapping smoke check passed:', {
  resourceCategories: mapped.resourceCategories.length,
  resourceItems: mapped.resourceItems.length,
  warnings: mapped.validation.summary.warning,
  blocking: mapped.validation.summary.blocking
});
