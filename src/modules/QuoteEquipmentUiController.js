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
  function num(value) {
    const cleaned = typeof value === 'string' ? value.replace(/[^0-9.,-]/g, '').replace(',', '.') : value;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  function money(value) {
    const n = num(value);
    return n ? n.toLocaleString('ru-RU') + ' ₽' : '0 ₽';
  }
  function qty(value) {
    const n = num(value);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }
  function itemLabel(item) { return item && item.code ? `${item.code} — ${item.name}` : (item && item.name) || ''; }
  function categoryLabel(key) {
    return ({
      sound_pa: 'Звук ПА', consoles: 'Пульты', monitoring: 'Мониторинг', backline: 'Бэклайн',
      light: 'Свет', services: 'Услуги', commutation: 'Коммутация', consumables: 'Расходники', other: 'Другое'
    })[key] || key || 'Другое';
  }

  function injectStyles() {
    if (!GLOBAL.document || GLOBAL.document.getElementById('packit-equipment-live-style')) return;
    const style = GLOBAL.document.createElement('style');
    style.id = 'packit-equipment-live-style';
    style.textContent = [
      'body.v4-only-body .packit-live-summary-card{display:grid;gap:2px;padding:8px 10px;border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface)}',
      'body.v4-only-body .packit-live-summary-card b{font-size:18px;line-height:1;color:var(--text-strong)}',
      'body.v4-only-body .packit-live-summary-card span{font-size:9px;text-transform:uppercase;color:var(--muted);letter-spacing:.04em}',
      'body.v4-only-body .packit-live-summary-card.ok b{color:var(--success)}',
      'body.v4-only-body .packit-live-summary-card.bad b{color:var(--danger)}',
      'body.v4-only-body .packit-live-summary-card.warn b{color:var(--warning,#f59e0b)}'
    ].join('\n');
    GLOBAL.document.head.appendChild(style);
  }

  function getItems(panel) {
    const legacyRows = Array.from(panel.querySelectorAll('.v4-equipment-group [data-quote-equipment-choice]'));
    const legacyCategories = Array.from(new Set(legacyRows.map(input => txt(input.getAttribute('data-quote-equipment-category'))).filter(Boolean)));
    let list = [];
    try {
      if (ROOT.EquipmentDatabase && ROOT.EquipmentDatabase.getStoredItemsOrDemo) list = ROOT.EquipmentDatabase.getStoredItemsOrDemo();
    } catch (_) { list = []; }
    list = Array.isArray(list) ? list.filter(item => item && item.isActive !== false) : [];
    return legacyCategories.length ? list.filter(item => legacyCategories.includes(item.category)) : list;
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
    const safeId = txt(id);
    if (!safeId) return fallback || '';
    try {
      const supplier = ROOT.SupplierDirectory && ROOT.SupplierDirectory.findSupplier ? ROOT.SupplierDirectory.findSupplier(safeId) : null;
      return supplier && supplier.name ? supplier.name : (fallback || safeId);
    } catch (_) { return fallback || safeId; }
  }
  function findItem(items, value) {
    const needle = txt(value).toLowerCase();
    if (!needle) return null;
    return items.find(item => item.id === value || item.code === value)
      || items.find(item => itemLabel(item).toLowerCase() === needle)
      || items.find(item => txt(item.code).toLowerCase() === needle || txt(item.name).toLowerCase() === needle)
      || items.find(item => itemLabel(item).toLowerCase().includes(needle));
  }
  function dedupeRows(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach(row => {
      if (!row || !row.itemId) return;
      map.set(row.itemId, Object.assign({}, map.get(row.itemId) || {}, row));
    });
    return Array.from(map.values());
  }
  function normalizeManualRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter(row => txt(row && row.name)).map(row => Object.assign({ qty: 1, unit: 'шт', sourceType: 'manual' }, row));
  }

  function rowStatus(row, item) {
    const available = Math.max(0, num(item && (item.availableQty == null ? item.stockQty : item.availableQty)));
    const requested = Math.max(0, num(row && row.qty));
    const deficit = Math.max(0, requested - available);
    return { available, requested, stock: Math.min(requested, available), deficit, subrent: deficit };
  }

  function renderSupplierOptions(selectedId, selectedName) {
    const rows = getSubrentors();
    const selected = txt(selectedId);
    const legacy = selected && !rows.some(row => row.id === selected)
      ? `<option value="${attr(selected)}" selected>${esc(selectedName || selected)}</option>` : '';
    return `<option value="">Выбрать субарендатора</option>${legacy}${rows.map(row => `<option value="${attr(row.id)}" ${row.id === selected ? 'selected' : ''}>${esc(row.name || row.id)}</option>`).join('')}`;
  }

  function captureLegacyRows(panel, items) {
    const out = [];
    panel.querySelectorAll('.v4-equipment-group [data-quote-equipment-smart-row], [data-packit-equipment-state] [data-quote-equipment-smart-row]').forEach(row => {
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
    panel.querySelectorAll('.v4-manual-equipment-list [data-quote-equipment-manual-row], [data-packit-equipment-state] [data-quote-equipment-manual-row]').forEach(row => {
      const get = key => row.querySelector(`[data-quote-equipment-manual-field="${key}"]`);
      const name = txt(get('name') && get('name').value);
      if (!name) return;
      rows.push({
        name,
        qty: Math.max(1, num(get('qty') && get('qty').value) || 1),
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
    return normalizeManualRows(rows);
  }

  function disableLegacy(panel) {
    panel.querySelectorAll(':scope > .v4-equipment-group, :scope > .v4-kicker, :scope > .v4-manual-equipment-list, :scope > .v4-equipment-compact-list').forEach(node => {
      if (!node.hasAttribute('data-packit-compact-root')) node.classList.add('packit-equipment-legacy-hidden');
    });
  }

  function ensureState(panel) {
    if (panel.__packitEquipmentState) return panel.__packitEquipmentState;
    const items = getItems(panel);
    const rows = captureLegacyRows(panel, items);
    const manualRows = captureManualRows(panel);
    panel.__packitEquipmentState = { rows, manualRows, manualOpen: false, selectedItemId: '' };
    return panel.__packitEquipmentState;
  }

  function renderHiddenState(panel, rows, manualRows, items) {
    let state = panel.querySelector('[data-packit-equipment-state]');
    if (!state) {
      state = GLOBAL.document.createElement('div');
      state.setAttribute('data-packit-equipment-state', 'true');
      panel.appendChild(state);
    }
    state.hidden = true;
    const safeManualRows = normalizeManualRows(manualRows);
    state.innerHTML = dedupeRows(rows).map(row => {
      const item = items.find(x => x.id === row.itemId);
      if (!item) return '';
      return `<div class="v4-equipment-smart-row is-selected" data-quote-equipment-smart-row="${attr(item.category)}">
        <input data-quote-equipment-choice data-quote-equipment-category="${attr(item.category)}" value="${attr(itemLabel(item))}">
        <input data-quote-equipment-qty value="${attr(row.qty)}">
        <select data-quote-equipment-linked-subrent-supplier-id>${renderSupplierOptions(row.supplierId, row.supplierName)}</select>
        <input data-quote-equipment-linked-subrent-supplier value="${attr(row.supplierName || supplierName(row.supplierId) || '')}">
        <input data-quote-equipment-linked-subrent-price value="${attr(row.subrentPrice || '')}">
        <input data-quote-equipment-linked-client-price value="${attr(row.clientPrice || item.rentalPrice || '')}">
      </div>`;
    }).join('') + safeManualRows.map((row, index) => `<div data-quote-equipment-manual-row="${index}">
        <input data-quote-equipment-manual-field="name" value="${attr(row.name)}">
        <input data-quote-equipment-manual-field="qty" value="${attr(row.qty)}">
        <input data-quote-equipment-manual-field="unit" value="${attr(row.unit || 'шт')}">
        <input data-quote-equipment-manual-field="rentalPrice" value="${attr(row.rentalPrice || row.clientPrice || 0)}">
        <input data-quote-equipment-manual-field="clientPrice" value="${attr(row.clientPrice || row.rentalPrice || 0)}">
        <input data-quote-equipment-manual-field="subrentPrice" value="${attr(row.subrentPrice || 0)}">
        <input data-quote-equipment-manual-field="margin" value="0">
        <input data-quote-equipment-manual-field="weightKg" value="${attr(row.weightKg || 0)}">
        <input data-quote-equipment-manual-field="powerW" value="${attr(row.powerW || 0)}">
        <input data-quote-equipment-manual-field="supplierName" value="${attr(row.supplierName || '')}">
        <input data-quote-equipment-manual-field="note" value="${attr(row.note || '')}">
        <select data-quote-equipment-manual-field="sourceType"><option value="manual" ${row.sourceType !== 'subrent' ? 'selected' : ''}>manual</option><option value="subrent" ${row.sourceType === 'subrent' ? 'selected' : ''}>subrent</option></select>
      </div>`).join('');
  }

  function renderPanel(panel, options) {
    const opts = options || {};
    injectStyles();
    disableLegacy(panel);
    const state = ensureState(panel);
    const items = getItems(panel);
    state.rows = dedupeRows(state.rows).filter(row => items.some(item => item.id === row.itemId));
    state.manualRows = normalizeManualRows(state.manualRows);
    renderHiddenState(panel, state.rows, state.manualRows, items);

    const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean))).sort();
    const oldRoot = panel.querySelector('[data-packit-equipment-compact-root]');
    const root = GLOBAL.document.createElement('div');
    root.className = 'packit-equipment-compact-root';
    root.setAttribute('data-packit-equipment-compact-root', 'true');
    root.innerHTML = `<section class="packit-equipment-addbar">
        <label>Раздел<select data-packit-eq-category><option value="">Все разделы</option>${categories.map(cat => `<option value="${attr(cat)}">${esc(categoryLabel(cat))}</option>`).join('')}</select></label>
        <label class="packit-equipment-search-wrap">Поиск позиции / код<input data-packit-eq-search autocomplete="off" placeholder="Shure, SM58, BKL..."><div class="packit-equipment-search-menu" data-packit-eq-menu hidden></div></label>
        <label>Кол-во<input data-packit-eq-qty type="number" min="1" step="1" value="1"></label>
        <button type="button" class="btn-primary" data-packit-eq-add>+ Добавить</button>
      </section>
      <section class="packit-equipment-table-card">
        <div class="packit-equipment-table-head"><b>Выбранные позиции</b><span>${state.rows.length} поз. · ручные ${state.manualRows.length}</span></div>
        ${renderTable(state, items)}
        <div class="packit-equipment-manual-actions"><button type="button" class="btn-secondary" data-packit-manual-toggle>+ Ручная позиция без базы</button></div>
        <div class="packit-equipment-manual-editor" data-packit-manual-editor ${state.manualOpen ? '' : 'hidden'}>${renderManualEditor()}</div>
      </section>`;
    if (oldRoot) oldRoot.replaceWith(root);
    else panel.insertBefore(root, panel.querySelector(':scope > .v4-summary-grid') || panel.firstChild);
    bindCompact(root, panel, items);
    updateLiveSummary(panel, state.rows, state.manualRows, items);
    if (opts.commit) commitHidden(panel);
  }

  function renderTable(state, items) {
    const rows = state.rows || [];
    const manualRows = state.manualRows || [];
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
        <div class="packit-equipment-source"><b>${esc(source)}</b><span>${esc(row.supplierName || supplierName(row.supplierId) || '')}</span></div>
        <div class="packit-equipment-actions"><button type="button" data-packit-row-delete title="Удалить">🗑</button></div>
        ${s.deficit > 0 ? renderSubrentEditor(row, item, s) : ''}
      </div>`;
    }).join('');
    const manual = manualRows.map((row, index) => `<div class="packit-equipment-row is-manual" data-packit-manual-row-visible="${index}">
      <div class="packit-equipment-name"><b>${esc(row.name)}</b><span>ручная позиция · ${esc(row.unit || 'шт')}</span></div>
      <div class="packit-equipment-stat"><b>${qty(row.qty)}</b><span>кол-во</span></div>
      <div class="packit-equipment-price"><b>${money(row.clientPrice || row.rentalPrice || row.subrentPrice)}</b><span>клиент</span></div>
      <div class="packit-equipment-source"><b>${esc(row.sourceType || 'ручная')}</b><span>${esc(row.supplierName || '')}</span></div>
      <div class="packit-equipment-actions"><button type="button" data-packit-manual-delete title="Удалить">🗑</button></div>
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

  function updateLiveSummary(panel, rows, manualRows, items) {
    const summary = panel.querySelector(':scope > .v4-summary-grid');
    if (!summary) return;
    const stats = (rows || []).reduce((acc, row) => {
      const item = items.find(x => x.id === row.itemId);
      if (!item) return acc;
      const s = rowStatus(row, item);
      if (s.deficit > 0) {
        acc.deficitRows += 1;
        acc.deficitQty += s.deficit;
        acc.subrentQty += s.subrent;
      } else {
        acc.stockOkRows += 1;
      }
      return acc;
    }, { stockOkRows: 0, deficitRows: 0, deficitQty: 0, subrentQty: 0 });
    const manualCount = normalizeManualRows(manualRows).length;
    summary.innerHTML = `<div class="packit-live-summary-card ok"><b>${qty(stats.stockOkRows)}</b><span>склад OK</span></div>
      <div class="packit-live-summary-card bad"><b>${qty(stats.deficitRows)}</b><span>дефицит · ${qty(stats.deficitQty)} шт</span></div>
      <div class="packit-live-summary-card warn"><b>${qty(stats.subrentQty)}</b><span>субаренда</span></div>
      ${manualCount ? `<div class="packit-live-summary-card"><b>${qty(manualCount)}</b><span>ручные</span></div>` : ''}`;
  }
  function commitHidden(panel) {
    const btn = panel.closest('[data-quote-form]') && panel.closest('[data-quote-form]').querySelector('[data-quote-bind-equipment]');
    if (btn) btn.click();
  }
  function commitAndRender(panel) {
    renderPanel(panel, { commit: true });
  }

  function bindCompact(root, panel, items) {
    const state = ensureState(panel);
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
      const addQty = Math.max(1, num(root.querySelector('[data-packit-eq-qty]').value) || 1);
      const existing = state.rows.find(row => row.itemId === item.id);
      if (existing) existing.qty += addQty;
      else state.rows.push({ itemId: item.id, qty: addQty, clientPrice: num(item.rentalPrice) });
      search.value = '';
      selectedItem = null;
      commitAndRender(panel);
    });
    root.addEventListener('input', event => {
      const rowEl = event.target.closest('[data-packit-row]');
      if (!rowEl) return;
      updateRowFromDom(state, rowEl);
      updateLiveSummary(panel, state.rows, state.manualRows, items);
      clearTimeout(panel.__packitLiveCommitTimer);
      panel.__packitLiveCommitTimer = GLOBAL.setTimeout(() => commitAndRender(panel), 350);
    });
    root.addEventListener('change', event => {
      const rowEl = event.target.closest('[data-packit-row]');
      if (!rowEl) return;
      updateRowFromDom(state, rowEl);
      commitAndRender(panel);
    });
    root.addEventListener('click', event => {
      const rowEl = event.target.closest('[data-packit-row]');
      if (event.target.closest('[data-packit-row-delete]') && rowEl) {
        state.rows = state.rows.filter(row => row.itemId !== rowEl.getAttribute('data-packit-row'));
        commitAndRender(panel);
      }
      if (event.target.closest('[data-packit-subrent-apply]') && rowEl) {
        updateRowFromDom(state, rowEl);
        commitAndRender(panel);
      }
      if (event.target.closest('[data-packit-subrent-add]') && rowEl) addSubrentor(rowEl, panel);
      if (event.target.closest('[data-packit-manual-toggle]')) {
        state.manualOpen = !state.manualOpen;
        renderPanel(panel);
      }
      if (event.target.closest('[data-packit-manual-add]')) addManual(root, panel);
      if (event.target.closest('[data-packit-manual-delete]')) {
        const m = event.target.closest('[data-packit-manual-row-visible]');
        const idx = m ? Number(m.getAttribute('data-packit-manual-row-visible')) : -1;
        if (idx >= 0) state.manualRows.splice(idx, 1);
        commitAndRender(panel);
      }
    });
  }

  function updateRowFromDom(state, rowEl) {
    const itemId = rowEl.getAttribute('data-packit-row');
    const row = state.rows.find(x => x.itemId === itemId);
    if (!row) return;
    const supplier = rowEl.querySelector('[data-packit-subrent-supplier]');
    row.qty = Math.max(0, num(rowEl.querySelector('[data-packit-row-qty]') && rowEl.querySelector('[data-packit-row-qty]').value));
    row.supplierId = txt(supplier && supplier.value);
    row.supplierName = supplierName(row.supplierId);
    row.subrentPrice = num(rowEl.querySelector('[data-packit-subrent-price]') && rowEl.querySelector('[data-packit-subrent-price]').value);
    row.clientPrice = num(rowEl.querySelector('[data-packit-client-price]') && rowEl.querySelector('[data-packit-client-price]').value) || row.clientPrice;
  }

  function addSubrentor(rowEl, panel) {
    if (ROOT.SubrentorsDirectoryUI && ROOT.SubrentorsDirectoryUI.openSubrentorModal) {
      ROOT.SubrentorsDirectoryUI.openSubrentorModal({ onSave: saved => chooseNewSubrentor(saved, rowEl, panel) });
      return;
    }
    const name = GLOBAL.prompt ? GLOBAL.prompt('Название субарендатора') : '';
    if (!txt(name)) return;
    let saved = { id: `sub-${Date.now().toString(36)}`, name: txt(name) };
    try {
      if (ROOT.SupplierDirectory && ROOT.SupplierDirectory.upsertSubrentor) {
        const list = ROOT.SupplierDirectory.upsertSubrentor({ name: txt(name), type: 'subrent' }) || [];
        saved = list.find(row => row.name === txt(name)) || saved;
      }
    } catch (_) {}
    chooseNewSubrentor(saved, rowEl, panel);
  }
  function chooseNewSubrentor(saved, rowEl, panel) {
    if (!saved) return;
    const state = ensureState(panel);
    const row = state.rows.find(x => x.itemId === rowEl.getAttribute('data-packit-row'));
    if (row) {
      row.supplierId = saved.id;
      row.supplierName = saved.name || saved.id;
    }
    commitAndRender(panel);
  }
  function addManual(root, panel) {
    const state = ensureState(panel);
    const editor = root.querySelector('[data-packit-manual-editor]');
    const get = key => editor.querySelector(`[data-packit-manual-${key}]`);
    const name = txt(get('name') && get('name').value);
    if (!name) return;
    state.manualRows.push({
      name,
      qty: Math.max(1, num(get('qty') && get('qty').value) || 1),
      unit: txt(get('unit') && get('unit').value) || 'шт',
      clientPrice: num(get('client') && get('client').value),
      weightKg: num(get('weight') && get('weight').value),
      powerW: num(get('power') && get('power').value),
      sourceType: 'manual'
    });
    state.manualOpen = false;
    commitAndRender(panel);
  }

  function enhance(root) {
    const scope = root && root.querySelectorAll ? root : GLOBAL.document;
    if (!scope) return;
    scope.querySelectorAll('[data-quote-equipment-panel]').forEach(panel => {
      if (panel.dataset.packitCompactEquipmentReady === 'true') return;
      injectStyles();
      disableLegacy(panel);
      ensureState(panel);
      renderPanel(panel);
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

  ROOT.QuoteEquipmentUiController = { version: '2.1.0', init, enhance };
  if (GLOBAL.document && GLOBAL.document.readyState === 'loading') GLOBAL.document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  GLOBAL.setTimeout(init, 250);
})();