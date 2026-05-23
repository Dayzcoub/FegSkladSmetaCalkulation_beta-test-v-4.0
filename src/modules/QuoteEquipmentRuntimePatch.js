(function () {
  'use strict';
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const FALLBACK_ITEMS = [
    row('qf-k2', 'sound_pa', 'SND-QF-001', 'L-Acoustics K2', 24, 2200, 56, 0, 'line array', 'sound'),
    row('qf-ks28', 'sound_pa', 'SND-QF-002', 'L-Acoustics KS28', 12, 2500, 79, 0, 'сабвуферы', 'sound'),
    row('qf-la12x', 'sound_pa', 'SND-QF-003', 'L-Acoustics LA12X', 10, 1200, 14.5, 1000, 'усилители', 'sound'),
    row('qf-sd12', 'consoles', 'MIX-QF-001', 'DiGiCo SD12', 1, 7500, 29, 300, 'микшерные пульты', 'audio_console'),
    row('qf-sm58', 'backline', 'BKL-QF-001', 'Shure SM58', 20, 250, 0.3, 0, 'микрофоны', 'backline'),
    row('qf-j48', 'backline', 'BKL-QF-002', 'Radial J48 DI', 8, 700, 0.7, 0, 'di-box', 'backline'),
    row('qf-xlr20', 'commutation', 'COM-QF-001', 'Кабель XLR 20 м', 30, 150, 1.2, 0, 'xlr', 'cable'),
    row('qf-pointe', 'light', 'LGT-QF-001', 'Robe Pointe', 16, 1800, 15, 470, 'beam', 'light_fixture'),
    row('qf-ledpar', 'light', 'LGT-QF-002', 'LED PAR RGBW', 24, 400, 3, 120, 'led par', 'light_fixture'),
    row('qf-sound-eng', 'services', 'SRV-QF-001', 'Звукорежиссёр', 12, 12000, 0, 0, 'звукорежиссёр', 'service', 'смена'),
    row('qf-light-eng', 'services', 'SRV-QF-002', 'Светорежиссёр', 12, 12000, 0, 0, 'светорежиссёр', 'service', 'смена')
  ];

  function row(id, category, code, name, stockQty, rentalPrice, weightKg, powerW, subcategory, type, unit) {
    return {
      id: id, category: category, subcategory: subcategory, type: type,
      code: code, name: name, manufacturer: 'PACK.IT fallback', model: '',
      unit: unit || 'шт', stockQty: stockQty, reservedQty: 0, availableQty: stockQty,
      weightKg: weightKg, powerW: powerW, startupPowerW: powerW,
      rentalPrice: rentalPrice, replacementCost: 0, isActive: true,
      sourceType: 'own', supplierId: '', supplierName: '', notes: 'local quote picker fallback'
    };
  }

  function patchPicker() {
    const picker = ROOT.QuoteEquipmentPicker;
    const db = ROOT.EquipmentDatabase;
    if (!picker || picker.__packitRuntimePatched || !picker.listPickerItems || !picker.getCategoriesForScope || !db || !db.normalizeItems) return false;
    const original = picker.listPickerItems.bind(picker);
    picker.listPickerItems = function (scope, inventoryItems) {
      const rows = original(scope, inventoryItems) || [];
      if (rows.length || inventoryItems) return rows;
      const categories = picker.getCategoriesForScope(scope || {});
      if (!categories.length) return rows;
      return db.normalizeItems(FALLBACK_ITEMS).filter(function (item) {
        return item.isActive !== false && categories.includes(item.category);
      });
    };
    picker.getFallbackItems = function () { return db.normalizeItems(FALLBACK_ITEMS); };
    picker.__packitRuntimePatched = true;
    return true;
  }

  function patchSoftRerender() {
    const storage = ROOT.QuoteDraftStorage;
    const wizard = ROOT.QuoteWizard;
    if (!storage || !wizard || storage.__packitEquipmentSoftRerender || !storage.saveDraft || !wizard.renderWizardMap) return false;
    const originalSaveDraft = storage.saveDraft.bind(storage);
    storage.saveDraft = function (draft, options) {
      const saved = originalSaveDraft(draft, options || {});
      try {
        if (saved && saved.wizard && saved.wizard.activeStep === 'equipment') {
          const source = String(options && options.source || '');
          if (source.indexOf('light-autosave') < 0) {
            GLOBAL.setTimeout(function () {
              const form = GLOBAL.document && GLOBAL.document.querySelector('[data-quote-form][data-quote-active-step="equipment"]');
              const mount = GLOBAL.document && GLOBAL.document.querySelector('[data-v4-main-content]');
              if (form && mount && ROOT.QuoteWizard && ROOT.QuoteWizard.renderWizardMap) {
                form.dataset.quoteActiveStep = '__force_equipment_rerender__';
                ROOT.QuoteWizard.renderWizardMap(mount, saved);
              }
            }, 0);
          }
        }
      } catch (err) {
        try { if (console && console.warn) console.warn('equipment rerender patch skipped', err); } catch (_) {}
      }
      return saved;
    };
    storage.__packitEquipmentSoftRerender = true;
    return true;
  }

  function ensureManualToggleStyles() {
    if (!GLOBAL.document || GLOBAL.document.getElementById('packit-equipment-manual-toggle-style')) return;
    const style = GLOBAL.document.createElement('style');
    style.id = 'packit-equipment-manual-toggle-style';
    style.textContent = [
      'body.v4-only-body .v4-equipment-manual-toggle-card{grid-column:2;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);}',
      'body.v4-only-body .v4-equipment-manual-toggle-card b{display:block;color:var(--text-strong);font-size:12px;}',
      'body.v4-only-body .v4-equipment-manual-toggle-card span{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35;}',
      'body.v4-only-body .v4-equipment-manual-toggle-check{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;color:var(--text-strong);font-size:11px;font-weight:700;}',
      'body.v4-only-body [data-packit-manual-hidden="true"]{display:none!important;}',
      'body.v4-only-body [data-packit-manual-kicker]{grid-column:2;margin-top:2px;}'
    ].join('\n');
    GLOBAL.document.head.appendChild(style);
  }

  function hasCommittedManualRows(list) {
    if (!list) return false;
    return Array.from(list.querySelectorAll('[data-quote-equipment-manual-row]')).some(function (row) {
      return !row.classList.contains('is-empty');
    });
  }

  function applyManualToggleState(panel, open) {
    const list = panel.querySelector('.v4-manual-equipment-list');
    if (!list) return;
    const kicker = list.previousElementSibling && list.previousElementSibling.classList && list.previousElementSibling.classList.contains('v4-kicker')
      ? list.previousElementSibling
      : null;
    if (kicker) {
      kicker.textContent = 'Ручные позиции без базы';
      kicker.setAttribute('data-packit-manual-kicker', 'true');
      kicker.setAttribute('data-packit-manual-hidden', open ? 'false' : 'true');
    }
    list.setAttribute('data-packit-manual-hidden', open ? 'false' : 'true');
    panel.dataset.packitManualOpen = open ? 'true' : 'false';
  }

  function patchManualToggle() {
    if (!GLOBAL.document) return false;
    ensureManualToggleStyles();
    const panels = GLOBAL.document.querySelectorAll('[data-quote-equipment-panel]');
    panels.forEach(function (panel) {
      const list = panel.querySelector('.v4-manual-equipment-list');
      if (!list) return;
      const existing = panel.querySelector('[data-packit-equipment-manual-toggle]');
      const shouldOpen = panel.dataset.packitManualOpen === 'true' || hasCommittedManualRows(list);
      if (!existing) {
        const card = GLOBAL.document.createElement('div');
        card.className = 'v4-equipment-manual-toggle-card';
        card.setAttribute('data-packit-equipment-manual-toggle', 'true');
        card.innerHTML = '<div><b>Ручные позиции</b><span>По умолчанию скрыты. Используй только если позиции нет в базе или нет доступа быстро добавить её в базу. Дефицит складских позиций закрывается субарендой внутри складской строки.</span></div><label class="v4-equipment-manual-toggle-check"><input type="checkbox" data-packit-equipment-manual-checkbox> показать</label>';
        const anchor = list.previousElementSibling || list;
        anchor.parentNode.insertBefore(card, anchor);
        const checkbox = card.querySelector('[data-packit-equipment-manual-checkbox]');
        checkbox.checked = shouldOpen;
        checkbox.addEventListener('change', function () {
          applyManualToggleState(panel, checkbox.checked);
        });
      } else {
        const checkbox = existing.querySelector('[data-packit-equipment-manual-checkbox]');
        if (checkbox) checkbox.checked = shouldOpen;
      }
      applyManualToggleState(panel, shouldOpen);
    });
    return true;
  }

  function observeEquipmentDom() {
    if (!GLOBAL.document || ROOT.__packitEquipmentManualObserver) return false;
    const observer = new MutationObserver(function () {
      patchManualToggle();
    });
    observer.observe(GLOBAL.document.body, { childList: true, subtree: true });
    ROOT.__packitEquipmentManualObserver = observer;
    return true;
  }

  function init() {
    patchPicker();
    patchSoftRerender();
    patchManualToggle();
    observeEquipmentDom();
  }

  ROOT.QuoteEquipmentRuntimePatch = { version: '1.1.0', init: init };
  init();
  GLOBAL.setTimeout(init, 250);
  GLOBAL.setTimeout(init, 1000);
})();