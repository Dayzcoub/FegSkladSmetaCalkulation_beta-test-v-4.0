(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});
  const STORAGE_KEY = 'fegV4AuthBootstrap';
  const DEFAULT_ROLES = Object.freeze({
    ADMIN: 'admin',
    MANAGER: 'manager',
    TECHNICIAN: 'technician',
    WAREHOUSE: 'warehouse',
    VIEWER: 'viewer'
  });

  function getBootstrapState(storage) {
    const safeStorage = storage || window.localStorage;
    try {
      const raw = safeStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        hasAdmin: Boolean(parsed.hasAdmin),
        adminEmail: parsed.adminEmail || '',
        createdAt: parsed.createdAt || ''
      };
    } catch (err) {
      return { hasAdmin: false, adminEmail: '', createdAt: '' };
    }
  }

  function saveBootstrapState(state, storage) {
    const safeStorage = storage || window.localStorage;
    const next = {
      hasAdmin: Boolean(state && state.hasAdmin),
      adminEmail: String((state && state.adminEmail) || '').trim(),
      createdAt: (state && state.createdAt) || new Date().toISOString()
    };
    safeStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function canCreateFirstAdmin(storage) {
    return !getBootstrapState(storage).hasAdmin;
  }

  function buildRegistrationModel(overrides) {
    const data = overrides || {};
    return {
      email: String(data.email || '').trim(),
      displayName: String(data.displayName || '').trim(),
      inviteKey: String(data.inviteKey || '').trim(),
      provider: data.provider || 'email',
      requestedRole: data.requestedRole || DEFAULT_ROLES.TECHNICIAN
    };
  }

  function validateRegistrationModel(model, options) {
    const errors = [];
    const data = buildRegistrationModel(model);
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) errors.push('Укажите корректный email.');
    if (!data.displayName) errors.push('Укажите имя пользователя или компанию.');
    if (!data.inviteKey) errors.push('Введите ключ доступа из админки.');
    const allowedRoles = Object.values(DEFAULT_ROLES);
    if (!allowedRoles.includes(data.requestedRole)) errors.push('Некорректная роль пользователя.');
    if (options && options.requireAdminKey && data.requestedRole === DEFAULT_ROLES.ADMIN && !canCreateFirstAdmin(options.storage)) {
      errors.push('Первый администратор уже создан. Новых админов создаёт действующий администратор.');
    }
    return { ok: errors.length === 0, errors, value: data };
  }

  function renderWelcome(target, callbacks) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const state = getBootstrapState();
    const cb = callbacks || {};
    root.innerHTML = `
      <div class="v4-card v4-auth-card">
        <div>
          <div class="v4-kicker">FEG Stage PRO v4</div>
          <h2>Вход в приложение</h2>
          <p class="v4-muted">Новый слой авторизации: email, Google/Apple и регистрация по ключам из админки.</p>
        </div>
        <div class="v4-auth-actions">
          <button type="button" class="btn-primary" data-v4-action="login-email">Войти по email</button>
          <button type="button" class="btn-secondary" data-v4-action="register-key">Регистрация по ключу</button>
          <button type="button" class="btn-secondary" data-v4-action="login-google">Google</button>
          <button type="button" class="btn-secondary" data-v4-action="login-apple">Apple ID</button>
          ${state.hasAdmin ? '' : '<button type="button" class="btn-secondary" data-v4-action="first-admin">Создать первого админа</button>'}
        </div>

        ${renderDemoLoginBlock(cb)}
        <div class="v4-note">${state.hasAdmin ? `Первый админ: ${escapeHtml(state.adminEmail || 'создан')}` : 'Чистая установка: доступен bootstrap-режим первого администратора.'}</div>
      </div>`;
    root.querySelectorAll('[data-v4-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-v4-action');
        if (cb.onAction) cb.onAction(action);
      });
    });
    root.querySelectorAll('[data-v4-demo-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.getAttribute('data-v4-demo-role');
        if (cb.onDemoLogin) cb.onDemoLogin(role);
      });
    });
    return root;
  }


  function renderDemoLoginBlock(callbacks) {
    const demo = ROOT.DemoAuthProvider;
    const enabled = Boolean(demo && demo.isDemoAuthEnabled && demo.isDemoAuthEnabled());
    if (!enabled) return '';
    const roles = ROOT.RolePermissions && ROOT.RolePermissions.ROLES
      ? [ROOT.RolePermissions.ROLES.ADMIN, ROOT.RolePermissions.ROLES.MANAGER, ROOT.RolePermissions.ROLES.TECHNICIAN, ROOT.RolePermissions.ROLES.WAREHOUSE, ROOT.RolePermissions.ROLES.VIEWER]
      : ['admin', 'manager', 'technician', 'warehouse', 'viewer'];
    const label = role => ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel ? ROOT.RolePermissions.getRoleLabel(role) : role;
    return `
      <div class="v4-demo-auth-panel">
        <div class="v4-demo-badge">DEMO AUTH</div>
        <b>Тестовый вход без ключа</b>
        <p class="v4-muted">Для разработки интерфейса и проверки ролей. Данные не пишутся в боевой Supabase.</p>
        <div class="v4-auth-actions">
          ${roles.map(role => `<button type="button" class="btn-secondary" data-v4-demo-role="${escapeHtml(role)}">${escapeHtml(label(role))}</button>`).join('')}
        </div>
      </div>`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    }[char]));
  }

  ROOT.AuthShell = {
    ROLES: DEFAULT_ROLES,
    STORAGE_KEY,
    getBootstrapState,
    saveBootstrapState,
    canCreateFirstAdmin,
    buildRegistrationModel,
    validateRegistrationModel,
    renderDemoLoginBlock,
    renderWelcome
  };
})();
