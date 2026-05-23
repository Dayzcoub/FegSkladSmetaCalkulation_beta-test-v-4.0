(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function esc(value) {
    const div = GLOBAL.document.createElement('div');
    div.textContent = String(value == null ? '' : value);
    return div.innerHTML;
  }

  function attr(value) { return esc(value).replace(/"/g, '&quot;'); }
  function txt(value) { return String(value == null ? '' : value).trim(); }
  function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }

  function money(value) {
    const n = num(value);
    return n ? n.toLocaleString('ru-RU') + ' ₽' : '0 ₽';
  }

  function qty(value) {
    const n = num(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }

  function itemLabel(item) {
    if (!item) return '';
    return item.code ? `${item.code} — ${item.name}` : item.name;
  }

  function categoryLabel(key) {
    return ({
      sound_pa: 'Звук ПА', consoles: 'Пульты', monitoring: 'Мониторинг', backline: 'Бэклайн',
      light: 'Свет', services: 'Услуги', commutation: 'Коммутация', consumables: 'Расходники', other: 'Другое'
    })[key] || key || 'Другое';
  }

  function getItems(panel) {
    const oldRows = Array.from(panel.querySelectorAll('.v4-equipment-group [data-quote-equipment-choice]'));
    const oldCategories = Array.from(new Set(oldRows.map(input => txt(input.getAttribute('data-quote-equipment-category'))).filter(Boolean)));
    let list = [];
    try {
      if (ROOT.EquipmentDatabase && ROOT.EquipmentDatabase.getStoredItemsOrDemo) list = ROOT.EquipmentDatabase.getStoredItemsOrDemo();
    } catch (_) { list = []; }
    list = Array.isArray(list) ? list.filter(item => item && item.isActive !== false) : [];
    if (oldCategories.length) list = list.filter(item => oldCategories.includes(item.category));
    return list;
  }

  function getSubrentors() {
    try {
      const dir = ROOT.SupplierDirectory;
      if (!dir) return [];
      if (dir.listSubrentors) return dir.listSubrentors({ onlyActive: true }) || [];
      if (dir.listSuppliers) return dir.listSuppliers({ type: 'subrent', onlyActive: true }) || [];
    } catch (_) {}
    return [];
  }

  function supplierName(id, fallback) {
    if (!id) return fallback || '';
    try {
      const supplier = ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(id) : null;
      return supplier && supplier.name ? supplier.name : (fallback || id);
    } catch (_) { return fallback || id; }
  }

  function findItem(items, value) {
    const needle = txt(value).toLowerCase();
    if (!needle) return null;
    return items.find(item => item.id === value || item.code === value)
      || items.find(item => itemLabel(item).toLowerCase() === needle)
      || items.find(item => txt(item.code).toLowerCase() === needle || txt(item.name).toLowerCase() === needle)
      || items.find(item => itemLabel(item).toLowerCase().includes(needle));
  }

  function captureLegacyRows(panel, items) {
    const out = [];
    panel.querySelectorAll('.v4-equipment-group [data-quote-equipment-smart-row]').forEach(row => {
      const choice = row.querySelector('[data-quote-equipment-choice]');
      const qtyInput = row.querySelector('[data-quote-equipment-qty]');
      const item = findItem(items, choice && choice.value);
      const requestedQty = num(qtyInput && qtyInput.value);
      if (!item || requestedQty <= 0 || row.classList.contains('is-empty')) return;
      const supplierSelect = row.querySelector('[data-quote-equipment-linked-subrent-supplier-id]');
      const supplierId = txt(supplierSelect && supplierSelect.value);
      const supplierHidden = row.querySelector('[data-quote-equipment-linked-subrent-supplier]');
      out.push({
        itemId: item.id,
        qty: requestedQty,
        supplierId,
        supplierName: supplierName(supplierId, txt(supplierHidden && supplierHidden.value)),
        subrentPrice: num(row.querySelector('[data-quote-equipment-linked-subrent-price]') && row.querySelector('[data-quote-equipment-linked-subrent-price]').value),
        clientPrice: num(row.querySelector('[data-quote-equipment-linked-client-price]') && row.querySelector('[data-quote-equipment-linked-client-price]').value) || num(item.rentalPrice)
      });
    });
    return dedupeRows(out);
  }

  function captureManualRows(panel) {
    const rows = [];
    panel.querySelectorAll('.v4-manual-equipment-list [data-quote-equipment-manual-row]').forEach(row => {
      const get = key => row.querySelector(`[data-quote-equipment-manual-field="${key}"]`);
      const name = txt(get('name') && get('name').value);
      const quantity = num(get('qty') && get('qty').value);
      if (!name && quantity <= 0) return;
      rows.push({
        name,
        qty: quantity || 1,
        unit: txt(get('unit') && get('unit').value) || 'шт',
        rentalPrice: num(get('rentalPrice') && get('rentalPrice').value),
        clientPrice: num(get('clientPrice') && get('clientPrice').value),
        subrentPrice: num(get('subrentPrice') && get('subrentPrice').value),
        weightKg: num(get('weightKg') && get('weightKg').value),
        powerW: num(get('powerW') && get('powerW').value),
        sourceType: txt(get('sourceType') && get('sourceType').value) || 'manual',
        supplierName: txt(get('supplierName') && get('supplierName').value),
        note: txt(get('note') && get('note').value)
      });
    });
    return rows;
  }

  function dedupeRows(rows) {
    const map = new Map();
    (rows || []).forEach(row => {
      if (!row || !row.itemId) return;
      map.set(row.itemId, Object.assign({}, map.get(row.itemId) || {}, row));
    });
    return Array.from(map.values());
  }

  function disableLegacy(panel) {
    panel.querySelectorAll(':scope > .v4-equipment-group, :scope > .v4-kicker, :scope > .v4-manual-equipment-list, :scope > .v4-equipment-compact-list').forEach(node => {
      if (node.hasAttribute('data-packit-compact-root')) return;
      node.classList.add('packit-equipment-legacy-hidden');
    });
    panel.querySelectorAll('.packit-equipment-legacy-hidden [data-quote-equipment-smart-row]').forEach(row => {
      if (!row.hasAttribute('data-packit-legacy-smart-row')) row.setAttribute('data-packit-legacy-smart-row', row.getAttribute('data-quote-equipment-smart-row') || '');
      row.removeAttribute('data-quote-equipment-smart-row');
    });
    panel.querySelectorAll('.packit-equipment-legacy-hidden [data-quote-equipment-manual-row]').forEach(row => {
      if (!row.hasAttribute('data-packit-legacy-manual-row')) row.setAttribute('data-packit-legacy-manual-row', row.getAttribute('data-quote-equipment-manual-row') || '');
      row.removeAttribute('data-quote-equipment-manual-row');
    });
  }

  function renderSupplierOptions(selectedId, selectedName) {
    const rows = getSubrentors();
    const selected = txt(selectedId);
    const legacy = selected && !rows.some(row => row.id === selected) ? `<option value="${attr(selected)}" selected>${esc(selectedName || selected)}</option>` : '';
    return `<option value="">Выбрать субарендатора</option>${legacy}${rows.map(row => `<option value="${attr(row.id)}" ${row.id === selected ? 'selected' : ''}>${esc(row.name || row.id)}</option>`).join('')}`;
  }

  function rowStatus(row, item) {
    const available = Math.max(0, num(item && (item.availableQty == null ? item.stockQty : item.availableQty)));
    const requested = Math.max(0, num(row.qty));
    const deficit = Math.max(0, requested - available);
    return { available, requested, stock: Math.min(requested, available), deficit, subrent: deficit };
  }

  function renderHiddenState(panel, rows, manualRows, items) {
    const state = panel.querySelector('[data-packit-equipment-state]') || GLOBAL.document.createElement('div');
    state.setAttribute('data-packit-equipment-state', 'true');
    state.hidden = true;
    state.innerHTML = rows.map(row => {
      const item = items.find(x => x.id === row.itemId);
      if (!item) return '';
      return `<div class="v4-equipment-smart-row is-selected" data-quote-equipment-smart-row="${attr(item.category)}">
        <input data-quote-equipment-choice data-quote-equipment-category="${attr(item.category)}" value="${attr(itemLabel(item))}">
        <input data-quote-equipment-qty value="${attr(row.qty)}">
        <select data-quote-equipment-linked-subrent-supplier-id>${renderSupplierOptions(row.supplierId, row.supplierName)}</select>
        <input data-quote-equipment-linked-subrent-supplier value="${attr(row.supplierName || '')}">
        <input data-quote-equipment-linked-subrent-price value="${attr(row.subrentPrice || '')}">
        <input data-quote-equipment-linked-client-price value="${attr(row.clientPrice || item.rentalPrice || '')}">
      </div>`;
    }).join('') + manualRows.map((row, index) => `<div data-quote-equipment-manual-row="${index}">
        <input data-quote-equipment-manual-field="name" value="${attr(row.name)}">
        <input data-quote-equipment-manual-field="qty" value="${attr(row.qty)}">
        <input data-quote-equipment-manual-field="unit" value="${attr(row.unit || 'шт')}">
        <input data-quote-equipment-manual-field="rentalPrice" value="${attr(row.rentalPrice || 0)}">
        <input data-quote-equipment-manual-field="clientPrice" value="${attr(row.clientPrice || 0)}">
        <input data-quote-equipment-manual-field="subrentPrice" value="${attr(row.subrentPrice || 0)}">
        <input data-quote-equipment-manual-field="margin" value="0">
        <input data-quote-equipment-manual-field="weightKg" value="${attr(row.weightKg || 0)}">
        <input data-quote-equipment-manual-field="powerW" value="${attr(row.powerW || 0)}">
        <input data-quote-equipment-manual-field="supplierName" value="${attr(row.supplierName || '')}">
        <input data-quote-equipment-manual-field="note" value="${attr(row.note || '')}">
        <select data-quote-equipment-manual-field="sourceType"><option value="manual" ${row.sourceType !== 'subrent' ? 'selected' : ''}>manual</option><option value="subrent" ${row.sourceType === 'subrent' ? 'selected' : ''}>subrent</option></select>
      </div>`).join('');
    if (!state.parentNode) panel.appendChild(state);
  }

  function renderCompact(panel, rows, manualRows, items) {
    const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean))).sort();
    const root = panel.querySelector('[data-packit-equipment-compact-root]') || GLOBAL.document.createElement('div');
    root.className = 'packit-equipment-compact-root';
    root.setAttribute('data-packit-equipment-compact-root', 'true');
    root.innerHTML = `<section class="packit-equipment-addbar">
        <label>Раздел<select data-packit-eq-category><option value="">Все разделы</option>${categories.map(cat => `<option value="${attr(cat)}">${esc(categoryLabel(cat))}</option>`).join('')}</select></label>
        <label class="packit-equipment-search-wrap">Поиск позиции / код<input data-packit-eq-search autocomplete="off" placeholder="Shure, SM58, BKL..."><div class="packit-equipment-search-menu" data-packit-eq-menu hidden></div></label>
        <label>Кол-во<input data-packit-eq-qty type="number" min="1" step="1" value="1"></label>
        <button type="button" class="btn-primary" data-packit-eq-add>+ Добавить</button>
      </section>
      <section class="packit-equipment-table-card">
        <div class="packit-equipment-table-head"><b>Выбранные позиции</b><span>${rows.length} поз. · ручные ${manualRows.length}</span></div>
        ${renderTable(rows, manualRows, items)}
        <div class="packit-equipment-manual-actions"><button type="button" class="btn-secondary" data-packit-manual-toggle>+ Ручная позиция без базы</button></div>
        <div class="packit-equipment-manual-editor" data-packit-manual-editor hidden>${renderManualEditor()}</div>
      </section>`;
    if (!root.parentNode) panel.insertBefore(root, panel.querySelector(':scope > .v4-summary-grid') || panel.firstChild);
    bindCompact(root, panel, items);
  }

  function renderTable(rows, manualRows, items) {
    if (!rows.length && !manualRows.length) return '<div class="v4-note">Позиции пока не выбраны. Найди позицию сверху, укажи количество и нажми «Добавить».</div>';
    const body = rows.map(row => {
      const item = items.find(x => x.id === row.itemId);
      if (!item) return '';
      const s = rowStatus(row, item);
      const source = s.deficit > 0 ? 'склад + субаренда' : 'склад';
      return `<div class="packit-equipment-row" data-packit-row="${attr(item.id)}">
        <div class="packit-equipment-name"><b>${esc(item.name)}</b><span>${esc(item.code || item.id)} · ${esc(item.subcategory || item.category || '')}</span></div>
        <label class="packit-equipment-qty"><span>Кол-во</span><input data-packit-row-qty type="number" min="0" step="1" value="${attr(row.qty)}"></label>
        <div class="packit-equipment-stat ok"><b>${qty(s.stock)}</b><span>склад</span></div>
        <div class="packit-equipment-stat ${s.deficit ? 'bad' : 'muted'}"><b>${qty(s.deficit)}</b><span>дефицит</span></div>
        <div class="packit-equipment-stat ${s.subrent ? 'warn' : 'muted'}"><b>${qty(s.subrent)}</b><span>субаренда</span></div>
        <div class="packit-equipment-price"><b>${money(row.clientPrice || item.rentalPrice)}</b><span>клиент/ед.</span></div>
        <div class="packit-equipment-source"><b>${esc(source)}</b><span>${esc(row.supplierName || '')}</span></div>
        <div class="packit-equipment-actions"><button type="button" data-packit-row-edit>✎</button><button type="button" data-packit-row-delete>🗑</button></div>
        ${s.deficit > 0 ? renderSubrentEditor(row, item, s) : ''}
      </div>`;
    }).join('');
    const manual = manualRows.map((row, index) => `<div class="packit-equipment-row is-manual" data-packit-manual-row-visible="${index}" data-packit-manual-payload="${attr(JSON.stringify(row))}">
      <div class="packit-equipment-name"><b>${esc(row.name)}</b><span>ручная позиция · ${esc(row.unit || 'шт')}</span></div>
      <div class="packit-equipment-stat"><b>${qty(row.qty)}</b><span>кол-во</span></div>
      <div class="packit-equipment-price"><b>${money(row.clientPrice || row.rentalPrice || row.subrentPrice)}</b><span>клиент</span></div>
      <div class="packit-equipment-source"><b>${esc(row.sourceType || 'ручная')}</b><span>${esc(row.supplierName || '')}</span></div>
      <div class="packit-equipment-actions"><button type="button" data-packit-manual-delete>🗑</button></div>
    </div>`).join('');
    return `<div class="packit-equipment-table">${body}${manual}</div>`;
  }

  function renderSubrentEditor(row, item, status) {
    return `<div class="packit-subrent-inline" data-packit-subrent-inline>
      <b>Добор субарендой</b>
      <label>Добрать<input data-packit-subrent-qty type="number" min="0" step="1" value="${attr(status.subrent)}" readonly></label>
      <label>Субарендатор<select data-packit-subrent-supplier>${renderSupplierOptions(row.supplierId, row.supplierName)}</select></label>
      <button type="button" class="btn-secondary btn-compact" data-packit-subrent-add>+ субарендатор</button>
      <label>Вход ₽<input data-packit-subrent-price type="number" min="0" step="100" value="${attr(row.subrentPrice || '')}"></label>
      <label>Клиент ₽<input data-packit-client-price type="number" min="0" step="100" value="${attr(row.clientPrice || item.rentalPrice || '')}"></label>
      <button type="button" class="btn-secondary btn-compact" data-packit-subrent-apply>Применить</button>
    </div>`;
  }

  function renderManualEditor() {
    return `<div class="packit-manual-inline">
      <label>Название<input data-packit-manual-name placeholder="Позиция вне базы"></label>
      <label>Кол-во<input data-packit-manual-qty type="number" min="1" step="1" value="1"></label>
      <label>Ед.<input data-packit-manual-unit value="шт"></label>
      <label>Цена клиенту<input data-packit-manual-client type="number" min="0" step="100" value="0"></label>
      <label>Вес<input data-packit-manual-weight type="number" min="0" step="0.1" value="0"></label>
      <label>Мощность<input data-packit-manual-power type="number" min="0" step="10" value="0"></label>
      <button type="button" class="btn-primary" data-packit-manual-add>Добавить</button>
    </div>`;
  }

  function save(panel) {
    renderHiddenState(panel, readRows(panel), readManualRows(panel), getItems(panel));
    const btn = panel.closest('[data-quote-form]') && panel.closest('[data-quote-form]').querySelector('[data-quote-bind-equipment]');
    if (btn) btn.click();
  }

  function readRows(panel) {
    const items = getItems(panel);
    const rows = [];
    panel.querySelectorAll('[data-packit-row]').forEach(node => {
      const itemId = node.getAttribute('data-packit-row');
      const item = items.find(x => x.id === itemId);
      if (!item) return;
      const supplier = node.querySelector('[data-packit-subrent-supplier]');
      rows.push({
        itemId,
        qty: num(node.querySelector('[data-packit-row-qty]') && node.querySelector('[data-packit-row-qty]').value),
        supplierId: txt(supplier && supplier.value),
        supplierName: supplierName(txt(supplier && supplier.value)),
        subrentPrice: num(node.querySelector('[data-packit-subrent-price]') && node.querySelector('[data-packit-subrent-price]').value),
        clientPrice: num(node.querySelector('[data-packit-client-price]') && node.querySelector('[data-packit-client-price]').value) || num(item.rentalPrice)
      });
    });
    return dedupeRows(rows.filter(row => row.qty > 0));
  }

  function readManualRows(panel) {
    const rows = [];
    panel.querySelectorAll('[data-packit-manual-row-visible]').forEach(node => {
      try {
        const payload = JSON.parse(node.getAttribute('data-packit-manual-payload') || '{}');
        if (payload && payload.name) rows.push(payload);
      } catch (_) {}
    });
    return rows;
  }

  function bindCompact(root, panel, items) {
    let selectedItem = null;
    const search = root.querySelector('[data-packit-eq-search]');
    const category = root.querySelector('[data-packit-eq-category]');
    const menu = root.querySelector('[data-packit-eq-menu]');
    const refreshMenu = () => {
      const q = txt(search.value).toLowerCase();
      const cat = category.value;
      const filtered = items.filter(item => (!cat || item.category === cat) && (!q || `${item.code} ${item.name} ${item.manufacturer} ${item.model}`.toLowerCase().includes(q))).slice(0, 14);
      menu.innerHTML = filtered.map(item => `<button type="button" data-packit-suggest="${attr(item.id)}"><b>${esc(item.name)}</b><span>${esc(item.code || item.id)} · ${esc(item.subcategory || item.category || '')} · доступно ${qty(item.availableQty == null ? item.stockQty : item.availableQty)} · ${money(item.rentalPrice)}</span></button>`).join('') || '<div class="packit-equipment-no-results">Нет совпадений</div>';
      menu.hidden = false;
    };
    search.addEventListener('input', () => { selectedItem = null; refreshMenu(); });
    search.addEventListener('focus', refreshMenu);
    category.addEventListener('change', refreshMenu);
    menu.addEventListener('mousedown', event => {
      const btn = event.target.closest('[data-packit-suggest]');
      if (!btn) return;
      event.preventDefault();
      selectedItem = items.find(item => item.id === btn.getAttribute('data-packit-suggest'));
      if (selectedItem) search.value = itemLabel(selectedItem);
      menu.hidden = true;
    });
    root.querySelector('[data-packit-eq-add]').addEventListener('click', () => {
      const item = selectedItem || findItem(items, search.value) || items.find(item => `${item.code} ${item.name}`.toLowerCase().includes(txt(search.value).toLowerCase()));
      if (!item) return;
      const rows = readRows(panel);
      const existing = rows.find(row => row.itemId === item.id);
      if (existing) existing.qty += Math.max(1, num(root.querySelector('[data-packit-eq-qty]').value));
      else rows.push({ itemId: item.id, qty: Math.max(1, num(root.querySelector('[data-packit-eq-qty]').value)), clientPrice: num(item.rentalPrice) });
      const manual = readManualRows(panel);
      renderHiddenState(panel, rows, manual, items);
      renderCompact(panel, rows, manual, items);
      save(panel);
    });
    root.addEventListener('change', event => {
      if (event.target.matches('[data-packit-row-qty], [data-packit-subrent-supplier], [data-packit-subrent-price], [data-packit-client-price]')) save(panel);
    });
    root.addEventListener('click', event => {
      const row = event.target.closest('[data-packit-row]');
      if (event.target.closest('[data-packit-row-delete]') && row) { row.remove(); save(panel); }
      if (event.target.closest('[data-packit-subrent-apply]')) save(panel);
      if (event.target.closest('[data-packit-subrent-add]') && row) addSubrentor(row, panel);
      if (event.target.closest('[data-packit-manual-toggle]')) root.querySelector('[data-packit-manual-editor]').hidden = !root.querySelector('[data-packit-manual-editor]').hidden;
      if (event.target.closest('[data-packit-manual-add]')) addManual(root, panel);
      if (event.target.closest('[data-packit-manual-delete]')) { const m = event.target.closest('[data-packit-manual-row-visible]'); if (m) m.remove(); save(panel); }
    });
  }

  function addSubrentor(row, panel) {
    if (!ROOT.SubrentorsDirectoryUI || !ROOT.SubrentorsDirectoryUI.openSubrentorModal) return;
    ROOT.SubrentorsDirectoryUI.openSubrentorModal({ onSave: saved => {
      const select = row.querySelector('[data-packit-subrent-supplier]');
      if (select && saved) {
        if (!Array.from(select.options).some(opt => opt.value === saved.id)) select.insertAdjacentHTML('beforeend', `<option value="${attr(saved.id)}">${esc(saved.name || saved.id)}</option>`);
        select.value = saved.id;
      }
      save(panel);
    }});
  }

  function addManual(root, panel) {
    const editor = root.querySelector('[data-packit-manual-editor]');
    const get = key => editor.querySelector(`[data-packit-manual-${key}]`);
    const name = txt(get('name') && get('name').value);
    if (!name) return;
    const manual = readManualRows(panel);
    manual.push({ name, qty: Math.max(1, num(get('qty') && get('qty').value)), unit: txt(get('unit') && get('unit').value) || 'шт', clientPrice: num(get('client') && get('client').value), weightKg: num(get('weight') && get('weight').value), powerW: num(get('power') && get('power').value), sourceType: 'manual' });
    const rows = readRows(panel);
    renderHiddenState(panel, rows, manual, getItems(panel));
    renderCompact(panel, rows, manual, getItems(panel));
    save(panel);
  }

  function enhance(root) {
    const scope = root && root.querySelectorAll ? root : GLOBAL.document;
    if (!scope) return;
    scope.querySelectorAll('[data-quote-equipment-panel]').forEach(panel => {
      if (panel.dataset.packitCompactEquipmentReady === 'true') return;
      const items = getItems(panel);
      const rows = captureLegacyRows(panel, items);
      const manualRows = captureManualRows(panel);
      disableLegacy(panel);
      renderHiddenState(panel, rows, manualRows, items);
      renderCompact(panel, rows, manualRows, items);
      panel.dataset.packitCompactEquipmentReady = 'true';
    });
  }

  function wrapQuoteWizardRender() {
    const wizard = ROOT.QuoteWizard;
    if (!wizard || !wizard.renderWizardMap || wizard.__packitEquipmentUiWrapped) return false;
    const original = wizard.renderWizardMap.bind(wizard);
    wizard.renderWizardMap = function wrappedRenderWizardMap(target, draft) {
      const result = original(target, draft);
      const targetRoot = result || (typeof target === 'string' ? GLOBAL.document.getElementById(target) : target);
      GLOBAL.requestAnimationFrame ? GLOBAL.requestAnimationFrame(() => enhance(targetRoot)) : GLOBAL.setTimeout(() => enhance(targetRoot), 0);
      return result;
    };
    wizard.__packitEquipmentUiWrapped = true;
    return true;
  }

  function init() {
    wrapQuoteWizardRender();
    enhance(GLOBAL.document);
  }

  ROOT.QuoteEquipmentUiController = { version: '2.0.0', init, enhance };
  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  GLOBAL.setTimeout(init, 250);
})();
