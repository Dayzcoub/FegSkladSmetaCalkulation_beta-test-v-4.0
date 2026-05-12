(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SUBRENT_PLANNER_VERSION = '1.0.0';
  const DEFAULT_MARGIN_RATE = 0.25;

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function roundMoney(value) { return Math.round(nonNegative(value, 0)); }

  function pickLists() { return ROOT.WarehousePickListBuilder || null; }

  function getNeedQty(row) {
    const src = row || {};
    if (nonNegative(src.subrentQty, 0) > 0) return nonNegative(src.subrentQty, 0);
    if (src.sourceType === 'subrent') return nonNegative(src.qty == null ? src.requestedQty : src.qty, 0);
    return nonNegative(src.deficitQty, 0);
  }

  function normalizeSubrentRow(row, options) {
    const src = row || {};
    const opts = options || {};
    const qty = getNeedQty(src);
    const subrentPrice = roundMoney(src.subrentPrice == null ? src.subrent_price == null ? src.rentalPrice : src.subrent_price : src.subrentPrice);
    const explicitClientPrice = src.clientPrice == null ? src.client_price : src.clientPrice;
    const clientPrice = explicitClientPrice == null || explicitClientPrice === ''
      ? roundMoney(subrentPrice * (1 + nonNegative(opts.defaultMarginRate, DEFAULT_MARGIN_RATE)))
      : roundMoney(explicitClientPrice);
    const margin = roundMoney((clientPrice - subrentPrice) * qty);
    const sourceType = src.sourceType === 'subrent' ? 'subrent' : 'subrent_needed';
    return {
      id: toText(src.id || src.itemId || src.code || src.name),
      itemId: toText(src.itemId),
      code: toText(src.code || src.id || src.itemId || 'SUBRENT'),
      name: toText(src.name || 'Позиция субаренды'),
      sectionKey: toText(src.sectionKey),
      sectionTitle: toText(src.sectionTitle),
      qty,
      unit: toText(src.unit || 'шт') || 'шт',
      sourceType,
      supplierId: toText(src.supplierId || src.supplier_id),
      supplierName: toText(src.supplierName || src.supplier_name || 'Поставщик не указан'),
      subrentPrice,
      clientPrice,
      margin,
      totalSubrent: roundMoney(subrentPrice * qty),
      totalClient: roundMoney(clientPrice * qty),
      deficitQty: nonNegative(src.deficitQty, 0),
      availableQty: src.availableQty == null ? null : nonNegative(src.availableQty, 0),
      stockQty: src.stockQty == null ? null : nonNegative(src.stockQty, 0),
      reservedQty: src.reservedQty == null ? null : nonNegative(src.reservedQty, 0),
      note: toText(src.note || src.notes),
      raw: src
    };
  }

  function collectRows(input) {
    if (Array.isArray(input)) return input;
    if (input && Array.isArray(input.rows)) return input.rows;
    if (input && pickLists() && pickLists().buildPickLists) {
      const lists = pickLists().buildPickLists(input);
      return lists && lists.subrent && Array.isArray(lists.subrent.rows) ? lists.subrent.rows : [];
    }
    return [];
  }

  function buildSubrentPlan(input, options) {
    const rows = collectRows(input)
      .map(row => normalizeSubrentRow(row, options || {}))
      .filter(row => row.qty > 0);
    const bySupplier = rows.reduce((acc, row) => {
      const key = row.supplierId || row.supplierName || 'unknown';
      if (!acc[key]) acc[key] = {
        supplierId: row.supplierId,
        supplierName: row.supplierName,
        rows: [],
        totalSubrent: 0,
        totalClient: 0,
        margin: 0
      };
      acc[key].rows.push(row);
      acc[key].totalSubrent += row.totalSubrent;
      acc[key].totalClient += row.totalClient;
      acc[key].margin += row.margin;
      return acc;
    }, {});
    const suppliers = Object.values(bySupplier).sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'ru'));
    return {
      version: SUBRENT_PLANNER_VERSION,
      rows,
      suppliers,
      totals: {
        rows: rows.length,
        qty: rows.reduce((sum, row) => sum + row.qty, 0),
        subrent: rows.reduce((sum, row) => sum + row.totalSubrent, 0),
        client: rows.reduce((sum, row) => sum + row.totalClient, 0),
        margin: rows.reduce((sum, row) => sum + row.margin, 0)
      },
      generatedAt: new Date().toISOString()
    };
  }

  function planToText(plan) {
    const p = plan || buildSubrentPlan([]);
    const lines = ['План субаренды', ''];
    (p.suppliers || []).forEach(supplier => {
      lines.push(`Поставщик: ${supplier.supplierName || '—'}`);
      supplier.rows.forEach(row => {
        lines.push(`- ${row.code || '—'} ${row.name}: ${row.qty} ${row.unit} × ${row.subrentPrice.toLocaleString('ru-RU')} ₽ = ${row.totalSubrent.toLocaleString('ru-RU')} ₽; клиент ${row.clientPrice.toLocaleString('ru-RU')} ₽/ед.; маржа ${row.margin.toLocaleString('ru-RU')} ₽${row.note ? ` (${row.note})` : ''}`);
      });
      lines.push(`Итого поставщик: ${supplier.totalSubrent.toLocaleString('ru-RU')} ₽ / клиент ${supplier.totalClient.toLocaleString('ru-RU')} ₽ / маржа ${supplier.margin.toLocaleString('ru-RU')} ₽`);
      lines.push('');
    });
    lines.push(`Всего строк: ${p.totals && p.totals.rows || 0}`);
    lines.push(`Субаренда: ${(p.totals && p.totals.subrent || 0).toLocaleString('ru-RU')} ₽`);
    lines.push(`Клиент: ${(p.totals && p.totals.client || 0).toLocaleString('ru-RU')} ₽`);
    lines.push(`Маржа: ${(p.totals && p.totals.margin || 0).toLocaleString('ru-RU')} ₽`);
    return lines.join('\n');
  }

  ROOT.SubrentPlanner = {
    SUBRENT_PLANNER_VERSION,
    DEFAULT_MARGIN_RATE,
    normalizeSubrentRow,
    buildSubrentPlan,
    planToText
  };
})();
