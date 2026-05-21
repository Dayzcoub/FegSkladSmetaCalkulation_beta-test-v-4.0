(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const SUBRENTORS_DIRECTORY_UI_VERSION = '3.17.18-subrentors-directory';

  function dir() { return ROOT.SupplierDirectory || null; }
  function toText(value) { return String(value == null ? '' : value).trim(); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#096;'); }
  function notify(message) { if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message); }

  function listSubrentors() {
    const supplierDir = dir();
    if (!supplierDir) return [];
    return supplierDir.listSubrentors ? supplierDir.listSubrentors({ onlyActive: false }) : supplierDir.listSuppliers({ type: 'subrent', onlyActive: false });
  }

  function dispatchUpdate(selectedId) {
    try {
      GLOBAL.dispatchEvent(new CustomEvent('feg:subrentors-updated', { detail: { selectedId: selectedId || '' } }));
    } catch (_) {}
  }

  function renderSubrentorsDirectory(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    root.innerHTML = renderShell();
    bind(root);
    return root;
  }

  function renderShell() {
    const rows = listSubrentors();
    return `<section class="v4-card v4-subrentors-directory" data-v4-subrentors-directory>
      <div class="v4-section-head">
        <div>
          <div class="v4-kicker">Субаренда · справочник</div>
          <h3>Субарендаторы</h3>
          <p class="v4-muted">Отдельный локальный слой для тех, у кого добираем оборудование в субаренду. Эти карточки используются в линейной смете при дефиците склада.</p>
        </div>
        <div class="v4-actions">
          <button type="button" class="btn-secondary" data-v4-subrentors-export>JSON</button>
          <button type="button" class="btn-primary" data-v4-subrentor-add>Добавить субарендатора</button>
        </div>
      </div>
      <div class="v4-subrentors-stats">
        <div class="v4-mini-stat"><span>Карточек</span><strong>${escapeHtml(String(rows.length))}</strong></div>
        <div class="v4-mini-stat"><span>Активных</span><strong>${escapeHtml(String(rows.filter(row => row.isActive !== false).length))}</strong></div>
        <div class="v4-mini-stat"><span>Источник</span><strong>localStorage / Supabase-ready</strong></div>
      </div>
      <div class="v4-subrentors-grid">
        ${rows.length ? rows.map(renderCard).join('') : '<div class="v4-note">Список пуст. Добавь первого субарендатора — после сохранения он сразу появится в выпадающем списке линейной сметы.</div>'}
      </div>
      <pre class="v4-doc-preview" data-v4-subrentors-output hidden></pre>
    </section>`;
  }

  function renderCard(row) {
    const label = dir() && dir().formatSupplierLabel ? dir().formatSupplierLabel(row) : row.name;
    return `<article class="v4-subrentor-card" data-v4-subrentor-card="${escapeAttr(row.id)}">
      <div class="v4-subrentor-card-head">
        <div><b>${escapeHtml(row.name || 'Субарендатор')}</b><span>${escapeHtml(label)}</span></div>
        <i class="${row.isActive === false ? 'muted' : 'ok'}">${row.isActive === false ? 'архив' : 'активен'}</i>
      </div>
      <div class="v4-subrentor-card-body">
        <span>Имя: <b>${escapeHtml(row.firstName || '—')}</b></span>
        <span>Фамилия: <b>${escapeHtml(row.lastName || '—')}</b></span>
        <span>Организация: <b>${escapeHtml(row.organizationName || row.legalName || '—')}</b></span>
        <span>Телефон: <b>${escapeHtml(row.phone || '—')}</b></span>
      </div>
      ${row.notes ? `<p>${escapeHtml(row.notes)}</p>` : ''}
      <div class="v4-subrentor-card-actions">
        <button type="button" class="btn-secondary btn-compact" data-v4-subrentor-edit="${escapeAttr(row.id)}">Редактировать</button>
        <button type="button" class="btn-secondary btn-compact" data-v4-subrentor-delete="${escapeAttr(row.id)}">Удалить</button>
      </div>
    </article>`;
  }

  function bind(root) {
    root.querySelector('[data-v4-subrentor-add]')?.addEventListener('click', () => openSubrentorModal({ onSave: () => renderSubrentorsDirectory(root) }));
    root.querySelector('[data-v4-subrentors-export]')?.addEventListener('click', () => {
      const out = root.querySelector('[data-v4-subrentors-output]');
      if (!out) return;
      const supplierDir = dir();
      out.hidden = !out.hidden;
      out.textContent = supplierDir && supplierDir.exportSuppliers ? supplierDir.exportSuppliers(listSubrentors()) : JSON.stringify(listSubrentors(), null, 2);
    });
    root.querySelectorAll('[data-v4-subrentor-edit]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-v4-subrentor-edit');
      const row = dir() && dir().findSupplier ? dir().findSupplier(id) : null;
      openSubrentorModal({ supplier: row, onSave: () => renderSubrentorsDirectory(root) });
    }));
    root.querySelectorAll('[data-v4-subrentor-delete]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-v4-subrentor-delete');
      const row = dir() && dir().findSupplier ? dir().findSupplier(id) : null;
      const label = row && row.name ? row.name : id;
      if (!GLOBAL.confirm || GLOBAL.confirm(`Удалить субарендатора «${label}»?`)) {
        dir() && dir().removeSupplier && dir().removeSupplier(id);
        dispatchUpdate('');
        notify('Субарендатор удалён');
        renderSubrentorsDirectory(root);
      }
    }));
  }

  function openSubrentorModal(options) {
    const opts = options || {};
    const supplier = opts.supplier || {};
    const modal = document.createElement('div');
    modal.className = 'v4-modal v4-subrentor-modal';
    modal.setAttribute('data-v4-subrentor-modal', 'true');
    modal.innerHTML = `<div class="v4-modal__backdrop" data-v4-subrentor-close></div>
      <form class="v4-modal__panel v4-subrentor-modal__panel" data-v4-subrentor-form>
        <div class="v4-section-head">
          <div><div class="v4-kicker">Субарендатор</div><h3>${supplier.id ? 'Редактировать карточку' : 'Новый субарендатор'}</h3><p class="v4-muted">Заполни минимум имя/организацию и телефон. После сохранения карточка сразу выбирается в текущей строке сметы.</p></div>
          <button type="button" class="btn-secondary btn-compact" data-v4-subrentor-close>Закрыть</button>
        </div>
        <input type="hidden" name="id" value="${escapeAttr(supplier.id || '')}">
        <div class="v4-grid-2">
          <label class="v4-field">Имя<input name="firstName" value="${escapeAttr(supplier.firstName || supplier.first_name || '')}" placeholder="Имя"></label>
          <label class="v4-field">Фамилия<input name="lastName" value="${escapeAttr(supplier.lastName || supplier.last_name || '')}" placeholder="Фамилия"></label>
          <label class="v4-field">Название организации<input name="organizationName" value="${escapeAttr(supplier.organizationName || supplier.organization_name || supplier.legalName || '')}" placeholder="Название организации"></label>
          <label class="v4-field">Телефон<input name="phone" value="${escapeAttr(supplier.phone || '')}" placeholder="+7 / +375 / ..."></label>
          <label class="v4-field v4-settings-wide">Комментарий<input name="notes" value="${escapeAttr(supplier.notes || supplier.note || '')}" placeholder="Условия, контакты, график"></label>
        </div>
        <div class="v4-doc-actions"><button type="submit" class="btn-primary">Сохранить и выбрать</button><button type="button" class="btn-secondary" data-v4-subrentor-close>Отмена</button></div>
      </form>`;
    document.body.appendChild(modal);
    const close = () => { modal.remove(); };
    modal.querySelectorAll('[data-v4-subrentor-close]').forEach(btn => btn.addEventListener('click', close));
    modal.querySelector('[data-v4-subrentor-form]').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const hasIdentity = toText(data.firstName) || toText(data.lastName) || toText(data.organizationName);
      if (!hasIdentity) { notify('Заполни имя, фамилию или организацию'); return; }
      if (!toText(data.phone)) { notify('Добавь телефон субарендатора'); return; }
      const before = listSubrentors();
      dir() && dir().upsertSubrentor && dir().upsertSubrentor(data);
      const after = listSubrentors();
      const saved = data.id ? (dir() && dir().findSupplier ? dir().findSupplier(data.id) : null) : after.find(row => !before.some(prev => prev.id === row.id)) || after.find(row => row.phone === data.phone) || after[0];
      dispatchUpdate(saved && saved.id || data.id || '');
      notify('Субарендатор сохранён');
      if (opts.onSave) opts.onSave(saved || null);
      close();
    });
    setTimeout(() => { const first = modal.querySelector('input[name="firstName"]'); if (first) first.focus(); }, 0);
    return modal;
  }

  ROOT.SubrentorsDirectoryUI = {
    SUBRENTORS_DIRECTORY_UI_VERSION,
    renderSubrentorsDirectory,
    openSubrentorModal,
    listSubrentors
  };
})();
