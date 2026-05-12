// FEG Stage PRO v3.6.4 — CalibrationManager module
// Responsibility: file-based SVG calibration, local admin draft calibration and PIN access.
// Classic-compatible module: attaches API to window.FEGModules.CalibrationManager.
(function (global) {
    'use strict';

    const DEFAULTS = Object.freeze({
        dx: 0,
        dy: 0,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
        opacity: 1,
        brightness: 1,
        lineWidth: 0,
        fill: '',
        stroke: ''
    });

    const ADMIN_PIN = '7663';
    const PIN_SESSION_KEY = 'feg.micro.admin.pin.ok';
    const CALIBRATION_FILE = 'feg_svg_calibration.json';
    const LOCAL_PREFIX = 'feg.micro.default.';

    let fileLoadStarted = false;

    function storage() {
        return global.localStorage;
    }

    function session() {
        return global.sessionStorage;
    }

    function doc(options) {
        return (options && options.document) || global.document;
    }

    function cleanNumber(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function rotationKey(rotation) {
        const deg = ((Math.round(Number(rotation || 0) / 90) * 90) % 360 + 360) % 360;
        return String(deg);
    }

    function normalizeValue(micro) {
        const raw = { ...DEFAULTS, ...(micro || {}) };
        return {
            dx: cleanNumber(raw.dx, 0),
            dy: cleanNumber(raw.dy, 0),
            scale: cleanNumber(raw.scale, 1),
            scaleX: cleanNumber(raw.scaleX, 1),
            scaleY: cleanNumber(raw.scaleY, 1),
            rotate: cleanNumber(raw.rotate, 0),
            opacity: cleanNumber(raw.opacity, 1),
            brightness: cleanNumber(raw.brightness, 1),
            lineWidth: cleanNumber(raw.lineWidth, 0),
            fill: /^#[0-9a-f]{6}$/i.test(String(raw.fill || '').trim()) ? String(raw.fill).trim() : '',
            stroke: /^#[0-9a-f]{6}$/i.test(String(raw.stroke || '').trim()) ? String(raw.stroke).trim() : ''
        };
    }

    function isCustom(micro) {
        const normalized = normalizeValue(micro);
        return Object.keys(DEFAULTS).some(key => String(normalized[key]) !== String(DEFAULTS[key]));
    }

    function normalizeCalibrationFile(data) {
        const source = data && typeof data === 'object' ? (data.items || data.calibration || data.defaults || data) : {};
        const out = {};
        Object.entries(source || {}).forEach(([type, rotations]) => {
            if (!rotations || typeof rotations !== 'object') return;
            const cleanType = String(type || '').trim();
            if (!cleanType) return;
            Object.entries(rotations).forEach(([rotation, micro]) => {
                const rot = rotationKey(rotation);
                const value = normalizeValue(micro);
                if (!isCustom(value)) return;
                if (!out[cleanType]) out[cleanType] = {};
                out[cleanType][rot] = value;
            });
        });
        return out;
    }

    function loadCalibrationFile(options) {
        const opts = options || {};
        if (fileLoadStarted) return Promise.resolve(null);
        fileLoadStarted = true;
        const fetchFn = opts.fetchFn || global.fetch;
        if (typeof fetchFn !== 'function') return Promise.resolve(null);
        const version = opts.version || Date.now();
        return fetchFn(`${CALIBRATION_FILE}?v=${encodeURIComponent(version)}`, { cache: 'no-store' })
            .then(response => response && response.ok ? response.json() : null)
            .then(data => {
                const next = normalizeCalibrationFile(data);
                if (typeof opts.onLoaded === 'function') opts.onLoaded(next, data);
                return next;
            })
            .catch(error => {
                if (typeof opts.onError === 'function') opts.onError(error);
                return null;
            });
    }

    function resetCalibrationFileLoader() {
        fileLoadStarted = false;
    }

    function adminUnlocked() {
        try { return session().getItem(PIN_SESSION_KEY) === '1'; }
        catch (err) { return false; }
    }

    function setAdminUnlocked() {
        try { session().setItem(PIN_SESSION_KEY, '1'); }
        catch (err) {}
    }

    function closePinModal(options) {
        const d = doc(options);
        const modal = d ? d.getElementById('microPinModal') : null;
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    function submitPin(options) {
        const d = doc(options);
        const modal = d ? d.getElementById('microPinModal') : null;
        if (!modal) return false;
        const input = modal.querySelector('#microPinInput');
        const err = modal.querySelector('#microPinError');
        const pin = input ? String(input.value || '').trim() : '';
        const opts = modal._calibrationOptions || options || {};
        if (pin === ADMIN_PIN) {
            setAdminUnlocked();
            closePinModal(opts);
            if (typeof opts.onToast === 'function') opts.onToast('Админ-калибровка открыта');
            if (typeof modal._afterUnlock === 'function') modal._afterUnlock();
            return true;
        }
        if (err) err.textContent = 'Неверный PIN-код';
        if (input) {
            input.select();
            input.focus();
        }
        return false;
    }

    function ensurePinModal(options) {
        const d = doc(options);
        if (!d || !d.body) return null;
        let modal = d.getElementById('microPinModal');
        if (modal) return modal;
        modal = d.createElement('div');
        modal.id = 'microPinModal';
        modal.className = 'micro-pin-backdrop';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="micro-pin-modal" role="dialog" aria-modal="true" aria-label="PIN-код админ-калибровки SVG">
                <h4>Доступ к админ-калибровке</h4>
                <p>Введите PIN-код, чтобы открыть настройки SVG-калибровки выбранного элемента.</p>
                <input id="microPinInput" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="••••">
                <div id="microPinError" class="micro-pin-error"></div>
                <div class="micro-pin-actions">
                    <button type="button" data-micro-pin-action="cancel">Отмена</button>
                    <button class="primary" type="button" data-micro-pin-action="submit">Открыть</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closePinModal(modal._calibrationOptions || options);
            const action = event.target && event.target.dataset ? event.target.dataset.microPinAction : '';
            if (action === 'cancel') closePinModal(modal._calibrationOptions || options);
            if (action === 'submit') submitPin(modal._calibrationOptions || options);
        });
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') submitPin(modal._calibrationOptions || options);
            if (event.key === 'Escape') closePinModal(modal._calibrationOptions || options);
        });
        d.body.appendChild(modal);
        return modal;
    }

    function openPinModal(afterUnlock, options) {
        const opts = options || {};
        if (adminUnlocked()) {
            if (typeof afterUnlock === 'function') afterUnlock();
            return;
        }
        const modal = ensurePinModal(opts);
        if (!modal) return;
        modal._afterUnlock = afterUnlock;
        modal._calibrationOptions = opts;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        const input = modal.querySelector('#microPinInput');
        const err = modal.querySelector('#microPinError');
        if (err) err.textContent = '';
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 0);
        }
    }

    function defaultKey(type, rotation) {
        return `${LOCAL_PREFIX}${String(type || '')}.${rotationKey(rotation)}`;
    }

    function getFileTypeDefault(fileDefaults, type, rotation) {
        const typeKey = String(type || '');
        const rot = rotationKey(rotation);
        const value = fileDefaults && fileDefaults[typeKey] ? fileDefaults[typeKey][rot] : null;
        return value ? normalizeValue(value) : null;
    }

    function getLocalTypeDefault(type, rotation) {
        try {
            const raw = storage().getItem(defaultKey(type, rotation));
            return raw ? normalizeValue(JSON.parse(raw)) : null;
        } catch (err) {
            return null;
        }
    }

    function saveLocalTypeDefault(type, rotation, micro) {
        if (!type || !micro) return null;
        const normalized = normalizeValue(micro);
        try { storage().setItem(defaultKey(type, rotation), JSON.stringify(normalized)); } catch (err) {}
        return normalized;
    }

    function clearLocalTypeDefault(type, rotation) {
        if (!type) return;
        try { storage().removeItem(defaultKey(type, rotation)); } catch (err) {}
    }

    function listTypesFromLocal() {
        const out = new Set();
        try {
            const s = storage();
            for (let i = 0; i < s.length; i += 1) {
                const key = s.key(i) || '';
                if (!key.startsWith(LOCAL_PREFIX)) continue;
                const tail = key.replace(LOCAL_PREFIX, '');
                const parts = tail.split('.');
                if (parts.length >= 2) out.add(parts.slice(0, -1).join('.'));
            }
        } catch (err) {}
        return Array.from(out).filter(Boolean).sort();
    }

    function collectCalibrationForFile(options) {
        const opts = options || {};
        const items = {};
        const rotations = opts.rotations || ['0', '90', '180', '270'];
        const types = Array.from(new Set([...(opts.types || []), ...Object.keys(opts.fileDefaults || {}), ...listTypesFromLocal()]))
            .filter(Boolean)
            .sort();
        types.forEach(type => {
            rotations.forEach(rotation => {
                const fileValue = getFileTypeDefault(opts.fileDefaults || {}, type, rotation);
                const localValue = getLocalTypeDefault(type, rotation);
                const value = normalizeValue({ ...(fileValue || {}), ...(localValue || {}) });
                if (!isCustom(value)) return;
                if (!items[type]) items[type] = {};
                items[type][rotationKey(rotation)] = value;
            });
        });
        return {
            schema: 'feg-stage-pro-svg-calibration-v1',
            version: opts.version || '',
            updatedAt: new Date().toISOString(),
            fileName: CALIBRATION_FILE,
            note: 'Этот файл лежит рядом с index.html. FEG Stage PRO загружает его при старте и применяет как серверную SVG-калибровку. Локальные настройки браузера имеют приоритет только как временный черновик администратора.',
            items
        };
    }

    function downloadCalibrationFile(options) {
        const opts = options || {};
        const d = doc(opts);
        const data = opts.data || collectCalibrationForFile(opts);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = d.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = opts.fileName || CALIBRATION_FILE;
        a.click();
        URL.revokeObjectURL(a.href);
        if (typeof opts.onToast === 'function') opts.onToast(`Скачан ${a.download}. Положи файл рядом с index.html и загрузи на сервер/GitHub.`);
        return data;
    }

    const api = {
        MODULE_NAME: 'CalibrationManager',
        MODULE_STATUS: 'runtime-extracted',
        DEFAULTS,
        ADMIN_PIN,
        PIN_SESSION_KEY,
        CALIBRATION_FILE,
        LOCAL_PREFIX,
        cleanNumber,
        rotationKey,
        normalizeValue,
        isCustom,
        normalizeCalibrationFile,
        loadCalibrationFile,
        resetCalibrationFileLoader,
        adminUnlocked,
        setAdminUnlocked,
        ensurePinModal,
        openPinModal,
        closePinModal,
        submitPin,
        defaultKey,
        getFileTypeDefault,
        getLocalTypeDefault,
        saveLocalTypeDefault,
        clearLocalTypeDefault,
        listTypesFromLocal,
        collectCalibrationForFile,
        downloadCalibrationFile
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.CalibrationManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
