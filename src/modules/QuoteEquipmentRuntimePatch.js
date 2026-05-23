(function () {
  'use strict';
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const FALLBACK_ITEMS = [
    row('qf-k2', 'sound_pa', 'SND-QF-001', 'L-Acoustics K2', 24, 2200, 56, 0, 'line array', 'sound'),
    row('qf-ks28', 'sound_pa', 'SND-QF-002', 'L-Acoustics KS28', 12, 2500, 79, 0, 'subs', 'sound'),
    row('qf-la12x', 'sound_pa', 'SND-QF-003', 'L-Acoustics LA12X', 10, 1200, 14.5, 1000, 'amps', 'sound'),
    row('qf-sd12', 'consoles', 'MIX-QF-001', 'DiGiCo SD12', 1, 7500, 29, 300, 'mixers', 'audio_console'),
    row('qf-sm58', 'backline', 'BKL-QF-001', 'Shure SM58', 20, 250, 0.3, 0, 'microphones', 'backline'),
    row('qf-j48', 'backline', 'BKL-QF-002', 'Radial J48 DI', 8, 700, 0.7, 0, 'di', 'backline'),
    row('qf-xlr20', 'commutation', 'COM-QF-001', 'XLR cable 20m', 30, 150, 1.2, 0, 'xlr', 'cable'),
    row('qf-pointe', 'light', 'LGT-QF-001', 'Robe Pointe', 16, 1800, 15, 470, 'beam', 'light_fixture'),
    row('qf-ledpar', 'light', 'LGT-QF-002', 'LED PAR RGBW', 24, 400, 3, 120, 'led par', 'light_fixture'),
    row('qf-sound-eng', 'services', 'SRV-QF-001', 'Sound engineer', 12, 12000, 0, 0, 'sound engineer', 'service', 'shift'),
    row('qf-light-eng', 'services', 'SRV-QF-002', 'Light engineer', 12, 12000, 0, 0, 'light engineer', 'service', 'shift')
  ];

  function row(id, category, code, name, stockQty, rentalPrice, weightKg, powerW, subcategory, type, unit) {
    return {
      id: id, category: category, subcategory: subcategory, type: type,
      code: code, name: name, manufacturer: 'PACK.IT fallback', model: '',
      unit: unit || 'pcs', stockQty: stockQty, reservedQty: 0, availableQty: stockQty,
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

  function init() {
    patchPicker();
    patchSoftRerender();
  }

  ROOT.QuoteEquipmentRuntimePatch = { version: '1.0.0', init: init };
  init();
  GLOBAL.setTimeout(init, 250);
  GLOBAL.setTimeout(init, 1000);
})();
