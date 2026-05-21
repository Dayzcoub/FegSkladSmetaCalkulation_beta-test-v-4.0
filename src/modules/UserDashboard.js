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
      primaryFor: ['technician', 'sound', 'light', 'screens', 'truss_stage'],
      group: 'main',
      badge: 'TECH'
    },
    {
      id: 'quote',
      title: 'Оформить смету',
      note: 'Линейный мастер клиента, площадки, транспорта и состава',
      icon: '🧾',
      permission: 'quotes:create',
      primaryFor: ['manager'],
      group: 'main',
      badge: 'QUOTE'
    },
    {
      id: 'projects',
      title: 'Проекты / история',
      note: 'Черновики, статусы, поиск, открытие и export pack',
      icon: '📁',
      permission: 'projects:view',
      primaryFor: ['viewer'],
      group: 'main',
      badge: 'PROJECTS'
    },
    {
      id: 'warehouse',
      title: 'Склад / наличие',
      note: 'Складские листы, доступность, дефицит и субаренда',
      icon: '🏷',
      permission: 'stock:view',
      primaryFor: ['warehouse'],
      group: 'operations',
      badge: 'WAREHOUSE'
    },
    {
      id: 'equipment',
      title: 'База оборудования',
      note: 'Единая база цен, веса, мощности, наличия и кодов',
      icon: '📦',
      permission: 'equipment:view',
      group: 'operations',
      badge: 'DB'
    },
    {
      id: 'subrentors',
      title: 'Субаренда',
      note: 'Карточки прокатчиков и контактов, у кого добираем оборудование',
      icon: '🤝',
      permission: 'stock:view',
      group: 'operations',
      badge: 'SUB'
    },
    {
      id: 'site_checklist',
      title: 'Чек-лист площадки',
      note: 'Осмотр площадки, фото, электричество, подъезды, контакты и схема',
      icon: '📍',
      permission: 'site_checklist:view',
      primaryFor: ['tech_director'],
      group: 'operations',
      badge: 'SITE'
    },
    {
      id: 'documents',
      title: 'Документы',
      note: 'КП, техлисты, складские листы, календарь и export pack',
      icon: '📄',
      permission: 'documents:view',
      group: 'operations',
      badge: 'DOCS'
    },
    {
      id: 'clients',
      title: 'Клиенты',
      note: 'Клиентская база и контакты проектов',
      icon: '👥',
      permission: 'clients:view',
      group: 'crm',
      badge: 'CRM'
    },
    {
      id: 'command',
      title: 'Поиск / Команды',
      note: 'Быстрый поиск по проектам, клиентам, оборудованию, документам и разделам',
      icon: '⌘',
      permission: 'command_center:view',
      group: 'crm',
      badge: 'CMD'
    },
    {
      id: 'communication',
      title: 'Chats / Notifications',
      note: 'Workspace, project and role chat, notification center and push-readiness',
      icon: 'CHAT',
      permission: 'communication:view',
      group: 'crm',
      badge: 'COMMS'
    },
    {
      id: 'reports',
      title: 'Отчёты',
      note: 'Операционная сводка: проекты, клиенты, склад, база и качество данных',
      icon: '📊',
      permission: 'reports:view',
      group: 'analytics',
      badge: 'REPORTS'
    },
    {
      id: 'quality',
      title: 'Контроль данных',
      note: 'Аудит базы, клиентов и проектов перед backend sync',
      icon: '✅',
      permission: 'data_quality:view',
      group: 'analytics',
      badge: 'QA'
    },
    {
      id: 'settings',
      title: 'Настройки',
      note: 'Профиль, документы и календарь workspace',
      icon: '⚙',
      permission: 'dashboard:view',
      group: 'system',
      badge: 'SETTINGS'
    },
    {
      id: 'sync',
      title: 'Backend / Sync',
      note: 'Supabase status, dry-run payload, readiness и snapshots',
      icon: '🔌',
      permission: 'admin:access',
      group: 'system',
      badge: 'SYNC'
    },
    {
      id: 'admin',
      title: 'Админка',
      note: 'Ключи, пользователи, роли, аудит и workspace',
      icon: '🛡',
      permission: 'admin:access',
      primaryFor: ['admin'],
      group: 'system',
      badge: 'ADMIN'
    }
  ]);

  const ROLE_HINTS = Object.freeze({
    admin: ['Полный доступ', 'Пользователи и роли', 'Проектные ключи', 'Dev/sync только здесь'],
    manager: ['Клиенты', 'Сметы и КП', 'Цены', 'Проекты'],
    technician: ['Быстрые расчёты', 'Техлисты без цен', 'Вес и мощность', 'Проекты'],
    warehouse: ['Складские листы', 'Наличие', 'Дефицит', 'Сборочные листы'],
    viewer: ['Просмотр проектов', 'Без редактирования', 'Без цен', 'Без админки'],
    director: ['Полный доступ', 'Проекты и сметы', 'Отчёты', 'Админка'],
    tech_director: ['Полный доступ', 'Чек-лист площадки', 'Техдокументация', 'Склад и база'],
    sound: ['Чаты', 'Быстрые расчёты', 'Документы', 'База: звук/бэклайн/коммутация'],
    light: ['Чаты', 'Быстрые расчёты', 'Документы', 'База: свет'],
    screens: ['Чаты', 'Быстрые расчёты', 'Документы', 'База: LED'],
    truss_stage: ['Чаты', 'Быстрые расчёты', 'Документы', 'База: сцены/фермы'],
    invited_specialist: ['Чаты проекта', 'Документы проекта', 'Доступ по сроку', 'Без базы и цен']
  });

  const SECTION_GROUPS = Object.freeze([
    { id: 'main', title: 'Работа', note: 'Основной ежедневный поток' },
    { id: 'operations', title: 'Операции', note: 'Склад, база и документы' },
    { id: 'crm', title: 'CRM / поиск', note: 'Клиенты, проекты и быстрый поиск' },
    { id: 'analytics', title: 'Контроль', note: 'Отчёты и качество данных' },
    { id: 'system', title: 'Система', note: 'Настройки, sync и админка' }
  ]);

  const ROLE_PRIMARY_FALLBACK = Object.freeze({
    admin: ['admin', 'quote', 'projects', 'communication'],
    manager: ['quote', 'projects', 'clients', 'documents'],
    technician: ['quick', 'projects', 'documents', 'communication'],
    warehouse: ['warehouse', 'equipment', 'documents', 'communication'],
    viewer: ['projects', 'documents', 'communication'],
    director: ['quote', 'projects', 'reports', 'admin'],
    tech_director: ['site_checklist', 'projects', 'quick', 'documents'],
    sound: ['communication', 'quick', 'documents', 'equipment'],
    light: ['communication', 'quick', 'documents', 'equipment'],
    screens: ['communication', 'quick', 'documents', 'equipment'],
    truss_stage: ['communication', 'quick', 'documents', 'equipment'],
    invited_specialist: ['communication', 'documents']
  });

  function getVisibleSections(role, user) {
    const normalizedRole = normalizeRole(role);
    if (user && ROOT.RolePermissions && ROOT.RolePermissions.canSeeSectionForUser) {
      return DASHBOARD_SECTIONS.filter(section => ROOT.RolePermissions.canSeeSectionForUser(user, section.id));
    }
    if (ROOT.RolePermissions && ROOT.RolePermissions.filterSectionsForRole) {
      return ROOT.RolePermissions.filterSectionsForRole(DASHBOARD_SECTIONS, normalizedRole);
    }
    return DASHBOARD_SECTIONS.slice();
  }

  function getHiddenSections(role, user) {
    const visibleIds = new Set(getVisibleSections(role, user).map(section => section.id));
    return DASHBOARD_SECTIONS.filter(section => !visibleIds.has(section.id));
  }

  function getDefaultSectionForRole(role, user) {
    const normalizedRole = normalizeRole(role);
    const visible = getVisibleSections(normalizedRole, user);
    const primary = visible.find(section => Array.isArray(section.primaryFor) && section.primaryFor.includes(normalizedRole));
    return (primary || visible[0] || DASHBOARD_SECTIONS[0]).id;
  }

  function getPrimarySections(role, visibleSections) {
    const normalizedRole = normalizeRole(role);
    const visible = Array.isArray(visibleSections) ? visibleSections : getVisibleSections(normalizedRole);
    const byId = new Map(visible.map(section => [section.id, section]));
    const preferred = ROLE_PRIMARY_FALLBACK[normalizedRole] || ROLE_PRIMARY_FALLBACK.viewer;
    const picked = [];
    preferred.forEach(id => {
      if (byId.has(id) && !picked.some(section => section.id === id)) picked.push(byId.get(id));
    });
    visible.forEach(section => {
      if (picked.length < 4 && section.primaryFor && section.primaryFor.includes(normalizedRole) && !picked.some(item => item.id === section.id)) picked.push(section);
    });
    visible.forEach(section => {
      if (picked.length < Math.min(4, visible.length) && !picked.some(item => item.id === section.id)) picked.push(section);
    });
    return picked.slice(0, 4);
  }

  function renderDashboard(target, callbacks) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const cb = callbacks || {};
    const user = cb.user || (ROOT.AuthProvider && ROOT.AuthProvider.getCurrentUser ? ROOT.AuthProvider.getCurrentUser() : null);
    const role = normalizeRole(user && user.role ? user.role : cb.role || 'viewer');
    const roleLabel = ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel ? ROOT.RolePermissions.getRoleLabel(role) : role;
    const visibleSections = getVisibleSections(role, user);
    const hiddenSections = getHiddenSections(role, user);
    const activeSection = cb.activeSection || getDefaultSectionForRole(role);
    const active = visibleSections.find(section => section.id === activeSection) || visibleSections[0];
    const hints = ROLE_HINTS[role] || ROLE_HINTS.viewer;
    const primarySections = getPrimarySections(role, visibleSections);
    root.innerHTML = `
      <nav class="v4-dashboard-panel v4-dashboard-panel--compact" data-v4-dashboard-role="${escapeHtml(role)}" aria-label="Главное меню v4">
        <div class="v4-dashboard-head v4-dashboard-head--compact">
          <div class="v4-dashboard-title">
            <div class="v4-kicker">FEG Stage PRO · v4 workspace</div>
            <h3>Рабочее окно</h3>
            <p class="v4-muted">${active ? `Открыт раздел: ${escapeHtml(active.title)}.` : 'Выберите рабочий раздел.'}</p>
          </div>
          <div class="v4-role-card v4-role-card--compact">
            <span>${escapeHtml(roleLabel)}</span>
            <b>${escapeHtml(user && (user.displayName || user.email) || 'Demo user')}</b>
            <small>${escapeHtml(user && (user.workspaceName || user.workspaceId) || 'workspace')}</small>
          </div>
        </div>

        <div class="v4-dashboard-quick-actions" aria-label="Быстрые действия роли">
          ${primarySections.map(item => renderPrimaryAction(item, activeSection)).join('')}
        </div>

        <div class="v4-dashboard-nav-groups" aria-label="Все разделы">
          ${SECTION_GROUPS.map(group => renderGroup(group, visibleSections, activeSection)).filter(Boolean).join('')}
        </div>

        <details class="v4-dashboard-role-details">
          <summary>Доступ роли · ${escapeHtml(roleLabel)}</summary>
          <div class="v4-role-hints">
            ${hints.map(hint => `<span>${escapeHtml(hint)}</span>`).join('')}
          </div>
          ${hiddenSections.length ? `
            <div class="v4-dashboard-hidden">
              <b>Скрыто для этой роли:</b>
              <div>${hiddenSections.map(section => `<span>${escapeHtml(section.title)}</span>`).join('')}</div>
            </div>` : ''}
        </details>
      </nav>`;
    root.querySelectorAll('[data-v4-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-v4-section');
        if (cb.onSelect) cb.onSelect(id);
      });
    });
    return root;
  }

  function renderPrimaryAction(item, activeSection) {
    const isActive = item.id === activeSection;
    return `
      <button type="button" class="v4-dashboard-primary ${isActive ? 'active' : ''}" data-v4-section="${escapeHtml(item.id)}" aria-pressed="${isActive ? 'true' : 'false'}">
        <span class="v4-dashboard-primary-icon">${escapeHtml(item.icon)}</span>
        <span>
          <b>${escapeHtml(item.title)}</b>
          <small>${escapeHtml(item.note)}</small>
        </span>
      </button>`;
  }

  function renderGroup(group, visibleSections, activeSection) {
    const items = visibleSections.filter(section => (section.group || 'main') === group.id);
    if (!items.length) return '';
    return `
      <div class="v4-dashboard-group" data-v4-dashboard-group="${escapeHtml(group.id)}">
        <div class="v4-dashboard-group-title">
          <b>${escapeHtml(group.title)}</b>
          <small>${escapeHtml(group.note)}</small>
        </div>
        <div class="v4-dashboard-chip-row">
          ${items.map(item => renderNavChip(item, activeSection)).join('')}
        </div>
      </div>`;
  }

  function renderNavChip(item, activeSection) {
    const isActive = item.id === activeSection;
    return `
      <button type="button" class="v4-dashboard-chip ${isActive ? 'active' : ''}" data-v4-section="${escapeHtml(item.id)}" title="${escapeHtml(item.note)}" aria-pressed="${isActive ? 'true' : 'false'}">
        <span>${escapeHtml(item.icon)}</span>
        <b>${escapeHtml(item.title)}</b>
      </button>`;
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
    SECTION_GROUPS,
    getVisibleSections,
    getHiddenSections,
    getDefaultSectionForRole,
    getPrimarySections,
    renderDashboard,
    renderCard
  };
})();
