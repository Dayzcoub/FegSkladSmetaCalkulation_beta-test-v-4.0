// PACK.IT — Quote Wizard LED navigation guard.
// Fixes stuck navigation on the quote LED step by bypassing fragile LED autosync during nav only.
// Does not change LED calculations, BOM, warehouse, PDF or backend writes.
(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VERSION = '1.0.0-led-step-nav-guard';

  function toast(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
    else if (GLOBAL.showToast) GLOBAL.showToast(message);
  }

  function storage() { return ROOT.QuoteDraftStorage || null; }
  function model() { return ROOT.QuoteModel || null; }
  function wizard() { return ROOT.QuoteWizard || null; }

  function closestWizardRoot(node) {
    if (!node || !node.closest) return null;
    return node.closest('[data-v4-quote-root], [data-quote-wizard-root], .v4-quote-layout') || node.closest('.v4-card') || document.getElementById('v4QuoteWizard') || document.querySelector('[data-v4-section="quote"], [data-v4-section="wizard"]');
  }

  function getActiveForm(node) {
    const root = node && node.closest ? (node.closest('[data-quote-form]') || document.querySelector('[data-quote-form]')) : document.querySelector('[data-quote-form]');
    return root || null;
  }

  function getCurrentDraft() {
    const saved = storage() && storage().loadActiveDraft ? storage().loadActiveDraft() : null;
    return model() && model().createQuoteDraft ? model().createQuoteDraft(saved || {}) : (saved || {});
  }

  function getSteps(draft) {
    return wizard() && wizard().getEnabledSteps ? wizard().getEnabledSteps(draft) : [];
  }

  function getCurrentStepId(form, draft, steps) {
    const fromForm = form && form.getAttribute ? form.getAttribute('data-quote-active-step') : '';
    if (fromForm) return fromForm;
    const requested = draft && draft.wizard && draft.wizard.activeStep || 'client';
    const ids = (steps || []).map(step => step.id);
    return ids.includes(requested) ? requested : (ids[0] || 'client');
  }

  function chooseTarget(button, form, draft) {
    const steps = getSteps(draft);
    const active = getCurrentStepId(form, draft, steps);
    const index = Math.max(0, steps.findIndex(step => step.id === active));
    if (button.matches('[data-quote-prev]')) return steps[Math.max(0, index - 1)] && steps[Math.max(0, index - 1)].id;
    if (button.matches('[data-quote-next]')) return steps[Math.min(steps.length - 1, index + 1)] && steps[Math.min(steps.length - 1, index + 1)].id;
    if (button.matches('[data-quote-step-target]')) return button.getAttribute('data-quote-step-target');
    return active;
  }

  function mergeActiveStep(draft, targetStep) {
    if (model() && model().mergeQuotePatch) return model().mergeQuotePatch(draft, { wizard: { activeStep: targetStep } });
    return Object.assign({}, draft || {}, { wizard: Object.assign({}, draft && draft.wizard || {}, { activeStep: targetStep }) });
  }

  function saveDraft(draft) {
    if (storage() && storage().saveDraft) return storage().saveDraft(draft, { source: 'quote-wizard-led-nav-guard' });
    return draft;
  }

  function render(root, draft) {
    const target = root && root.closest ? (root.closest('.v4-card') || root) : root;
    if (wizard() && wizard().renderWizardMap) {
      wizard().renderWizardMap(target, draft);
      return true;
    }
    return false;
  }

  function handleClick(event) {
    const button = event.target && event.target.closest ? event.target.closest('[data-quote-prev], [data-quote-next], [data-quote-step-target]') : null;
    if (!button || button.disabled) return;

    const form = getActiveForm(button);
    if (!form || form.getAttribute('data-quote-active-step') !== 'led') return;

    const draft = getCurrentDraft();
    const targetStep = chooseTarget(button, form, draft);
    if (!targetStep || targetStep === 'led') return;

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    try {
      const next = mergeActiveStep(draft, targetStep);
      const saved = saveDraft(next);
      const root = closestWizardRoot(button) || form.parentElement || document.body;
      if (!render(root, saved)) toast('Шаг сметы обновлён');
    } catch (err) {
      console.warn('[PACK.IT][QuoteWizardLedNavGuard] navigation fallback failed', err);
      toast('Не удалось переключить шаг LED');
    }
  }

  function init() {
    if (!document || !document.addEventListener || document.__packitQuoteWizardLedNavGuard) return;
    document.__packitQuoteWizardLedNavGuard = true;
    document.addEventListener('click', handleClick, true);
  }

  ROOT.QuoteWizardLedNavGuard = { VERSION, init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
