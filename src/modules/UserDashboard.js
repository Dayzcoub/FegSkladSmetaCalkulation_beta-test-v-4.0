(function () {
  'use strict';
  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const DASHBOARD_SECTIONS = Object.freeze([
    {
      id: 'quick',
      title: 'Быстрый расчёт',
      note: 'Сцена, фермы, LED без цен и клиентов',
      icon: '⚡',
      permission: 'quick_calculators:view',
      primaryFor: ['technician'],
      badge: 'TECH'
    },
    {
      id: 'quote',
      title: 'Оформить смету',
      note: 'Линейный мастер клиента, площадки, транспорта и состава',
      icon: '🧾',
      permission: 'quotes:create',
      primaryFor: ['manager'],
      badge: 'QUOTE'
    },
    {
      id: 'equipment',
      title: 'База оборудования',
      note: 'Единая база цен, веса, мощности, наличия и кодов',
      icon: '📦',
      permission: 'equipment:view',
      badge: 'DB'
    },
    {
      id: 'warehouse',
      title: 'Склад / наличие',
      note: 'Складские листы, доступность, дефицит и субаренда',
      icon: '🏷',
      permission: 'stock:view',
      primaryFor: ['warehouse'],
      badge: 'WAREHOUSE'
    },

    {
      id: 'documents',
      title: 'Документы',
      note: 'КП, техлисты, складские листы, календарь и export pack',
      icon: '📄',
      permission: 'documents:view',
      badge: 'DOCS'
    },
    {
      id: 'projects',
      title: 'Проекты / история',
      note: 'Черновики, статусы, поиск, открытие и export pack',
      icon: '📁',
      permission: 'projects:view',
      primaryFor: ['viewer'],
      badge: 'PROJECTS'
    },
    {
      id: 'clients',
      title: 'Клиенты',
      note: 'Клиентская база и контакты проектов',
      icon: '👥',
      permission: 'clients:view',
      badge: 'CRM'
    },
    {
      id: 'settings',
      title: 'Настройки',
      note: 'Профиль, документы, календарь, dev/demo параметры',
      icon: '⚙',
      permission: 'dashboard:view',
      badge: 'SETTINGS'
    },



    {
      id: 'command',
      title: 'Поиск / Команды',
      note: 'Быстрый поиск по проектам, клиентам, оборудованию, документам и разделам',
      icon: '⌘',
      permission: 'command_center:view',
      badge: 'CMD'
    },

    {
      id: 'reports',
      title: 'Отчёты',
      note: 'Операционная сводка: проекты, клиенты, склад, база и качество данных',
      icon: '📊',
      permission: 'reports:view',
      badge: 'REPORTS'
    },
    {
      id: 'quality',
      title: 'Контроль данных',
      note: 'Аудит базы, клиентов и проектов перед backend sync',
      icon: '✅',
      permission: 'data_quality:view',
      badge: 'QA'
    },
    {
      id: 'sync',
      title: 'Backend / Sync',
      note: 'Supabase status, dry-run payload, readiness и snapshots',
      icon: '🔌',
      permission: 'admin:access',
      badge: 'SYNC'
    },
    {
      id: 'admin',
      title: 'Админка',
      note: 'Ключи, пользователи, роли, аудит и workspace',
      icon: '🛡',
      permission: 'admin:access',
      primaryFor: ['admin'],
      badge: 'ADMIN'
    }
  ]);

  const ROLE_HINTS = Object.freeze({
    admin: ['Полный доступ', 'Пользователи и роли', 'База и настройки', 'Audit/export'],
    manager: ['Клиенты', 'Сметы и КП', 'Цены', 'Проекты'],
    technician: ['Быстрые расчёты', 'Техлисты без цен', 'Вес и мощность', 'Без клиентов'],
    warehouse: ['Складские листы', 'Наличие', 'Дефицит', 'Субаренда'],
    viewer: ['Просмотр проектов', 'Без редактирования', 'Без цен', 'Без админки']
  });

  function getVisibleSections(role) {
    const normalizedRole = normalizeRole(role);
    if (ROOT.RolePermissions && ROOT.RolePermissions.filterSectionsForRole) {
      return ROOT.RolePermissions.filterSectionsForRole(DASHBOARD_SECTIONS, normalizedRole);
    }
    return DASHBOARD_SECTIONS.slice();
  }

  function getHiddenSections(role) {
    const visibleIds = new Set(getVisibleSections(role).map(section => section.id));
    return DASHBOARD_SECTIONS.filter(section => !visibleIds.has(section.id));
  }

  function getDefaultSectionForRole(role) {
    const normalizedRole = normalizeRole(role);
    const visible = getVisibleSections(normalizedRole);
    const primary = visible.find(section => Array.isArray(section.primaryFor) && section.primaryFor.includes(normalizedRole));
    return (primary || visible[0] || DASHBOARD_SECTIONS[0]).id;
  }

  function renderDashboard(target, callbacks) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const cb = callbacks || {};
    const user = cb.user || (ROOT.AuthProvider && ROOT.AuthProvider.getCurrentUser ? ROOT.AuthProvider.getCurrentUser() : null);
    const role = normalizeRole(user && user.role ? user.role : cb.role || 'viewer');
    const roleLabel = ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel ? ROOT.RolePermissions.getRoleLabel(role) : role;
    const visibleSections = getVisibleSections(role);
    const hiddenSections = getHiddenSections(role);
    const activeSection = cb.activeSection || getDefaultSectionForRole(role);
    const hints = ROLE_HINTS[role] || ROLE_HINTS.viewer;
    root.innerHTML = `
      <div class="v4-dashboard-panel" data-v4-dashboard-role="${escapeHtml(role)}">
        <div class="v4-dashboard-head">
          <div>
            <div class="v4-kicker">User Dashboard · role based</div>
            <h3>Главное меню</h3>
            <p class="v4-muted">Разделы показываются по роли пользователя. Demo Auth позволяет проверить сборку без настоящего admin-логина.</p>
          </div>
          <div class="v4-role-card">
            <span>${escapeHtml(roleLabel)}</span>
            <b>${escapeHtml(user && (user.displayName || user.email) || 'Demo user')}</b>
            <small>${escapeHtml(user && (user.workspaceName || user.workspaceId) || 'workspace')}</small>
          </div>
        </div>
        <div class="v4-role-hints">
          ${hints.map(hint => `<span>${escapeHtml(hint)}</span>`).join('')}
        </div>
        <div class="v4-dashboard-grid">
          ${visibleSections.map(item => renderCard(item, activeSection)).join('')}
        </div>
        ${hiddenSections.length ? `
          <details class="v4-dashboard-hidden">
            <summary>Скрыто для роли ${escapeHtml(roleLabel)} · ${hiddenSections.length}</summary>
            <div>${hiddenSections.map(section => `<span>${escapeHtml(section.title)}</span>`).join('')}</div>
          </details>` : ''}
      </div>`;
    root.querySelectorAll('[data-v4-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-v4-section');
        if (cb.onSelect) cb.onSelect(id);
      });
    });
    return root;
  }

  function renderCard(item, activeSection) {
    const isActive = item.id === activeSection;
    return `
      <button type="button" class="v4-dashboard-card ${isActive ? 'active' : ''}" data-v4-section="${escapeHtml(item.id)}" aria-pressed="${isActive ? 'true' : 'false'}">
        <span class="v4-dashboard-badge">${escapeHtml(item.badge || item.id)}</span>
        <span class="v4-dashboard-icon">${escapeHtml(item.icon)}</span>
        <b>${escapeHtml(item.title)}</b>
        <small>${escapeHtml(item.note)}</small>
      </button>`;
  }

  function normalizeRole(role) {
    return ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole ? ROOT.RolePermissions.normalizeRole(role) : (role || 'viewer');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.UserDashboard = {
    DASHBOARD_SECTIONS,
    ROLE_HINTS,
    getVisibleSections,
    getHiddenSections,
    getDefaultSectionForRole,
    renderDashboard
  };
})();
