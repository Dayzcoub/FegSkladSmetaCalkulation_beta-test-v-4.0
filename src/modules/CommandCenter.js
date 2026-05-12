(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const COMMAND_CENTER_VERSION = '3.9.7';

  const GROUP_LABELS = Object.freeze({
    navigation: 'Разделы',
    project: 'Проекты',
    client: 'Клиенты',
    equipment: 'Оборудование',
    document: 'Документы',
    action: 'Действия'
  });

  function getRole() {
    const auth = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : null;
    return auth && auth.role ? auth.role : 'viewer';
  }

  function canSee(sectionId, role) {
    if (!ROOT.RolePermissions || !ROOT.RolePermissions.canSeeSection) return true;
    return ROOT.RolePermissions.canSeeSection(role || getRole(), sectionId);
  }

  function listNavigationCommands(role) {
    const sections = ROOT.UserDashboard && ROOT.UserDashboard.DASHBOARD_SECTIONS ? ROOT.UserDashboard.DASHBOARD_SECTIONS : [];
    return sections.filter(section => canSee(section.id, role)).map(section => ({
      id: `nav:${section.id}`,
      group: 'navigation',
      title: section.title,
      subtitle: section.note || 'Открыть раздел',
      badge: section.badge || 'OPEN',
      keywords: [section.id, section.title, section.note, section.badge].join(' '),
      action: 'open-section',
      sectionId: section.id,
      icon: section.icon || '↗'
    }));
  }

  function listProjectCommands(role) {
    if (!canSee('projects', role)) return [];
    const rows = ROOT.QuoteProjectStorage && ROOT.QuoteProjectStorage.listProjects ? ROOT.QuoteProjectStorage.listProjects() : [];
    return rows.slice(0, 80).map(project => ({
      id: `project:${project.projectId || project.quoteId}`,
      group: 'project',
      title: project.projectName || 'Проект без названия',
      subtitle: `${project.clientName || 'Клиент не указан'} · ${project.eventDate || 'Дата не указана'} · ${statusLabel(project.status)}`,
      badge: project.status || 'draft',
      keywords: [project.projectName, project.clientName, project.venueName, project.venueAddress, project.eventDate, project.status, project.projectId].join(' '),
      action: 'open-project',
      projectId: project.projectId,
      icon: '📁'
    }));
  }

  function listClientCommands(role) {
    if (!canSee('clients', role)) return [];
    const rows = ROOT.ClientsStorage && ROOT.ClientsStorage.getClients ? ROOT.ClientsStorage.getClients() : [];
    return rows.slice(0, 100).map(client => ({
      id: `client:${client.id || client.name}`,
      group: 'client',
      title: client.name || 'Клиент без названия',
      subtitle: [client.contact, client.phone, client.email].filter(Boolean).join(' · ') || 'Контакты не заполнены',
      badge: 'CRM',
      keywords: [client.name, client.contact, client.phone, client.email, client.address, client.note].join(' '),
      action: 'open-client',
      clientId: client.id,
      icon: '👥'
    }));
  }

  function listEquipmentCommands(role) {
    if (!canSee('equipment', role)) return [];
    const rows = ROOT.EquipmentDatabase && ROOT.EquipmentDatabase.listItems ? ROOT.EquipmentDatabase.listItems({ onlyActive: true }) : [];
    return rows.slice(0, 160).map(item => ({
      id: `equipment:${item.id || item.code}`,
      group: 'equipment',
      title: item.name || item.code || 'Позиция оборудования',
      subtitle: `${item.code || 'без кода'} · ${item.category || 'category'} · доступно: ${num(item.availableQty)} ${item.unit || 'шт'}`,
      badge: item.code || 'ITEM',
      keywords: [item.code, item.name, item.manufacturer, item.model, item.category, item.subcategory, item.type, item.notes].join(' '),
      action: 'open-equipment',
      itemId: item.id,
      icon: '📦'
    }));
  }

  function listDocumentCommands(role) {
    if (!canSee('documents', role)) return [];
    const docs = ROOT.DocumentCenter && ROOT.DocumentCenter.buildDocumentList ? ROOT.DocumentCenter.buildDocumentList() : [];
    return docs.slice(0, 80).map(doc => ({
      id: `document:${doc.id || doc.type || doc.title}`,
      group: 'document',
      title: doc.title || doc.label || 'Документ',
      subtitle: `${doc.groupLabel || doc.group || 'Документ'} · ${doc.fileName || ''}`,
      badge: (doc.extension || 'txt').toUpperCase(),
      keywords: [doc.title, doc.label, doc.fileName, doc.group, doc.type].join(' '),
      action: 'open-documents',
      documentId: doc.id,
      icon: '📄'
    }));
  }

  function listActionCommands(role) {
    const actions = [];
    if (canSee('quote', role)) actions.push({
      id: 'action:new-quote', group: 'action', title: 'Новая смета', subtitle: 'Открыть мастер оформления сметы', badge: 'NEW', keywords: 'новая смета quote wizard клиент проект', action: 'open-section', sectionId: 'quote', icon: '➕'
    });
    if (canSee('warehouse', role)) actions.push({
      id: 'action:warehouse', group: 'action', title: 'Складские операции', subtitle: 'Открыть Warehouse Operations Hub', badge: 'OPS', keywords: 'склад резерв дефицит выдача возврат operations', action: 'open-section', sectionId: 'warehouse', icon: '🏷'
    });
    if (canSee('reports', role)) actions.push({
      id: 'action:reports', group: 'action', title: 'Операционный отчёт', subtitle: 'Открыть сводный Reports Center', badge: 'REPORT', keywords: 'отчет reports summary аналитика', action: 'open-section', sectionId: 'reports', icon: '📊'
    });
    return actions;
  }

  function buildCommandIndex(options) {
    const role = options && options.role ? options.role : getRole();
    return [
      ...listNavigationCommands(role),
      ...listActionCommands(role),
      ...listProjectCommands(role),
      ...listClientCommands(role),
      ...listEquipmentCommands(role),
      ...listDocumentCommands(role)
    ].map(command => ({ ...command, searchText: normalizeSearch([command.title, command.subtitle, command.badge, command.keywords, command.group].join(' ')) }));
  }

  function searchCommands(query, options) {
    const q = normalizeSearch(query);
    const index = options && Array.isArray(options.index) ? options.index : buildCommandIndex(options);
    const limit = options && options.limit ? Number(options.limit) : 40;
    if (!q) return index.slice(0, limit);
    const terms = q.split(/\s+/).filter(Boolean);
    return index
      .map(command => ({ command, score: scoreCommand(command, terms, q) }))
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score || a.command.group.localeCompare(b.command.group))
      .slice(0, limit)
      .map(row => row.command);
  }

  function scoreCommand(command, terms, query) {
    const haystack = command.searchText || '';
    let score = 0;
    if (haystack.includes(query)) score += 20;
    terms.forEach(term => {
      if (!term) return;
      if (normalizeSearch(command.title).startsWith(term)) score += 18;
      else if (normalizeSearch(command.title).includes(term)) score += 12;
      if (normalizeSearch(command.badge).includes(term)) score += 10;
      if (haystack.includes(term)) score += 4;
    });
    if (command.group === 'navigation' || command.group === 'action') score += 2;
    return score;
  }

  function renderCommandCenter(target, options) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    ensureStyles();
    const opts = options || {};
    const role = opts.role || getRole();
    const index = buildCommandIndex({ role });
    root._commandIndex = index;
    root.innerHTML = `
      <div class="v4-command-center" data-command-center-version="${escapeHtml(COMMAND_CENTER_VERSION)}">
        <div class="v4-card v4-command-head">
          <div>
            <div class="v4-kicker">Command Center</div>
            <h3>Быстрый поиск и команды</h3>
            <p class="v4-muted">Ищи проекты, клиентов, оборудование, документы и разделы. Результаты фильтруются по роли пользователя.</p>
          </div>
          <div class="v4-command-stats">
            <b>${index.length}</b>
            <span>команд в индексе</span>
          </div>
        </div>
        <div class="v4-card">
          <label class="v4-command-search-label">Поиск / команда</label>
          <input class="v4-command-search" data-command-search type="search" placeholder="Например: DLive, FBT, Иванов, КП, склад, дефицит..." autocomplete="off">
          <div class="v4-command-hints">
            <button type="button" data-command-query="склад">склад</button>
            <button type="button" data-command-query="КП">КП</button>
            <button type="button" data-command-query="DLive">DLive</button>
            <button type="button" data-command-query="LED">LED</button>
            <button type="button" data-command-query="дефицит">дефицит</button>
          </div>
        </div>
        <div class="v4-command-results" data-command-results></div>
      </div>`;

    const input = root.querySelector('[data-command-search]');
    const results = root.querySelector('[data-command-results]');
    const render = () => renderResults(results, searchCommands(input.value, { index, limit: 50 }), opts);
    if (input) input.addEventListener('input', render);
    root.querySelectorAll('[data-command-query]').forEach(btn => btn.addEventListener('click', () => {
      input.value = btn.dataset.commandQuery || '';
      input.focus();
      render();
    }));
    render();
    return root;
  }

  function renderResults(root, commands, options) {
    if (!root) return;
    const grouped = groupBy(commands, row => row.group || 'action');
    const groups = Object.keys(grouped);
    if (!groups.length) {
      root.innerHTML = `<div class="v4-card"><div class="v4-kicker">Ничего не найдено</div><p class="v4-muted">Попробуй другой запрос: код оборудования, название клиента, статус проекта или раздел меню.</p></div>`;
      return;
    }
    root.innerHTML = groups.map(group => `
      <div class="v4-card v4-command-group">
        <div class="v4-command-group-title">${escapeHtml(GROUP_LABELS[group] || group)} <span>${grouped[group].length}</span></div>
        <div class="v4-command-list">
          ${grouped[group].map(command => renderCommand(command)).join('')}
        </div>
      </div>`).join('');
    root.querySelectorAll('[data-command-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const command = commands.find(row => row.id === btn.dataset.commandId);
        executeCommand(command, options);
      });
    });
  }

  function renderCommand(command) {
    return `<button type="button" class="v4-command-row" data-command-id="${escapeHtml(command.id)}">
      <span class="v4-command-icon">${escapeHtml(command.icon || '↗')}</span>
      <span class="v4-command-main"><b>${escapeHtml(command.title)}</b><small>${escapeHtml(command.subtitle || '')}</small></span>
      <span class="v4-command-badge">${escapeHtml(command.badge || command.group || '')}</span>
    </button>`;
  }

  function executeCommand(command, options) {
    if (!command) return false;
    const opts = options || {};
    if (typeof opts.onCommand === 'function') opts.onCommand(command);
    if (command.action === 'open-section' && typeof opts.onOpenSection === 'function') return opts.onOpenSection(command.sectionId, command);
    if (command.action === 'open-project' && typeof opts.onOpenProject === 'function') return opts.onOpenProject(command.projectId, command);
    if (command.action === 'open-client' && typeof opts.onOpenSection === 'function') return opts.onOpenSection('clients', command);
    if (command.action === 'open-equipment' && typeof opts.onOpenSection === 'function') return opts.onOpenSection('equipment', command);
    if (command.action === 'open-documents' && typeof opts.onOpenSection === 'function') return opts.onOpenSection('documents', command);
    return false;
  }

  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById('v4CommandCenterStyles')) return;
    const style = document.createElement('style');
    style.id = 'v4CommandCenterStyles';
    style.textContent = `
      .v4-command-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.v4-command-stats{min-width:130px;text-align:right;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:12px}.v4-command-stats b{display:block;font-size:1.7rem;line-height:1}.v4-command-stats span{font-size:.78rem;color:var(--muted,#9aa4af)}.v4-command-search-label{display:block;margin-bottom:8px}.v4-command-search{width:100%;font-size:1rem;border-radius:18px}.v4-command-hints{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.v4-command-hints button{padding:7px 10px;border-radius:999px;font-size:.82rem}.v4-command-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.v4-command-group{min-width:0}.v4-command-group-title{display:flex;justify-content:space-between;align-items:center;font-weight:900;margin-bottom:8px}.v4-command-group-title span{font-size:.78rem;color:var(--muted,#9aa4af)}.v4-command-list{display:flex;flex-direction:column;gap:8px}.v4-command-row{width:100%;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;text-align:left;border-radius:16px;padding:10px 12px}.v4-command-icon{font-size:1.2rem}.v4-command-main{min-width:0}.v4-command-main b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v4-command-main small{display:block;color:var(--muted,#9aa4af);font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.v4-command-badge{font-size:.68rem;font-weight:900;border-radius:999px;padding:4px 7px;background:rgba(199,167,122,.16);white-space:nowrap}@media(max-width:880px){.v4-command-results{grid-template-columns:1fr}.v4-command-head{display:block}.v4-command-stats{text-align:left;margin-top:10px}.v4-command-main b,.v4-command-main small{white-space:normal}}
    `;
    document.head.appendChild(style);
  }

  function groupBy(rows, getter) {
    return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
      const key = getter(row);
      acc[key] = acc[key] || [];
      acc[key].push(row);
      return acc;
    }, {});
  }

  function normalizeSearch(value) {
    return String(value == null ? '' : value).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
  }

  function num(value) { return Math.round((Number(value) || 0) * 100) / 100; }

  function statusLabel(status) {
    const map = { draft: 'Черновик', in_work: 'В работе', sent: 'Отправлено', approved: 'Подтверждён', cancelled: 'Отменён', completed: 'Завершён' };
    return map[status] || status || 'Черновик';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.CommandCenter = {
    COMMAND_CENTER_VERSION,
    buildCommandIndex,
    searchCommands,
    executeCommand,
    renderCommandCenter
  };
})();
