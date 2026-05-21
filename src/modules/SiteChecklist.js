(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const STORAGE_KEY = 'fegV4SiteChecklists';
  const VERSION = '1.0.0-techdirector-site-checklist';

  const TEXT_FIELDS = Object.freeze([
    ['projectName', 'Проект / мероприятие', 'Фестиваль / корпоратив / концерт'],
    ['venueName', 'Площадка', 'Название площадки / адрес'],
    ['inspectorName', 'Кто осмотрел', 'ФИО техдиректора'],
    ['inspectionDate', 'Дата осмотра', ''],
    ['roomDimensions', 'Размеры помещения', 'ширина / глубина / полезные зоны'],
    ['ceilingHeight', 'Высота потолков', 'общая / до балок / до ферм площадки'],
    ['stageParameters', 'Сцена площадки', 'размеры, высота, одежда, подиумы, ограничения'],
    ['houseEquipment', 'Оборудование площадки', 'звук, свет, экраны, коммутация, подвесы'],
    ['placementPlan', 'Куда что ставить', 'FOH, PA, фермы, LED, грим, склад, кофры'],
    ['powerInputs', 'Электричество / вводная', 'щитовая, вводы, расстояния, автоматы, фазы'],
    ['powerCapacity', 'Сколько тянет щитовая', 'кВт / А / запас / нужно ли разделять линии'],
    ['generatorPlan', 'Генератор / кабель', 'нужен ли генератор, где ставить, сколько кабеля, через что тянуть'],
    ['backstageRooms', 'Гримерки / техпомещения', 'где артисты, где техперсонал, где хранить чехлы'],
    ['loadingAccess', 'Подъезды / разгрузка', 'фуры, грузовые, прицепы, лифты, ворота, ограничения'],
    ['restrictions', 'Запреты / ограничения', 'шум, время заезда, пожарка, подвесы, полы, охрана'],
    ['contacts', 'Контакты специалистов', 'электрик, техдир площадки, админ, директор, охрана'],
    ['notes', 'Дополнительные заметки', 'риски, что уточнить, что взять с собой']
  ]);

  function getStorage(storage) {
    if (storage) return storage;
    if (GLOBAL.localStorage) return GLOBAL.localStorage;
    if (!GLOBAL.__FEG_SITE_CHECKLIST_MEMORY_STORAGE__) {
      const data = new Map();
      GLOBAL.__FEG_SITE_CHECKLIST_MEMORY_STORAGE__ = {
        getItem: key => data.has(key) ? data.get(key) : null,
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: key => data.delete(key)
      };
    }
    return GLOBAL.__FEG_SITE_CHECKLIST_MEMORY_STORAGE__;
  }

  function parseJson(raw, fallback) {
    try {
      const parsed = JSON.parse(raw || '');
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function normalizeChecklist(input) {
    const src = input || {};
    const now = new Date().toISOString();
    const fields = {};
    TEXT_FIELDS.forEach(([key]) => { fields[key] = String((src.fields && src.fields[key]) || src[key] || '').trim(); });
    if (!fields.inspectionDate) fields.inspectionDate = now.slice(0, 10);
    return {
      id: src.id || `site-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      version: VERSION,
      projectId: String(src.projectId || '').trim(),
      fields,
      markers: (Array.isArray(src.markers) ? src.markers : []).map(marker => ({
        id: marker.id || `mark-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: Math.max(0, Math.min(100, Number(marker.x || 0))),
        y: Math.max(0, Math.min(100, Number(marker.y || 0))),
        label: String(marker.label || 'Метка').slice(0, 80),
        note: String(marker.note || '').slice(0, 240)
      })),
      photos: (Array.isArray(src.photos) ? src.photos : []).map(photo => ({
        id: photo.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: String(photo.name || 'Фото площадки').slice(0, 120),
        dataUrl: String(photo.dataUrl || '').slice(0, 1024 * 1024 * 3),
        note: String(photo.note || '').slice(0, 240),
        addedAt: photo.addedAt || now
      })).filter(photo => photo.dataUrl),
      createdAt: src.createdAt || now,
      updatedAt: now,
      createdBy: src.createdBy || ''
    };
  }

  function loadChecklists(storage) {
    const raw = getStorage(storage).getItem(STORAGE_KEY);
    const rows = parseJson(raw, []);
    return (Array.isArray(rows) ? rows : []).map(normalizeChecklist).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  function saveChecklist(data, storage) {
    const list = loadChecklists(storage);
    const next = normalizeChecklist(data);
    const index = list.findIndex(row => row.id === next.id);
    if (index >= 0) list[index] = { ...next, createdAt: list[index].createdAt || next.createdAt };
    else list.unshift(next);
    getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
    return next;
  }

  function deleteChecklist(id, storage) {
    const list = loadChecklists(storage).filter(row => row.id !== id);
    getStorage(storage).setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  }

  function getChecklist(id, storage) {
    return loadChecklists(storage).find(row => row.id === id) || null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function escapeAttr(value) { return escapeHtml(value); }

  function renderSiteChecklist(target, options) {
    const root = typeof target === 'string' ? GLOBAL.document && document.getElementById(target) : target;
    if (!root) return null;
    const opts = options || {};
    const auth = ROOT.AuthProvider && ROOT.AuthProvider.getAuthState ? ROOT.AuthProvider.getAuthState() : { role: 'viewer', user: null };
    const role = auth.role || 'viewer';
    const canEdit = ROOT.RolePermissions && ROOT.RolePermissions.hasPermission ? ROOT.RolePermissions.hasPermission(role, 'site_checklist:edit') : role === 'admin' || role === 'tech_director';
    const list = loadChecklists();
    const activeId = root._siteChecklistActiveId || (list[0] && list[0].id) || '';
    const active = getChecklist(activeId) || normalizeChecklist({ createdBy: auth.user && (auth.user.displayName || auth.user.email) || '' });
    root._siteChecklistActiveId = active.id;
    root.innerHTML = renderShell(active, list, canEdit, opts);
    bind(root, active, canEdit, opts);
    return root;
  }

  function renderShell(active, list, canEdit) {
    return `
      <div class="v4-site-checklist" data-site-checklist-id="${escapeAttr(active.id)}">
        <div class="v4-card">
          <div class="v4-card-head">
            <div>
              <div class="v4-kicker">ТехДиректор · Чек-лист площадки</div>
              <h3>Осмотр и документация площадки</h3>
              <p class="v4-muted">Фиксируем помещение, сцену, электричество, логистику, контакты, фото и простую схему с пометками.</p>
            </div>
            <div class="v4-auth-actions">
              <button type="button" class="btn-secondary" data-site-checklist-action="new"${canEdit ? '' : ' disabled'}>+ новый</button>
              <button type="button" class="btn-primary" data-site-checklist-action="save"${canEdit ? '' : ' disabled'}>Сохранить</button>
              <button type="button" class="btn-secondary" data-site-checklist-action="export">JSON</button>
            </div>
          </div>
          <div class="v4-site-checklist-layout">
            <aside class="v4-site-checklist-list">
              <h4>Осмотры</h4>
              ${(list.length ? list : [active]).map(row => `<button type="button" class="v4-site-checklist-row${row.id === active.id ? ' is-active' : ''}" data-site-checklist-open="${escapeAttr(row.id)}"><b>${escapeHtml(row.fields.projectName || row.fields.venueName || 'Новый осмотр')}</b><span>${escapeHtml(row.fields.inspectionDate || '')} · ${escapeHtml(row.fields.venueName || 'площадка не указана')}</span></button>`).join('')}
              <button type="button" class="btn-secondary" data-site-checklist-action="delete"${canEdit ? '' : ' disabled'}>Удалить текущий</button>
            </aside>
            <main class="v4-site-checklist-main">
              ${renderFields(active, canEdit)}
              ${renderScheme(active, canEdit)}
              ${renderPhotos(active, canEdit)}
              <pre class="v4-json-preview" data-site-checklist-export hidden></pre>
            </main>
          </div>
        </div>
      </div>`;
  }

  function renderFields(active, canEdit) {
    const fieldHtml = TEXT_FIELDS.map(([key, label, placeholder]) => {
      const value = active.fields[key] || '';
      if (['placementPlan', 'powerInputs', 'powerCapacity', 'generatorPlan', 'backstageRooms', 'loadingAccess', 'restrictions', 'contacts', 'notes', 'houseEquipment', 'stageParameters'].includes(key)) {
        return `<label class="v4-field v4-site-field--wide">${escapeHtml(label)}<textarea data-site-field="${escapeAttr(key)}" rows="3" placeholder="${escapeAttr(placeholder)}"${canEdit ? '' : ' readonly'}>${escapeHtml(value)}</textarea></label>`;
      }
      const type = key === 'inspectionDate' ? 'date' : 'text';
      return `<label class="v4-field">${escapeHtml(label)}<input data-site-field="${escapeAttr(key)}" type="${type}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"${canEdit ? '' : ' readonly'}></label>`;
    }).join('');
    return `<section class="v4-site-section"><h4>Параметры площадки</h4><div class="v4-site-grid">${fieldHtml}</div></section>`;
  }

  function renderScheme(active, canEdit) {
    const markers = active.markers || [];
    return `
      <section class="v4-site-section">
        <div class="v4-card-head v4-card-head--compact">
          <div><h4>Схема площадки</h4><p class="v4-muted">Клик по полю добавит метку с подписью. Используй для FOH, PA, генератора, щитовой, разгрузки, гримёрок и склада кофров.</p></div>
          <div class="v4-auth-actions"><button type="button" class="btn-secondary" data-site-checklist-action="clear-markers"${canEdit ? '' : ' disabled'}>Очистить схему</button></div>
        </div>
        <div class="v4-site-scheme" data-site-scheme${canEdit ? '' : ' aria-disabled="true"'}>
          ${markers.map((marker, index) => `<button type="button" class="v4-site-marker" style="left:${escapeAttr(marker.x)}%;top:${escapeAttr(marker.y)}%;" data-site-marker="${escapeAttr(marker.id)}" title="${escapeAttr(marker.note || marker.label)}"><b>${index + 1}</b><span>${escapeHtml(marker.label)}</span></button>`).join('')}
        </div>
        <div class="v4-site-marker-list">
          ${markers.map((marker, index) => `<div class="v4-site-marker-row"><b>${index + 1}. ${escapeHtml(marker.label)}</b><span>${escapeHtml(marker.note || '')}</span><button type="button" class="btn-secondary btn-compact" data-site-marker-delete="${escapeAttr(marker.id)}"${canEdit ? '' : ' disabled'}>убрать</button></div>`).join('') || '<p class="v4-muted">Меток пока нет.</p>'}
        </div>
      </section>`;
  }

  function renderPhotos(active, canEdit) {
    const photos = active.photos || [];
    return `
      <section class="v4-site-section">
        <div class="v4-card-head v4-card-head--compact">
          <div><h4>Фото площадки</h4><p class="v4-muted">Фото сохраняются локально в карточке осмотра. Для большого архива лучше потом вынести в Supabase Storage.</p></div>
          <label class="btn-secondary v4-file-button">+ фото<input data-site-photo-input type="file" accept="image/*" multiple ${canEdit ? '' : 'disabled'}></label>
        </div>
        <div class="v4-site-photo-grid">
          ${photos.map(photo => `<figure class="v4-site-photo"><img src="${escapeAttr(photo.dataUrl)}" alt="${escapeAttr(photo.name)}"><figcaption><b>${escapeHtml(photo.name)}</b><span>${escapeHtml(photo.note || '')}</span><button type="button" class="btn-secondary btn-compact" data-site-photo-delete="${escapeAttr(photo.id)}"${canEdit ? '' : ' disabled'}>удалить</button></figcaption></figure>`).join('') || '<p class="v4-muted">Фото пока не добавлены.</p>'}
        </div>
      </section>`;
  }

  function readCurrent(root, active) {
    const fields = { ...(active.fields || {}) };
    root.querySelectorAll('[data-site-field]').forEach(input => { fields[input.getAttribute('data-site-field')] = input.value || ''; });
    return normalizeChecklist({ ...active, fields });
  }

  function bind(root, active, canEdit, opts) {
    const rerender = checklist => { root._siteChecklistActiveId = checklist && checklist.id || active.id; renderSiteChecklist(root, opts); };
    root.querySelectorAll('[data-site-checklist-open]').forEach(btn => btn.addEventListener('click', () => {
      root._siteChecklistActiveId = btn.getAttribute('data-site-checklist-open');
      renderSiteChecklist(root, opts);
    }));
    root.querySelectorAll('[data-site-checklist-action]').forEach(btn => btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-site-checklist-action');
      if (action === 'new' && canEdit) {
        const created = saveChecklist(normalizeChecklist({ createdBy: ROOT.AuthProvider && ROOT.AuthProvider.getCurrentUser ? (ROOT.AuthProvider.getCurrentUser() || {}).displayName : '' }));
        rerender(created);
      }
      if (action === 'save' && canEdit) {
        const saved = saveChecklist(readCurrent(root, active));
        rerender(saved);
      }
      if (action === 'delete' && canEdit) {
        deleteChecklist(active.id);
        const next = loadChecklists()[0] || normalizeChecklist({});
        rerender(next);
      }
      if (action === 'export') {
        const pre = root.querySelector('[data-site-checklist-export]');
        if (pre) {
          pre.hidden = false;
          pre.textContent = JSON.stringify(readCurrent(root, active), null, 2);
        }
      }
      if (action === 'clear-markers' && canEdit) {
        const saved = saveChecklist({ ...readCurrent(root, active), markers: [] });
        rerender(saved);
      }
    }));

    const scheme = root.querySelector('[data-site-scheme]');
    if (scheme && canEdit) {
      scheme.addEventListener('click', event => {
        if (event.target.closest('[data-site-marker]')) return;
        const rect = scheme.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        const label = GLOBAL.prompt ? GLOBAL.prompt('Подпись метки на схеме:', 'Новая метка') : 'Новая метка';
        if (!label) return;
        const note = GLOBAL.prompt ? GLOBAL.prompt('Комментарий к метке:', '') : '';
        const current = readCurrent(root, active);
        current.markers.push({ id: `mark-${Date.now()}`, x, y, label, note });
        rerender(saveChecklist(current));
      });
    }

    root.querySelectorAll('[data-site-marker-delete]').forEach(btn => btn.addEventListener('click', () => {
      if (!canEdit) return;
      const id = btn.getAttribute('data-site-marker-delete');
      const current = readCurrent(root, active);
      current.markers = current.markers.filter(marker => marker.id !== id);
      rerender(saveChecklist(current));
    }));

    const fileInput = root.querySelector('[data-site-photo-input]');
    if (fileInput && canEdit) {
      fileInput.addEventListener('change', () => {
        const files = Array.from(fileInput.files || []).slice(0, 8);
        if (!files.length) return;
        const current = readCurrent(root, active);
        let pending = files.length;
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = () => {
            current.photos.push({ id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: file.name, dataUrl: String(reader.result || ''), addedAt: new Date().toISOString() });
            pending -= 1;
            if (pending <= 0) rerender(saveChecklist(current));
          };
          reader.readAsDataURL(file);
        });
      });
    }

    root.querySelectorAll('[data-site-photo-delete]').forEach(btn => btn.addEventListener('click', () => {
      if (!canEdit) return;
      const id = btn.getAttribute('data-site-photo-delete');
      const current = readCurrent(root, active);
      current.photos = current.photos.filter(photo => photo.id !== id);
      rerender(saveChecklist(current));
    }));
  }

  ROOT.SiteChecklist = {
    STORAGE_KEY,
    VERSION,
    TEXT_FIELDS,
    normalizeChecklist,
    loadChecklists,
    saveChecklist,
    deleteChecklist,
    getChecklist,
    renderSiteChecklist
  };
})();
