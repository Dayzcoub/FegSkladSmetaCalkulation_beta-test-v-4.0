(function () {
  'use strict';
  const ROOT = (window.FEGModules = window.FEGModules || {});

  function getModule(name) { return ROOT[name] || {}; }
  function getAuthState() {
    return getModule('AuthProvider').getAuthState
      ? getModule('AuthProvider').getAuthState()
      : { isAuthenticated: false, role: 'viewer', user: null };
  }

  // ─── Карта иконок разделов ────────────────────────────────────────────────
  const SECTION_ICONS = {
    quick:          '⚡',
    quote:          '🧾',
    projects:       '📁',
    warehouse:      '🏷',
    equipment:      '📦',
    subrentors:     '🤝',
    site_checklist: '📍',
    documents:      '📄',
    clients:        '👥',
    command:        '⌘',
    communication:  '💬',
    reports:        '📊',
    quality:        '✅',
    settings:       '⚙',
    sync:           '🔌',
    admin:          '🛡',
  };

  // ─── Главный рендер ───────────────────────────────────────────────────────
  function renderShell(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;

    const auth = getAuthState();

    // Не авторизован — показываем auth экран без shell
    if (!auth.isAuthenticated) {
      renderAuthScreen(root, auth);
      return root;
    }

    // Просроченный гостевой ключ
    const isExpiredGuest = auth.isAuthenticated &&
      ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole &&
      ROOT.RolePermissions.normalizeRole(auth.role) === 'invited_specialist' &&
      ROOT.AuthProvider && ROOT.AuthProvider.hasActiveProjectAccess &&
      !ROOT.AuthProvider.hasActiveProjectAccess(auth.user || {});

    if (isExpiredGuest) {
      renderExpiredGuest(root, auth);
      return root;
    }

    // Определяем активный раздел
    const defaultSection = getModule('UserDashboard').getDefaultSectionForRole
      ? getModule('UserDashboard').getDefaultSectionForRole(auth.role)
      : 'quick';
    if (!root._v4ActiveSection || !canOpenSection(root._v4ActiveSection, auth)) {
      root._v4ActiveSection = defaultSection;
    }

    renderAppShell(root, auth);
    return root;
  }

  // ─── Auth screen ──────────────────────────────────────────────────────────
  function renderAuthScreen(root, auth) {
    root.innerHTML = `<div class="packit-auth-wrap"><div class="packit-auth-card" id="v4AuthMount"></div></div>`;
    const mount = root.querySelector('#v4AuthMount');
    const mode = root._v4AuthMode || 'welcome';

    if (getModule('AccessOnboardingPanel').render) {
      getModule('AccessOnboardingPanel').render(mount, {
        mode,
        onMode: m => { root._v4AuthMode = m || 'welcome'; renderShell(root); },
        onDemoLogin: handleDemoLogin,
        onSuccess: result => {
          const user = result && result.user;
          root._v4ActiveSection = getModule('UserDashboard').getDefaultSectionForRole
            ? getModule('UserDashboard').getDefaultSectionForRole(user && user.role || 'viewer')
            : 'projects';
          root._v4AuthMode = 'welcome';
          renderShell(root);
          notifyAction(`auth:${user && user.role || 'local'}`);
        }
      });
    } else if (getModule('AuthShell').renderWelcome) {
      getModule('AuthShell').renderWelcome(mount, {
        onAction: a => { root._v4AuthMode = a || 'welcome'; renderShell(root); },
        onDemoLogin: handleDemoLogin
      });
    }
  }

  // ─── Expired guest ────────────────────────────────────────────────────────
  function renderExpiredGuest(root, auth) {
    const user = auth.user;
    const roleLabel = getModule('RolePermissions').getRoleLabel
      ? getModule('RolePermissions').getRoleLabel(auth.role) : auth.role;
    root.innerHTML = `
      <div class="packit-auth-wrap">
        <div class="packit-auth-card">
          <div class="v4-kicker packit-auth-kicker">Проектный доступ</div>
          <h2 class="packit-auth-title">Доступ завершён</h2>
          <p class="v4-muted packit-auth-copy">Проектный ключ истёк или ещё не активен. Обратитесь к администратору.</p>
          <div class="packit-auth-user-row">
            <div>
              <div class="packit-auth-user-name">${escapeHtml(user && (user.displayName || user.email) || 'Гость')}</div>
              <div class="packit-auth-user-role">${escapeHtml(roleLabel)}</div>
            </div>
            <button class="btn-secondary packit-auth-logout-btn" data-v4-logout>Выйти</button>
          </div>
        </div>
      </div>`;
    root.querySelector('[data-v4-logout]').addEventListener('click', () => {
      getModule('AuthProvider').signOut && getModule('AuthProvider').signOut();
      root._v4ActiveSection = '';
      renderShell(root);
    });
  }

  // ─── Основной shell ───────────────────────────────────────────────────────
  function renderAppShell(root, auth) {
    const user = auth.user;
    const role = auth.role;
    const roleLabel = getModule('RolePermissions').getRoleLabel
      ? getModule('RolePermissions').getRoleLabel(role) : role;

    const sections = getModule('UserDashboard').getVisibleSections
      ? getModule('UserDashboard').getVisibleSections(role, user)
      : [];

    const GROUPS = [
      { id: 'main',       title: 'Работа' },
      { id: 'operations', title: 'Операции' },
      { id: 'crm',        title: 'CRM' },
      { id: 'analytics',  title: 'Контроль' },
      { id: 'system',     title: 'Система' },
    ];

    const activeSection = root._v4ActiveSection;
    const activeSectionData = sections.find(s => s.id === activeSection);
    const sectionTitle = activeSectionData ? activeSectionData.title : 'PACK.IT';

    // Инициалы пользователя
    const userName = user && (user.displayName || user.email) || 'User';
    const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Nav items по группам
    const navHTML = GROUPS.map(group => {
      const items = sections.filter(s => (s.group || 'main') === group.id);
      if (!items.length) return '';
      return `
        <div class="packit-nav-group">
          <div class="packit-nav-group-title">${escapeHtml(group.title)}</div>
          ${items.map(s => `
            <button class="packit-nav-item${s.id === activeSection ? ' active' : ''}"
              data-section="${escapeHtml(s.id)}" title="${escapeHtml(s.title)}">
              <span class="packit-nav-icon" aria-hidden="true">${escapeHtml(SECTION_ICONS[s.id] || '·')}</span>
              <span class="packit-nav-label">${escapeHtml(s.title)}</span>
              ${s.badge ? `<span class="packit-nav-badge">${escapeHtml(s.badge)}</span>` : ''}
            </button>`).join('')}
        </div>`;
    }).join('');

    root.innerHTML = `
      <div class="packit-shell" data-v4-active-section="${escapeHtml(activeSection)}">

        <!-- NAV RAIL -->
        <nav class="packit-nav" aria-label="Навигация PACK.IT">
          <div class="packit-nav-logo" role="banner">
            <div class="packit-nav-logo-mark">P</div>
            <div class="packit-nav-logo-text">
              <span class="packit-nav-logo-name">PACK.IT</span>
              <span class="packit-nav-logo-sub">Stage PRO</span>
            </div>
          </div>

          ${auth.isDemo ? '<div class="packit-demo-banner">ЛОКАЛЬНЫЙ РЕЖИМ</div>' : ''}

          <div class="packit-nav-menu" role="navigation">
            ${navHTML}
          </div>

          <div class="packit-nav-footer">
            <div class="packit-nav-user">
              <div class="packit-nav-avatar" title="${escapeHtml(userName)}">${escapeHtml(initials)}</div>
              <div class="packit-nav-user-info">
                <div class="packit-nav-user-name">${escapeHtml(userName)}</div>
                <div class="packit-nav-user-role">${escapeHtml(roleLabel)}</div>
              </div>
              <button class="packit-nav-logout" data-v4-logout title="Выйти">✕</button>
            </div>
          </div>
        </nav>

        <!-- MAIN AREA -->
        <div class="packit-main">
          <header class="packit-topbar">
            <div class="packit-topbar-left">
              <span class="packit-topbar-breadcrumb">PACK.IT</span>
              <span class="packit-topbar-sep">/</span>
              <span class="packit-topbar-title">${escapeHtml(sectionTitle)}</span>
            </div>
            <div class="packit-topbar-right">
              <span class="packit-topbar-workspace">${escapeHtml(user && (user.displayName || user.email) || '')} · ${escapeHtml(user && user.workspaceName || user && user.workspaceId || 'Demo Workspace')}</span>
            </div>
          </header>

          <main class="packit-page" id="v4SectionMount"></main>
        </div>

      </div>`;

    // Events: nav items
    root.querySelectorAll('.packit-nav-item[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sectionId = btn.dataset.section;
        if (!canOpenSection(sectionId, auth)) {
          notifyAction(`denied:${sectionId}`);
          return;
        }
        root._v4ActiveSection = sectionId;
        renderShell(root);
        notifyAction(sectionId);
      });
    });

    // Event: logout
    const logoutBtn = root.querySelector('[data-v4-logout]');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        getModule('AuthProvider').signOut && getModule('AuthProvider').signOut();
        root._v4ActiveSection = '';
        renderShell(root);
        notifyAction('logout');
      });
    }

    // Рендерим активный раздел
    const mount = root.querySelector('#v4SectionMount');
    if (mount) renderActiveSection(root, mount, auth);
  }

  // ─── Рендер активного раздела ─────────────────────────────────────────────
  function renderActiveSection(root, mount, auth) {
    const section = root._v4ActiveSection;
    if (!canOpenSection(section, auth)) {
      mount.innerHTML = renderDenied(section, auth);
      return;
    }
    if (section === 'quick')          return renderQuick(root, mount, auth);
    if (section === 'quote')          return renderQuote(root, mount, auth);
    if (section === 'equipment')      return renderEquipment(root, mount, auth);
    if (section === 'subrentors')     return renderSubrentors(root, mount, auth);
    if (section === 'site_checklist') return renderSiteChecklist(root, mount, auth);
    if (section === 'warehouse')      return renderWarehouse(root, mount, auth);
    if (section === 'projects')       return renderProjects(root, mount, auth);
    if (section === 'documents')      return renderDocuments(root, mount, auth);
    if (section === 'clients')        return renderClients(root, mount, auth);
    if (section === 'communication')  return renderCommunication(root, mount, auth);
    if (section === 'settings')       return renderSettings(root, mount, auth);
    if (section === 'command')        return renderCommand(root, mount, auth);
    if (section === 'reports')        return renderReports(root, mount, auth);
    if (section === 'quality')        return renderQuality(root, mount, auth);
    if (section === 'sync')           return renderSync(root, mount, auth);
    if (section === 'admin')          return renderAdmin(root, mount, auth);
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Dashboard</div><h3>Раздел не найден</h3><p class="v4-muted">Выберите пункт меню.</p></div>`;
  }

  // ─── Рендеры разделов ────────────────────────────────────────────────────
  function renderQuick(root, mount, auth) {
    const CALCS = [
      { id: 'stage', title: 'Сцена',     icon: '▦', desc: 'Схема · Техлист · Склад · Вес' },
      { id: 'truss', title: 'Фермы',     icon: '△', desc: 'Схема · Техлист · Склад · Вес' },
      { id: 'led',   title: 'LED экран', icon: '▣', desc: 'Кабинеты · Кабели · Мощность · Вес' },
      { id: 'mdm',   title: '3D фермы MDM', icon: '⬡', desc: 'GLB · Просмотр · Масштаб · Sandbox' },
    ];

    // Активный калькулятор (по умолчанию — первый)
    if (!mount._quickActiveKind) mount._quickActiveKind = 'stage';

    function renderQuickLayout() {
      const kind = mount._quickActiveKind;

      mount.innerHTML = `
        <div class="packit-quick-shell">

          <!-- Переключатели сверху -->
          <div class="packit-quick-tabs">
            ${CALCS.map(c => `
              <button class="packit-quick-tab${c.id === kind ? ' active' : ''}"
                data-quick-kind="${escapeHtml(c.id)}">
                <span class="packit-quick-tab-icon">${escapeHtml(c.icon)}</span>
                <span class="packit-quick-tab-name">${escapeHtml(c.title)}</span>
                ${c.desc ? `<span class="packit-quick-tab-desc">${escapeHtml(c.desc)}</span>` : ''}
              </button>`).join('')}
          </div>

          <!-- Основная зона: конфигуратор (3 колонки внутри него) -->
          <div class="packit-quick-body">
            <div id="v4QuickConfigMount" class="packit-quick-config-area"></div>
          </div>

          <!-- Нижняя зона: техлисты и BOM -->
          <div class="packit-quick-bottom">
            <div id="v4QuickDocsMount"></div>
            <div id="v4QuickBomMount"></div>
          </div>

        </div>`;

      // Переключение вкладок
      mount.querySelectorAll('[data-quick-kind]').forEach(btn => {
        btn.addEventListener('click', () => {
          mount._quickActiveKind = btn.dataset.quickKind;
          // Синхронизируем секции перед переключением
          const QC = getModule('QuickCalculators');
          if (QC.syncOpenQuickModalSections && mount._quickRoot) {
            QC.syncOpenQuickModalSections(mount._quickRoot);
          }
          renderQuickLayout();
        });
      });

      // Рендерим конфигуратор прямо в area (не в модал)
      const configMount = mount.querySelector('#v4QuickConfigMount');
      const QC = getModule('QuickCalculators');

      if (!QC.renderStageConfigurator) {
        configMount.innerHTML = `<div class="v4-note">QuickCalculators не загружен.</div>`;
        return;
      }

      // Создаём единый root-объект для хранения секций (как раньше был root в renderQuickCalculators)
      if (!mount._quickRoot) {
        mount._quickRoot = document.createElement('div');
        mount._quickRoot.style.display = 'none';
        // Гидратируем черновики
        if (QC.hydrateQuickDrafts) QC.hydrateQuickDrafts(mount._quickRoot);
      }
      const quickRoot = mount._quickRoot;

      // Колбэк синхронизации секций
      const onChange = (sectionKey, section, input) => {
        if (QC.setQuickSection || (quickRoot && QC.markQuickBomDirty)) {
          quickRoot[`_quick${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}Section`] = section;
          quickRoot[`_quick${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)}Input`] = input || (section && section.input) || null;
          if (QC.markQuickBomDirty) QC.markQuickBomDirty(quickRoot, sectionKey);
        }
      };

      if (kind === 'stage') {
        if (getModule('V4StructureVisualConfigurator').renderStageConfigurator) {
          getModule('V4StructureVisualConfigurator').renderStageConfigurator(configMount, {
            mode: 'quick',
            title: 'Быстрый конфигуратор сцены',
            input: QC.readQuickDraft ? (QC.readQuickDraft('stage') || {}).input : {},
            onChange: (section, input) => { onChange('stage', section, input); }
          });
        } else {
          QC.renderStageConfigurator(configMount, quickRoot);
        }
      } else if (kind === 'truss') {
        if (getModule('V4StructureVisualConfigurator').renderTrussConfigurator) {
          getModule('V4StructureVisualConfigurator').renderTrussConfigurator(configMount, {
            mode: 'quick',
            title: 'Быстрый конфигуратор ферм',
            input: QC.readQuickDraft ? (QC.readQuickDraft('truss') || {}).input : { items: [], state: {} },
            onChange: (section, input) => { onChange('truss', section, input); }
          });
        } else {
          QC.renderTrussConfigurator(configMount, quickRoot);
        }
      } else if (kind === 'led') {
        QC.renderLedConfigurator(configMount, quickRoot);

      } else if (kind === 'mdm') {
        // 3D MDM — заглушка, модуль в разработке
        configMount.innerHTML = `
          <div class="packit-mdm-placeholder">
            <div class="packit-mdm-placeholder-icon">⬡</div>
            <div class="packit-mdm-placeholder-title">3D фермы MDM</div>
            <div class="packit-mdm-placeholder-desc">
              Конструктор на основе реальных 3D-моделей MDM: просмотр GLB-файлов,
              сборка конструкции из отдельных элементов, BOM, нагрузки, точки подвеса.
            </div>
            <div class="packit-mdm-placeholder-meta">
              <span>Asset library · 3D Viewer · Assembly · BOM Preview</span>
              <span class="packit-mdm-placeholder-badge">В разработке</span>
            </div>
          </div>`;
      }

      // Нижняя зона: техлисты
      const docsMount = mount.querySelector('#v4QuickDocsMount');
      if (docsMount && QC.renderQuickCalculators) {
        // Рендерим только docs-часть через отдельный div
        const tempRoot = document.createElement('div');
        QC.renderQuickCalculators(tempRoot, { onOpen: () => {} });
        // Копируем только docs-секцию
        const docsSection = tempRoot.querySelector('[data-v4-quick-docs]');
        if (docsSection) {
          docsMount.appendChild(docsSection);
          // Перепривязываем quickRoot чтобы кнопки работали
          mount._quickRoot = tempRoot;
        }
      }

      // BOM inspector
      const bomMount = mount.querySelector('#v4QuickBomMount');
      if (bomMount && QC.renderQuickBomInspectorPlaceholder) {
        const tempBom = document.createElement('div');
        tempBom.setAttribute('data-v4-bom-inspector', '');
        bomMount.appendChild(tempBom);
        // Создаём минимальный root с нужными слотами
        const bomRoot = { querySelector: sel => sel === '[data-v4-bom-inspector]' ? tempBom : null, _v4QuickBomInspectorEnabled: false, _v4QuickBomDirty: false };
        if (QC.renderQuickBomInspectorPlaceholder) QC.renderQuickBomInspectorPlaceholder(bomRoot);
      }
    }

    renderQuickLayout();
  }

  function renderQuote(root, mount, auth) {
    mount.innerHTML = `<div id="v4WizardMount"></div>`;
    getModule('QuoteWizard').renderWizardMap &&
      getModule('QuoteWizard').renderWizardMap(mount.querySelector('#v4WizardMount'));
  }

  function renderEquipment(root, mount, auth) {
    mount.innerHTML = `<div id="v4EquipmentMount"></div>`;
    getModule('EquipmentDatabaseUI').renderEquipmentDatabase &&
      getModule('EquipmentDatabaseUI').renderEquipmentDatabase(mount.querySelector('#v4EquipmentMount'));
  }

  function renderSubrentors(root, mount, auth) {
    mount.innerHTML = `<div id="v4SubrentorsMount"></div>`;
    if (getModule('SubrentorsDirectoryUI').renderSubrentorsDirectory) {
      getModule('SubrentorsDirectoryUI').renderSubrentorsDirectory(mount.querySelector('#v4SubrentorsMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Субаренда</div><h3>Субаренда</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderSiteChecklist(root, mount, auth) {
    mount.innerHTML = `<div id="v4SiteChecklistMount"></div>`;
    if (getModule('SiteChecklist').renderSiteChecklist) {
      getModule('SiteChecklist').renderSiteChecklist(mount.querySelector('#v4SiteChecklistMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Площадка</div><h3>Чек-лист площадки</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderWarehouse(root, mount, auth) {
    mount.innerHTML = `<div id="v4WarehouseOperationsMount"></div>`;
    if (getModule('WarehouseOperationsHub').renderHub) {
      getModule('WarehouseOperationsHub').renderHub(mount.querySelector('#v4WarehouseOperationsMount'), {
        onOpenProjects: () => { root._v4ActiveSection = 'projects'; renderShell(root); },
        onOpenEquipment: () => { root._v4ActiveSection = 'equipment'; renderShell(root); },
        onOpenProject: projectId => {
          try {
            getModule('QuoteProjectStorage').restoreProjectToDraft &&
              getModule('QuoteProjectStorage').restoreProjectToDraft(projectId);
            root._v4ActiveSection = 'quote';
            renderShell(root);
            notifyAction('warehouse:open-project');
          } catch (err) { notifyAction('warehouse:open-project-error'); }
        }
      });
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Склад</div><h3>Склад / Наличие</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderProjects(root, mount, auth) {
    mount.innerHTML = `<div id="v4ProjectsMount"></div>`;
    getModule('QuoteProjectsUI').renderProjects &&
      getModule('QuoteProjectsUI').renderProjects(mount.querySelector('#v4ProjectsMount'), {
        onOpen: () => { root._v4ActiveSection = 'quote'; renderShell(root); notifyAction('project:open'); }
      });
  }

  function renderDocuments(root, mount, auth) {
    mount.innerHTML = `<div id="v4DocumentCenterMount"></div>`;
    if (getModule('DocumentCenter').renderDocumentCenter) {
      getModule('DocumentCenter').renderDocumentCenter(mount.querySelector('#v4DocumentCenterMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Документы</div><h3>Центр документов</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderClients(root, mount, auth) {
    mount.innerHTML = `<div id="v4ClientsMount"></div>`;
    if (getModule('V4ClientsPanel').renderClientsPanel) {
      getModule('V4ClientsPanel').renderClientsPanel(mount.querySelector('#v4ClientsMount'), {
        onOpenQuote: () => { root._v4ActiveSection = 'quote'; renderShell(root); notifyAction('client:quote'); }
      });
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Клиенты</div><h3>Клиенты</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderCommunication(root, mount, auth) {
    mount.innerHTML = `<div id="v4CommunicationMount"></div>`;
    if (getModule('CommunicationCenter').renderCommunicationCenter) {
      getModule('CommunicationCenter').renderCommunicationCenter(
        mount.querySelector('#v4CommunicationMount'), { role: auth.role, user: auth.user }
      );
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Чаты</div><h3>Чаты / Уведомления</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderSettings(root, mount, auth) {
    mount.innerHTML = `<div id="v4SettingsMount"></div>`;
    getModule('SettingsPanel').renderSettingsPanel &&
      getModule('SettingsPanel').renderSettingsPanel(mount.querySelector('#v4SettingsMount'));
  }

  function renderCommand(root, mount, auth) {
    mount.innerHTML = `<div id="v4CommandCenterMount"></div>`;
    if (getModule('CommandCenter').renderCommandCenter) {
      getModule('CommandCenter').renderCommandCenter(mount.querySelector('#v4CommandCenterMount'), {
        role: auth.role,
        onOpenSection: sectionId => {
          if (!canOpenSection(sectionId, auth)) return false;
          root._v4ActiveSection = sectionId;
          renderShell(root);
          notifyAction(`command:${sectionId}`);
          return true;
        },
        onOpenProject: projectId => {
          try {
            getModule('QuoteProjectStorage').restoreProjectToDraft &&
              getModule('QuoteProjectStorage').restoreProjectToDraft(projectId);
            root._v4ActiveSection = 'quote';
            renderShell(root);
            notifyAction('command:project');
          } catch (err) { notifyAction('command:project-error'); }
        }
      });
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Поиск</div><h3>Поиск / Команды</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderReports(root, mount, auth) {
    mount.innerHTML = `<div id="v4ReportsCenterMount"></div>`;
    if (getModule('ReportsCenter').renderReportsCenter) {
      getModule('ReportsCenter').renderReportsCenter(mount.querySelector('#v4ReportsCenterMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Отчёты</div><h3>Отчёты</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderQuality(root, mount, auth) {
    mount.innerHTML = `<div id="v4DataQualityMount"></div>`;
    if (getModule('DataQualityCenter').renderDataQualityCenter) {
      getModule('DataQualityCenter').renderDataQualityCenter(mount.querySelector('#v4DataQualityMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Контроль</div><h3>Контроль данных</h3><p class="v4-muted">Модуль не загружен.</p></div>`;
  }

  function renderSync(root, mount, auth) {
    var SYNC_MODULES = [
      { label: 'Supabase Backend Pack',   mod: 'SupabaseBackendPack',      fn: 'renderBackendPackConsole' },
      { label: 'Quote Backend Sync',      mod: 'QuoteBackendSyncPack',     fn: 'renderQuoteBackendSyncConsole' },
      { label: 'Supabase Auth Adapter',   mod: 'SupabaseAuthAdapter',      fn: 'renderAuthConsole' },
      { label: 'Server Test Harness',     mod: 'ServerTestHarness',        fn: 'renderServerTestHarness' },
      { label: 'Quote Sync Queue',        mod: 'QuoteServerSyncQueue',     fn: 'renderQueueConsole' },
      { label: 'Equipment Sync Queue',    mod: 'EquipmentServerSyncQueue', fn: 'renderEquipmentSyncConsole' },
      { label: 'Write Dry Run / Console', mod: 'BackendWriteDryRun',       fn: 'renderWriteDryRunConsole',
        fallback: { mod: 'SupabaseSyncConsole', fn: 'renderSyncConsole' } },
    ];

    mount.innerHTML = `
      <div class="v4-sync-stack">
        <div class="packit-card packit-sync-card">
          <div class="v4-kicker">Backend / Sync</div>
          <h3 class="packit-sync-title">Консоли синхронизации</h3>
          <p class="v4-muted packit-sync-copy">
            Каждая консоль загружается отдельно. Нажмите кнопку чтобы открыть.
          </p>
          <div class="v4-sync-actions packit-sync-actions" id="v4SyncBtns"></div>
        </div>
        <div id="v4SyncActiveMount"></div>
      </div>`;

    var btnsEl = mount.querySelector('#v4SyncBtns');
    var activeMount = mount.querySelector('#v4SyncActiveMount');
    var activeIdx = -1;

    SYNC_MODULES.forEach(function(item, idx) {
      var mod = getModule(item.mod);
      var available = !!(mod[item.fn] || (item.fallback && getModule(item.fallback.mod)[item.fallback.fn]));
      var btn = document.createElement('button');
      btn.className = available ? 'btn-secondary' : 'btn-secondary';
      btn.textContent = item.label;
      if (!available) { btn.disabled = true; btn.classList.add('is-disabled'); }
      btn.addEventListener('click', function() {
        if (activeIdx === idx) {
          activeMount.innerHTML = '';
          activeIdx = -1;
          btnsEl.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
          return;
        }
        activeIdx = idx;
        btnsEl.querySelectorAll('button').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        activeMount.innerHTML = '<div class="v4-note packit-sync-loading">Загрузка...</div>';
        setTimeout(function() {
          activeMount.innerHTML = '';
          var m = getModule(item.mod);
          if (m[item.fn]) {
            m[item.fn](activeMount);
          } else if (item.fallback) {
            var fb = getModule(item.fallback.mod);
            if (fb[item.fallback.fn]) fb[item.fallback.fn](activeMount);
          }
        }, 30);
      });
      btnsEl.appendChild(btn);
    });
  }

  function renderAdmin(root, mount, auth) {
    mount.innerHTML = `<div id="v4AdminMount"></div>`;
    const adminMount = mount.querySelector('#v4AdminMount');
    if (getModule('AdminControlCenter').renderAdminControlCenter) {
      getModule('AdminControlCenter').renderAdminControlCenter(adminMount, {
        onGenerate: invite => notifyAction(`invite:${invite.key}`)
      });
      return;
    }
    getModule('AdminShell').renderAdminDashboard &&
      getModule('AdminShell').renderAdminDashboard(adminMount, {
        onGenerate: invite => notifyAction(`invite:${invite.key}`)
      });
  }

  // ─── Guards ───────────────────────────────────────────────────────────────
  function getSectionGuard(sectionId, auth) {
    if (!auth || !auth.isAuthenticated) return { ok: false, section_id: sectionId, role: 'viewer', reason: 'not_authenticated' };
    if (ROOT.AuthProvider && ROOT.AuthProvider.assertRuntimeSectionAccess) {
      return ROOT.AuthProvider.assertRuntimeSectionAccess(sectionId, { authState: auth, role: auth.role, activeSection: sectionId });
    }
    const ok = ROOT.RolePermissions && ROOT.RolePermissions.canSeeSection
      ? ROOT.RolePermissions.canSeeSection(auth.role, sectionId) : true;
    return { ok, section_id: sectionId, role: auth.role, fallback_section: 'projects' };
  }

  function canOpenSection(sectionId, auth) { return getSectionGuard(sectionId, auth).ok; }

  function renderDenied(sectionId, auth) {
    const guard = getSectionGuard(sectionId, auth);
    const roleLabel = ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel
      ? ROOT.RolePermissions.getRoleLabel(guard.role || auth.role) : (guard.role || auth.role);
    return `<div class="v4-card"><div class="v4-kicker">Доступ ограничен</div><h3>Раздел скрыт</h3><p class="v4-muted">Раздел <b>${escapeHtml(sectionId)}</b> недоступен для роли <b>${escapeHtml(roleLabel)}</b>.</p></div>`;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function handleDemoLogin(role) {
    try {
      const user = getModule('AuthProvider').signInDemo(role);
      notifyAction(`local:${user.role}`);
      const page = document.getElementById('v4ShellPage');
      if (page) {
        page._v4ActiveSection = getModule('UserDashboard').getDefaultSectionForRole
          ? getModule('UserDashboard').getDefaultSectionForRole(user.role) : '';
        renderShell(page);
      }
    } catch (err) { notifyAction(err.message || 'local auth disabled'); }
  }

  function notifyAction(action) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(`${action}`);
    else if (window.showToast) window.showToast(`${action}`);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function openV4Preview() {
    const v4Page = document.getElementById('v4ShellPage');
    if (!v4Page) return;
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active-page'));
    v4Page.classList.add('active-page');
    renderShell(v4Page);
    window.location.hash = 'app';
  }

  function closeV4Preview() {
    const page = document.getElementById('v4ShellPage');
    if (page) renderShell(page);
  }

  function init() {
    const page = document.getElementById('v4ShellPage');
    if (page && !page.dataset.v4Ready) {
      page.dataset.v4Ready = '1';
      renderShell(page);
    }
    if (window.location.hash !== '#app') window.location.hash = 'app';
  }

  ROOT.V4AppShell = {
    renderShell, openV4Preview, closeV4Preview, init,
    handleDemoLogin, renderActiveSection, getSectionGuard, canOpenSection, renderReports
  };
  window.openV4Preview = openV4Preview;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();