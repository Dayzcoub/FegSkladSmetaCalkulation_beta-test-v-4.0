(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});

  function settingsApi() { return ROOT.WorkspaceSettings || null; }
  function currentUser() { return ROOT.AuthProvider && ROOT.AuthProvider.getCurrentUser ? ROOT.AuthProvider.getCurrentUser() : null; }

  function renderSettingsPanel(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root || !settingsApi()) return null;
    const settings = settingsApi().loadSettings();
    const appSettings = ROOT.AppSettings || null;
    const appTheme = appSettings && appSettings.loadAppTheme ? appSettings.loadAppTheme() : 'dark';
    const user = currentUser() || {};
    root.innerHTML = `
      <section class="v4-card v4-wide-card" data-v4-settings-panel>
        <div class="v4-section-head">
          <div><div class="v4-kicker">Settings</div><h3>Настройки workspace</h3><p class="v4-muted">Локальный слой профиля, документов, календаря и dev-переключателей. Позже переедет в Supabase.</p></div>
          <div class="v4-actions"><button type="button" class="btn-secondary" data-v4-settings-export>JSON</button><button type="button" class="btn-secondary" data-v4-settings-reset>Сброс</button><button type="button" class="btn-primary" data-v4-settings-save>Сохранить</button></div>
        </div>
        <div class="v4-settings-grid v4-settings-grid-3">
          <label>Тема интерфейса<select data-app-theme><option value="dark"${appTheme === 'dark' ? ' selected' : ''}>Темная</option><option value="light"${appTheme === 'light' ? ' selected' : ''}>Светлая</option></select></label>
          <div class="v4-note v4-settings-wide">Темная тема зафиксирована как основной рабочий стиль. Светлая тема сохраняет структуру, акцент #2F4F4F и технические цветовые маркеры схем.</div>
        </div>
        <div class="v4-settings-grid">
          <label>Workspace ID<input data-setting="workspaceId" value="${escapeHtml(settings.workspaceId)}"></label>
          <label>Название workspace<input data-setting="workspaceName" value="${escapeHtml(settings.workspaceName)}"></label>
          <label>Компания<input data-setting="companyName" value="${escapeHtml(settings.companyName)}"></label>
          <label>Ответственный<input data-setting="managerName" value="${escapeHtml(settings.managerName || user.displayName || '')}"></label>
          <label>Email<input data-setting="managerEmail" value="${escapeHtml(settings.managerEmail || user.email || '')}"></label>
          <label>Телефон<input data-setting="managerPhone" value="${escapeHtml(settings.managerPhone)}"></label>
        </div>
        <div class="v4-settings-grid v4-settings-grid-2">
          <label>Заголовок КП<input data-setting="documents.customerProposalTitle" value="${escapeHtml(settings.documents.customerProposalTitle)}"></label>
          <label>Формат экспорта<select data-setting="documents.defaultExportFormat"><option value="txt"${settings.documents.defaultExportFormat === 'txt' ? ' selected' : ''}>TXT</option><option value="json"${settings.documents.defaultExportFormat === 'json' ? ' selected' : ''}>JSON</option></select></label>
          <label class="v4-check"><input type="checkbox" data-setting="documents.showWarehouseDetailsInCustomerProposal"${settings.documents.showWarehouseDetailsInCustomerProposal ? ' checked' : ''}> Складские детали в КП</label>
          <label class="v4-check"><input type="checkbox" data-setting="documents.showPricesInTechnicalSheets"${settings.documents.showPricesInTechnicalSheets ? ' checked' : ''}> Цены в техлистах</label>
        </div>
        <div class="v4-settings-grid v4-settings-grid-2">
          <label>Календарь по умолчанию<input data-setting="calendar.defaultCalendarName" value="${escapeHtml(settings.calendar.defaultCalendarName)}"></label>
          <label>Провайдер<select data-setting="calendar.provider"><option value="ics"${settings.calendar.provider === 'ics' ? ' selected' : ''}>ICS export</option><option value="google_future"${settings.calendar.provider === 'google_future' ? ' selected' : ''}>Google Calendar later</option></select></label>
          <label class="v4-check"><input type="checkbox" data-setting="calendar.enabled"${settings.calendar.enabled ? ' checked' : ''}> Календарные черновики включены</label>
          <label>Шаблон названия события<input data-setting="calendar.eventTitleTemplate" value="${escapeHtml(settings.calendar.eventTitleTemplate)}"></label>
          <label class="v4-settings-wide">Шаблон описания события<textarea data-setting="calendar.eventDescriptionTemplate" rows="5">${escapeHtml(settings.calendar.eventDescriptionTemplate)}</textarea></label>
        </div>
        <div class="v4-settings-grid v4-settings-grid-3">
          <label class="v4-check"><input type="checkbox" data-setting="dev.enableDemoAuth"${settings.dev.enableDemoAuth ? ' checked' : ''}> Demo Auth в dev</label>
          <label class="v4-check"><input type="checkbox" data-setting="dev.allowLocalExports"${settings.dev.allowLocalExports ? ' checked' : ''}> Локальные экспорты</label>
          <label class="v4-check"><input type="checkbox" data-setting="dev.showDebugJson"${settings.dev.showDebugJson ? ' checked' : ''}> Debug JSON</label>
        </div>
        <pre class="v4-doc-preview" data-v4-settings-output hidden></pre>
      </section>`;

    root.querySelector('[data-v4-settings-save]').addEventListener('click', () => {
      saveThemeFromPanel(root);
      const saved = settingsApi().saveSettings(readSettingsFromPanel(root, settings));
      notify('Настройки сохранены');
      renderSettingsPanel(root);
      return saved;
    });
    root.querySelector('[data-v4-settings-reset]').addEventListener('click', () => {
      settingsApi().resetSettings();
      if (ROOT.AppSettings && ROOT.AppSettings.saveAppTheme) ROOT.AppSettings.saveAppTheme('dark');
      notify('Настройки сброшены');
      renderSettingsPanel(root);
    });
    root.querySelector('[data-v4-settings-export]').addEventListener('click', () => {
      const out = root.querySelector('[data-v4-settings-output]');
      out.hidden = false;
      out.textContent = settingsApi().exportSettings(readSettingsFromPanel(root, settings));
    });
    const themeSelect = root.querySelector('[data-app-theme]');
    if (themeSelect && appSettings && appSettings.saveAppTheme) {
      themeSelect.addEventListener('change', () => {
        appSettings.saveAppTheme(themeSelect.value === 'light' ? 'light' : 'dark');
      });
    }
    return root;
  }

  function saveThemeFromPanel(root) {
    const select = root && root.querySelector ? root.querySelector('[data-app-theme]') : null;
    if (!select || !ROOT.AppSettings || !ROOT.AppSettings.saveAppTheme) return 'dark';
    return ROOT.AppSettings.saveAppTheme(select.value === 'light' ? 'light' : 'dark');
  }

  function readSettingsFromPanel(root, fallback) {
    const source = settingsApi().normalizeSettings(fallback || {});
    root.querySelectorAll('[data-setting]').forEach(input => {
      setPath(source, input.getAttribute('data-setting'), input.type === 'checkbox' ? input.checked : input.value);
    });
    return settingsApi().normalizeSettings(source);
  }

  function setPath(obj, path, value) {
    const parts = String(path || '').split('.').filter(Boolean);
    let ref = obj;
    while (parts.length > 1) {
      const key = parts.shift();
      ref[key] = ref[key] && typeof ref[key] === 'object' ? ref[key] : {};
      ref = ref[key];
    }
    ref[parts[0]] = value;
  }

  function notify(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
    else if (window.showToast) window.showToast(message);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>\'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.SettingsPanel = { renderSettingsPanel, readSettingsFromPanel };
})();
