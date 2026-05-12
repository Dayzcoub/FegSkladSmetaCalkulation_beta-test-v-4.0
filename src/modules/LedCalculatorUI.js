(function () {
  'use strict';
  const ROOT = (window.FEGModules = window.FEGModules || {});

  function renderLedCalculator(target, initial) {
    const root = typeof target === 'string' ? document.getElementById(target) : target;
    if (!root) return null;
    const calc = ROOT.LedCalculator;
    if (!calc) {
      root.innerHTML = '<div class="v4-card"><p class="v4-muted">LED Calculator module is not loaded.</p></div>';
      return root;
    }
    const defaultFormat = calc.getCabinetFormat ? calc.getCabinetFormat('640x640') : { defaultWeightKg: 14, defaultPowerW: 320, defaultStartupPowerW: 600 };
    const state = Object.assign({ widthM: 4, heightM: 2.56, format: '640x640', pitch: 'p4', cabinetWeightKg: defaultFormat.defaultWeightKg, cabinetPowerW: defaultFormat.defaultPowerW, cabinetStartupPowerW: defaultFormat.defaultStartupPowerW, legType: '3m', legCount: 0 }, initial || {});
    root.innerHTML = `
      <div class="v4-card" data-led-calculator>
        <div class="v4-kicker">LED Calculator</div>
        <h3>Быстрый расчёт LED-экрана</h3>
        <p class="v4-muted">Кабинеты, линки, PowerCON–Schuko, ноги, печеньки, болты, вес, рабочая и пусковая мощность.</p>
        <div class="v4-grid-3">
          <label class="v4-field"><span>Ширина, м</span><input type="number" min="0.1" step="0.1" data-led="widthM" value="${escapeHtml(state.widthM)}"></label>
          <label class="v4-field"><span>Высота, м</span><input type="number" min="0.1" step="0.1" data-led="heightM" value="${escapeHtml(state.heightM)}"></label>
          <label class="v4-field"><span>Форм-фактор</span><select data-led="format">${Object.values(calc.CABINET_FORMATS).map(f => `<option value="${f.id}" ${f.id === state.format ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}</select></label>
          <label class="v4-field"><span>Шаг пикселя</span><select data-led="pitch">${Object.values(calc.PIXEL_PITCHES).map(p => `<option value="${p.id}" ${p.id === state.pitch ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></label>
          <label class="v4-field"><span>Вес кабинета, кг</span><input type="number" min="0" step="0.1" data-led="cabinetWeightKg" value="${escapeHtml(state.cabinetWeightKg)}"></label>
          <label class="v4-field"><span>Мощность кабинета, Вт</span><input type="number" min="0" step="10" data-led="cabinetPowerW" value="${escapeHtml(state.cabinetPowerW)}"></label>
          <label class="v4-field"><span>Пусковая мощность, Вт</span><input type="number" min="0" step="10" data-led="cabinetStartupPowerW" value="${escapeHtml(state.cabinetStartupPowerW)}"></label>
          <label class="v4-field"><span>Тип ног</span><select data-led="legType">${Object.values(calc.LEG_TYPES || {}).map(leg => `<option value="${leg.id}" ${leg.id === state.legType ? 'selected' : ''}>${escapeHtml(leg.name)}</option>`).join('')}</select></label>
          <label class="v4-field"><span>Количество ног</span><input type="number" min="0" step="1" data-led="legCount" value="${escapeHtml(state.legCount)}"></label>
        </div>
        <div class="v4-actions"><button type="button" class="btn-primary" data-led-calc>Рассчитать LED</button></div>
        <div data-led-result></div>
      </div>`;

    const recalc = () => renderResult(root);
    const formatEl = root.querySelector('[data-led="format"]');
    if (formatEl) {
      formatEl.addEventListener('change', () => {
        applyFormatDefaults(root, formatEl.value);
        recalc();
      });
    }
    root.querySelectorAll('[data-led]').forEach(input => input.addEventListener('input', recalc));
    const btn = root.querySelector('[data-led-calc]');
    if (btn) btn.addEventListener('click', recalc);
    recalc();
    return root;
  }

  function applyFormatDefaults(root, formatId) {
    const calc = ROOT.LedCalculator;
    if (!calc || !calc.getCabinetFormat) return;
    const format = calc.getCabinetFormat(formatId);
    setField(root, 'cabinetWeightKg', format.defaultWeightKg || 0);
    setField(root, 'cabinetPowerW', format.defaultPowerW || 0);
    setField(root, 'cabinetStartupPowerW', format.defaultStartupPowerW || 0);
  }

  function setField(root, key, value) {
    const el = root.querySelector(`[data-led="${key}"]`);
    if (el) el.value = value;
  }

  function readState(root) {
    const get = key => {
      const el = root.querySelector(`[data-led="${key}"]`);
      return el ? el.value : '';
    };
    return {
      widthM: get('widthM'),
      heightM: get('heightM'),
      format: get('format'),
      pitch: get('pitch'),
      cabinetWeightKg: get('cabinetWeightKg'),
      cabinetPowerW: get('cabinetPowerW'),
      cabinetStartupPowerW: get('cabinetStartupPowerW'),
      legType: get('legType'),
      legCount: get('legCount')
    };
  }

  function renderResult(root) {
    const calc = ROOT.LedCalculator;
    const box = root.querySelector('[data-led-result]');
    if (!calc || !box) return;
    const result = calc.calculateLedScreen(readState(root));
    const summary = calc.summarizeLed(result);
    const rows = calc.buildLedBomRows(result);
    box.innerHTML = `
      <div class="v4-summary-grid">
        <div class="v4-mini"><b>Фактический размер</b><span>${escapeHtml(summary.actualSize)}</span><small>Запрошено: ${escapeHtml(summary.requestedSize)}</small></div>
        <div class="v4-mini"><b>Кабинеты</b><span>${escapeHtml(summary.cabinets)}</span><small>${escapeHtml(result.format.name)} · ${escapeHtml(result.pitch.name)}</small></div>
        <div class="v4-mini"><b>Пиксели</b><span>${escapeHtml(summary.pixelSize)}</span><small>${escapeHtml(summary.cabinetPixelSize)}</small></div>
        <div class="v4-mini"><b>Вес / мощность</b><span>${formatNumber(summary.weightKg, 1)} кг · ${formatNumber(summary.powerKw, 2)} кВт</span><small>пуск: ${formatNumber(summary.startupPowerKw, 2)} кВт</small></div>
        <div class="v4-mini"><b>Ноги / печеньки / М8×60</b><span>${result.legCount} / ${summary.brackets} / ${summary.bolts} шт</span><small>${escapeHtml(result.legType.name)} · 4 печеньки и 16 болтов на ногу</small></div>
        <div class="v4-mini"><b>Кабели</b><span>PowerCON–Schuko: ${summary.powerconSchukoCables}</span><small>220В: ${summary.powerLinks} · RJ45: ${summary.rj45Links}</small></div>
        <div class="v4-mini"><b>Округление 50%</b><span>W: ${roundLabel(result.widthRound)} · H: ${roundLabel(result.heightRound)}</span><small>остаток ≥ 50% достраиваем</small></div>
      </div>
      <div class="v4-table-wrap">
        <table class="v4-table">
          <thead><tr><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Мощность</th><th>Пуск</th><th>Примечание</th></tr></thead>
          <tbody>${rows.map(row => `<tr><td><b>${escapeHtml(row.name)}</b><br><span class="v4-muted">${escapeHtml(row.code)}</span></td><td>${formatNumber(row.qty, 0)} ${escapeHtml(row.unit)}</td><td>${formatNumber(row.weightKg, 1)} кг</td><td>${row.powerW ? formatNumber(row.powerW / 1000, 2) + ' кВт' : '—'}</td><td>${row.startupPowerW ? formatNumber(row.startupPowerW / 1000, 2) + ' кВт' : '—'}</td><td>${escapeHtml(row.note)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="v4-actions">
        <button type="button" class="btn-secondary" data-led-show-tech>Показать техлист без цен</button>
        <button type="button" class="btn-secondary" data-led-show-warehouse>Показать складской лист LED</button>
      </div>
      <div data-led-export></div>`;

    const techBtn = box.querySelector('[data-led-show-tech]');
    const warehouseBtn = box.querySelector('[data-led-show-warehouse]');
    if (techBtn) techBtn.addEventListener('click', () => {
      if (calc.buildLedTechSheet) renderSheetPanel(box, calc.buildLedTechSheet(result));
    });
    if (warehouseBtn) warehouseBtn.addEventListener('click', () => {
      if (calc.buildLedWarehouseSheet) renderSheetPanel(box, calc.buildLedWarehouseSheet(result));
    });
  }

  function renderSheetPanel(root, sheet) {
    const mount = root.querySelector('[data-led-export]');
    if (!mount || !sheet) return;
    const text = sheetToText(sheet);
    const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
    mount.innerHTML = `
      <div class="v4-card" style="margin-top:14px">
        <div class="v4-card-head">
          <div>
            <div class="v4-kicker">technical export</div>
            <h4>${escapeHtml(sheet.title || 'LED лист без цен')}</h4>
            <p class="v4-muted">Цены и клиентские данные не выводятся. Подходит для техника и склада.</p>
          </div>
          <button type="button" class="btn-secondary" data-led-copy-export>Скопировать</button>
        </div>
        ${renderSheetSummary(sheet)}
        <div class="v4-table-wrap">
          <table class="v4-table">
            <thead><tr><th>#</th><th>Код</th><th>Позиция</th><th>Кол-во</th><th>Вес</th><th>Примечание</th></tr></thead>
            <tbody>${rows.map((row, idx) => `<tr><td>${escapeHtml(row.n || idx + 1)}</td><td>${escapeHtml(row.code || '')}</td><td><b>${escapeHtml(row.name || '')}</b></td><td>${formatNumber(row.qty || 0, 0)} ${escapeHtml(row.unit || 'шт')}</td><td>${formatNumber(row.weightKg || 0, 1)} кг</td><td><span class="v4-muted">${escapeHtml(row.note || '')}</span></td></tr>`).join('')}</tbody>
          </table>
        </div>
        <textarea readonly class="v4-export-text" data-led-export-text>${escapeHtml(text)}</textarea>
      </div>`;
    const copyBtn = mount.querySelector('[data-led-copy-export]');
    if (copyBtn) copyBtn.addEventListener('click', () => copyText(text));
  }

  function renderSheetSummary(sheet) {
    const summary = sheet.summary || {};
    const totals = sheet.totals || {};
    if (sheet.type === 'led-tech-sheet') {
      return `<div class="v4-summary-grid">
        <div class="v4-mini"><b>${escapeHtml(summary.actualSize || '')}</b><span>Фактический размер</span><small>${escapeHtml(summary.requestedSize || '')}</small></div>
        <div class="v4-mini"><b>${escapeHtml(summary.cabinets || '')}</b><span>Кабинеты</span><small>${escapeHtml(summary.cabinetPixels || '')}</small></div>
        <div class="v4-mini"><b>${formatNumber((summary.weightKg || 0), 1)} кг</b><span>Вес</span></div>
        <div class="v4-mini"><b>${formatNumber((summary.powerW || 0) / 1000, 2)} кВт</b><span>Рабочая мощность</span><small>пуск ${formatNumber((summary.startupPowerW || 0) / 1000, 2)} кВт</small></div>
      </div>`;
    }
    return `<div class="v4-summary-grid">
      <div class="v4-mini"><b>${formatNumber(totals.positions || 0, 0)}</b><span>Позиций</span></div>
      <div class="v4-mini"><b>${formatNumber(totals.qty || 0, 0)}</b><span>Всего штук</span></div>
      <div class="v4-mini"><b>${formatNumber(totals.weightKg || 0, 1)} кг</b><span>Вес</span></div>
      <div class="v4-mini"><b>${formatNumber((totals.powerW || 0) / 1000, 2)} кВт</b><span>Рабочая мощность</span></div>
    </div>`;
  }

  function sheetToText(sheet) {
    const lines = [];
    lines.push(sheet.title || 'LED лист без цен');
    lines.push('Цены: не выводятся');
    if (sheet.summary) {
      const s = sheet.summary;
      lines.push(`Экран: ${s.screen || ''}`);
      lines.push(`Размер: ${s.actualSize || ''} (запрошено ${s.requestedSize || ''})`);
      lines.push(`Кабинеты: ${s.cabinets || ''}`);
      lines.push(`Пиксели: ${s.pixels || ''}`);
      lines.push(`Вес: ${formatNumber(s.weightKg || 0, 1)} кг`);
      lines.push(`Мощность: ${formatNumber((s.powerW || 0) / 1000, 2)} кВт, пуск ${formatNumber((s.startupPowerW || 0) / 1000, 2)} кВт`);
      lines.push(`Кабели: ${s.cables || ''}`);
      lines.push(`Крепеж: ${s.rigging || ''}`);
    }
    if (sheet.totals) {
      const t = sheet.totals;
      lines.push(`Итого позиций: ${formatNumber(t.positions || 0, 0)}`);
      lines.push(`Итого вес: ${formatNumber(t.weightKg || 0, 1)} кг`);
      lines.push(`Мощность: ${formatNumber((t.powerW || 0) / 1000, 2)} кВт, пуск ${formatNumber((t.startupPowerW || 0) / 1000, 2)} кВт`);
    }
    lines.push('');
    lines.push('Комплектация:');
    (sheet.rows || []).forEach((row, idx) => {
      lines.push(`${row.n || idx + 1}. ${row.code || ''} — ${row.name || ''}: ${formatNumber(row.qty || 0, 0)} ${row.unit || 'шт'}; ${formatNumber(row.weightKg || 0, 1)} кг${row.note ? '; ' + row.note : ''}`);
    });
    return lines.join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => notify('LED лист скопирован')).catch(() => notify('Не удалось скопировать'));
      return;
    }
    notify('Скопируй текст из поля вручную');
  }

  function notify(message) {
    if (ROOT.ToastManager && ROOT.ToastManager.showToast) ROOT.ToastManager.showToast(message);
    else if (window.showToast) window.showToast(message);
  }

  function roundLabel(round) {
    return `${round.roundedCount} ${round.direction === 'up' ? '↑' : '↓'}`;
  }

  function formatNumber(value, digits) {
    const n = Number(value || 0);
    return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.LedCalculatorUI = { renderLedCalculator };
})();
