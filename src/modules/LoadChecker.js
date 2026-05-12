// FEG Stage PRO v3.6.21
// LoadChecker: паспортные таблицы и базовая проверка нагрузок блочного конструктора.
(function(global) {
    'use strict';

const TRUSS_LOAD_TABLES = {
    T29Q: {
        id: 'T29Q',
        label: 'T29 вид Q',
        main: [
            { span:4,  udlKgM:467, udlMaxKg:1868, deflectionMm:20,  points:{p1:1375, p2:933, p3:618, p4:467}, weightKg:26 },
            { span:5,  udlKgM:372, udlMaxKg:1860, deflectionMm:31,  points:{p1:1094, p2:821, p3:547, p4:454}, weightKg:31 },
            { span:6,  udlKgM:302, udlMaxKg:1812, deflectionMm:45,  points:{p1:906,  p2:680, p3:453, p4:376}, weightKg:37 },
            { span:7,  udlKgM:220, udlMaxKg:1540, deflectionMm:61,  points:{p1:771,  p2:579, p3:386, p4:320}, weightKg:45 },
            { span:8,  udlKgM:167, udlMaxKg:1336, deflectionMm:79,  points:{p1:669,  p2:502, p3:335, p4:278}, weightKg:50 },
            { span:9,  udlKgM:131, udlMaxKg:1179, deflectionMm:101, points:{p1:589,  p2:442, p3:295, p4:245}, weightKg:56 },
            { span:10, udlKgM:105, udlMaxKg:1050, deflectionMm:124, points:{p1:525,  p2:394, p3:262, p4:218}, weightKg:64 },
            { span:11, udlKgM:86,  udlMaxKg:946,  deflectionMm:151, points:{p1:471,  p2:353, p3:234, p4:196}, weightKg:69 },
            { span:12, udlKgM:71,  udlMaxKg:852,  deflectionMm:179, points:{p1:426,  p2:320, p3:213, p4:177}, weightKg:75 }
        ],
        cantilever: [
            { lk:0.5, T:{p1:807, p2:1677}, Q:{p1:942,  p2:1885} },
            { lk:1,   T:{p1:501, p2:804},  Q:{p1:940,  p2:940} },
            { lk:1.5, T:{p1:362, p2:409},  Q:{p1:742,  p2:624} },
            { lk:2,   T:{p1:282, p2:247},  Q:{p1:595,  p2:467} },
            { lk:2.5, T:{p1:230, p2:164},  Q:{p1:495,  p2:334} },
            { lk:3,   T:{p1:193, p2:117},  Q:{p1:424,  p2:243} },
            { lk:3.5, T:{p1:163, p2:87},   Q:{p1:369,  p2:184} }
        ]
    },
    T39Q: {
        id: 'T39Q',
        label: 'T39 вид Q',
        main: [
            { span:4,  udlKgM:601, udlMaxKg:2404, deflectionMm:13,  points:{p1:1954, p2:1203, p3:797, p4:601}, weightKg:29 },
            { span:5,  udlKgM:480, udlMaxKg:2400, deflectionMm:20,  points:{p1:1557, p2:1168, p3:779, p4:600}, weightKg:34 },
            { span:6,  udlKgM:399, udlMaxKg:2394, deflectionMm:29,  points:{p1:1292, p2:969,  p3:646, p4:536}, weightKg:40 },
            { span:7,  udlKgM:315, udlMaxKg:2205, deflectionMm:40,  points:{p1:1101, p2:826,  p3:551, p4:457}, weightKg:49 },
            { span:8,  udlKgM:239, udlMaxKg:1912, deflectionMm:52,  points:{p1:957,  p2:718,  p3:479, p4:397}, weightKg:54 },
            { span:9,  udlKgM:188, udlMaxKg:1692, deflectionMm:65,  points:{p1:845,  p2:633,  p3:422, p4:351}, weightKg:60 },
            { span:10, udlKgM:150, udlMaxKg:1500, deflectionMm:81,  points:{p1:754,  p2:565,  p3:377, p4:313}, weightKg:70 },
            { span:11, udlKgM:124, udlMaxKg:1364, deflectionMm:98,  points:{p1:679,  p2:509,  p3:340, p4:282}, weightKg:75 },
            { span:12, udlKgM:103, udlMaxKg:1236, deflectionMm:116, points:{p1:616,  p2:462,  p3:308, p4:256}, weightKg:81 }
        ],
        cantilever: [
            { lk:1,   T:{p1:646, p2:980}, Q:{p1:1209, p2:1209} },
            { lk:1.5, T:{p1:480, p2:516}, Q:{p1:945,  p2:804} },
            { lk:2,   T:{p1:380, p2:319}, Q:{p1:774,  p2:600} },
            { lk:2.5, T:{p1:314, p2:217}, Q:{p1:654,  p2:420} },
            { lk:3,   T:{p1:267, p2:156}, Q:{p1:565,  p2:310} },
            { lk:3.5, T:{p1:231, p2:118}, Q:{p1:497,  p2:239} },
            { lk:4,   T:{p1:203, p2:91},  Q:{p1:442,  p2:188} }
        ]
    }
};

    function numberValue(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function metric(value, digits = 1) {
        const n = Number(value || 0);
        return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
    }

    function pickMainLoadRow(seriesId, span) {
        const table = TRUSS_LOAD_TABLES[seriesId] || TRUSS_LOAD_TABLES.T29Q;
        const rows = table.main;
        const n = numberValue(span, 0);
        if (!n) return { table, row:null, status:'empty', usedSpan:0, note:'Пролёт не задан и не найден по схеме.' };
        if (n > rows[rows.length - 1].span + 1e-9) return { table, row:null, status:'over', usedSpan:n, note:`Пролёт ${metric(n)} м больше максимума таблицы ${rows[rows.length - 1].span} м.` };
        const row = rows.find(r => n <= r.span + 1e-9) || rows[rows.length - 1];
        const minSpan = rows[0].span;
        const note = n < minSpan ? `Пролёт меньше 4 м — для запаса применена строка ${minSpan} м.` : (Math.abs(row.span - n) > 1e-9 ? `Длины между строками считаются по ближайшему большему пролёту: ${row.span} м.` : 'Длина совпадает со строкой таблицы.');
        return { table, row, status:'ok', usedSpan:row.span, note };
    }

    function pickCantileverRow(seriesId, lk) {
        const table = TRUSS_LOAD_TABLES[seriesId] || TRUSS_LOAD_TABLES.T29Q;
        const rows = table.cantilever;
        const n = numberValue(lk, 0);
        if (!n) return { table, row:null, status:'empty', usedLk:0, note:'' };
        if (n > rows[rows.length - 1].lk + 1e-9) return { table, row:null, status:'over', usedLk:n, note:`Консоль ${metric(n)} м больше максимума таблицы ${rows[rows.length - 1].lk} м.` };
        const row = rows.find(r => n <= r.lk + 1e-9) || rows[rows.length - 1];
        const note = Math.abs(row.lk - n) > 1e-9 ? `Консоль между строками считается по ближайшей большей Lк: ${row.lk} м.` : 'Консоль совпадает со строкой таблицы.';
        return { table, row, status:'ok', usedLk:row.lk, note };
    }

    function loadMarginClass(value, limit) {
        const v = numberValue(value, 0);
        const lim = numberValue(limit, 0);
        if (!lim || !Number.isFinite(lim) || v <= 0) return 'na';
        if (v > lim + 1e-9) return 'bad';
        const margin = (lim - v) / lim;
        return margin < 0.1 ? 'risk' : 'ok';
    }

    function formatMargin(value, limit, unit = 'кг') {
        const v = numberValue(value, 0);
        const lim = numberValue(limit, 0);
        if (!lim || !Number.isFinite(lim) || v <= 0) return 'не задано';
        const diff = lim - v;
        const pct = Math.round((diff / lim) * 100);
        return diff >= 0 ? `запас ${metric(diff,0)} ${unit} / ${pct}%` : `превышение ${metric(Math.abs(diff),0)} ${unit} / ${Math.abs(pct)}%`;
    }

    function calculateLoadCheck(state, spanInfo) {
        const info = spanInfo || { maxEffective:0 };
        const autoSpan = numberValue(info.maxEffective, 0);
        const span = numberValue(state && state.spanManual, 0) > 0 ? numberValue(state.spanManual, 0) : autoSpan;
        const seriesId = state && state.trussSeries ? state.trussSeries : 'T29Q';
        const main = pickMainLoadRow(seriesId, span);
        const factDist = numberValue(state && state.factDistributedKgM, 0);
        const factPoint = numberValue(state && state.factPointKg, 0);
        const scheme = state && state.pointScheme ? state.pointScheme : 'p1';
        const result = { autoSpan, span, main, factDist, factPoint, scheme, overall:'na', spanInfo:info };
        if (main.row) {
            const distTotal = factDist * span;
            const distClass = loadMarginClass(factDist, main.row.udlKgM);
            const distTotalClass = loadMarginClass(distTotal, main.row.udlMaxKg);
            const pointLimit = Number(main.row.points[scheme] || 0);
            const pointClass = loadMarginClass(factPoint, pointLimit);
            result.distributed = { value: factDist, total: distTotal, limitKgM: main.row.udlKgM, limitTotal: main.row.udlMaxKg, className: distClass === 'bad' || distTotalClass === 'bad' ? 'bad' : (distClass === 'risk' || distTotalClass === 'risk' ? 'risk' : (factDist > 0 ? 'ok' : 'na')) };
            result.point = { value: factPoint, limit: pointLimit, className: pointClass };
            const checks = [result.distributed.className, result.point.className].filter(x => x !== 'na');
            result.overall = checks.includes('bad') ? 'bad' : (checks.includes('risk') ? 'risk' : (checks.length ? 'ok' : 'na'));
        } else if (main.status === 'over') result.overall = 'bad';
        const cant = pickCantileverRow(seriesId, state && state.cantileverLength);
        result.cantilever = { pick:cant, view:(state && state.cantileverView) || 'Q' };
        if (cant.row) {
            const data = cant.row[result.cantilever.view] || cant.row.Q;
            result.cantilever.p1Limit = data.p1;
            result.cantilever.p2Limit = data.p2;
            result.cantilever.pointClass = loadMarginClass(factPoint, data.p1);
            result.cantilever.distClass = loadMarginClass(factDist, data.p2);
            result.cantilever.balancePointA = span > 0 && factPoint > 0 ? factPoint * cant.usedLk / span * 1.2 : 0;
            result.cantilever.balanceDistributedA = span > 0 && factDist > 0 ? (factDist / 2) * cant.usedLk / span * 1.2 : 0;
            if (result.cantilever.pointClass === 'bad' || result.cantilever.distClass === 'bad') result.overall = 'bad';
            else if (result.overall !== 'bad' && (result.cantilever.pointClass === 'risk' || result.cantilever.distClass === 'risk')) result.overall = 'risk';
        } else if (cant.status === 'over') result.overall = 'bad';
        return result;
    }


    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, ch => ({
            '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;'
        }[ch]));
    }

    function getLoadStatus(load) {
        const table = load && load.main && load.main.table ? load.main.table : TRUSS_LOAD_TABLES.T29Q;
        const row = load && load.main ? load.main.row : null;
        const spanLabel = load && load.span > 0 ? `${metric(load.span)} м` : 'не найден';
        const appliedSpan = row ? `${row.span} м` : '—';
        const overall = load && load.overall ? load.overall : 'na';
        const statusText = overall === 'bad'
            ? 'Есть превышение / вне таблицы'
            : overall === 'risk'
                ? 'Нагрузка проходит, но запас меньше 10%'
                : overall === 'ok'
                    ? 'Нагрузка проходит по выбранной таблице'
                    : 'Введите фактическую нагрузку для проверки';
        const statusClass = overall === 'bad' ? 'bad' : overall === 'risk' ? 'risk' : overall === 'ok' ? 'ok' : '';
        const launcherText = overall === 'bad' ? 'превышение' : overall === 'risk' ? 'малый запас' : overall === 'ok' ? 'OK' : 'не задано';
        const launcherSub = `${table.label} · пролёт ${spanLabel} · строка ${appliedSpan}`;
        return { table, row, spanLabel, appliedSpan, statusText, statusClass, launcherText, launcherSub };
    }

    function renderGridRows(rows) {
        return rows.map(row => `<div>${row[0]}</div><div>${row[1]}</div>`).join('');
    }

    function buildLoadSummaryRows(load, options = {}) {
        const esc = options.escapeHtml || escapeHtml;
        const state = options.state || {};
        const status = getLoadStatus(load);
        const row = status.row;
        const table = status.table;
        const baseRows = [];
        baseRows.push(['Таблица', esc(table.label)]);
        baseRows.push(['Авто-пролёт с U-блоками', load && load.autoSpan > 0 ? metric(load.autoSpan) + ' м' : '—']);
        if (load && load.spanInfo) {
            baseRows.push(['Прямые / выросты U', `${metric(load.spanInfo.maxStraight)} м + ${metric(load.spanInfo.nodeExtensionMeters)} м (${load.spanInfo.maxNodeCount || 0} × 0.5)`]);
        }
        baseRows.push(['Расчётный пролёт L', status.spanLabel]);
        baseRows.push(['Строка таблицы', status.appliedSpan]);
        if (row) baseRows.push(['Прогиб / вес по паспорту', `${row.deflectionMm} мм · ${row.weightKg} кг`]);
        if (load && load.main && load.main.note) baseRows.push(['Примечание', esc(load.main.note)]);

        const distRows = [];
        if (row) {
            const distTotal = load.distributed ? load.distributed.total : 0;
            distRows.push(['Допустимо', `${row.udlKgM} кг/м · макс. ${row.udlMaxKg} кг`]);
            distRows.push(['Фактически', load.factDist ? `${metric(load.factDist,0)} кг/м · ${metric(distTotal,0)} кг всего` : 'не задано']);
            distRows.push(['Запас', load.factDist ? formatMargin(load.factDist, row.udlKgM, 'кг/м') : '—']);
        } else {
            distRows.push(['Статус', load && load.main && load.main.note ? esc(load.main.note) : 'нет строки таблицы']);
        }

        const pointRows = [];
        if (row) {
            const pointLimit = load.point ? load.point.limit : Number(row.points[load.scheme || 'p1'] || 0);
            pointRows.push([`Допустимо ${String(load.scheme || 'p1').toUpperCase()}`, `${pointLimit} кг`]);
            pointRows.push(['Фактически', load.factPoint ? `${metric(load.factPoint,0)} кг` : 'не задано']);
            pointRows.push(['Запас', load.factPoint ? formatMargin(load.factPoint, pointLimit) : '—']);
        } else {
            pointRows.push(['Статус', load && load.main && load.main.note ? esc(load.main.note) : 'нет строки таблицы']);
        }

        const cantRows = [];
        const cant = load && load.cantilever;
        if (cant && cant.pick && cant.pick.status !== 'empty') {
            if (cant.pick.row) {
                const cantLength = state.cantileverLength ?? cant.pick.usedLk ?? cant.pick.row.lk;
                cantRows.push(['Lк', `${metric(cantLength)} м → строка ${cant.pick.row.lk} м`]);
                cantRows.push(['Вид', cant.view]);
                cantRows.push(['P1 / P2 допустимо', `${cant.p1Limit} кг · ${cant.p2Limit} кг/м`]);
                cantRows.push(['Уравновешивание A', `${cant.balancePointA ? metric(cant.balancePointA,0) + ' кг по P1' : '—'}${cant.balanceDistributedA ? ' · ' + metric(cant.balanceDistributedA,0) + ' кг по P2' : ''}`]);
                if (cant.pick.note) cantRows.push(['Примечание', esc(cant.pick.note)]);
            } else {
                cantRows.push(['Статус', esc(cant.pick.note)]);
            }
        } else {
            cantRows.push(['Статус', 'консоль не задана']);
        }

        return { baseRows, distRows, pointRows, cantRows, status };
    }

    function renderLoadSummaryHtml(load, options = {}) {
        if (!load) return '';
        const rows = buildLoadSummaryRows(load, options);
        return `
                <div class="block-load-sections">
                    <div class="block-load-section"><h5>Ферма / пролёт</h5><div class="block-load-grid">${renderGridRows(rows.baseRows)}</div></div>
                    <div class="block-load-section"><h5>Распределённая нагрузка</h5><div class="block-load-grid">${renderGridRows(rows.distRows)}</div></div>
                    <div class="block-load-section"><h5>Точечная нагрузка</h5><div class="block-load-grid">${renderGridRows(rows.pointRows)}</div></div>
                    <div class="block-load-section"><h5>Консоль</h5><div class="block-load-grid">${renderGridRows(rows.cantRows)}</div></div>
                </div>
                <div class="block-load-note">Расчёт использует паспортные таблицы MDM T29/T39 вида Q. Длины между строками считаются по ближайшему большему пролёту без интерполяции. Авто-пролёт учитывает подключённые U-блоки как отдельные торцевые порты: +0.5 м на каждый реально подключённый узел в линии пролёта. Это контроль по таблице, а не замена инженерному расчёту подвеса, ветра, балласта и креплений. Масса угловых блоков в ведомости берётся по выбранной серии T29/T39; закупочные цены МДМТ в приложение не внесены. Торцевые стыки считаются отдельными позициями: 4 C2-88, 8 C2-67 и 8 шплинтов на один стык. Масса пальца C2-67 в базе: 0.04 кг/шт.</div>`;
    }



    const LOAD_FIELD_IDS = [
        'blockTrussSeries',
        'blockLoadSpan',
        'blockFactDistributed',
        'blockPointScheme',
        'blockFactPoint',
        'blockCantileverLength',
        'blockCantileverView'
    ];

    function getLoadFieldIds() {
        return LOAD_FIELD_IDS.slice();
    }

    function writeLoadInputs(state, helpers = {}) {
        const writeValue = typeof helpers.writeValue === 'function' ? helpers.writeValue : function(id, value) {
            const el = global.document && global.document.getElementById(id);
            if (el) el.value = value;
        };
        const st = state || {};
        writeValue('blockTrussSeries', st.trussSeries || 'T29Q');
        writeValue('blockLoadSpan', numberValue(st.spanManual, 0));
        writeValue('blockFactDistributed', numberValue(st.factDistributedKgM, 0));
        writeValue('blockPointScheme', st.pointScheme || 'p1');
        writeValue('blockFactPoint', numberValue(st.factPointKg, 0));
        writeValue('blockCantileverLength', numberValue(st.cantileverLength, 0));
        writeValue('blockCantileverView', st.cantileverView || 'Q');
    }

    function readLoadInputs(state, helpers = {}) {
        const q = typeof helpers.q === 'function' ? helpers.q : function(id) {
            return global.document && global.document.getElementById(id);
        };
        const readNumber = typeof helpers.readNumber === 'function'
            ? helpers.readNumber
            : function(id, fallback) {
                const el = q(id);
                const n = Number(el ? el.value : fallback);
                return Number.isFinite(n) ? n : fallback;
            };
        const next = Object.assign({}, state || {});
        next.trussSeries = q('blockTrussSeries') ? q('blockTrussSeries').value : (next.trussSeries || 'T29Q');
        if (!TRUSS_LOAD_TABLES[next.trussSeries]) next.trussSeries = 'T29Q';
        next.spanManual = Math.max(0, readNumber('blockLoadSpan', next.spanManual || 0));
        next.factDistributedKgM = Math.max(0, readNumber('blockFactDistributed', next.factDistributedKgM || 0));
        next.pointScheme = q('blockPointScheme') ? q('blockPointScheme').value : (next.pointScheme || 'p1');
        if (!['p1','p2','p3','p4'].includes(next.pointScheme)) next.pointScheme = 'p1';
        next.factPointKg = Math.max(0, readNumber('blockFactPoint', next.factPointKg || 0));
        next.cantileverLength = Math.max(0, readNumber('blockCantileverLength', next.cantileverLength || 0));
        next.cantileverView = q('blockCantileverView') ? q('blockCantileverView').value : (next.cantileverView || 'Q');
        if (!['Q','T'].includes(next.cantileverView)) next.cantileverView = 'Q';
        return next;
    }

    function openLoadModal(helpers = {}) {
        const q = typeof helpers.q === 'function' ? helpers.q : function(id) {
            return global.document && global.document.getElementById(id);
        };
        const modal = q('blockLoadModal');
        if (!modal) return false;
        if (typeof helpers.calculate === 'function') helpers.calculate();
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        const focusId = helpers.focusId || 'blockTrussSeries';
        const first = q(focusId);
        if (first) global.setTimeout(() => first.focus(), 0);
        return true;
    }

    function closeLoadModal(helpers = {}) {
        const q = typeof helpers.q === 'function' ? helpers.q : function(id) {
            return global.document && global.document.getElementById(id);
        };
        const modal = q('blockLoadModal');
        if (!modal) return false;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        return true;
    }

    function bindLoadModal(helpers = {}) {
        const q = typeof helpers.q === 'function' ? helpers.q : function(id) {
            return global.document && global.document.getElementById(id);
        };
        const close = typeof helpers.close === 'function' ? helpers.close : function() { closeLoadModal({ q }); };
        const modal = q('blockLoadModal');
        if (!modal || modal.dataset.feg35Bound === '1') return false;
        modal.dataset.feg35Bound = '1';
        modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
        global.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.classList.contains('open')) close();
        });
        return true;
    }
    global.FEGModules = global.FEGModules || {};
    global.FEGModules.LoadChecker = {
        TRUSS_LOAD_TABLES,
        getLoadTables: () => TRUSS_LOAD_TABLES,
        pickMainLoadRow,
        pickCantileverRow,
        loadMarginClass,
        formatMargin,
        getLoadStatus,
        buildLoadSummaryRows,
        renderLoadSummaryHtml,
        calculateLoadCheck,
        getLoadFieldIds,
        writeLoadInputs,
        readLoadInputs,
        openLoadModal,
        closeLoadModal,
        bindLoadModal
    };
})(window);
