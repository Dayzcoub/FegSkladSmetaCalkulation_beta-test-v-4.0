(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SUMMARY_VERSION = '1.3.3-project-crew-summary';

  const SECTION_TITLES = Object.freeze({
    stage: 'Сцена',
    truss: 'Фермы',
    led: 'LED экран',
    equipment: 'Звук / свет / услуги',
    crew: 'Команда проекта'
  });

  function model() { return ROOT.QuoteModel || null; }
  function availability() { return ROOT.AvailabilityChecker || null; }
  function sharedBomBridge() { return ROOT.V4SharedBomBridge || null; }
  function quoteItemBuilder() { return ROOT.QuoteItemBuilder || null; }
  function warehousePickListBuilder() { return ROOT.WarehousePickListBuilder || null; }
  function crewModule() { return ROOT.ProjectCrewAssignments || null; }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (_) { return value; } }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }


  function normalizeCrewAssignments(quote) {
    const q = quote || {};
    const list = q.crewAssignments || q.projectCrew || q.team || [];
    return crewModule() && crewModule().normalizeAssignments ? crewModule().normalizeAssignments(list) : (Array.isArray(list) ? list : []);
  }

  function getCrewCost(row) {
    const src = crewModule() && crewModule().normalizeAssignment ? crewModule().normalizeAssignment(row || {}) : (row || {});
    const total = nonNegative(src.totalCost, 0);
    if (total) return total;
    if (src.payMode === 'hourly') return nonNegative(src.hourlyRate, 0) * nonNegative(src.hours, 0);
    return nonNegative(src.fixedCost, 0);
  }

  function getCrewPersonLabel(row) {
    const src = crewModule() && crewModule().normalizeAssignment ? crewModule().normalizeAssignment(row || {}) : (row || {});
    return toText(src.displayName || src.userEmail || src.userId || 'Участник');
  }

  function getCrewRoleLabel(row) {
    const src = crewModule() && crewModule().normalizeAssignment ? crewModule().normalizeAssignment(row || {}) : (row || {});
    if (src.projectRoleLabel) return src.projectRoleLabel;
    return crewModule() && crewModule().getCrewRoleLabel ? crewModule().getCrewRoleLabel(src.projectRole || src.role) : toText(src.projectRole || src.role || 'Роль');
  }

  function getCrewSectionRow(quote) {
    const assignments = normalizeCrewAssignments(quote);
    const total = crewModule() && crewModule().calculateCrewCost ? crewModule().calculateCrewCost(assignments) : assignments.reduce((sum, row) => sum + getCrewCost(row), 0);
    if (!assignments.length && !total) return null;
    const paid = assignments.filter(row => getCrewCost(row) > 0).length;
    return {
      key: 'crew',
      title: SECTION_TITLES.crew,
      status: 'configured',
      source: 'project_crew_assignments',
      summary: `${assignments.length} участн.; оплачиваемых ${paid}; итого ${Math.round(total).toLocaleString('ru-RU')} ₽`,
      rental: total,
      weightKg: 0,
      powerW: 0,
      startupPowerW: 0,
      deficitCount: 0,
      bomCount: assignments.length,
      stageHeightM: 0,
      configured: true
    };
  }

  function getCrewCustomerRows(quote) {
    return normalizeCrewAssignments(quote).map((row, index) => {
      const src = crewModule() && crewModule().normalizeAssignment ? crewModule().normalizeAssignment(row || {}) : (row || {});
      const total = getCrewCost(src);
      if (total <= 0) return null;
      const hourly = src.payMode === 'hourly';
      const qty = hourly ? nonNegative(src.hours, 0) : 1;
      const unitPrice = hourly ? nonNegative(src.hourlyRate, 0) : total;
      const role = getCrewRoleLabel(src);
      return {
        key: `crew:${src.id || index}`,
        sectionKey: 'crew',
        title: `Работы: ${role}`,
        qty: qty || 1,
        unit: hourly ? 'ч' : 'усл.',
        price: unitPrice,
        total,
        note: hourly ? `${nonNegative(src.hourlyRate, 0)} ₽/ч × ${nonNegative(src.hours, 0)} ч` : 'фиксированная стоимость'
      };
    }).filter(Boolean);
  }

  function getCrewTechnicalRows(quote) {
    return normalizeCrewAssignments(quote).map((row, index) => {
      const src = crewModule() && crewModule().normalizeAssignment ? crewModule().normalizeAssignment(row || {}) : (row || {});
      return {
        key: `crew:${src.id || index}`,
        sectionKey: 'crew',
        role: getCrewRoleLabel(src),
        name: getCrewPersonLabel(src),
        email: toText(src.userEmail),
        payMode: src.payMode === 'hourly' ? 'hourly' : 'fixed',
        hours: nonNegative(src.hours, 0),
        hourlyRate: nonNegative(src.hourlyRate, 0),
        fixedCost: nonNegative(src.fixedCost, 0),
        totalCost: getCrewCost(src),
        isGuest: Boolean(src.isGuest),
        keyType: toText(src.keyType || 'temporary'),
        accessFrom: toText(src.accessFrom),
        accessTo: toText(src.accessTo),
        inviteKey: toText(src.inviteKey),
        note: toText(src.note)
      };
    });
  }

  function readSectionMetric(section, keys) {
    const src = section || {};
    for (const key of keys) {
      const value = src[key];
      if (Number.isFinite(Number(value))) return Number(value);
    }
    return 0;
  }

  function getSectionRental(section) {
    if (!section) return 0;
    const direct = readSectionMetric(section, ['total', 'rental', 'price', 'rentalTotal']);
    if (direct) return direct;
    if (section.type === 'equipment') return readSectionMetric(section, ['equipmentRental']);
    return 0;
  }

  function getSectionRows(quote) {
    const q = normalizeQuote(quote);
    const sections = q.sections || {};
    const rows = ['stage', 'truss', 'led', 'equipment']
      .filter(key => Boolean(sections[key]))
      .map(key => {
        const section = sections[key] || {};
        const firstBomRow = Array.isArray(section.bomRows) && section.bomRows.length ? section.bomRows[0] : null;
        const subrentClientPrice = firstBomRow && (firstBomRow.sourceType === 'subrent' || section.subrentOverride) ? nonNegative(firstBomRow.clientPrice, 0) || nonNegative(firstBomRow.rentalPrice, 0) || getSectionRental(section) : 0;
        return {
          key,
          title: section.subrentOverride && firstBomRow && firstBomRow.name ? firstBomRow.name : (section.title || SECTION_TITLES[key] || key),
          status: section.status || 'placeholder',
          source: section.source || '',
          summary: section.summary || '',
          rental: subrentClientPrice || getSectionRental(section),
          weightKg: readSectionMetric(section, ['weightKg', 'weight', 'totalWeightKg']),
          powerW: readSectionMetric(section, ['powerW', 'power', 'totalPowerW']),
          startupPowerW: readSectionMetric(section, ['startupPowerW', 'totalStartupPowerW']),
          deficitCount: readSectionMetric(section, ['deficitCount']),
          bomCount: Array.isArray(section.bomRows) ? section.bomRows.length : Array.isArray(section.items) ? section.items.length : 0,
          stageHeightM: section.stageHeightM || (section.result && section.result.stageHeightM) || 0,
          configured: section.status === 'configured'
        };
      });
    const crewRow = getCrewSectionRow(q);
    if (crewRow) rows.push(crewRow);
    return rows;
  }

  function getConfiguredSectionRows(quote) {
    return getSectionRows(quote).filter(row => row.configured);
  }

  function getSectionStatusRows(quote) {
    const q = normalizeQuote(quote);
    const scope = q.scope || {};
    const rows = [];
    if (scope.stage) rows.push(statusRow('stage', q.sections && q.sections.stage));
    if (scope.truss) rows.push(statusRow('truss', q.sections && q.sections.truss));
    if (scope.led) rows.push(statusRow('led', q.sections && q.sections.led));
    if (scope.sound || scope.light || scope.backline || scope.services) rows.push(statusRow('equipment', q.sections && q.sections.equipment));
    if (normalizeCrewAssignments(q).length) rows.push({ key: 'crew', title: SECTION_TITLES.crew, status: 'configured', ok: true, label: 'назначена команда' });
    return rows;
  }

  function statusRow(key, section) {
    const sec = section || {};
    const status = sec.status || 'placeholder';
    return {
      key,
      title: sec.title || SECTION_TITLES[key] || key,
      status,
      ok: status === 'configured',
      label: status === 'configured' ? 'готово' : status === 'disabled' ? 'не выбрано' : 'ожидает заполнения'
    };
  }

  function getCustomerEstimateRows(quote) {
    const q = normalizeQuote(quote);
    const rows = [];
    getConfiguredSectionRows(q).forEach(row => {
      if (row.key === 'crew') return;
      if (row.key === 'equipment') {
        const equipmentRows = getEquipmentCustomerRows(q, row);
        if (equipmentRows.length) {
          equipmentRows.forEach(eqRow => rows.push(eqRow));
          return;
        }
      }
      rows.push({
        key: row.key,
        title: row.title,
        qty: 1,
        unit: 'раздел',
        price: row.rental,
        total: row.rental,
        note: row.summary || row.source || ''
      });
    });
    getCrewCustomerRows(q).forEach(row => rows.push(row));
    const transport = model() && model().normalizeTransport ? model().normalizeTransport(q.transport || {}) : (q.transport || {});
    const transportTotal = nonNegative(transport.total, 0);
    if (transportTotal > 0) {
      rows.push({
        key: 'transport',
        title: transport.mode === 'out_of_city' ? 'Транспорт за город' : 'Транспорт по городу',
        qty: 1,
        unit: 'усл.',
        price: transportTotal,
        total: transportTotal,
        note: `${transport.vehicleLabel || 'Грузовой'} · ${transport.mode === 'out_of_city' ? `${nonNegative(transport.distanceKm, 0)} км × ${nonNegative(transport.pricePerKm, 0)} ₽/км` : `${nonNegative(transport.cityPrice, 0)} ₽ по городу`}`
      });
    }
    return rows;
  }

  function getEquipmentCustomerRows(quote, sectionRow) {
    const q = normalizeQuote(quote);
    const section = q.sections && q.sections.equipment || null;
    const lines = section && Array.isArray(section.items) ? section.items : [];
    if (!lines.length) return [];
    const map = new Map();
    lines.forEach(line => {
      if (!line) return;
      const qty = nonNegative(line.qty, 0);
      if (qty <= 0) return;
      const hasCatalogLink = Boolean(toText(line.itemId));
      const key = hasCatalogLink
        ? `catalog:${toText(line.itemId)}`
        : `manual:${toText(line.name || line.code)}:${toText(line.sourceType || 'manual')}:${toText(line.supplierName)}`;
      const unitPrice = nonNegative(line.clientPrice, 0) || nonNegative(line.rentalPrice, 0) || nonNegative(line.subrentPrice, 0);
      const target = map.get(key) || {
        key: `equipment:${key}`,
        title: line.name || line.code || 'Оборудование',
        qty: 0,
        unit: line.unit || 'шт',
        total: 0,
        notes: [],
        ownQty: 0,
        subrentQty: 0
      };
      target.qty += qty;
      target.total += unitPrice * qty;
      if ((line.sourceType || 'own') === 'subrent') {
        target.subrentQty += qty;
        const supplier = toText(line.supplierName) || 'поставщик не указан';
        const price = nonNegative(line.subrentPrice, 0) || unitPrice;
        target.notes.push(`субаренда ${qty} ${line.unit || 'шт'} · ${supplier}${price ? ` · ${price} ₽/ед.` : ''}`);
      } else {
        target.ownQty += qty;
        target.notes.push(`свой склад ${qty} ${line.unit || 'шт'}`);
      }
      target.price = target.qty > 0 ? target.total / target.qty : 0;
      map.set(key, target);
    });
    return Array.from(map.values()).map(row => ({
      key: row.key,
      title: row.title,
      qty: row.qty,
      unit: row.unit || 'шт',
      price: row.price || 0,
      total: row.total || 0,
      note: (sectionRow && sectionRow.summary) || ''
    }));
  }

  function getTechnicalSummaryRows(quote) {
    const q = normalizeQuote(quote);
    const summary = model() && model().summarizeQuote ? model().summarizeQuote(q) : { totals: q.totals || {} };
    const totals = summary.totals || {};
    const crewRows = getCrewTechnicalRows(q);
    const rows = [
      { key: 'weight', title: 'Общий вес', value: nonNegative(totals.weightKg, 0), unit: 'кг' },
      { key: 'power', title: 'Рабочая мощность', value: nonNegative(totals.powerW, 0), unit: 'Вт' },
      { key: 'startupPower', title: 'Пусковая мощность', value: nonNegative(totals.startupPowerW, 0), unit: 'Вт' },
      { key: 'sections', title: 'Готовые разделы', value: getConfiguredSectionRows(q).length, unit: 'разд.' },
      { key: 'deficits', title: 'Дефицитные позиции', value: countDeficitRows(q), unit: 'поз.' }
    ];
    if (crewRows.length) {
      rows.push({ key: 'crewCount', title: 'Команда проекта', value: crewRows.length, unit: 'чел.' });
      rows.push({ key: 'crewCost', title: 'Стоимость работ команды', value: crewRows.reduce((sum, row) => sum + nonNegative(row.totalCost, 0), 0), unit: '₽' });
    }
    return rows;
  }

  function countDeficitRows(quote) {
    const rows = collectBomRows(quote);
    return rows.filter(row => nonNegative(row.deficitQty, 0) > 0).length;
  }


  function incrementMap(map, key, patch) {
    const k = toText(key || 'unknown') || 'unknown';
    if (!map[k]) map[k] = { rows: 0, qty: 0, weightKg: 0, powerW: 0, startupPowerW: 0, deficitRows: 0, subrentRows: 0, unmatchedRows: 0 };
    const target = map[k];
    target.rows += nonNegative(patch && patch.rows, 0);
    target.qty += nonNegative(patch && patch.qty, 0);
    target.weightKg += nonNegative(patch && patch.weightKg, 0);
    target.powerW += nonNegative(patch && patch.powerW, 0);
    target.startupPowerW += nonNegative(patch && patch.startupPowerW, 0);
    target.deficitRows += nonNegative(patch && patch.deficitRows, 0);
    target.subrentRows += nonNegative(patch && patch.subrentRows, 0);
    target.unmatchedRows += nonNegative(patch && patch.unmatchedRows, 0);
    return target;
  }

  function summarizeRowsBySection(rows) {
    const map = {};
    (Array.isArray(rows) ? rows : []).forEach(row => {
      incrementMap(map, row && (row.sectionKey || row.section_key), {
        rows: 1,
        qty: row && (row.qty == null ? row.quantity : row.qty),
        weightKg: row && (row.weightKg == null ? row.weight_kg : row.weightKg),
        powerW: row && (row.powerW == null ? row.power_w : row.powerW),
        startupPowerW: row && (row.startupPowerW == null ? row.startup_power_w : row.startupPowerW),
        deficitRows: row && nonNegative(row.deficitQty == null ? row.deficit_qty : row.deficitQty, 0) > 0 ? 1 : 0,
        subrentRows: row && (row.sourceType === 'subrent' || row.source_type === 'subrent' || row.sourceType === 'subrent_needed' || row.source_type === 'subrent_needed' || nonNegative(row.subrentQty == null ? row.subrent_qty : row.subrentQty, 0) > 0) ? 1 : 0,
        unmatchedRows: row && (row.inventoryStatus === 'unmatched' || row.inventory_status === 'unmatched') ? 1 : 0
      });
    });
    return map;
  }

  function summarizePickListsBySection(pickLists) {
    const map = {};
    const allRows = pickLists && pickLists.all && Array.isArray(pickLists.all.rows) ? pickLists.all.rows : [];
    allRows.forEach(row => {
      incrementMap(map, row && row.sectionKey, {
        rows: 1,
        qty: row && row.qty,
        weightKg: row && row.weightKg,
        powerW: row && row.powerW,
        startupPowerW: row && row.startupPowerW,
        deficitRows: row && nonNegative(row.deficitQty, 0) > 0 ? 1 : 0,
        subrentRows: row && (row.sourceType === 'subrent' || nonNegative(row.subrentQty, 0) > 0) ? 1 : 0,
        unmatchedRows: row && row.inventoryStatus === 'unmatched' ? 1 : 0
      });
    });
    return map;
  }

  function getFlowStatus(row) {
    if (row && row.key === 'crew') return nonNegative(row.quoteItems, 0) > 0 || row.configured ? 'linked' : 'idle';
    if (row.selected && !row.configured) return 'needs_section_config';
    if (row.configured && row.bomRows <= 0 && row.quoteItems <= 0 && row.warehouseRows <= 0) return 'configured_without_rows';
    if (row.configured && row.bomRows > 0 && row.quoteItems > 0 && row.warehouseRows > 0) return row.deficitRows > 0 || row.unmatchedRows > 0 ? 'linked_with_warnings' : 'linked';
    if (!row.selected && (row.bomRows > 0 || row.quoteItems > 0 || row.warehouseRows > 0)) return 'rows_without_scope';
    if (row.selected || row.configured) return 'partial';
    return 'idle';
  }

  function getFlowLabel(status) {
    return {
      linked: 'цепочка ок',
      linked_with_warnings: 'цепочка ок, есть предупреждения',
      partial: 'частично',
      needs_section_config: 'нужно заполнить раздел',
      configured_without_rows: 'нет строк BOM',
      rows_without_scope: 'строки без чекбокса раздела',
      idle: 'не выбран'
    }[status] || status;
  }

  function buildFlowDiagnosticRows(quote) {
    const q = normalizeQuote(quote);
    const statusRows = getSectionStatusRows(q);
    const sectionRows = getSectionRows(q);
    const bomRows = collectBomRows(q);
    const quoteItemsPack = quoteItemBuilder() && quoteItemBuilder().buildQuoteItems
      ? quoteItemBuilder().buildQuoteItems(q, { includeTransport: false })
      : { rows: [] };
    const pickLists = warehousePickListBuilder() && warehousePickListBuilder().buildPickLists
      ? warehousePickListBuilder().buildPickLists(q)
      : null;
    const bomBySection = summarizeRowsBySection(bomRows);
    const quoteItemsBySection = summarizeRowsBySection(quoteItemsPack && quoteItemsPack.rows);
    const warehouseBySection = summarizePickListsBySection(pickLists);
    const keys = Array.from(new Set([].concat(
      ['stage', 'truss', 'led', 'equipment', 'crew'].filter(key => statusRows.some(row => row.key === key) || sectionRows.some(row => row.key === key)),
      Object.keys(bomBySection),
      Object.keys(quoteItemsBySection),
      Object.keys(warehouseBySection)
    ))).filter(key => key && key !== 'transport');
    return keys.map(key => {
      const status = statusRows.find(row => row.key === key) || null;
      const section = sectionRows.find(row => row.key === key) || null;
      const bom = bomBySection[key] || {};
      const quoteItem = quoteItemsBySection[key] || {};
      const warehouse = warehouseBySection[key] || {};
      const row = {
        key,
        title: (section && section.title) || (status && status.title) || SECTION_TITLES[key] || key,
        selected: Boolean(status),
        configured: Boolean(section && section.configured),
        sectionStatus: (status && status.status) || (section && section.status) || 'not_selected',
        sectionLabel: (status && status.label) || (section && section.status) || 'не выбран',
        sectionWeightKg: section ? nonNegative(section.weightKg, 0) : 0,
        sectionPowerW: section ? nonNegative(section.powerW, 0) : 0,
        bomRows: nonNegative(bom.rows, 0),
        bomQty: nonNegative(bom.qty, 0),
        quoteItems: nonNegative(quoteItem.rows, 0),
        warehouseRows: nonNegative(warehouse.rows, 0),
        deficitRows: Math.max(nonNegative(bom.deficitRows, 0), nonNegative(warehouse.deficitRows, 0), nonNegative(quoteItem.deficitRows, 0)),
        subrentRows: Math.max(nonNegative(bom.subrentRows, 0), nonNegative(warehouse.subrentRows, 0), nonNegative(quoteItem.subrentRows, 0)),
        unmatchedRows: Math.max(nonNegative(bom.unmatchedRows, 0), nonNegative(warehouse.unmatchedRows, 0), nonNegative(quoteItem.unmatchedRows, 0))
      };
      row.flowStatus = getFlowStatus(row);
      row.flowLabel = getFlowLabel(row.flowStatus);
      row.ok = row.flowStatus === 'linked' || row.flowStatus === 'linked_with_warnings' || row.flowStatus === 'idle';
      return row;
    });
  }

  function collectBomRows(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    let rows = [];
    if (sharedBomBridge() && sharedBomBridge().collectQuoteBomRows) {
      rows = sharedBomBridge().collectQuoteBomRows(q, { sectionKey: opts.sectionKey, enrichAvailability: false });
    } else {
      const sections = q.sections || {};
      const keys = opts.sectionKey ? [opts.sectionKey] : ['stage', 'truss', 'led', 'equipment'];
      const out = [];
      keys.forEach(key => {
        const section = sections[key];
        if (!section) return;
        const sectionRows = Array.isArray(section.bomRows) ? section.bomRows : Array.isArray(section.items) ? section.items : [];
        sectionRows.forEach(row => out.push(normalizeBomRow(row, key, section)));
      });
      rows = out;
    }
    rows = rows.filter(row => row.qty > 0 || row.weightKg > 0 || row.powerW > 0 || row.startupPowerW > 0);
    return availability() && availability().enrichBomRows ? availability().enrichBomRows(rows) : rows;
  }

  function normalizeBomRow(row, sectionKey, section) {
    const src = row || {};
    return {
      sectionKey,
      sectionTitle: section && section.title || SECTION_TITLES[sectionKey] || sectionKey,
      id: toText(src.id || src.itemId || src.code || src.name),
      itemId: toText(src.itemId),
      code: toText(src.code || src.id || src.itemId),
      name: toText(src.name || src.label || src.title || src.code || 'Позиция'),
      qty: nonNegative(src.qty == null ? src.count : src.qty, 0),
      unit: toText(src.unit || 'шт') || 'шт',
      weightKg: nonNegative(src.weightKg == null ? src.weight : src.weightKg, 0),
      powerW: nonNegative(src.powerW, 0),
      startupPowerW: nonNegative(src.startupPowerW, 0),
      meters: nonNegative(src.meters, 0),
      trussLengthM: nonNegative(src.trussLengthM == null ? src.truss_length_m : src.trussLengthM, 0),
      trussStraightCount: nonNegative(src.trussStraightCount == null ? src.truss_straight_count : src.trussStraightCount, 0),
      stageHeightM: nonNegative(src.stageHeightM == null ? (src.stage_height_m == null ? (section && (section.stageHeightM || (section.result && section.result.stageHeightM))) : src.stage_height_m) : src.stageHeightM, 0),
      sourceType: toText(src.sourceType || 'own') || 'own',
      supplierName: toText(src.supplierName),
      supplierId: toText(src.supplierId || src.supplier_id),
      subrentPrice: nonNegative(src.subrentPrice == null ? src.subrent_price : src.subrentPrice, 0),
      clientPrice: nonNegative(src.clientPrice == null ? src.client_price : src.clientPrice, 0),
      margin: nonNegative(src.margin, 0),
      availableQty: src.availableQty == null ? null : nonNegative(src.availableQty, 0),
      stockQty: src.stockQty == null ? null : nonNegative(src.stockQty, 0),
      reservedQty: src.reservedQty == null ? null : nonNegative(src.reservedQty, 0),
      requestedQty: nonNegative(src.requestedQty == null ? (src.qty == null ? src.count : src.qty) : src.requestedQty, 0),
      deficitQty: nonNegative(src.deficitQty, 0),
      subrentQty: nonNegative(src.subrentQty, 0),
      inventoryStatus: toText(src.inventoryStatus),
      inventoryItemId: toText(src.inventoryItemId),
      ok: src.ok !== false && nonNegative(src.deficitQty, 0) <= 0,
      note: toText(src.note || src.notes)
    };
  }

  function buildFinalSummary(quote) {
    const q = normalizeQuote(quote);
    const summary = model() && model().summarizeQuote ? model().summarizeQuote(q) : { totals: q.totals || {} };
    const validation = model() && model().validateQuote ? model().validateQuote(q) : { ok: true, errors: [] };
    return {
      version: SUMMARY_VERSION,
      quote: q,
      totals: clone(summary.totals || q.totals || {}),
      transport: clone(summary.transport || q.transport || {}),
      sectionRows: getSectionRows(q),
      sectionStatusRows: getSectionStatusRows(q),
      customerRows: getCustomerEstimateRows(q),
      technicalRows: getTechnicalSummaryRows(q),
      crewRows: getCrewTechnicalRows(q),
      flowRows: buildFlowDiagnosticRows(q),
      bomRows: collectBomRows(q),
      validation,
      warnings: buildWarnings(q, validation),
      builtAt: new Date().toISOString()
    };
  }

  function buildWarnings(quote, validation) {
    const q = normalizeQuote(quote);
    const warnings = [];
    (validation && validation.errors || []).forEach(row => warnings.push({ type: 'validation', message: row.message || String(row) }));
    getSectionStatusRows(q).forEach(row => {
      if (!row.ok) warnings.push({ type: 'section', sectionKey: row.key, message: `${row.title}: ${row.label}` });
    });
    collectBomRows(q).forEach(row => {
      if (row.deficitQty > 0) warnings.push({ type: 'deficit', sectionKey: row.sectionKey, message: `${row.name}: дефицит ${row.deficitQty} ${row.unit}` });
      if (row.inventoryStatus === 'unmatched') warnings.push({ type: 'inventory', sectionKey: row.sectionKey, message: `${row.name}: нет сопоставления с базой оборудования` });
      if ((row.sourceType === 'subrent' || row.subrentQty > 0) && !row.supplierName) warnings.push({ type: 'subrent', sectionKey: row.sectionKey, message: `${row.name}: не указан поставщик субаренды` });
    });
    return warnings;
  }

  ROOT.QuoteSummaryBuilder = {
    SUMMARY_VERSION,
    SECTION_TITLES,
    normalizeQuote,
    getSectionRows,
    getConfiguredSectionRows,
    getSectionStatusRows,
    getCustomerEstimateRows,
    getCrewCustomerRows,
    getCrewTechnicalRows,
    getTechnicalSummaryRows,
    collectBomRows,
    buildFlowDiagnosticRows,
    normalizeBomRow,
    buildFinalSummary
  };
})();
