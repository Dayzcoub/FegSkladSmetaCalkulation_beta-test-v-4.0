(function () {
  'use strict';
  const ROOT = (window.FEGModules = window.FEGModules || {});

  const SOURCE_TYPES = [
    { id: 'own', name: 'Свой склад' },
    { id: 'subrent', name: 'Субаренда' },
    { id: 'manual', name: 'Ручная позиция' }
  ];

  function renderEquipmentDatabase(target, opts) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const db = ROOT.EquipmentDatabase;
    if (!db) {
      root.innerHTML = '<div class="v4-card"><p class="v4-muted">EquipmentDatabase не загружен.</p></div>';
      return root;
    }
    ensureEquipmentEditorStyles();
    const options = opts || {};
    const auth = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : { role: 'viewer' };
    const role = auth.role || 'viewer';
    const isAdmin = ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole ? ROOT.RolePermissions.normalizeRole(role) === 'admin' : role === 'admin';
    const canEdit = ROOT.RolePermissions && ROOT.RolePermissions.hasPermission ? ROOT.RolePermissions.hasPermission(role, 'equipment:edit') : false;
    const canSeePrices = ROOT.RolePermissions && ROOT.RolePermissions.hasPermission ? ROOT.RolePermissions.hasPermission(role, 'prices:view') : false;
    const selectedCategory = options.category || '';
    const selectedType = options.type || '';
    const selectedIssue = options.issue || '';
    const query = options.query || '';
    const onlyActive = options.onlyActive !== false;
    const rawItems = db.getStoredItemsOrDemo();
    const allItems = ROOT.RolePermissions && ROOT.RolePermissions.filterEquipmentItemsForRole ? ROOT.RolePermissions.filterEquipmentItemsForRole(rawItems, role) : rawItems;
    const completionMatrix = isAdmin && db.buildManualCompletionMatrix ? db.buildManualCompletionMatrix(allItems, { includeRows: true, includeItems: false }) : null;
    const sourceItems = selectedIssue && db.getManualCompletionFilteredItems ? db.getManualCompletionFilteredItems(selectedIssue, allItems) : allItems;
    const items = db.listItems({ items: sourceItems, category: selectedCategory, type: selectedType, query, onlyActive });
    const summary = db.summarize(allItems);
    const categoryReport = isAdmin && db.buildCategoryReport ? db.buildCategoryReport(allItems) : null;
    const typeReport = isAdmin && db.buildTypeReport ? db.buildTypeReport(allItems) : null;
    const syncSchemaReport = isAdmin && db.buildSyncSchemaReport ? db.buildSyncSchemaReport(allItems) : null;
    const syncPreviewReport = isAdmin && db.buildEquipmentSyncPreview ? db.buildEquipmentSyncPreview(allItems) : null;
    const readinessReport = isAdmin && db.buildEquipmentReadinessReport ? db.buildEquipmentReadinessReport(allItems, { includeRows: false }) : null;
    const allowedCategories = ROOT.RolePermissions && ROOT.RolePermissions.getRoleAllowedEquipmentCategories ? ROOT.RolePermissions.getRoleAllowedEquipmentCategories(role) : null;
    const categories = allowedCategories === null ? db.CATEGORY_TREE : db.CATEGORY_TREE.filter(cat => allowedCategories.includes(cat.id));
    const types = Object.values(db.ITEM_TYPES || {});

    root.innerHTML = `
      <div class="v4-card" data-v4-equipment-panel>
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">База оборудования</div>
            <h3>Единая база оборудования</h3>
            <p class="v4-muted">Единая рабочая база: сцены, фермы, LED, свет, звук, услуги, коммутация и расходники. Для профильных ролей отображаются только разрешённые разделы.</p>
          </div>
          <div class="v4-auth-actions">
            ${canEdit ? '<button type="button" class="btn-primary" data-v4-equipment-open-new>+ Добавить позицию</button>' : '<span class="v4-muted">Режим просмотра</span>'}
            ${isAdmin ? '<button type="button" class="btn-secondary" data-v4-equipment-recode>Привести коды</button><button type="button" class="btn-secondary" data-v4-equipment-reset>Загрузить demo-базу</button><button type="button" class="btn-secondary" data-v4-equipment-category-report>Категории JSON</button><button type="button" class="btn-secondary" data-v4-equipment-sync-schema>Sync schema JSON</button><button type="button" class="btn-secondary" data-v4-equipment-sync-preview>Sync preview JSON</button><button type="button" class="btn-secondary" data-v4-equipment-readiness>Readiness JSON</button><button type="button" class="btn-secondary" data-v4-equipment-completion>Completion JSON</button><button type="button" class="btn-secondary" data-v4-equipment-patch-export>Patch template</button><button type="button" class="btn-secondary" data-v4-equipment-patch-import>Import patch</button><button type="button" class="btn-secondary" data-v4-equipment-safe-cleanup>Safe cleanup</button><button type="button" class="btn-secondary" data-v4-equipment-export>JSON</button>' : ''}
          </div>
        </div>

        <div class="v4-grid-3">
          <div class="v4-mini"><b>${formatNumber(summary.total)}</b><span>позиций всего</span></div>
          <div class="v4-mini"><b>${formatNumber(summary.availableQty)}</b><span>доступно, шт/ед.</span></div>
          <div class="v4-mini"><b>${formatNumber(summary.weightKg)} кг</b><span>складской вес</span></div>
          <div class="v4-mini"><b>${formatNumber(summary.powerW / 1000)} кВт</b><span>потенциальная мощность</span></div>
          <div class="v4-mini"><b>${formatNumber(summary.reservedQty)}</b><span>в резерве</span></div>
          <div class="v4-mini"><b>${canSeePrices ? formatMoney(summary.replacementCost) : 'скрыто'}</b><span>replacement cost</span></div>
        </div>

        <div class="v4-db-status-strip">
          ${renderCategoryHealth(categoryReport)}
          ${renderTypeHealth(typeReport, syncSchemaReport)}
          ${renderSyncPreviewHealth(syncPreviewReport)}
          ${renderReadinessHealth(readinessReport)}
          ${renderManualCompletionHealth(completionMatrix, selectedIssue)}
        </div>

        <div class="v4-equipment-tools">
          <label class="field" style="margin:0;min-width:0;">
            <span>Поиск</span>
            <input type="search" data-v4-equipment-query value="${escapeHtml(query)}" placeholder="код, название, тип, заметка">
          </label>
          <label class="field" style="margin:0;min-width:0;">
            <span>Категория</span>
            <select data-v4-equipment-category>
              <option value="">Все категории</option>
              ${categories.map(cat => `<option value="${escapeHtml(cat.id)}" ${cat.id === selectedCategory ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`).join('')}
            </select>
          </label>
          <label class="field" style="margin:0;min-width:0;">
            <span>Тип</span>
            <select data-v4-equipment-type>
              <option value="">Все типы</option>
              ${types.map(type => `<option value="${escapeHtml(type)}" ${type === selectedType ? 'selected' : ''}>${escapeHtml(formatTypeLabel(type, db))}</option>`).join('')}
            </select>
          </label>
          <label class="field" style="margin:0;min-width:0;">
            <span>Добивка</span>
            <select data-v4-equipment-issue>
              <option value="">Все задачи</option>
              ${(completionMatrix && completionMatrix.issueOptions || []).map(issue => `<option value="${escapeHtml(issue.id)}" ${issue.id === selectedIssue ? 'selected' : ''}>${escapeHtml(issue.label)} · ${formatNumber(issue.count)}</option>`).join('')}
            </select>
          </label>
          <label class="v4-equipment-active-filter">
            <input type="checkbox" data-v4-equipment-active ${onlyActive ? 'checked' : ''}>
            Только активные
          </label>
        </div>

        <div class="v4-auth-actions" style="margin-top:10px;">
          <button type="button" class="btn-secondary" data-v4-equipment-cat="">Все</button>
          ${categories.map(cat => `<button type="button" class="btn-secondary" data-v4-equipment-cat="${escapeHtml(cat.id)}">${escapeHtml(cat.name)} · ${formatNumber(summary.categories.find(row => row.id === cat.id)?.count || 0)}</button>`).join('')}
        </div>
        ${renderManualCompletionFilters(completionMatrix, selectedIssue)}

        ${canEdit ? '<div class="v4-hint-card">Позиции можно добавлять и редактировать через карточку. Профильные роли работают только со своими категориями базы.</div>' : ''}

        <div class="v4-table-wrap v4-table-wrap--equipment">
          <table class="v4-table v4-table--equipment">
            <thead><tr><th>Код</th><th>Позиция</th><th>Категория / тип</th><th>Склад</th><th>Вес / мощность</th>${canSeePrices ? '<th>Цена / замена</th>' : ''}<th>Источник</th>${canEdit ? '<th>Действия</th>' : ''}</tr></thead>
            <tbody>
              ${(items.slice(0, options._page ? options._page * 50 : 50)).map(item => renderRow(item, db, canSeePrices, canEdit)).join('') || `<tr><td colspan="${canSeePrices ? (canEdit ? 8 : 7) : (canEdit ? 7 : 6)}" class="v4-muted">Нет позиций по выбранному фильтру.</td></tr>`}
            </tbody>
          </table>
          ${items.length > (options._page ? options._page * 50 : 50) ? `<div style="padding:10px 14px;border-top:1px solid var(--line)"><button type="button" class="btn-secondary" data-v4-equipment-load-more>Показать ещё ${Math.min(50, items.length - (options._page ? options._page * 50 : 50))} из ${items.length - (options._page ? options._page * 50 : 50)} оставшихся</button></div>` : ''}
        </div>
        <div class="v4-equipment-card-list">
          ${(items.slice(0, options._page ? options._page * 50 : 50)).map(item => renderCard(item, db, canSeePrices, canEdit)).join('') || '<div class="v4-equipment-card v4-muted">Нет позиций по выбранному фильтру.</div>'}
        </div>
        <div data-v4-equipment-output style="margin-top:12px;"></div>
      </div>`;

    bindEquipmentEvents(root, db, canEdit, isAdmin, role);
    return root;
  }

  function bindEquipmentEvents(root, db, canEdit, isAdmin, role) {
    root.querySelectorAll('[data-v4-equipment-cat]').forEach(btn => {
      btn.addEventListener('click', () => renderEquipmentDatabase(root, { ...readFilters(root), category: btn.getAttribute('data-v4-equipment-cat') || '' }));
    });
    ['query', 'category', 'type', 'issue', 'active'].forEach(name => {
      const el = root.querySelector(`[data-v4-equipment-${name}]`);
      if (el) el.addEventListener(name === 'query' ? 'input' : 'change', debounce(() => {
        root.dataset.equipmentPage = '1'; // сбрасываем страницу при фильтрации
        renderEquipmentDatabase(root, readFilters(root));
      }, 180));
    });
    root.querySelectorAll('[data-v4-equipment-issue-filter]').forEach(btn => {
      btn.addEventListener('click', () => renderEquipmentDatabase(root, { ...readFilters(root), issue: btn.getAttribute('data-v4-equipment-issue-filter') || '' }));
    });
    const loadMoreBtn = root.querySelector('[data-v4-equipment-load-more]');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        const currentFilters = readFilters(root);
        const currentPage = (currentFilters._page || 1);
        renderEquipmentDatabase(root, { ...currentFilters, _page: currentPage + 1 });
      });
    }
    const reset = root.querySelector('[data-v4-equipment-reset]');
    if (reset) reset.addEventListener('click', () => {
      db.resetDemoItems();
      toast('Demo-база оборудования загружена');
      renderEquipmentDatabase(root, readFilters(root));
    });

    const recode = root.querySelector('[data-v4-equipment-recode]');
    if (recode && isAdmin) recode.addEventListener('click', () => {
      if (!window.confirm || window.confirm('Привести все коды базы к серии по категориям? Старые коды сохранятся в legacy-поле.')) {
        db.recodeStoredItemsByCategory();
        toast('Коды базы приведены к единой серии');
        renderEquipmentDatabase(root, readFilters(root));
      }
    });
    const categoryReportBtn = root.querySelector('[data-v4-equipment-category-report]');
    if (categoryReportBtn) categoryReportBtn.addEventListener('click', () => showCategoryReport(root, db));
    const syncSchemaBtn = root.querySelector('[data-v4-equipment-sync-schema]');
    if (syncSchemaBtn) syncSchemaBtn.addEventListener('click', () => showSyncSchemaReport(root, db));
    const syncPreviewBtn = root.querySelector('[data-v4-equipment-sync-preview]');
    if (syncPreviewBtn) syncPreviewBtn.addEventListener('click', () => showSyncPreviewReport(root, db));
    const readinessBtn = root.querySelector('[data-v4-equipment-readiness]');
    if (readinessBtn) readinessBtn.addEventListener('click', () => showReadinessReport(root, db));
    const completionBtn = root.querySelector('[data-v4-equipment-completion]');
    if (completionBtn) completionBtn.addEventListener('click', () => showManualCompletionMatrix(root, db));
    const patchExportBtn = root.querySelector('[data-v4-equipment-patch-export]');
    if (patchExportBtn) patchExportBtn.addEventListener('click', () => showPatchExport(root, db));
    const patchImportBtn = root.querySelector('[data-v4-equipment-patch-import]');
    if (patchImportBtn && isAdmin) patchImportBtn.addEventListener('click', () => showPatchImport(root, db));
    const safeCleanupBtn = root.querySelector('[data-v4-equipment-safe-cleanup]');
    if (safeCleanupBtn && isAdmin) safeCleanupBtn.addEventListener('click', () => applySafeCleanup(root, db));
    const exportBtn = root.querySelector('[data-v4-equipment-export]');
    if (exportBtn) exportBtn.addEventListener('click', () => showExport(root, db));
    const addBtn = root.querySelector('[data-v4-equipment-open-new]');
    if (addBtn && canEdit) addBtn.addEventListener('click', () => openEquipmentEditor(root, db, null));
    root.querySelectorAll('[data-v4-equipment-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = db.findItem(btn.getAttribute('data-v4-equipment-edit'));
        if (ROOT.RolePermissions && ROOT.RolePermissions.canEditEquipmentItem && !ROOT.RolePermissions.canEditEquipmentItem(role, item)) {
          toast('Редактирование этой категории недоступно для роли');
          return;
        }
        openEquipmentEditor(root, db, item);
      });
    });
  }

  function renderCategoryHealth(report) {
    if (!report) return '';
    const activeCategories = report.byCategory.filter(row => row.count > 0).length;
    const prefixStatus = report.codePrefixMismatches.length ? `${formatNumber(report.codePrefixMismatches.length)} кодов вне серии` : 'коды по сериям';
    const subcategoryStatus = report.unknownSubcategories.length ? `${formatNumber(report.unknownSubcategories.length)} нестандартных подкатегорий` : 'подкатегории чистые';
    const cls = report.ok && !report.unknownSubcategories.length ? 'ok' : report.codePrefixMismatches.length || report.duplicateCodes.length ? 'bad' : 'warn';
    return `<div class="v4-equipment-category-health ${escapeHtml(cls)}">
      <div><b>Нормализация категорий</b><span>${formatNumber(activeCategories)} активных разделов · ${escapeHtml(prefixStatus)} · ${escapeHtml(subcategoryStatus)}</span></div>
      <small>Алиасы вроде «звук», «свет», «кабели», «услуги» приводятся к стабильным category id для будущего Supabase sync.</small>
    </div>`;
  }

  function renderTypeHealth(typeReport, schemaReport) {
    if (!typeReport) return '';
    const typeCount = typeReport.byType ? typeReport.byType.length : 0;
    const incompatible = typeReport.incompatibleTypes ? typeReport.incompatibleTypes.length : 0;
    const manual = typeReport.manualBaseItems ? typeReport.manualBaseItems.length : 0;
    const schemaOk = !schemaReport || schemaReport.ok;
    const cls = incompatible ? 'bad' : manual || !schemaOk ? 'warn' : 'ok';
    return `<div class="v4-equipment-category-health ${escapeHtml(cls)}">
      <div><b>Типы и sync schema</b><span>${formatNumber(typeCount)} типов · ${formatNumber(incompatible)} конфликтов · ${schemaOk ? 'schema ok' : 'schema check'}</span></div>
      <small>Типы проверяются по category id и готовятся к будущей таблице <code>equipment_items</code> без включения серверной записи.</small>
    </div>`;
  }


  function renderSyncPreviewHealth(preview) {
    if (!preview) return '';
    const counts = preview.statusCounts || {};
    const cls = preview.blockerCount ? 'bad' : preview.warningCount ? 'warn' : 'ok';
    return `<div class="v4-equipment-category-health ${escapeHtml(cls)}">
      <div><b>Supabase sync preview</b><span>${formatNumber(preview.rowCount)} строк · ${formatNumber(counts.ready || 0)} ready · ${formatNumber(preview.blockerCount)} blockers · ${formatNumber(preview.warningCount)} warnings</span></div>
      <small>Preview показывает будущий upsert в <code>equipment_items</code> по каждой позиции, но не выполняет серверную запись.</small>
    </div>`;
  }


  function renderReadinessHealth(report) {
    if (!report) return '';
    const counts = report.counts || {};
    const cls = counts.blocker ? 'bad' : counts.manual ? 'warn' : 'ok';
    const statusText = report.status === 'ready_clean' ? 'чисто' : report.status === 'ready_after_safe_cleanup' ? 'готово после safe cleanup' : report.status === 'ready_with_manual_tasks' ? 'добить вручную' : report.status;
    return `<div class="v4-equipment-category-health ${escapeHtml(cls)}">
      <div><b>Sync readiness checklist</b><span>${formatNumber(report.score)}% · ${escapeHtml(statusText)} · ${formatNumber(counts.manual || 0)} ручных задач · ${formatNumber(counts.safe_fix || 0)} safe-fix</span></div>
      <small>Readiness отделяет безопасные авто-исправления от реальных данных: вес, мощность, остатки и поставщики остаются ручной добивкой.</small>
    </div>`;
  }


  function renderManualCompletionHealth(matrix, selectedIssue) {
    if (!matrix) return '';
    const cls = matrix.issueCount ? 'warn' : 'ok';
    const filterText = selectedIssue ? ` · фильтр: ${selectedIssue}` : '';
    return `<div class="v4-equipment-category-health ${escapeHtml(cls)}">
      <div><b>Manual completion matrix</b><span>${formatNumber(matrix.score)}% · ${formatNumber(matrix.problemRows)} позиций · ${formatNumber(matrix.issueCount)} задач${escapeHtml(filterText)}</span></div>
      <small>Матрица ручной добивки: вес, мощность, остатки, поставщики, цены и спорные подкатегории редактируются только фактическими данными.</small>
    </div>`;
  }

  function renderManualCompletionFilters(matrix, selectedIssue) {
    if (!matrix || !matrix.issueOptions || !matrix.issueOptions.length) return '';
    const buttons = [{ id: '', label: 'Все задачи', count: matrix.problemRows }].concat(matrix.issueOptions.filter(issue => issue.count > 0));
    return `<div class="v4-auth-actions v4-completion-filters" style="margin-top:10px;">
      ${buttons.map(issue => `<button type="button" class="btn-secondary ${issue.id === selectedIssue ? 'active' : ''}" data-v4-equipment-issue-filter="${escapeHtml(issue.id)}">${escapeHtml(issue.label)} · ${formatNumber(issue.count)}</button>`).join('')}
    </div>`;
  }

  function renderRow(item, db, canSeePrices, canEdit) {
    const category = db.getCategory(item.category);
    const status = item.availableQty <= 0 ? 'bad' : item.reservedQty > 0 ? 'risk' : 'ok';
    const makeStockLine = (label, value) => `<span class="v4-muted">${label}:</span> <b class="v4-nowrap">${formatNumber(value)} ${escapeHtml(item.unit)}</b>`;
    return `<tr>
      <td class="v4-num-cell"><b class="v4-nowrap">${escapeHtml(item.code || '—')}</b></td>
      <td class="v4-name-cell"><b>${escapeHtml(item.name)}</b>${[item.manufacturer, item.model].filter(Boolean).join(' ') || item.notes ? '<br><span class="v4-muted">' + escapeHtml([item.manufacturer, item.model].filter(Boolean).join(' ') || item.notes || '') + '</span>' : ''}</td>
      <td class="v4-wide-cell">${escapeHtml(category ? category.name : item.category)}${item.subcategory ? '<br><span class="v4-muted">' + escapeHtml(item.subcategory) + '</span>' : ''}<br><code>${escapeHtml(formatTypeLabel(item.type, db))}</code></td>
      <td class="v4-wide-cell">
        ${makeStockLine('Всего', item.stockQty)}<br>
        ${makeStockLine('Резерв', item.reservedQty)}<br>
        <span class="block-load-status ${status}" style="display:inline-block;margin-top:4px;">Доступно ${formatNumber(item.availableQty)} ${escapeHtml(item.unit)}</span>
      </td>
      <td class="v4-wide-cell"><span class="v4-nowrap">${formatNumber(item.weightKg)} кг/${escapeHtml(item.unit)}</span><br><span class="v4-muted">${item.powerW ? formatNumber(item.powerW) + ' Вт' : 'мощность —'}</span></td>
      ${canSeePrices ? `<td class="v4-wide-cell">${item.rentalPrice ? formatMoney(item.rentalPrice) : '—'}<br><span class="v4-muted">Замена: ${item.replacementCost ? formatMoney(item.replacementCost) : '—'}</span></td>` : ''}
      <td class="v4-source-cell"><span class="v4-nowrap">${escapeHtml(item.sourceType || 'own')}</span>${item.supplierName ? '<br><span class="v4-muted">' + escapeHtml(item.supplierName) + '</span>' : ''}</td>
      ${canEdit ? `<td class="v4-actions-cell"><button type="button" class="btn-secondary btn-compact" data-v4-equipment-edit="${escapeHtml(item.id)}">Редактировать</button></td>` : ''}
    </tr>`;
  }

  function renderCard(item, db, canSeePrices, canEdit) {
    const category = db.getCategory(item.category);
    const status = item.availableQty <= 0 ? 'bad' : item.reservedQty > 0 ? 'risk' : 'ok';
    const source = item.sourceType || 'own';
    return `<article class="v4-equipment-card">
      <div class="v4-equipment-card-top">
        <span class="v4-equipment-code">${escapeHtml(item.code || '—')}</span>
        <span class="block-load-status ${status}">${formatNumber(item.availableQty)} ${escapeHtml(item.unit)} доступно</span>
      </div>
      <h4>${escapeHtml(item.name)}</h4>
      ${[item.manufacturer, item.model].filter(Boolean).join(' ') || item.notes ? '<p class="v4-muted">' + escapeHtml([item.manufacturer, item.model].filter(Boolean).join(' ') || item.notes || '') + '</p>' : ''}
      <div class="v4-equipment-card-grid">
        <div><span>Категория</span><b>${escapeHtml(category ? category.name : item.category)}</b>${item.subcategory ? '<small>' + escapeHtml(item.subcategory) + '</small>' : ''}</div>
        <div><span>Тип</span><b>${escapeHtml(formatTypeLabel(item.type, db))}</b></div>
        <div><span>Склад</span><b>${formatNumber(item.stockQty)} ${escapeHtml(item.unit)}</b><small>Резерв: ${formatNumber(item.reservedQty)}</small></div>
        <div><span>Вес / мощность</span><b>${formatNumber(item.weightKg)} кг/${escapeHtml(item.unit)}</b><small>${item.powerW ? formatNumber(item.powerW) + ' Вт' : 'мощность —'}</small></div>
        ${canSeePrices ? `<div><span>Цена / замена</span><b>${item.rentalPrice ? formatMoney(item.rentalPrice) : '—'}</b><small>Замена: ${item.replacementCost ? formatMoney(item.replacementCost) : '—'}</small></div>` : ''}
        <div><span>Источник</span><b>${escapeHtml(source)}</b>${item.supplierName ? '<small>' + escapeHtml(item.supplierName) + '</small>' : ''}</div>
      </div>
      ${canEdit ? `<div class="v4-equipment-card-actions"><button type="button" class="btn-secondary" data-v4-equipment-edit="${escapeHtml(item.id)}">Редактировать позицию</button></div>` : ''}
    </article>`;
  }

  function openEquipmentEditor(root, db, item) {
    const auth = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : { role: 'viewer' };
    const role = auth.role || 'viewer';
    const editing = !!item;
    if (editing && ROOT.RolePermissions && ROOT.RolePermissions.canEditEquipmentItem && !ROOT.RolePermissions.canEditEquipmentItem(role, item)) {
      toast('Эта роль может редактировать только свои категории базы');
      return;
    }
    const allowedCategories = ROOT.RolePermissions && ROOT.RolePermissions.getRoleAllowedEquipmentCategories ? ROOT.RolePermissions.getRoleAllowedEquipmentCategories(role) : null;
    const categories = allowedCategories === null ? db.CATEGORY_TREE : db.CATEGORY_TREE.filter(cat => allowedCategories.includes(cat.id));
    if (!categories.length) {
      toast('Для этой роли нет доступных категорий базы');
      return;
    }
    const defaultCategory = categories[0] && categories[0].id || 'stage';
    const baseItem = item || {
      id: db.makeId('eq'),
      code: db.generateNextCode ? db.generateNextCode(defaultCategory) : '',
      name: '',
      category: defaultCategory,
      type: db.getDefaultTypeForCategory ? db.getDefaultTypeForCategory(defaultCategory) : 'manual',
      unit: 'шт',
      stockQty: 1,
      reservedQty: 0,
      sourceType: 'own',
      isActive: true
    };
    const current = db.normalizeItem(Object.assign({}, baseItem, { category: baseItem.category || defaultCategory }));
    if (!categories.some(cat => cat.id === current.category)) current.category = defaultCategory;
    const types = db.getTypeOptionsForCategory ? db.getTypeOptionsForCategory(current.category) : Object.values(db.ITEM_TYPES || {});
    const categoryPrefixHint = categories.map(cat => `${cat.name}: ${db.getCategoryCodePrefix ? db.getCategoryCodePrefix(cat.id) : cat.id}`).join(' · ');
    const codeBlock = `
      <label class="field v4-equipment-code-field">
        <span>Код</span>
        <div class="v4-equipment-code-row">
          <input name="code" value="${escapeHtml(current.code)}" placeholder="${escapeHtml(db.generateNextCode ? db.generateNextCode(current.category) : 'STG-001')}" ${editing ? '' : 'data-v4-equipment-code-autogen="1"'} required>
          <button type="button" class="btn-secondary btn-compact" data-v4-equipment-generate-code>Сгенерировать</button>
        </div>
        <small>${escapeHtml(categoryPrefixHint)}</small>
      </label>`;
    const modal = document.createElement('div');
    modal.className = 'v4-equipment-editor-backdrop open';
    modal.setAttribute('role', 'presentation');
    modal.innerHTML = `
      <div class="v4-equipment-editor" role="dialog" aria-modal="true" aria-label="${editing ? 'Редактирование позиции оборудования' : 'Добавление позиции оборудования'}">
        <div class="v4-equipment-editor-head">
          <div>
            <div class="v4-kicker">База оборудования</div>
            <h3>${editing ? 'Редактировать позицию' : 'Добавить позицию'}</h3>
            <p class="v4-muted">Изменения сохраняются в рабочей базе оборудования. Профильные роли могут редактировать только разрешённые категории.</p>
          </div>
          <button type="button" class="btn-secondary" data-v4-equipment-editor-close>Закрыть</button>
        </div>
        <form data-v4-equipment-editor-form>
          <input type="hidden" name="id" value="${escapeHtml(current.id)}">
          <div class="v4-equipment-editor-grid">
            ${codeBlock}
            ${field('name', 'Название', current.name, 'Наименование позиции', true)}
            <label class="field"><span>Категория</span><select name="category" data-v4-equipment-editor-category>${categories.map(cat => `<option value="${escapeHtml(cat.id)}" ${cat.id === current.category ? 'selected' : ''}>${escapeHtml(cat.name)}</option>`).join('')}</select></label>
            ${subcategoryField(current, categories)}
            <label class="field"><span>Тип</span><select name="type" data-v4-equipment-editor-type>${renderTypeOptions(types, current.type, db)}</select></label>
            ${field('unit', 'Ед. изм.', current.unit || 'шт', 'шт')}
            ${field('manufacturer', 'Производитель', current.manufacturer, 'FBT / Robe / ...')}
            ${field('model', 'Модель', current.model, 'MUSE 218')}
            ${numberField('stockQty', 'Всего на складе', current.stockQty, '1', '1')}
            ${numberField('reservedQty', 'В резерве', current.reservedQty, '1', '0')}
            ${numberField('weightKg', 'Вес за ед., кг', current.weightKg, '0.0001', '0')}
            ${numberField('powerW', 'Мощность за ед., Вт', current.powerW, '1', '0')}
            ${numberField('startupPowerW', 'Пусковая мощность, Вт', current.startupPowerW, '1', '0')}
            ${numberField('rentalPrice', 'Прокат за ед., ₽', current.rentalPrice, '1', '0')}
            ${numberField('replacementCost', 'Стоимость замены, ₽', current.replacementCost, '1', '0')}
            <label class="field"><span>Источник</span><select name="sourceType">${SOURCE_TYPES.map(src => `<option value="${escapeHtml(src.id)}" ${src.id === current.sourceType ? 'selected' : ''}>${escapeHtml(src.name)}</option>`).join('')}</select></label>
            ${field('supplierName', 'Поставщик', current.supplierName, 'Для субаренды')}
            ${field('supplierId', 'ID поставщика', current.supplierId, 'supplier-id')}
            <label class="field v4-equipment-editor-wide"><span>Комментарий</span><textarea name="notes" rows="3" placeholder="Заметки, комплектность, особенности">${escapeHtml(current.notes)}</textarea></label>
            <label class="v4-equipment-editor-check"><input type="checkbox" name="isActive" ${current.isActive ? 'checked' : ''}> Позиция активна</label>
          </div>
          <div data-v4-equipment-editor-error class="v4-equipment-editor-error"></div>
          <div class="v4-equipment-editor-actions">
            ${editing ? '<button type="button" class="btn-secondary" data-v4-equipment-editor-deactivate>Сделать неактивной</button>' : ''}
            <button type="button" class="btn-secondary" data-v4-equipment-editor-close>Отмена</button>
            <button type="submit" class="btn-primary">Сохранить позицию</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(modal);
    const form = modal.querySelector('[data-v4-equipment-editor-form]');
    const close = () => modal.remove();
    modal.querySelectorAll('[data-v4-equipment-editor-close]').forEach(btn => btn.addEventListener('click', close));
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    const codeInput = modal.querySelector('input[name="code"]');
    const categorySelect = modal.querySelector('[data-v4-equipment-editor-category]');
    const generateCodeBtn = modal.querySelector('[data-v4-equipment-generate-code]');
    bindCodeGenerator(db, codeInput, categorySelect, generateCodeBtn, editing);
    bindTypeCategorySync(db, categorySelect, modal.querySelector('[data-v4-equipment-editor-type]'), modal.querySelector('input[name="unit"]'), editing);
    const first = editing ? (modal.querySelector('input[name="name"]') || codeInput) : (modal.querySelector('input[name="name"]') || codeInput);
    if (first) setTimeout(() => first.focus(), 0);
    const deactivate = modal.querySelector('[data-v4-equipment-editor-deactivate]');
    if (deactivate) deactivate.addEventListener('click', () => {
      const data = collectEditorForm(form, current);
      data.isActive = false;
      if (ROOT.RolePermissions && ROOT.RolePermissions.canEditEquipmentItem && !ROOT.RolePermissions.canEditEquipmentItem(role, data)) {
        toast('Эта роль может редактировать только свои категории базы');
        return;
      }
      saveEditorItem(root, db, data, modal, 'Позиция отключена');
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = collectEditorForm(form, current);
      const error = validateEditorItem(data, db, current.id);
      const errorEl = modal.querySelector('[data-v4-equipment-editor-error]');
      if (error) {
        if (errorEl) errorEl.textContent = error;
        return;
      }
      if (ROOT.RolePermissions && ROOT.RolePermissions.canEditEquipmentItem && !ROOT.RolePermissions.canEditEquipmentItem(role, data)) {
        if (errorEl) errorEl.textContent = 'Эта роль может редактировать только свои категории базы.';
        return;
      }
      saveEditorItem(root, db, data, modal, editing ? 'Позиция обновлена' : 'Позиция добавлена');
    });
  }

  function bindCodeGenerator(db, codeInput, categorySelect, generateCodeBtn, editing) {
    if (!codeInput || !categorySelect || !db || !db.generateNextCode) return;
    const generate = () => db.generateNextCode(categorySelect.value || 'stage');
    const setGenerated = () => {
      codeInput.value = generate();
      codeInput.dataset.v4EquipmentCodeAutogen = '1';
    };
    if (generateCodeBtn) generateCodeBtn.addEventListener('click', setGenerated);
    codeInput.addEventListener('input', () => {
      codeInput.dataset.v4EquipmentCodeAutogen = '0';
    });
    categorySelect.addEventListener('change', () => {
      const shouldAutofill = !editing || !String(codeInput.value || '').trim() || codeInput.dataset.v4EquipmentCodeAutogen === '1';
      if (shouldAutofill) setGenerated();
    });
  }

  function bindTypeCategorySync(db, categorySelect, typeSelect, unitInput, editing) {
    if (!db || !categorySelect || !typeSelect || !db.getTypeOptionsForCategory) return;
    const refreshTypes = () => {
      const oldType = typeSelect.value;
      const options = db.getTypeOptionsForCategory(categorySelect.value || 'stage');
      typeSelect.innerHTML = renderTypeOptions(options, oldType, db);
      const compatible = !db.isTypeCompatibleWithCategory || db.isTypeCompatibleWithCategory(typeSelect.value, categorySelect.value);
      if (!editing && (!oldType || oldType === 'manual' || !compatible)) typeSelect.value = db.getDefaultTypeForCategory ? db.getDefaultTypeForCategory(categorySelect.value || 'stage') : typeSelect.value;
      if (unitInput && (!unitInput.value || unitInput.value === 'шт' || unitInput.value === 'смена')) {
        const def = db.getItemTypeDefinition ? db.getItemTypeDefinition(typeSelect.value) : null;
        unitInput.value = def && def.defaultUnit ? def.defaultUnit : 'шт';
      }
    };
    categorySelect.addEventListener('change', refreshTypes);
    typeSelect.addEventListener('change', () => {
      if (!unitInput || !db.getItemTypeDefinition) return;
      const def = db.getItemTypeDefinition(typeSelect.value);
      if (def && def.defaultUnit && (!unitInput.value || unitInput.value === 'шт' || unitInput.value === 'смена')) unitInput.value = def.defaultUnit;
    });
  }

  function collectEditorForm(form, current) {
    const fd = new FormData(form);
    const data = {
      id: String(fd.get('id') || current.id || '').trim(),
      code: String(fd.get('code') || '').trim(),
      name: String(fd.get('name') || '').trim(),
      category: String(fd.get('category') || 'stage').trim(),
      subcategory: String(fd.get('subcategory') || '').trim(),
      type: String(fd.get('type') || 'manual').trim(),
      unit: String(fd.get('unit') || 'шт').trim() || 'шт',
      manufacturer: String(fd.get('manufacturer') || '').trim(),
      model: String(fd.get('model') || '').trim(),
      stockQty: toNumber(fd.get('stockQty')),
      reservedQty: toNumber(fd.get('reservedQty')),
      weightKg: toNumber(fd.get('weightKg')),
      powerW: toNumber(fd.get('powerW')),
      startupPowerW: toNumber(fd.get('startupPowerW')),
      rentalPrice: toNumber(fd.get('rentalPrice')),
      replacementCost: toNumber(fd.get('replacementCost')),
      sourceType: String(fd.get('sourceType') || 'own').trim(),
      supplierName: String(fd.get('supplierName') || '').trim(),
      supplierId: String(fd.get('supplierId') || '').trim(),
      notes: String(fd.get('notes') || '').trim(),
      isActive: fd.get('isActive') === 'on'
    };
    if (!data.id) data.id = data.code ? `eq-${data.code.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-')}` : `eq_${Date.now().toString(36)}`;
    return data;
  }

  function validateEditorItem(data, db, currentId) {
    if (!data.name) return 'Заполни название позиции.';
    if (!data.code) return 'Заполни код позиции — по нему позиция потом сопоставляется со складскими листами.';
    if (data.reservedQty > data.stockQty) return 'Резерв не может быть больше количества на складе.';
    const existing = db.findItem(data.code);
    if (existing && existing.id !== currentId) return `Код уже используется: ${existing.name}`;
    return '';
  }

  function saveEditorItem(root, db, data, modal, message) {
    db.upsertItem(data);
    toast(message);
    modal.remove();
    renderEquipmentDatabase(root, readFilters(root));
  }

  function field(name, label, value, placeholder, required) {
    return `<label class="field"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder || '')}" ${required ? 'required' : ''}></label>`;
  }

  function subcategoryField(current, categories) {
    const listId = `v4-equipment-subcategory-list-${String(current.id || Date.now()).replace(/[^a-z0-9_-]+/gi, '-')}`;
    const options = categories.flatMap(cat => (cat.subcategories || []).map(sub => `<option value="${escapeHtml(sub)}" label="${escapeHtml(cat.name)}"></option>`)).join('');
    return `<label class="field"><span>Подкатегория</span><input name="subcategory" list="${escapeHtml(listId)}" value="${escapeHtml(current.subcategory)}" placeholder="Например: line array"><datalist id="${escapeHtml(listId)}">${options}</datalist></label>`;
  }

  function numberField(name, label, value, step, placeholder) {
    return `<label class="field"><span>${escapeHtml(label)}</span><input type="number" min="0" step="${escapeHtml(step || '1')}" name="${escapeHtml(name)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder || '0')}"></label>`;
  }

  function readFilters(root) {
    return {
      query: root.querySelector('[data-v4-equipment-query]')?.value || '',
      category: root.querySelector('[data-v4-equipment-category]')?.value || '',
      type: root.querySelector('[data-v4-equipment-type]')?.value || '',
      issue: root.querySelector('[data-v4-equipment-issue]')?.value || '',
      onlyActive: !!root.querySelector('[data-v4-equipment-active]')?.checked,
      _page: parseInt(root.dataset.equipmentPage || '1', 10) || 1,
    };
  }


  function showManualCompletionMatrix(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output || !db.buildManualCompletionMatrix) return;
    const report = db.buildManualCompletionMatrix(db.getStoredItemsOrDemo());
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Manual completion matrix</b><p class="v4-muted" style="margin:.35rem 0 0;">${formatNumber(report.problemRows)} позиций требуют ручной добивки. Используй быстрые фильтры выше или скачай patch template.</p><textarea readonly style="width:100%;min-height:280px;margin-top:10px;">${escapeHtml(JSON.stringify(report, null, 2))}</textarea></div>`;
  }

  function showPatchExport(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output || !db.buildEquipmentPatchExport) return;
    const patch = db.buildEquipmentPatchExport(db.getStoredItemsOrDemo());
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Equipment manual patch template</b><p class="v4-muted" style="margin:.35rem 0 0;">Скопируй JSON, заполни реальные значения в fields и импортируй обратно через Import patch.</p><textarea readonly style="width:100%;min-height:320px;margin-top:10px;">${escapeHtml(JSON.stringify(patch, null, 2))}</textarea></div>`;
  }

  function showPatchImport(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output || !db.applyStoredEquipmentPatch) return;
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Import equipment patch</b><p class="v4-muted" style="margin:.35rem 0 0;">Вставь JSON из patch template. Сохраняются только разрешённые поля ручной добивки.</p><textarea data-v4-equipment-patch-input style="width:100%;min-height:260px;margin-top:10px;" placeholder="{ &quot;type&quot;: &quot;feg-stage-pro-equipment-manual-completion-patch&quot;, ... }"></textarea><div class="v4-auth-actions" style="margin-top:10px;"><button type="button" class="btn-primary" data-v4-equipment-patch-apply>Применить patch</button></div><div data-v4-equipment-patch-result></div></div>`;
    const apply = output.querySelector('[data-v4-equipment-patch-apply]');
    if (apply) apply.addEventListener('click', () => {
      const raw = output.querySelector('[data-v4-equipment-patch-input]')?.value || '';
      const result = db.applyStoredEquipmentPatch(raw);
      const resultEl = output.querySelector('[data-v4-equipment-patch-result]');
      if (resultEl) resultEl.innerHTML = `<textarea readonly style="width:100%;min-height:180px;margin-top:10px;">${escapeHtml(JSON.stringify(result, null, 2))}</textarea>`;
      toast(result.ok ? `Patch применён: ${result.changed.length} изменений` : 'Patch не применён');
      if (result.ok) setTimeout(() => renderEquipmentDatabase(root, readFilters(root)), 450);
    });
  }

  function showCategoryReport(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output || !db.buildCategoryReport) return;
    const report = db.buildCategoryReport(db.getStoredItemsOrDemo());
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Category normalization report</b><textarea readonly style="width:100%;min-height:180px;margin-top:10px;">${escapeHtml(JSON.stringify(report, null, 2))}</textarea></div>`;
  }

  function showSyncSchemaReport(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output || !db.buildSyncSchemaReport) return;
    const report = db.buildSyncSchemaReport(db.getStoredItemsOrDemo());
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Equipment sync schema report</b><textarea readonly style="width:100%;min-height:220px;margin-top:10px;">${escapeHtml(JSON.stringify(report, null, 2))}</textarea></div>`;
  }


  function showSyncPreviewReport(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output || !db.buildEquipmentSyncPreview) return;
    const report = db.buildEquipmentSyncPreview(db.getStoredItemsOrDemo());
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Equipment sync preview</b><textarea readonly style="width:100%;min-height:260px;margin-top:10px;">${escapeHtml(JSON.stringify(report, null, 2))}</textarea></div>`;
  }


  function showReadinessReport(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output || !db.buildEquipmentReadinessReport) return;
    const report = db.buildEquipmentReadinessReport(db.getStoredItemsOrDemo());
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Equipment sync readiness</b><p class="v4-muted" style="margin:.35rem 0 0;">Safe-fix задачи можно автоматизировать, ручные задачи требуют реальных значений: вес, мощность, остатки, поставщики.</p><textarea readonly style="width:100%;min-height:280px;margin-top:10px;">${escapeHtml(JSON.stringify(report, null, 2))}</textarea></div>`;
  }

  function applySafeCleanup(root, db) {
    if (!db.applyStoredEquipmentReadinessFixes) return;
    if (window.confirm && !window.confirm('Выполнить безопасную добивку базы? Коды будут приведены к сериям категорий с сохранением legacy-кодов. Вес, мощность, остатки и поставщики не будут заполняться автоматически.')) return;
    const result = db.applyStoredEquipmentReadinessFixes({ recode: true });
    toast(`Safe cleanup: ${result.after.score}% · осталось ручных задач ${result.after.counts.manual || 0}`);
    const output = root.querySelector('[data-v4-equipment-output]');
    renderEquipmentDatabase(root, readFilters(root));
    const refreshedOutput = root.querySelector('[data-v4-equipment-output]') || output;
    if (refreshedOutput) refreshedOutput.innerHTML = `<div class="v4-card" style="padding:12px;"><b>Safe cleanup result</b><textarea readonly style="width:100%;min-height:240px;margin-top:10px;">${escapeHtml(JSON.stringify(result, null, 2))}</textarea></div>`;
  }

  function showExport(root, db) {
    const output = root.querySelector('[data-v4-equipment-output]');
    if (!output) return;
    const json = db.exportItems();
    output.innerHTML = `<div class="v4-card" style="padding:12px;"><b>JSON export</b><textarea readonly style="width:100%;min-height:180px;margin-top:10px;">${escapeHtml(json)}</textarea></div>`;
  }

  function ensureEquipmentEditorStyles() {
    if (document.getElementById('v4EquipmentEditorStyles')) return;
    const style = document.createElement('style');
    style.id = 'v4EquipmentEditorStyles';
    style.textContent = `
      .v4-equipment-tools { display:grid; grid-template-columns:1.2fr .8fr .8fr auto; gap:10px; margin-top:14px; align-items:end; }
      .v4-equipment-active-filter { display:flex; gap:8px; align-items:center; padding:12px 0; color:var(--muted); font-size:.85rem; }
      .v4-equipment-active-filter input { width:auto; }
      .v4-hint-card { margin-top:12px; padding:10px 12px; border:1px dashed rgba(199,167,122,.35); border-radius:16px; color:var(--muted); background:rgba(199,167,122,.07); font-size:.88rem; }
      .v4-equipment-category-health { margin-top:12px; display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:12px 14px; border-radius:18px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.045); }
      .v4-equipment-category-health b { display:block; }
      .v4-equipment-category-health span, .v4-equipment-category-health small { color:var(--muted); }
      .v4-equipment-category-health.ok { border-color:rgba(102,220,151,.28); background:rgba(102,220,151,.07); }
      .v4-equipment-category-health.warn { border-color:rgba(246,196,83,.28); background:rgba(246,196,83,.07); }
      .v4-equipment-category-health.bad { border-color:rgba(255,120,98,.28); background:rgba(255,120,98,.07); }
      .v4-completion-filters .active { border-color:rgba(199,167,122,.7); background:rgba(199,167,122,.14); color:var(--text); }
      .btn-compact { padding:8px 10px; border-radius:12px; font-size:.78rem; }
      .v4-actions-cell { min-width:120px; }
      .v4-equipment-card-actions { margin-top:12px; display:flex; justify-content:flex-end; }
      .v4-equipment-editor-backdrop { position:fixed; inset:0; z-index:6000; display:none; align-items:center; justify-content:center; padding:18px; background:rgba(4,8,12,.62); backdrop-filter:blur(10px); }
      .v4-equipment-editor-backdrop.open { display:flex; }
      .v4-equipment-editor { width:min(980px, 100%); max-height:92vh; overflow:auto; border-radius:26px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg, #151d25, #0f151c); color:var(--text); box-shadow:0 28px 90px rgba(0,0,0,.52); padding:18px; }
      .v4-equipment-editor-head { display:flex; justify-content:space-between; gap:14px; align-items:flex-start; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,.08); }
      .v4-equipment-editor-head h3 { margin:.15rem 0 .25rem; }
      .v4-equipment-editor-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px; margin-top:14px; }
      .v4-equipment-editor-grid .field { margin:0; min-width:0; }
      .v4-equipment-editor-grid textarea { width:100%; resize:vertical; }
      .v4-equipment-code-field small { display:block; margin-top:5px; color:var(--muted); font-size:.72rem; line-height:1.3; }
      .v4-equipment-code-row { display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:8px; align-items:center; }
      .v4-equipment-code-row input { min-width:0; }
      .v4-equipment-editor-wide { grid-column:span 3; }
      .v4-equipment-editor-check { display:flex; align-items:center; gap:8px; padding:12px; border:1px solid rgba(255,255,255,.08); border-radius:16px; color:var(--muted); }
      .v4-equipment-editor-check input { width:auto; }
      .v4-equipment-editor-error { min-height:20px; margin-top:10px; color:#ffb4a6; font-weight:800; }
      .v4-equipment-editor-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:10px; margin-top:12px; }
      @media (max-width: 900px) { .v4-equipment-tools, .v4-equipment-editor-grid { grid-template-columns:1fr 1fr; } .v4-equipment-editor-wide { grid-column:1 / -1; } }
      @media (max-width: 640px) { .v4-equipment-tools, .v4-equipment-editor-grid { grid-template-columns:1fr; } .v4-equipment-editor { padding:14px; border-radius:22px; } .v4-equipment-editor-head { flex-direction:column; } .v4-equipment-code-row { grid-template-columns:1fr; } .v4-equipment-editor-actions { justify-content:stretch; } .v4-equipment-editor-actions button { width:100%; } }
    `;
    document.head.appendChild(style);
  }

  function debounce(fn, delay) {
    let timer = 0;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  function toast(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
    else if (window.showToast) window.showToast(message);
  }

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function formatTypeLabel(type, db) {
    const def = db && db.getItemTypeDefinition ? db.getItemTypeDefinition(type) : null;
    return def && def.label ? `${def.label} · ${type}` : type;
  }

  function renderTypeOptions(types, selectedType, db) {
    const list = Array.isArray(types) ? types : [];
    const selected = String(selectedType || '').trim();
    const merged = selected && !list.includes(selected) ? list.concat(selected) : list;
    return merged.map(type => `<option value="${escapeHtml(type)}" ${type === selected ? 'selected' : ''}>${escapeHtml(formatTypeLabel(type, db))}</option>`).join('');
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }

  function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.EquipmentDatabaseUI = { renderEquipmentDatabase, readFilters, openEquipmentEditor };
})();
