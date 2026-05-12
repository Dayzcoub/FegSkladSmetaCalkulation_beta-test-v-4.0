(function () {
  'use strict';
  const ROOT = (window.FEGModules = window.FEGModules || {});

  const QUICK_CALCULATORS = Object.freeze([
    { id: 'stage', title: 'Сцена', output: ['Схема', 'Техлист', 'Склад', 'Вес'], icon: '▦' },
    { id: 'truss', title: 'Фермы', output: ['Схема', 'Техлист', 'Склад', 'Вес'], icon: '△' },
    { id: 'led', title: 'LED экран', output: ['Кабинеты', 'Кабели', 'Мощность', 'Вес'], icon: '▣' }
  ]);

  function renderQuickCalculators(target, callbacks) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const cb = callbacks || {};
    root.innerHTML = `
      <div class="v4-card v4-quick-panel">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">Quick calculators</div>
            <h3>Быстрые расчёты</h3>
          </div>
          <p class="v4-muted">Маленькие технические калькуляторы без клиентов, цен и КП.</p>
        </div>
        <div class="v4-quick-grid">
          ${QUICK_CALCULATORS.map(calc => `
            <button type="button" class="v4-quick-tile" data-v4-quick="${calc.id}">
              <span class="v4-quick-icon">${escapeHtml(calc.icon)}</span>
              <b>${escapeHtml(calc.title)}</b>
              <small>${calc.output.map(escapeHtml).join(' · ')}</small>
            </button>`).join('')}
        </div>
        <div class="v4-quick-docs" data-v4-quick-docs>
          <div class="v4-kicker">No-price sheets</div>
          <h4>Техлисты сцены и ферм</h4>
          <p class="v4-muted">Быстрый экспорт без клиентов, цен и КП. Берёт текущий расчёт из сцены / блочного конструктора ферм.</p>
          <div class="v4-doc-actions">
            <button type="button" class="btn-secondary" data-v4-quick-doc="stage:tech">Сцена · техлист</button>
            <button type="button" class="btn-secondary" data-v4-quick-doc="stage:warehouse">Сцена · склад</button>
            <button type="button" class="btn-secondary" data-v4-quick-doc="truss:tech">Фермы · техлист</button>
            <button type="button" class="btn-secondary" data-v4-quick-doc="truss:warehouse">Фермы · склад</button>
          </div>
          <pre class="v4-quick-doc-output" data-v4-quick-doc-output>Выбери лист, чтобы увидеть текст для копирования или скачивания.</pre>
          <div class="v4-doc-actions">
            <button type="button" class="btn-secondary" data-v4-quick-doc-copy disabled>Копировать</button>
            <button type="button" class="btn-secondary" data-v4-quick-doc-download disabled>Скачать .txt</button>
          </div>
        </div>
      </div>`;
    root._v4QuickDocText = '';
    root._v4QuickDocName = 'quick-sheet.txt';
    root.querySelectorAll('[data-v4-quick]').forEach(btn => btn.addEventListener('click', () => {
      if (cb.onOpen) cb.onOpen(btn.getAttribute('data-v4-quick'));
    }));
    root.querySelectorAll('[data-v4-quick-doc]').forEach(btn => btn.addEventListener('click', () => renderQuickDoc(root, btn.getAttribute('data-v4-quick-doc'))));
    const copyBtn = root.querySelector('[data-v4-quick-doc-copy]');
    if (copyBtn) copyBtn.addEventListener('click', () => copyQuickDoc(root));
    const downloadBtn = root.querySelector('[data-v4-quick-doc-download]');
    if (downloadBtn) downloadBtn.addEventListener('click', () => downloadQuickDoc(root));
    return root;
  }

  function renderQuickDoc(root, action) {
    const output = root && root.querySelector ? root.querySelector('[data-v4-quick-doc-output]') : null;
    if (!output) return;
    const [sectionKey, docKind] = String(action || '').split(':');
    const builder = ROOT.QuickTechnicalSheets;
    if (!builder) {
      output.textContent = 'Модуль QuickTechnicalSheets не загружен.';
      return;
    }
    const doc = docKind === 'warehouse'
      ? builder.buildSectionWarehouseSheet(sectionKey)
      : builder.buildSectionTechnicalSheet(sectionKey);
    const text = builder.documentToText(doc);
    root._v4QuickDocText = text;
    root._v4QuickDocName = `${sectionKey || 'section'}-${docKind || 'tech'}-sheet.txt`;
    output.textContent = text;
    const copyBtn = root.querySelector('[data-v4-quick-doc-copy]');
    const downloadBtn = root.querySelector('[data-v4-quick-doc-download]');
    if (copyBtn) copyBtn.disabled = false;
    if (downloadBtn) downloadBtn.disabled = false;
    if (cbNotify()) cbNotify()(`${sectionKey}: ${docKind}`);
  }

  function cbNotify() {
    return ROOT.ToastManager && ROOT.ToastManager.showToast ? ROOT.ToastManager.showToast : window.showToast;
  }

  function copyQuickDoc(root) {
    const text = root && root._v4QuickDocText || '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
    if (cbNotify()) cbNotify()('Лист скопирован');
  }

  function downloadQuickDoc(root) {
    const text = root && root._v4QuickDocText || '';
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = root._v4QuickDocName || 'quick-sheet.txt';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 0);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.QuickCalculators = { QUICK_CALCULATORS, renderQuickCalculators, renderQuickDoc };
})();
