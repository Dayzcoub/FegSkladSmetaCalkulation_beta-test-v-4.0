(function () {
  'use strict';
  const ROOT = (window.FEGModules = window.FEGModules || {});

  function getModule(name) { return ROOT[name] || {}; }
  function getAuthState() { return getModule('AuthProvider').getAuthState ? getModule('AuthProvider').getAuthState() : { isAuthenticated: false, role: 'viewer', user: null }; }

  function renderShell(target) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const auth = getAuthState();
    const user = auth.user;
    const roleLabel = ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel ? ROOT.RolePermissions.getRoleLabel(auth.role) : auth.role;
    const defaultSection = ROOT.UserDashboard && ROOT.UserDashboard.getDefaultSectionForRole ? ROOT.UserDashboard.getDefaultSectionForRole(auth.role) : 'quick';
    if (!root._v4ActiveSection || !canOpenSection(root._v4ActiveSection, auth)) root._v4ActiveSection = defaultSection;

    root.innerHTML = `
      <div class="v4-shell" data-v4-active-section="${escapeHtml(root._v4ActiveSection || '')}">
        <div class="v4-hero">
          <div>
            <div class="v4-kicker">demo auth preview</div>
            <h2>FEG Stage PRO v4.0</h2>
            <p>Новый каркас: авторизация, роли, главное меню, быстрые расчёты, мастер сметы, склад, документы и единая база оборудования.</p>
            ${auth.isDemo ? '<div class="v4-demo-mode-banner">DEMO MODE — данные не сохраняются в боевое облако</div>' : ''}
          </div>
          <div class="v4-userbox">
            ${auth.isAuthenticated ? `<b>${escapeHtml(user.displayName || user.email)}</b><span>${escapeHtml(roleLabel)} · ${escapeHtml(user.workspaceName || user.workspaceId || '')}</span><button type="button" class="btn-secondary" data-v4-logout>Выйти</button>` : '<span class="v4-muted">Пользователь не выбран</span>'}
            <button type="button" class="btn-secondary" data-v4-close>Вернуться к v3.7</button>
          </div>
        </div>
        <div id="v4AuthMount"></div>
        <div id="v4DashboardMount"></div>
        <div id="v4SectionMount" class="v4-wide-section"></div>
      </div>`;

    renderAccess(root, auth);

    if (auth.isAuthenticated) {
      renderDashboard(root, auth);
      renderActiveSection(root, auth);
    } else {
      root.querySelector('#v4DashboardMount').innerHTML = `<div class="v4-card"><div class="v4-kicker">Role testing</div><h3>Выберите демо-роль</h3><p class="v4-muted">После входа появится главное меню, отфильтрованное по правам выбранной роли.</p></div>`;
      root.querySelector('#v4SectionMount').innerHTML = '';
    }

    const closeBtn = root.querySelector('[data-v4-close]');
    if (closeBtn) closeBtn.addEventListener('click', closeV4Preview);
    const logoutBtn = root.querySelector('[data-v4-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { getModule('AuthProvider').signOut && getModule('AuthProvider').signOut(); root._v4ActiveSection = ''; renderShell(root); notifyAction('demo:logout'); });
    return root;
  }


  function renderAccess(root, auth) {
    const mount = root.querySelector('#v4AuthMount');
    if (!mount) return;
    if (auth.isAuthenticated) {
      mount.innerHTML = '';
      root._v4AuthMode = 'welcome';
      return;
    }
    const mode = root._v4AuthMode || 'welcome';
    if (getModule('AccessOnboardingPanel').render) {
      getModule('AccessOnboardingPanel').render(mount, {
        mode,
        onMode: nextMode => {
          root._v4AuthMode = nextMode || 'welcome';
          renderShell(root);
        },
        onDemoLogin: handleDemoLogin,
        onSuccess: result => {
          const user = result && result.user;
          root._v4ActiveSection = ROOT.UserDashboard && ROOT.UserDashboard.getDefaultSectionForRole ? ROOT.UserDashboard.getDefaultSectionForRole(user && user.role || 'viewer') : 'projects';
          root._v4AuthMode = 'welcome';
          renderShell(root);
          notifyAction(`auth:${user && user.role || 'local'}`);
        }
      });
      return;
    }
    getModule('AuthShell').renderWelcome && getModule('AuthShell').renderWelcome(mount, { onAction: action => {
      root._v4AuthMode = action || 'welcome';
      renderShell(root);
    }, onDemoLogin: handleDemoLogin });
  }

  function renderDashboard(root, auth) {
    const mount = root.querySelector('#v4DashboardMount');
    const user = auth.user;
    getModule('UserDashboard').renderDashboard && getModule('UserDashboard').renderDashboard(mount, {
      user,
      role: auth.role,
      activeSection: root._v4ActiveSection,
      onSelect: sectionId => {
        if (!canOpenSection(sectionId, auth)) {
          notifyAction(`denied:${sectionId}`);
          return;
        }
        root._v4ActiveSection = sectionId;
        renderShell(root);
        notifyAction(sectionId);
      }
    });
  }

  function renderActiveSection(root, auth) {
    const mount = root.querySelector('#v4SectionMount');
    if (!mount) return;
    const section = root._v4ActiveSection;
    if (!canOpenSection(section, auth)) {
      mount.innerHTML = renderDenied(section, auth);
      return;
    }
    if (section === 'quick') return renderQuick(root, mount, auth);
    if (section === 'quote') return renderQuote(root, mount, auth);
    if (section === 'equipment') return renderEquipment(root, mount, auth);
    if (section === 'warehouse') return renderWarehouse(root, mount, auth);
    if (section === 'projects') return renderProjects(root, mount, auth);
    if (section === 'documents') return renderDocuments(root, mount, auth);
    if (section === 'clients') return renderClients(root, mount, auth);
    if (section === 'settings') return renderSettings(root, mount, auth);
    if (section === 'command') return renderCommand(root, mount, auth);
    if (section === 'reports') return renderReports(root, mount, auth);
    if (section === 'quality') return renderQuality(root, mount, auth);
    if (section === 'sync') return renderSync(root, mount, auth);
    if (section === 'admin') return renderAdmin(root, mount, auth);
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Dashboard</div><h3>Раздел не найден</h3><p class="v4-muted">Выберите пункт главного меню.</p></div>`;
  }

  function renderQuick(root, mount, auth) {
    mount.innerHTML = `<div id="v4QuickMount"></div><div id="v4LedMount"></div>`;
    getModule('QuickCalculators').renderQuickCalculators && getModule('QuickCalculators').renderQuickCalculators(mount.querySelector('#v4QuickMount'), { onOpen: action => { notifyAction(action); if (action === 'led') renderLedPreview(mount); } });
    renderLedPreview(mount);
  }

  function renderQuote(root, mount, auth) {
    mount.innerHTML = `<div id="v4WizardMount"></div>`;
    getModule('QuoteWizard').renderWizardMap && getModule('QuoteWizard').renderWizardMap(mount.querySelector('#v4WizardMount'));
  }

  function renderEquipment(root, mount, auth) {
    mount.innerHTML = `<div id="v4EquipmentMount"></div>`;
    getModule('EquipmentDatabaseUI').renderEquipmentDatabase && getModule('EquipmentDatabaseUI').renderEquipmentDatabase(mount.querySelector('#v4EquipmentMount'));
  }

  function renderWarehouse(root, mount, auth) {
    mount.innerHTML = `<div id="v4WarehouseOperationsMount"></div>`;
    const hubMount = mount.querySelector('#v4WarehouseOperationsMount');
    if (getModule('WarehouseOperationsHub').renderHub) {
      getModule('WarehouseOperationsHub').renderHub(hubMount, {
        onOpenProjects: () => { root._v4ActiveSection = 'projects'; renderShell(root); },
        onOpenEquipment: () => { root._v4ActiveSection = 'equipment'; renderShell(root); },
        onOpenProject: projectId => {
          try {
            getModule('QuoteProjectStorage').restoreProjectToDraft && getModule('QuoteProjectStorage').restoreProjectToDraft(projectId);
            root._v4ActiveSection = 'quote';
            renderShell(root);
            notifyAction('warehouse:open-project');
          } catch (err) {
            notifyAction('warehouse:open-project-error');
          }
        }
      });
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Warehouse</div><h3>Склад / Операции</h3><p class="v4-muted">WarehouseOperationsHub не загружен.</p></div>`;
  }

  function renderDocuments(root, mount, auth) {
    mount.innerHTML = `<div id="v4DocumentCenterMount"></div>`;
    if (getModule('DocumentCenter').renderDocumentCenter) {
      getModule('DocumentCenter').renderDocumentCenter(mount.querySelector('#v4DocumentCenterMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Documents</div><h3>Центр документов</h3><p class="v4-muted">DocumentCenter не загружен.</p></div>`;
  }

  function renderProjects(root, mount, auth) {
    mount.innerHTML = `<div id="v4ProjectsMount"></div>`;
    getModule('QuoteProjectsUI').renderProjects && getModule('QuoteProjectsUI').renderProjects(mount.querySelector('#v4ProjectsMount'), { onOpen: () => {
      root._v4ActiveSection = 'quote';
      renderShell(root);
      notifyAction('project:open');
    } });
  }

  function renderClients(root, mount, auth) {
    mount.innerHTML = `<div id="v4ClientsMount"></div>`;
    if (getModule('V4ClientsPanel').renderClientsPanel) {
      getModule('V4ClientsPanel').renderClientsPanel(mount.querySelector('#v4ClientsMount'), {
        onOpenQuote: () => {
          root._v4ActiveSection = 'quote';
          renderShell(root);
          notifyAction('client:quote');
        }
      });
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Clients</div><h3>Клиенты</h3><p class="v4-muted">V4ClientsPanel не загружен.</p></div>`;
  }

  function renderSettings(root, mount, auth) {
    mount.innerHTML = `<div id="v4SettingsMount"></div>`;
    getModule('SettingsPanel').renderSettingsPanel && getModule('SettingsPanel').renderSettingsPanel(mount.querySelector('#v4SettingsMount'));
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
            getModule('QuoteProjectStorage').restoreProjectToDraft && getModule('QuoteProjectStorage').restoreProjectToDraft(projectId);
            root._v4ActiveSection = 'quote';
            renderShell(root);
            notifyAction('command:project');
          } catch (err) {
            notifyAction('command:project-error');
          }
        }
      });
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Command Center</div><h3>Поиск / Команды</h3><p class="v4-muted">CommandCenter не загружен.</p></div>`;
  }

  function renderReports(root, mount, auth) {
    mount.innerHTML = `<div id="v4ReportsCenterMount"></div>`;
    if (getModule('ReportsCenter').renderReportsCenter) {
      getModule('ReportsCenter').renderReportsCenter(mount.querySelector('#v4ReportsCenterMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Reports</div><h3>Отчёты</h3><p class="v4-muted">ReportsCenter не загружен.</p></div>`;
  }

  function renderQuality(root, mount, auth) {
    mount.innerHTML = `<div id="v4DataQualityMount"></div>`;
    if (getModule('DataQualityCenter').renderDataQualityCenter) {
      getModule('DataQualityCenter').renderDataQualityCenter(mount.querySelector('#v4DataQualityMount'));
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Data Quality</div><h3>Контроль данных</h3><p class="v4-muted">DataQualityCenter не загружен.</p></div>`;
  }

  function renderSync(root, mount, auth) {
    mount.innerHTML = `<div class="v4-sync-stack"><div id="v4BackendPackMount"></div><div id="v4QuoteBackendPackMount"></div><div id="v4SupabaseAuthMount"></div><div id="v4ServerTestHarnessMount"></div><div id="v4QuoteSyncQueueMount"></div><div id="v4EquipmentSyncQueueMount"></div><div id="v4SyncConsoleMount"></div></div>`;
    const backendPackMount = mount.querySelector('#v4BackendPackMount');
    const quoteBackendPackMount = mount.querySelector('#v4QuoteBackendPackMount');
    const authMount = mount.querySelector('#v4SupabaseAuthMount');
    const serverTestMount = mount.querySelector('#v4ServerTestHarnessMount');
    const quoteSyncMount = mount.querySelector('#v4QuoteSyncQueueMount');
    const equipmentSyncMount = mount.querySelector('#v4EquipmentSyncQueueMount');
    const syncMount = mount.querySelector('#v4SyncConsoleMount');
    if (getModule('SupabaseBackendPack').renderBackendPackConsole) getModule('SupabaseBackendPack').renderBackendPackConsole(backendPackMount);
    if (getModule('QuoteBackendSyncPack').renderQuoteBackendSyncConsole) getModule('QuoteBackendSyncPack').renderQuoteBackendSyncConsole(quoteBackendPackMount);
    if (getModule('SupabaseAuthAdapter').renderAuthConsole) getModule('SupabaseAuthAdapter').renderAuthConsole(authMount);
    if (getModule('ServerTestHarness').renderServerTestHarness) getModule('ServerTestHarness').renderServerTestHarness(serverTestMount);
    if (getModule('QuoteServerSyncQueue').renderQueueConsole) getModule('QuoteServerSyncQueue').renderQueueConsole(quoteSyncMount);
    if (getModule('EquipmentServerSyncQueue').renderEquipmentSyncConsole) getModule('EquipmentServerSyncQueue').renderEquipmentSyncConsole(equipmentSyncMount);
    if (getModule('BackendWriteDryRun').renderWriteDryRunConsole) {
      getModule('BackendWriteDryRun').renderWriteDryRunConsole(syncMount);
      return;
    }
    if (getModule('SupabaseSyncConsole').renderSyncConsole) {
      getModule('SupabaseSyncConsole').renderSyncConsole(syncMount);
      return;
    }
    mount.innerHTML = `<div class="v4-card"><div class="v4-kicker">Backend</div><h3>Backend / Sync</h3><p class="v4-muted">SupabaseSyncConsole не загружен.</p></div>`;
  }

  function renderAdmin(root, mount, auth) {
    mount.innerHTML = `<div id="v4AdminMount"></div>`;
    const adminMount = mount.querySelector('#v4AdminMount');
    if (getModule('AdminControlCenter').renderAdminControlCenter) {
      getModule('AdminControlCenter').renderAdminControlCenter(adminMount, { onGenerate: invite => notifyAction(`invite:${invite.key}`) });
      return;
    }
    getModule('AdminShell').renderAdminDashboard && getModule('AdminShell').renderAdminDashboard(adminMount, { onGenerate: invite => notifyAction(`invite:${invite.key}`) });
  }

  function renderLedPreview(container) {
    const mount = container && container.querySelector ? container.querySelector('#v4LedMount') : null;
    if (!mount) return;
    if (getModule('LedCalculatorUI').renderLedCalculator) {
      getModule('LedCalculatorUI').renderLedCalculator(mount);
    }
  }

  function canOpenSection(sectionId, auth) {
    if (!auth || !auth.isAuthenticated) return false;
    return ROOT.RolePermissions && ROOT.RolePermissions.canSeeSection ? ROOT.RolePermissions.canSeeSection(auth.role, sectionId) : true;
  }

  function renderDenied(sectionId, auth) {
    const roleLabel = ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel ? ROOT.RolePermissions.getRoleLabel(auth.role) : auth.role;
    return `<div class="v4-card"><div class="v4-kicker">Access denied</div><h3>Раздел скрыт</h3><p class="v4-muted">Раздел ${escapeHtml(sectionId)} недоступен для роли ${escapeHtml(roleLabel)}.</p></div>`;
  }

  function handleDemoLogin(role) {
    try {
      const user = getModule('AuthProvider').signInDemo(role);
      notifyAction(`demo:${user.role}`);
      const page = document.getElementById('v4ShellPage');
      if (page) {
        page._v4ActiveSection = ROOT.UserDashboard && ROOT.UserDashboard.getDefaultSectionForRole ? ROOT.UserDashboard.getDefaultSectionForRole(user.role) : '';
        renderShell(page);
      }
    } catch (err) {
      notifyAction(err.message || 'demo auth disabled');
    }
  }

  function notifyAction(action) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(`v4: ${action}`);
    else if (window.showToast) window.showToast(`v4: ${action}`);
  }

  function openV4Preview() {
    const v4Page = document.getElementById('v4ShellPage');
    if (!v4Page) return;
    if (ROOT.NavigationManager && typeof ROOT.NavigationManager.setPage === 'function') {
      ROOT.NavigationManager.setPage('v4', { updateHash: true, scroll: true });
      return;
    }
    document.querySelectorAll('.app-page').forEach(page => page.classList.remove('active-page'));
    document.querySelectorAll('.page-tab').forEach(btn => btn.classList.remove('active'));
    v4Page.classList.add('active-page');
    renderShell(v4Page);
    window.location.hash = 'v4';
  }

  function closeV4Preview() {
    if (window.setAppPage) window.setAppPage('stage');
    else window.location.hash = 'stage';
  }

  function init() {
    const page = document.getElementById('v4ShellPage');
    if (page && !page.dataset.v4Ready) {
      page.dataset.v4Ready = '1';
      renderShell(page);
    }
    if (window.location.hash === '#v4') openV4Preview();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.V4AppShell = { renderShell, openV4Preview, closeV4Preview, init, handleDemoLogin, renderActiveSection, canOpenSection, renderReports };
  window.openV4Preview = openV4Preview;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
