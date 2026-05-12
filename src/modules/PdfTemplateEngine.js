(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const PDF_TEMPLATE_ENGINE_VERSION = '3.9.8';

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function toNumber(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function nonNegative(value, fallback) { return Math.max(0, toNumber(value, fallback)); }
  function money(value) { return `${Math.round(nonNegative(value, 0)).toLocaleString('ru-RU')} ₽`; }
  function weight(value) { return `${nonNegative(value, 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`; }
  function power(value) { return `${(nonNegative(value, 0) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кВт`; }
  function qty(value) { return nonNegative(value, 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(',00', ''); }
  function nowIso() { return new Date().toISOString(); }

  const TEMPLATE_TYPES = new Set([
    'customer-proposal',
    'technical-sheet',
    'warehouse-all',
    'warehouse-deficits',
    'warehouse-subrent',
    'reservation-plan',
    'stock-movement-plan',
    'warehouse-workflow',
    'subrent-plan',
    'calendar-draft'
  ]);

  function canRender(doc) {
    const type = String(doc && doc.type || '');
    return TEMPLATE_TYPES.has(type) || type.startsWith('warehouse-');
  }

  function renderDocument(doc, options) {
    const d = doc || {};
    const body = renderBody(d, options || {});
    const title = d.title || d.type || 'FEG документ';
    const css = buildCss(options || {});
    const html = `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(title)}</title>\n<style>${css}</style>\n</head>\n<body>${body}</body>\n</html>`;
    return {
      type: 'feg-stage-pro-html-template',
      version: PDF_TEMPLATE_ENGINE_VERSION,
      title,
      bodyHtml: body,
      css,
      html,
      generatedAt: nowIso()
    };
  }

  function renderBody(doc, options) {
    const d = doc || {};
    const type = String(d.type || 'document');
    const themeClass = type === 'customer-proposal' ? 'client-doc' : 'internal-doc';
    return `
      <main class="feg-pdf-template ${themeClass} ${escapeHtml(slug(type))}" data-template-version="${PDF_TEMPLATE_ENGINE_VERSION}">
        ${renderHero(d)}
        ${renderMetaGrid(d)}
        ${renderTypeContent(d)}
        ${renderNotes(d)}
        ${renderFooter(d)}
      </main>`;
  }

  function renderHero(doc) {
    const isClient = doc.type === 'customer-proposal';
    const label = isClient ? 'Коммерческое предложение' : 'Технический документ';
    return `
      <section class="feg-doc-hero">
        <div>
          <div class="feg-brand">FEG <span>Stage PRO</span></div>
          <h1>${escapeHtml(doc.title || label)}</h1>
          <p>${escapeHtml(doc.projectName || 'Проект без названия')}</p>
        </div>
        <div class="feg-hero-card">
          <b>${escapeHtml(label)}</b>
          <span>${escapeHtml(formatDate(doc.eventDate) || 'Дата не указана')}</span>
          <small>${escapeHtml(doc.clientName || 'Клиент не указан')}</small>
        </div>
      </section>`;
  }

  function renderMetaGrid(doc) {
    const items = [
      ['Проект', doc.projectName || '—'],
      ['Клиент', doc.clientName || '—'],
      ['Площадка', doc.venueName || '—'],
      ['Адрес', doc.venueAddress || '—'],
      ['Дата', formatDate(doc.eventDate) || '—'],
      ['Сформировано', formatDateTime(doc.generatedAt) || '—']
    ];
    return `<section class="feg-meta-grid">${items.map(([label, value]) => `
      <div class="feg-meta-cell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
    </section>`;
  }

  function renderTypeContent(doc) {
    if (doc.type === 'customer-proposal') return renderCustomerProposal(doc);
    if (doc.type === 'technical-sheet') return renderTechnicalSheet(doc);
    if (String(doc.type || '').startsWith('warehouse-')) return renderWarehouseSheet(doc);
    if (doc.type === 'reservation-plan') return renderReservationSheet(doc);
    if (doc.type === 'stock-movement-plan') return renderStockMovementSheet(doc);
    if (doc.type === 'warehouse-workflow') return renderWorkflowSheet(doc);
    if (doc.type === 'subrent-plan') return renderSubrentSheet(doc);
    if (doc.type === 'calendar-draft') return renderCalendarDraft(doc);
    return `<section class="feg-section"><pre>${escapeHtml(JSON.stringify(doc, null, 2))}</pre></section>`;
  }

  function renderCustomerProposal(doc) {
    const rows = doc.rows || [];
    return `
      <section class="feg-section">
        <h2>Состав предложения</h2>
        <table class="feg-doc-table feg-money-table">
          <thead><tr><th>Раздел</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Итого</th></tr></thead>
          <tbody>${rows.map(row => `<tr><td><b>${escapeHtml(row.title)}</b>${row.note ? `<small>${escapeHtml(row.note)}</small>` : ''}</td><td>${qty(row.qty)}</td><td>${escapeHtml(row.unit || 'раздел')}</td><td>${money(row.price)}</td><td><b>${money(row.total)}</b></td></tr>`).join('') || emptyRow(5)}</tbody>
        </table>
      </section>
      <section class="feg-totals feg-totals-accent">
        <div><span>Разделы</span><b>${money(doc.totals && doc.totals.rental)}</b></div>
        <div><span>Транспорт</span><b>${money(doc.totals && doc.totals.transport)}</b></div>
        <div class="grand"><span>Итого к оплате</span><b>${money(doc.totals && doc.totals.total)}</b></div>
      </section>`;
  }

  function renderTechnicalSheet(doc) {
    return `
      <section class="feg-totals">
        <div><span>Общий вес</span><b>${weight(doc.totals && doc.totals.weightKg)}</b></div>
        <div><span>Рабочая мощность</span><b>${power(doc.totals && doc.totals.powerW)}</b></div>
        <div><span>Пусковая мощность</span><b>${power(doc.totals && doc.totals.startupPowerW)}</b></div>
        <div><span>Дефицит</span><b>${qty(doc.totals && doc.totals.deficitCount)} строк</b></div>
      </section>
      <section class="feg-section">
        <h2>Технические разделы</h2>
        <table class="feg-doc-table">
          <thead><tr><th>Раздел</th><th>Статус</th><th>Сводка</th><th>Вес</th><th>Мощность</th><th>Пуск</th></tr></thead>
          <tbody>${(doc.rows || []).map(row => `<tr><td><b>${escapeHtml(row.section)}</b></td><td>${escapeHtml(row.status || '—')}</td><td>${escapeHtml(row.summary || '—')}</td><td>${weight(row.weightKg)}</td><td>${power(row.powerW)}</td><td>${power(row.startupPowerW)}</td></tr>`).join('') || emptyRow(6)}</tbody>
        </table>
      </section>`;
  }

  function renderWarehouseSheet(doc) {
    return `
      <section class="feg-totals">
        <div><span>Позиций</span><b>${qty(doc.totals && doc.totals.totalRows)}</b></div>
        <div><span>Единиц</span><b>${qty(doc.totals && doc.totals.totalQty)}</b></div>
        <div><span>Вес</span><b>${weight(doc.totals && doc.totals.totalWeightKg)}</b></div>
        <div><span>Дефицит</span><b>${qty(doc.totals && doc.totals.deficitRows)} строк</b></div>
      </section>
      <section class="feg-section">
        <h2>Складские позиции</h2>
        <table class="feg-doc-table feg-warehouse-table">
          <thead><tr><th>№</th><th>Раздел</th><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Доступно</th><th>Дефицит</th><th>Источник</th></tr></thead>
          <tbody>${(doc.rows || []).map(row => `<tr><td>${qty(row.n)}</td><td>${escapeHtml(row.section || '—')}</td><td><code>${escapeHtml(row.code || '—')}</code></td><td><b>${escapeHtml(row.name || '—')}</b>${row.note ? `<small>${escapeHtml(row.note)}</small>` : ''}</td><td>${qty(row.qty)} ${escapeHtml(row.unit || 'шт')}</td><td>${row.availableQty == null ? '—' : qty(row.availableQty)}</td><td>${row.deficitQty ? `<mark>${qty(row.deficitQty)}</mark>` : '—'}</td><td>${escapeHtml(sourceLabel(row))}</td></tr>`).join('') || emptyRow(8)}</tbody>
        </table>
      </section>`;
  }

  function renderReservationSheet(doc) {
    return `
      <section class="feg-totals">
        <div><span>Нужно</span><b>${qty(doc.totals && doc.totals.requestedQty)}</b></div>
        <div><span>Резерв</span><b>${qty(doc.totals && doc.totals.reservedQty)}</b></div>
        <div><span>Дефицит</span><b>${qty(doc.totals && doc.totals.deficitQty)}</b></div>
        <div><span>Субаренда</span><b>${qty(doc.totals && doc.totals.subrentQty)}</b></div>
      </section>
      <section class="feg-section">
        <h2>План резерва</h2>
        <table class="feg-doc-table"><thead><tr><th>№</th><th>Позиция</th><th>Нужно</th><th>Резерв</th><th>Доступно</th><th>Статус</th></tr></thead>
        <tbody>${(doc.rows || []).map(row => `<tr><td>${qty(row.n)}</td><td><code>${escapeHtml(row.code || '—')}</code><br><b>${escapeHtml(row.name || '—')}</b></td><td>${qty(row.qty)}</td><td>${qty(row.reservedQty)}</td><td>${row.availableQty == null ? '—' : qty(row.availableQty)}</td><td>${escapeHtml(row.status || '—')}</td></tr>`).join('') || emptyRow(6)}</tbody></table>
      </section>`;
  }

  function renderStockMovementSheet(doc) {
    return `
      <section class="feg-section">
        <h2>Плановые операции склада</h2>
        <table class="feg-doc-table"><thead><tr><th>№</th><th>Операция</th><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Статус</th></tr></thead>
        <tbody>${(doc.rows || []).map(row => `<tr><td>${qty(row.n)}</td><td>${escapeHtml(row.movementType || doc.action || 'reserve')}</td><td><code>${escapeHtml(row.code || '—')}</code></td><td><b>${escapeHtml(row.name || '—')}</b></td><td>${qty(row.qty)} ${escapeHtml(row.unit || 'шт')}</td><td>${escapeHtml(row.status || 'planned')}</td></tr>`).join('') || emptyRow(6)}</tbody></table>
      </section>`;
  }

  function renderWorkflowSheet(doc) {
    return `
      <section class="feg-totals"><div><span>Статус склада</span><b>${escapeHtml(doc.statusLabel || doc.status || '—')}</b></div><div><span>Действие</span><b>${escapeHtml(doc.warehouseAction || '—')}</b></div></section>
      <section class="feg-section"><h2>Timeline</h2><div class="feg-timeline">${(doc.timeline || []).slice(0, 16).map(event => `<div><b>${escapeHtml(event.statusLabel || event.status || '—')}</b><span>${escapeHtml(formatDateTime(event.at) || '—')} · ${escapeHtml(event.actorName || '—')}</span>${event.note ? `<small>${escapeHtml(event.note)}</small>` : ''}</div>`).join('') || '<p class="feg-muted">Событий пока нет.</p>'}</div></section>`;
  }

  function renderSubrentSheet(doc) {
    return `
      <section class="feg-totals feg-totals-accent">
        <div><span>Субаренда</span><b>${money(doc.totals && doc.totals.subrent)}</b></div>
        <div><span>Клиенту</span><b>${money(doc.totals && doc.totals.client)}</b></div>
        <div class="grand"><span>Маржа</span><b>${money(doc.totals && doc.totals.margin)}</b></div>
      </section>
      <section class="feg-section"><h2>Позиции субаренды</h2><table class="feg-doc-table"><thead><tr><th>№</th><th>Позиция</th><th>Кол-во</th><th>Поставщик</th><th>Субаренда</th><th>Клиенту</th><th>Маржа</th></tr></thead>
      <tbody>${(doc.rows || []).map(row => `<tr><td>${qty(row.n)}</td><td><code>${escapeHtml(row.code || '—')}</code><br><b>${escapeHtml(row.name || '—')}</b></td><td>${qty(row.qty)} ${escapeHtml(row.unit || 'шт')}</td><td>${escapeHtml(row.supplierName || '—')}</td><td>${money(row.totalSubrent || row.subrentPrice)}</td><td>${money(row.totalClient || row.clientPrice)}</td><td><b>${money(row.margin)}</b></td></tr>`).join('') || emptyRow(7)}</tbody></table></section>`;
  }

  function renderCalendarDraft(doc) {
    return `<section class="feg-section"><h2>Черновик события</h2><div class="feg-calendar-card"><b>${escapeHtml(doc.title || '—')}</b><span>${escapeHtml(formatDate(doc.date) || '—')}</span><span>${escapeHtml(doc.location || '—')}</span><p>${escapeHtml(doc.description || '—')}</p></div></section>`;
  }

  function renderNotes(doc) {
    const notes = Array.isArray(doc.notes) ? doc.notes.filter(Boolean) : [];
    if (!notes.length) return '';
    return `<section class="feg-notes"><h2>Примечания</h2>${notes.map(note => `<p>${escapeHtml(note)}</p>`).join('')}</section>`;
  }

  function renderFooter(doc) {
    return `<footer class="feg-doc-footer"><span>FEG Stage PRO · ${escapeHtml(PDF_TEMPLATE_ENGINE_VERSION)}</span><span>${escapeHtml(formatDateTime(doc.generatedAt) || '')}</span></footer>`;
  }

  function buildCss() {
    return `
      :root { --ink:#121820; --muted:#69727d; --line:#d7dde3; --soft:#f7f4ef; --accent:#c4a06f; --dark:#111820; }
      * { box-sizing:border-box; }
      body { margin:0; background:#eef1f4; color:var(--ink); font:14px/1.45 Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .feg-pdf-template { width:min(1120px, 100%); margin:0 auto; padding:28px; background:#fff; min-height:100vh; }
      .feg-doc-hero { display:grid; grid-template-columns:1fr 280px; gap:18px; align-items:stretch; border-radius:22px; padding:24px; background:linear-gradient(135deg, var(--dark), #26323e 58%, #4d3825); color:#fff; }
      .feg-brand { font-weight:950; letter-spacing:.08em; text-transform:uppercase; color:#fff; font-size:13px; } .feg-brand span { color:#e5c58c; }
      h1 { margin:10px 0 6px; font-size:30px; line-height:1.05; letter-spacing:-.04em; } h2 { margin:0 0 12px; font-size:15px; text-transform:uppercase; letter-spacing:.08em; }
      .feg-doc-hero p { margin:0; color:rgba(255,255,255,.76); }
      .feg-hero-card { border:1px solid rgba(255,255,255,.2); border-radius:18px; background:rgba(255,255,255,.08); padding:16px; display:flex; flex-direction:column; gap:8px; }
      .feg-hero-card b { font-size:16px; } .feg-hero-card span { color:#e5c58c; font-weight:900; } .feg-hero-card small { color:rgba(255,255,255,.72); }
      .feg-meta-grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px; margin:16px 0; }
      .feg-meta-cell { border:1px solid var(--line); border-radius:14px; padding:10px 12px; background:var(--soft); } .feg-meta-cell span { display:block; color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.05em; } .feg-meta-cell strong { display:block; margin-top:3px; overflow-wrap:anywhere; }
      .feg-section, .feg-notes { margin-top:16px; border:1px solid var(--line); border-radius:18px; padding:16px; background:#fff; overflow:hidden; }
      .feg-doc-table { width:100%; border-collapse:collapse; font-size:12px; } .feg-doc-table th { text-align:left; padding:9px 8px; background:var(--dark); color:#fff; font-size:10px; text-transform:uppercase; letter-spacing:.04em; } .feg-doc-table td { padding:9px 8px; border-bottom:1px solid #e7ebef; vertical-align:top; } .feg-doc-table tr:last-child td { border-bottom:0; } .feg-doc-table small { display:block; color:var(--muted); margin-top:3px; } .feg-doc-table code { font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:11px; background:#f2f4f6; border-radius:7px; padding:2px 5px; } mark { background:#ffe3de; color:#9b1c1c; border-radius:999px; padding:2px 7px; font-weight:900; }
      .feg-totals { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:10px; margin:16px 0; } .feg-totals div { border:1px solid var(--line); border-radius:16px; padding:12px; background:#fbfcfd; } .feg-totals span { display:block; color:var(--muted); font-size:11px; text-transform:uppercase; } .feg-totals b { display:block; margin-top:4px; font-size:18px; } .feg-totals-accent .grand { background:var(--accent); color:#19140d; border-color:var(--accent); }
      .feg-timeline { display:grid; gap:8px; } .feg-timeline div { border-left:3px solid var(--accent); background:#faf8f5; border-radius:12px; padding:10px 12px; } .feg-timeline span, .feg-timeline small { display:block; color:var(--muted); margin-top:2px; }
      .feg-calendar-card { display:grid; gap:8px; border-radius:14px; background:#f7f4ef; padding:14px; } .feg-calendar-card b { font-size:18px; }
      .feg-notes p { margin:0 0 8px; color:var(--muted); } .feg-doc-footer { display:flex; justify-content:space-between; gap:12px; margin-top:18px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:11px; }
      @media print { body { background:#fff; } .feg-pdf-template { width:100%; padding:0; } .feg-section, .feg-meta-cell, .feg-totals div { break-inside:avoid; } }
      @media (max-width:720px) { .feg-pdf-template { padding:14px; } .feg-doc-hero { grid-template-columns:1fr; } .feg-meta-grid, .feg-totals { grid-template-columns:1fr; } .feg-doc-table { min-width:760px; } .feg-section { overflow:auto; } }
    `;
  }

  function sourceLabel(row) {
    if (!row) return '—';
    if (row.supplierName) return `${row.sourceType || 'subrent'}: ${row.supplierName}`;
    return row.sourceType || row.inventoryStatus || 'own';
  }

  function emptyRow(cols) { return `<tr><td colspan="${cols || 1}">Нет данных</td></tr>`; }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return toText(value);
    return date.toLocaleDateString('ru-RU');
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return toText(value);
    return date.toLocaleString('ru-RU');
  }

  function slug(value) {
    return String(value == null ? '' : value).trim().toLowerCase().replace(/[ё]/g, 'e').replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-+|-+$/g, '') || 'document';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.PdfTemplateEngine = {
    PDF_TEMPLATE_ENGINE_VERSION,
    canRender,
    renderDocument,
    renderBody,
    buildCss
  };
})();
