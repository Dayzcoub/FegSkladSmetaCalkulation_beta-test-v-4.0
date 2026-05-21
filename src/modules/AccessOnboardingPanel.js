(function () {
  'use strict';

  const ROOT = (window.FEGModules = window.FEGModules || {});

  function render(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const mode = opts.mode || 'welcome';
    if (mode === 'login-email') root.innerHTML = renderLogin();
    else if (mode === 'register-key') root.innerHTML = renderRegister();
    else if (mode === 'first-admin') root.innerHTML = renderFirstAdmin();
    else if (mode === 'reset-password') root.innerHTML = renderResetPassword();
    else if (mode === 'login-google' || mode === 'login-apple') root.innerHTML = renderProviderDraft(mode);
    else root.innerHTML = renderWelcome();
    bind(root, opts);
    return root;
  }

  function renderWelcome() {
    const state = ROOT.AuthShell && ROOT.AuthShell.getBootstrapState ? ROOT.AuthShell.getBootstrapState() : { hasAdmin: false };
    return `
      <div class="v4-card v4-auth-card v4-access-onboarding">
        <div>
          <div class="v4-kicker">Access onboarding</div>
          <h2>Вход в FEG Stage PRO v4</h2>
          <p class="v4-muted">Локальный слой входа, регистрации по invite key и bootstrap первого администратора. Готов к будущему Supabase Auth, но пока работает безопасно локально.</p>
        </div>
        <div class="v4-auth-actions">
          <button type="button" class="btn-primary" data-v4-access-mode="login-email">Войти по email</button>
          <button type="button" class="btn-secondary" data-v4-access-mode="register-key">Регистрация по ключу</button>
          <button type="button" class="btn-secondary" data-v4-access-mode="reset-password">Забыли пароль</button>
          <button type="button" class="btn-secondary" data-v4-access-mode="login-google">Google</button>
          <button type="button" class="btn-secondary" data-v4-access-mode="login-apple">Apple ID</button>
          ${state.hasAdmin ? '' : '<button type="button" class="btn-secondary" data-v4-access-mode="first-admin">Создать первого админа</button>'}
        </div>
        ${renderDemoAuth()}
        <div class="v4-note">${state.hasAdmin ? `Первый админ создан: ${escapeHtml(state.adminEmail || 'да')}` : 'Чистая установка: bootstrap первого администратора доступен, если задан backend/runtime key.'}</div>
        <div data-v4-access-result></div>
      </div>`;
  }

  function renderLogin() {
    return `
      <div class="v4-card v4-auth-card v4-access-onboarding">
        <div class="v4-card-head">
          <div><div class="v4-kicker">Email login</div><h3>Вход по email</h3><p class="v4-muted">В локальном режиме вход ищет активный профиль в AdminShell. Пароль/magic link будут подключены на Supabase Auth этапе.</p></div>
          <button type="button" class="btn-secondary" data-v4-access-mode="welcome">Назад</button>
        </div>
        <div class="v4-grid-2">
          <label>Email<input data-v4-access-field="email" type="email" placeholder="manager@feg.local"></label>
          <label>Пароль<input data-v4-access-field="password" type="password" placeholder="если задан в админке"></label>
        </div>
        <div class="v4-auth-actions"><button type="button" class="btn-primary" data-v4-access-submit="login">Войти</button><button type="button" class="btn-secondary" data-v4-access-mode="reset-password">Забыли пароль</button><button type="button" class="btn-secondary" data-v4-access-seed>Сервисные профили</button></div>
        <div data-v4-access-result></div>
      </div>`;
  }

  function renderRegister() {
    return `
      <div class="v4-card v4-auth-card v4-access-onboarding">
        <div class="v4-card-head">
          <div><div class="v4-kicker">Invite registration</div><h3>Регистрация по ключу</h3><p class="v4-muted">Ключ создаётся в админке и определяет роль/workspace пользователя.</p></div>
          <button type="button" class="btn-secondary" data-v4-access-mode="welcome">Назад</button>
        </div>
        <div class="v4-grid-2">
          <label>Email<input data-v4-access-field="email" type="email" placeholder="tech@feg.local"></label>
          <label>Имя / компания<input data-v4-access-field="displayName" type="text" placeholder="Иван / FEG"></label>
          <label>Компания<input data-v4-access-field="companyName" type="text" placeholder="опционально"></label>
          <label>Invite key<input data-v4-access-field="inviteKey" type="text" placeholder="FEG-MAIN-TEC-...."></label>
          <label>Пароль<input data-v4-access-field="password" type="password" placeholder="придумайте пароль"></label>
        </div>
        <div class="v4-auth-actions"><button type="button" class="btn-primary" data-v4-access-submit="register">Зарегистрироваться</button><button type="button" class="btn-secondary" data-v4-access-seed>Сервисные профили</button></div>
        <div data-v4-access-result></div>
      </div>`;
  }

  function renderFirstAdmin() {
    return `
      <div class="v4-card v4-auth-card v4-access-onboarding">
        <div class="v4-card-head">
          <div><div class="v4-kicker">First admin bootstrap</div><h3>Создать первого администратора</h3><p class="v4-muted">Bootstrap key не хранится в клиентском коде. Он должен прийти из runtime/backend-конфига.</p></div>
          <button type="button" class="btn-secondary" data-v4-access-mode="welcome">Назад</button>
        </div>
        <div class="v4-grid-2">
          <label>Email<input data-v4-access-field="email" type="email" placeholder="admin@feg.local"></label>
          <label>Имя<input data-v4-access-field="displayName" type="text" placeholder="Администратор"></label>
          <label>Workspace<input data-v4-access-field="workspaceId" type="text" value="MAIN"></label>
          <label>Bootstrap key<input data-v4-access-field="bootstrapKey" type="password" placeholder="из backend/env"></label>
          <label>Пароль админа<input data-v4-access-field="password" type="password" placeholder="пароль входа"></label>
        </div>
        <div class="v4-auth-actions"><button type="button" class="btn-primary" data-v4-access-submit="first-admin">Создать и войти</button></div>
        <div data-v4-access-result></div>
      </div>`;
  }

  function renderResetPassword() {
    return `
      <div class="v4-card v4-auth-card v4-access-onboarding">
        <div class="v4-card-head">
          <div><div class="v4-kicker">Password recovery</div><h3>Восстановление пароля</h3><p class="v4-muted">В локальном режиме заявка создаёт одноразовый reset-код. Админ может выдать код сотруднику или пользователь может ввести полученный код здесь.</p></div>
          <button type="button" class="btn-secondary" data-v4-access-mode="welcome">Назад</button>
        </div>
        <div class="v4-grid-2">
          <label>Email<input data-v4-access-field="email" type="email" placeholder="user@feg.local"></label>
          <label>Reset-код<input data-v4-access-field="resetToken" type="text" placeholder="код из админки / письма"></label>
          <label>Новый пароль<input data-v4-access-field="password" type="password" placeholder="новый пароль"></label>
        </div>
        <div class="v4-auth-actions"><button type="button" class="btn-secondary" data-v4-access-submit="request-reset">Получить reset-код</button><button type="button" class="btn-primary" data-v4-access-submit="complete-reset">Сменить пароль</button></div>
        <div data-v4-access-result></div>
      </div>`;
  }

  function renderProviderDraft(mode) {
    const label = mode === 'login-google' ? 'Google' : 'Apple ID';
    return `
      <div class="v4-card v4-auth-card v4-access-onboarding">
        <div class="v4-card-head"><div><div class="v4-kicker">${escapeHtml(label)} Auth</div><h3>${escapeHtml(label)} — заготовка</h3><p class="v4-muted">OAuth-кнопка зафиксирована в UX, реальное подключение будет на backend/Auth этапе.</p></div><button type="button" class="btn-secondary" data-v4-access-mode="welcome">Назад</button></div>
        <div class="v4-note">Для проверки доступа используйте локальные профили или ключи из админки.</div>
      </div>`;
  }

  function renderDemoAuth() {
    return ROOT.AuthShell && ROOT.AuthShell.renderDemoLoginBlock ? ROOT.AuthShell.renderDemoLoginBlock({}) : '';
  }

  function bind(root, opts) {
    root.querySelectorAll('[data-v4-access-mode]').forEach(btn => btn.addEventListener('click', () => {
      if (opts.onMode) opts.onMode(btn.getAttribute('data-v4-access-mode'));
    }));
    root.querySelectorAll('[data-v4-demo-role]').forEach(btn => btn.addEventListener('click', () => {
      if (opts.onDemoLogin) opts.onDemoLogin(btn.getAttribute('data-v4-demo-role'));
    }));
    const seed = root.querySelector('[data-v4-access-seed]');
    if (seed) seed.addEventListener('click', () => {
      if (ROOT.AdminShell && ROOT.AdminShell.seedDemoAccess) ROOT.AdminShell.seedDemoAccess();
      showResult(root, 'Сервисные локальные профили и ключи созданы.', 'ok');
    });
    root.querySelectorAll('[data-v4-access-submit]').forEach(btn => btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-v4-access-submit');
      submit(root, action, opts);
    }));
  }

  function readFields(root) {
    const data = {};
    root.querySelectorAll('[data-v4-access-field]').forEach(input => {
      data[input.getAttribute('data-v4-access-field')] = input.value;
    });
    return data;
  }

  function submit(root, action, opts) {
    try {
      const auth = ROOT.AuthProvider || {};
      const data = readFields(root);
      let result;
      if (action === 'login') result = auth.signInProfile ? auth.signInProfile(data.email, data.password) : { ok: false, reason: 'auth_provider_missing' };
      if (action === 'register') result = auth.registerWithInvite ? auth.registerWithInvite(data) : { ok: false, reason: 'auth_provider_missing' };
      if (action === 'first-admin') result = auth.createFirstAdmin ? auth.createFirstAdmin(data) : { ok: false, reason: 'auth_provider_missing' };
      if (action === 'request-reset') result = auth.requestPasswordReset ? auth.requestPasswordReset(data.email) : { ok: false, reason: 'auth_provider_missing' };
      if (action === 'complete-reset') result = auth.completePasswordReset ? auth.completePasswordReset(data) : { ok: false, reason: 'auth_provider_missing' };
      if (!result || !result.ok) {
        showResult(root, reasonText(result && result.reason), 'bad');
        return;
      }
      if (action === 'request-reset') {
        showResult(root, result.token ? `Reset-код: ${escapeHtml(result.token)}. Передайте его сотруднику и задайте новый пароль.` : 'Reset-заявка создана.', 'ok');
        return;
      }
      showResult(root, `Готово: ${escapeHtml(result.user && (result.user.displayName || result.user.email) || result.profile && (result.profile.displayName || result.profile.email) || 'пользователь')}`, 'ok');
      if (opts.onSuccess && action !== 'complete-reset') opts.onSuccess(result);
    } catch (err) {
      showResult(root, err.message || 'Ошибка входа.', 'bad');
    }
  }

  function showResult(root, text, status) {
    const box = root.querySelector('[data-v4-access-result]');
    if (!box) return;
    box.innerHTML = `<div class="v4-access-result ${status === 'bad' ? 'bad' : 'ok'}">${escapeHtml(text)}</div>`;
  }

  function reasonText(reason) {
    const map = {
      profile_not_found: 'Профиль не найден. Создайте пользователя через invite key или Сервисные профили.',
      invalid_password: 'Неверный пароль.',
      password_required: 'Введите пароль.',
      reset_token_invalid: 'Reset-код неверный.',
      reset_token_expired: 'Reset-код истёк. Запросите новый.',
      password_updated: 'Пароль обновлён.',
      profile_not_active: 'Профиль не активен.',
      project_access_expired: 'Проектный ключ истёк или ещё не активен. Обратитесь к администратору для продления.',
      invalid_email: 'Введите корректный email.',
      display_name_required: 'Введите имя пользователя или компанию.',
      invite_key_required: 'Введите invite key.',
      not_found: 'Invite key не найден.',
      used: 'Invite key уже использован.',
      expired: 'Invite key истёк.',
      disabled: 'Invite key отключён.',
      admin_exists: 'Первый администратор уже создан.',
      invalid_bootstrap_key: 'Неверный bootstrap key.',
      bootstrap_key_not_configured: 'Bootstrap key не задан в runtime/backend config.',
      auth_provider_missing: 'LocalAuthProvider/AuthProvider не загружен.'
    };
    return map[reason] || `Ошибка: ${reason || 'unknown'}`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.AccessOnboardingPanel = { render, renderWelcome, renderLogin, renderRegister, renderFirstAdmin, renderResetPassword, reasonText };
})();
