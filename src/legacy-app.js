// FEG Stage PRO v3.8.9 block truss quote bridge hotfix
// Temporary compatibility entrypoint extracted from index.html.
// Public functions remain on window for existing inline onclick handlers.
// The next refactor steps move code from this file into src/modules/*.js one domain at a time.

const APP_VERSION = '3.8.9';
const DEFAULT_GRID_COLS = 20;
    const DEFAULT_GRID_ROWS = 20;
    const MIN_GRID_SIZE = 6;
    const MAX_GRID_SIZE = 40;
    let gridColsCount = DEFAULT_GRID_COLS;
    let gridRowsCount = DEFAULT_GRID_ROWS;
    let gridScalePercent = 100;
    const MODULE_WIDTH_M = 1.2;
    const MODULE_DEPTH_M = 1.2;
    const MODULE_SIZE_LABEL = '1.2×1.2 м';
    const DEFAULT_STAGE_HEIGHT_M = 0.6;
    const DEFAULT_PRICING = {
        priceModule: 850,
        installCost: 3500
    };
    const DEFAULT_TRANSPORT_SETTINGS = {
        type: 'city',
        cityPrice: 0,
        kmPrice: 0,
        km: 0
    };
    const DEFAULT_APP_THEME = 'dark';
    const DEFAULT_CLOUD_SETTINGS = {
        url: '',
        anonKey: '',
        workspaceKey: ''
    };
    const CLOUD_TABLE_NAME = 'projects';
    const STAGE_DRAFT_KEY = 'fegStageAutosaveDraft';
    const BACKUP_EXPORT_VERSION = APP_VERSION;
    const MAX_BACKUP_FILE_BYTES = 8 * 1024 * 1024;
    const BACKUP_LIMITS = {
        stageOrders: 300,
        stageHistory: 200,
        trussProjects: 300,
        clients: 1000
    };
    const PROJECT_STATUS_LABELS = {
        draft: 'Черновик',
        sent: 'Отправлено',
        approved: 'Согласовано',
        archived: 'Архив'
    };
    const FEG_MODULES = window.FEGModules || {};
    const StageCalculatorModule = FEG_MODULES.StageCalculator || null;
    const AppSettingsModule = FEG_MODULES.AppSettings || null;
    const SupabaseStorageModule = FEG_MODULES.SupabaseStorage || null;
    const ProjectStorageModule = FEG_MODULES.ProjectStorage || null;
    const ProjectManagerModule = FEG_MODULES.ProjectManager || null;
    const ClientsStorageModule = FEG_MODULES.ClientsStorage || null;
    const ClientsManagerModule = FEG_MODULES.ClientsManager || null;
    const ClientsUIModule = FEG_MODULES.ClientsUI || null;
    const NavigationManagerModule = FEG_MODULES.NavigationManager || null;
    const ModalManagerModule = FEG_MODULES.ModalManager || null;
    const ToastManagerModule = FEG_MODULES.ToastManager || null;
    const FormatUtilsModule = FEG_MODULES.FormatUtils || null;
    const DomUtilsModule = FEG_MODULES.DomUtils || null;
    const TrussBootstrapModule = FEG_MODULES.TrussBootstrap || null;
    const TrussStateModule = FEG_MODULES.TrussState || null;
    const TrussProjectsUIModule = FEG_MODULES.TrussProjectsUI || null;
    const StageGridStateModule = FEG_MODULES.StageGridState || null;
    const TransportSettingsModule = FEG_MODULES.TransportSettings || null;
    const PriceWeightSettingsModule = FEG_MODULES.PriceWeightSettings || null;
    const CalibrationManagerModule = FEG_MODULES.CalibrationManager || null;
    const COLUMN_TYPES = {
        low: 'Столб низкий',
        middle: 'Столб средний',
        high: 'Столб высокий'
    };
    const FRAME_TYPES = {
        low: 'Перекладина низкая',
        high: 'Перекладина высокая'
    };
    const DEFAULT_WEIGHTS = {
        sheet: 18,
        column_low: 0.6,
        column_middle: 2.6,
        column_high: 4.8,
        frame_low: 3.5,
        frame_high: 5,
        stud: 1.5
    };
    let itemWeights = loadWeights();
    let stageHeightM = loadStageHeight();
    let pricingSettings = loadPricingSettings();
    let transportSettings = loadTransportSettings();
    let appTheme = loadAppTheme();
    let cloudSettings = loadCloudSettings();
    let selectedModules = new Set();
    let lastResult = null;

    const clientNameInput = q('clientName');
    const clientSelect = q('clientSelect');
    const projectNameInput = q('projectName');
    const widthInput = q('width');
    const depthInput = q('depth');
    const priceModuleInput = q('priceModule');
    const installInput = q('install');
    const columnTypeSelect = q('columnType');
    const frameTypeSelect = q('frameType');
    const resultDiv = q('result');
    const ordersDiv = q('orders');
    const pdfDataDiv = q('pdfData');
    const pdfTitleEl = q('pdfTitle');
    const pdfFooterEl = q('pdfFooter');
    const stageGrid = q('stageGrid');
    const selectedCount = q('selectedCount');
    const pdfModal = q('pdfModal');
    const pdfPreviewFrame = q('pdfPreviewFrame');
    const pdfModalTitle = q('pdfModalTitle');
    const gridZoom = q('gridZoom');
    const gridZoomValue = q('gridZoomValue');
    const gridColsInput = q('gridCols');
    const gridRowsInput = q('gridRows');
    const weightsModal = q('weightsModal');
    const appSettingsModal = q('appSettingsModal');
    const transportModal = q('transportModal');
    const appThemeSelect = q('appTheme');
    const stageHeightInput = q('stageHeight');
    const transportTypeSelect = q('transportType');
    const transportCityPriceInput = q('transportCityPrice');
    const transportKmPriceInput = q('transportKmPrice');
    const transportKmInput = q('transportKm');
    const saveOrderBtn = q('saveOrderBtn');
    const editModePill = q('editModePill');
    const projectStatusSelect = q('projectStatus');
    const autosaveStatusEl = q('autosaveStatus');
    const restoreDraftBtn = q('restoreDraftBtn');
    const backupImportInput = q('backupImportInput');
    const ordersSearchInput = q('ordersSearchInput');
    const ordersStatusFilter = q('ordersStatusFilter');
    const cloudUrlInput = q('cloudUrl');
    const cloudAnonKeyInput = q('cloudAnonKey');
    const cloudWorkspaceKeyInput = q('cloudWorkspaceKey');
    const cloudAuthEmailInput = q('cloudAuthEmail');
    const cloudAuthStatusEl = q('cloudAuthStatus');
    const cloudAuthLoginBtn = q('cloudAuthLoginBtn');
    const cloudAuthLogoutBtn = q('cloudAuthLogoutBtn');

    let editingOrderId = null;
    let isDrawing = false;
    let drawMode = 'add';
    let lastDrawnCell = null;
    let preparedPdfBlob = null;
    let preparedPdfUrl = null;
    let preparedPdfName = 'smeta.pdf';
    let preparedPdfKind = 'tech';
    let pdfFlow = null;

    function moduleKey(x, y) {
        if (StageGridStateModule && typeof StageGridStateModule.moduleKey === 'function') return StageGridStateModule.moduleKey(x, y);
        return `${x},${y}`;
    }

    function parseModuleKey(key) {
        if (StageGridStateModule && typeof StageGridStateModule.parseModuleKey === 'function') return StageGridStateModule.parseModuleKey(key);
        const [x, y] = key.split(',').map(Number);
        return { x, y };
    }

    function domEl(id, root) {
        if (DomUtilsModule && typeof DomUtilsModule.getElementById === 'function') {
            return DomUtilsModule.getElementById(id, root || document);
        }
        const scope = root || document;
        return scope && typeof scope.getElementById === 'function' ? scope.getElementById(id) : null;
    }

    function q(id, root) {
        return domEl(id, root);
    }

    function getValue(id, fallback = '') {
        if (DomUtilsModule && typeof DomUtilsModule.getValue === 'function') {
            return DomUtilsModule.getValue(id, fallback, document);
        }
        const el = q(id);
        return el ? el.value : fallback;
    }

    function setValue(id, value) {
        if (DomUtilsModule && typeof DomUtilsModule.setValue === 'function') {
            return DomUtilsModule.setValue(id, value, document);
        }
        const el = q(id);
        if (el) el.value = value;
        return el;
    }

    function getNumber(id, fallback = 0) {
        if (DomUtilsModule && typeof DomUtilsModule.getNumber === 'function') {
            return DomUtilsModule.getNumber(id, fallback, document);
        }
        const raw = getValue(id, fallback);
        const n = Number(String(raw).replace(',', '.'));
        return Number.isFinite(n) ? n : fallback;
    }

    function setText(id, value) {
        if (DomUtilsModule && typeof DomUtilsModule.setText === 'function') {
            return DomUtilsModule.setText(id, value, document);
        }
        const el = q(id);
        if (el) el.textContent = value == null ? '' : String(value);
        return el;
    }

    function setHtml(id, value) {
        if (DomUtilsModule && typeof DomUtilsModule.setHtml === 'function') {
            return DomUtilsModule.setHtml(id, value, document);
        }
        const el = q(id);
        if (el) el.innerHTML = value == null ? '' : String(value);
        return el;
    }

    function escapeHtml(str) {
        if (!str) return '';
        if (FormatUtilsModule && typeof FormatUtilsModule.escapeHtml === 'function') {
            return FormatUtilsModule.escapeHtml(str);
        }
        return String(str).replace(/[&<>"']/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            if (m === '"') return '&quot;';
            if (m === "'") return '&#039;';
            return m;
        });
    }

    function money(value) {
        if (FormatUtilsModule && typeof FormatUtilsModule.money === 'function') {
            return FormatUtilsModule.money(value);
        }
        return Number(value || 0).toLocaleString('ru-RU');
    }

    function metric(value) {
        if (FormatUtilsModule && typeof FormatUtilsModule.metric === 'function') {
            return FormatUtilsModule.metric(value);
        }
        const rounded = Math.round((Number(value) || 0) * 100) / 100;
        return rounded.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
    }

    function kg(value) {
        if (FormatUtilsModule && typeof FormatUtilsModule.kg === 'function') {
            return FormatUtilsModule.kg(value);
        }
        const rounded = Math.round((Number(value) || 0) * 10) / 10;
        return rounded.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
    }

    function loadAppTheme() {
        if (AppSettingsModule && typeof AppSettingsModule.loadAppTheme === 'function') {
            return AppSettingsModule.loadAppTheme();
        }
        const saved = localStorage.getItem('appTheme');
        return saved === 'light' ? 'light' : DEFAULT_APP_THEME;
    }

    function applyAppTheme(theme) {
        const normalized = AppSettingsModule && typeof AppSettingsModule.applyAppTheme === 'function'
            ? AppSettingsModule.applyAppTheme(theme, { document })
            : (theme === 'light' ? 'light' : 'dark');
        appTheme = normalized;
        if (!AppSettingsModule) {
            document.body.classList.toggle('theme-light', normalized === 'light');
            document.body.classList.toggle('theme-dark', normalized === 'dark');
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.setAttribute('content', normalized === 'light' ? '#f3f0ea' : '#111820');
        }
    }

    function syncThemeInput() {
        if (AppSettingsModule && typeof AppSettingsModule.syncThemeInput === 'function') {
            AppSettingsModule.syncThemeInput(appThemeSelect, appTheme);
            return;
        }
        if (appThemeSelect) appThemeSelect.value = appTheme === 'light' ? 'light' : 'dark';
    }

    function readThemeFromInput() {
        if (AppSettingsModule && typeof AppSettingsModule.readThemeFromInput === 'function') {
            return AppSettingsModule.readThemeFromInput(appThemeSelect);
        }
        return appThemeSelect && appThemeSelect.value === 'light' ? 'light' : 'dark';
    }

    function makeLocalWorkspaceKey() {
        if (AppSettingsModule && typeof AppSettingsModule.makeLocalWorkspaceKey === 'function') {
            return AppSettingsModule.makeLocalWorkspaceKey();
        }
        if (window.crypto && crypto.randomUUID) return `feg-${crypto.randomUUID()}`;
        return `feg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function normalizeCloudSettings(raw) {
        if (AppSettingsModule && typeof AppSettingsModule.normalizeCloudSettings === 'function') {
            return AppSettingsModule.normalizeCloudSettings(raw);
        }
        const source = raw && typeof raw === 'object' ? raw : {};
        let workspaceKey = String(source.workspaceKey || '').trim();
        if (!workspaceKey) {
            workspaceKey = localStorage.getItem('cloudWorkspaceKey') || makeLocalWorkspaceKey();
        }
        return {
            url: String(source.url || '').trim().replace(/\/$/, ''),
            anonKey: String(source.anonKey || '').trim(),
            workspaceKey
        };
    }

    function loadCloudSettings() {
        if (AppSettingsModule && typeof AppSettingsModule.loadCloudSettings === 'function') {
            return AppSettingsModule.loadCloudSettings();
        }
        try {
            const parsed = JSON.parse(localStorage.getItem('cloudSettings') || 'null');
            const normalized = normalizeCloudSettings(parsed || DEFAULT_CLOUD_SETTINGS);
            localStorage.setItem('cloudWorkspaceKey', normalized.workspaceKey);
            return normalized;
        } catch (err) {
            const normalized = normalizeCloudSettings(DEFAULT_CLOUD_SETTINGS);
            localStorage.setItem('cloudWorkspaceKey', normalized.workspaceKey);
            return normalized;
        }
    }

    function syncCloudInputs() {
        if (AppSettingsModule && typeof AppSettingsModule.syncCloudInputs === 'function') {
            AppSettingsModule.syncCloudInputs({ url: cloudUrlInput, anonKey: cloudAnonKeyInput, workspaceKey: cloudWorkspaceKeyInput }, cloudSettings);
            return;
        }
        const normalized = normalizeCloudSettings(cloudSettings);
        if (cloudUrlInput) cloudUrlInput.value = normalized.url;
        if (cloudAnonKeyInput) cloudAnonKeyInput.value = normalized.anonKey;
        if (cloudWorkspaceKeyInput) cloudWorkspaceKeyInput.value = normalized.workspaceKey;
    }

    function readCloudSettingsFromInputs() {
        if (AppSettingsModule && typeof AppSettingsModule.readCloudSettingsFromInputs === 'function') {
            return AppSettingsModule.readCloudSettingsFromInputs({ url: cloudUrlInput, anonKey: cloudAnonKeyInput, workspaceKey: cloudWorkspaceKeyInput }, cloudSettings);
        }
        return normalizeCloudSettings({
            url: cloudUrlInput ? cloudUrlInput.value : cloudSettings.url,
            anonKey: cloudAnonKeyInput ? cloudAnonKeyInput.value : cloudSettings.anonKey,
            workspaceKey: cloudWorkspaceKeyInput ? cloudWorkspaceKeyInput.value : cloudSettings.workspaceKey
        });
    }

    function saveCloudSettings() {
        const nextSettings = readCloudSettingsFromInputs();
        cloudSettings = AppSettingsModule && typeof AppSettingsModule.saveCloudSettings === 'function'
            ? AppSettingsModule.saveCloudSettings(nextSettings)
            : nextSettings;
        if (!AppSettingsModule) {
            localStorage.setItem('cloudSettings', JSON.stringify(cloudSettings));
            localStorage.setItem('cloudWorkspaceKey', cloudSettings.workspaceKey);
        }
    }

    function getSupabaseClient() {
        if (SupabaseStorageModule && typeof SupabaseStorageModule.getClient === 'function') {
            return SupabaseStorageModule.getClient(cloudSettings);
        }
        const cfg = normalizeCloudSettings(cloudSettings);
        if (!cfg.url || !cfg.anonKey) {
            throw new Error('Заполните Supabase URL и Anon public key в настройках.');
        }
        if (!window.supabase || !window.supabase.createClient) {
            throw new Error('Библиотека Supabase не загрузилась. Проверьте интернет.');
        }
        return window.supabase.createClient(cfg.url, cfg.anonKey);
    }

    function projectStatusLabel(status) {
        return PROJECT_STATUS_LABELS[status] || PROJECT_STATUS_LABELS.draft;
    }

    function syncAuthStatus(message, tone) {
        if (!cloudAuthStatusEl) return;
        cloudAuthStatusEl.textContent = message || 'Вход не проверен.';
        cloudAuthStatusEl.dataset.tone = tone || '';
    }

    async function refreshCloudAuthStatus() {
        try {
            if (!cloudSettings.url || !cloudSettings.anonKey) {
                syncAuthStatus('Заполните Supabase URL и anon key, чтобы проверить вход.', 'muted');
                return null;
            }
            const session = SupabaseStorageModule && typeof SupabaseStorageModule.getAuthSession === 'function'
                ? await SupabaseStorageModule.getAuthSession(cloudSettings)
                : await getSupabaseClient().auth.getSession().then(({ data, error }) => {
                    if (error) throw error;
                    return data && data.session ? data.session : null;
                });
            const user = session && session.user;
            syncAuthStatus(user ? `Вход выполнен: ${user.email || user.id}` : 'Вход не выполнен. Облако с защищённой схемой потребует email-вход.', user ? 'ok' : 'warn');
            return session;
        } catch (err) {
            syncAuthStatus('Не удалось проверить вход: ' + (err && err.message ? err.message : err), 'error');
            return null;
        }
    }

    async function sendCloudAuthMagicLink() {
        try {
            saveCloudSettings();
            const email = cloudAuthEmailInput ? cloudAuthEmailInput.value : '';
            if (SupabaseStorageModule && typeof SupabaseStorageModule.signInWithEmail === 'function') {
                await SupabaseStorageModule.signInWithEmail(cloudSettings, email, { emailRedirectTo: window.location.href.split('#')[0] });
            } else {
                await getSupabaseClient().auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split('#')[0] } });
            }
            syncAuthStatus('Ссылка входа отправлена. Проверьте почту.', 'ok');
            showToast('Ссылка входа отправлена на email');
        } catch (err) {
            syncAuthStatus('Не удалось отправить ссылку: ' + (err && err.message ? err.message : err), 'error');
            alert('Не удалось отправить ссылку входа: ' + (err && err.message ? err.message : err));
        }
    }

    async function signOutCloudAuth() {
        try {
            if (SupabaseStorageModule && typeof SupabaseStorageModule.signOut === 'function') {
                await SupabaseStorageModule.signOut(cloudSettings);
            } else {
                await getSupabaseClient().auth.signOut();
            }
            syncAuthStatus('Вы вышли из облака.', 'muted');
            showToast('Выход выполнен');
        } catch (err) {
            alert('Не удалось выйти: ' + (err && err.message ? err.message : err));
        }
    }

    function bindCloudAuthControls() {
        if (cloudAuthLoginBtn) cloudAuthLoginBtn.addEventListener('click', sendCloudAuthMagicLink);
        if (cloudAuthLogoutBtn) cloudAuthLogoutBtn.addEventListener('click', signOutCloudAuth);
        refreshCloudAuthStatus();
    }

    function validateCurrentProjectForSave() {
        if (!lastResult) throw new Error('Сначала выберите модули на сетке.');
        if (!clientSelect.value) throw new Error('Выберите или добавьте клиента перед сохранением.');
        if (!projectNameInput.value.trim() && !confirm('Название проекта не заполнено. Сохранить без названия?')) {
            throw new Error('Сохранение отменено.');
        }
    }

    function loadWeights() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.loadWeights === 'function') {
            return PriceWeightSettingsModule.loadWeights();
        }
        try {
            return { ...DEFAULT_WEIGHTS, ...(JSON.parse(localStorage.getItem('itemWeights') || '{}')) };
        } catch (e) {
            return { ...DEFAULT_WEIGHTS };
        }
    }

    function loadStageHeight() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.loadStageHeight === 'function') {
            return PriceWeightSettingsModule.loadStageHeight();
        }
        const value = Number(localStorage.getItem('stageHeightM'));
        return isNaN(value) || value < 0 ? DEFAULT_STAGE_HEIGHT_M : value;
    }

    function normalizePricingSettings(raw) {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.normalizePricingSettings === 'function') {
            return PriceWeightSettingsModule.normalizePricingSettings(raw);
        }
        const source = raw && typeof raw === 'object' ? raw : {};
        const priceModule = Number(source.priceModule);
        const installCost = Number(source.installCost);
        return {
            priceModule: isNaN(priceModule) || priceModule < 0 ? DEFAULT_PRICING.priceModule : priceModule,
            installCost: isNaN(installCost) || installCost < 0 ? DEFAULT_PRICING.installCost : installCost
        };
    }

    function loadPricingSettings() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.loadPricingSettings === 'function') {
            return PriceWeightSettingsModule.loadPricingSettings();
        }
        try {
            const parsed = JSON.parse(localStorage.getItem('pricingSettings') || 'null');
            return normalizePricingSettings(parsed || DEFAULT_PRICING);
        } catch (err) {
            return { ...DEFAULT_PRICING };
        }
    }

    function pricingInputs() {
        return { priceModule: priceModuleInput, installCost: installInput };
    }

    function weightInputs() {
        return {
            stageHeight: stageHeightInput,
            weightSheet: document.getElementById('weightSheet'),
            weightColumnLow: document.getElementById('weightColumnLow'),
            weightColumnMiddle: document.getElementById('weightColumnMiddle'),
            weightColumnHigh: document.getElementById('weightColumnHigh'),
            weightFrameLow: document.getElementById('weightFrameLow'),
            weightFrameHigh: document.getElementById('weightFrameHigh'),
            weightStud: document.getElementById('weightStud')
        };
    }

    function syncPricingInputs() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.syncPricingInputs === 'function') {
            PriceWeightSettingsModule.syncPricingInputs(pricingInputs(), pricingSettings);
            return;
        }
        const normalized = normalizePricingSettings(pricingSettings);
        if (priceModuleInput) priceModuleInput.value = normalized.priceModule;
        if (installInput) installInput.value = normalized.installCost;
    }

    function readPricingFromInputs() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.readPricingFromInputs === 'function') {
            return PriceWeightSettingsModule.readPricingFromInputs(pricingInputs(), pricingSettings);
        }
        return normalizePricingSettings({
            priceModule: priceModuleInput ? Number(priceModuleInput.value) : pricingSettings.priceModule,
            installCost: installInput ? Number(installInput.value) : pricingSettings.installCost
        });
    }

    function transportInputs() {
        return {
            type: transportTypeSelect,
            cityPrice: transportCityPriceInput,
            kmPrice: transportKmPriceInput,
            km: transportKmInput
        };
    }

    function normalizeTransportSettings(raw) {
        if (TransportSettingsModule && typeof TransportSettingsModule.normalizeTransportSettings === 'function') {
            return TransportSettingsModule.normalizeTransportSettings(raw);
        }
        const source = raw && typeof raw === 'object' ? raw : {};
        const type = source.type === 'intercity' ? 'intercity' : 'city';
        const cityPrice = Number(source.cityPrice);
        const kmPrice = Number(source.kmPrice);
        const km = Number(source.km);
        return {
            type,
            cityPrice: isNaN(cityPrice) || cityPrice < 0 ? DEFAULT_TRANSPORT_SETTINGS.cityPrice : cityPrice,
            kmPrice: isNaN(kmPrice) || kmPrice < 0 ? DEFAULT_TRANSPORT_SETTINGS.kmPrice : kmPrice,
            km: isNaN(km) || km < 0 ? DEFAULT_TRANSPORT_SETTINGS.km : km
        };
    }

    function loadTransportSettings() {
        if (TransportSettingsModule && typeof TransportSettingsModule.loadTransportSettings === 'function') {
            return TransportSettingsModule.loadTransportSettings();
        }
        try {
            const parsed = JSON.parse(localStorage.getItem('transportSettings') || 'null');
            return normalizeTransportSettings(parsed || DEFAULT_TRANSPORT_SETTINGS);
        } catch (err) {
            return { ...DEFAULT_TRANSPORT_SETTINGS };
        }
    }

    function calculateTransportCost(settings) {
        if (TransportSettingsModule && typeof TransportSettingsModule.calculateTransportCost === 'function') {
            return TransportSettingsModule.calculateTransportCost(settings || transportSettings);
        }
        const normalized = normalizeTransportSettings(settings || transportSettings);
        return normalized.type === 'intercity'
            ? normalized.kmPrice * normalized.km
            : normalized.cityPrice;
    }

    function getTransportLabel(settings) {
        if (TransportSettingsModule && typeof TransportSettingsModule.getTransportLabel === 'function') {
            return TransportSettingsModule.getTransportLabel(settings || transportSettings, { metric, money });
        }
        const normalized = normalizeTransportSettings(settings || transportSettings);
        if (normalized.type === 'intercity') {
            return `Межгород · ${metric(normalized.km)} км × ${money(normalized.kmPrice)} ₽/км`;
        }
        return 'По городу · фиксированная стоимость';
    }

    function syncTransportInputs() {
        if (TransportSettingsModule && typeof TransportSettingsModule.syncTransportInputs === 'function') {
            TransportSettingsModule.syncTransportInputs(transportInputs(), transportSettings);
            return;
        }
        const normalized = normalizeTransportSettings(transportSettings);
        if (transportTypeSelect) transportTypeSelect.value = normalized.type;
        if (transportCityPriceInput) transportCityPriceInput.value = normalized.cityPrice;
        if (transportKmPriceInput) transportKmPriceInput.value = normalized.kmPrice;
        if (transportKmInput) transportKmInput.value = normalized.km;
    }

    function readTransportFromInputs() {
        if (TransportSettingsModule && typeof TransportSettingsModule.readTransportFromInputs === 'function') {
            return TransportSettingsModule.readTransportFromInputs(transportInputs(), transportSettings);
        }
        return normalizeTransportSettings({
            type: transportTypeSelect ? transportTypeSelect.value : transportSettings.type,
            cityPrice: transportCityPriceInput ? Number(transportCityPriceInput.value) : transportSettings.cityPrice,
            kmPrice: transportKmPriceInput ? Number(transportKmPriceInput.value) : transportSettings.kmPrice,
            km: transportKmInput ? Number(transportKmInput.value) : transportSettings.km
        });
    }

    function getStageHeightValue() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.getStageHeightValue === 'function') {
            return PriceWeightSettingsModule.getStageHeightValue(stageHeightM);
        }
        const value = Number(stageHeightM);
        return isNaN(value) || value < 0 ? 0 : value;
    }

    function getWeightValue(key) {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.getWeightValue === 'function') {
            return PriceWeightSettingsModule.getWeightValue(itemWeights, key);
        }
        const value = Number(itemWeights[key]);
        return isNaN(value) || value < 0 ? 0 : value;
    }

    function calculateWeightBreakdown(geometry, columnType, frameType, studs) {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.calculateWeightBreakdown === 'function') {
            return PriceWeightSettingsModule.calculateWeightBreakdown(itemWeights, geometry, columnType, frameType, studs);
        }
        const sheetUnit = getWeightValue('sheet');
        const columnUnit = getWeightValue(`column_${columnType || 'middle'}`);
        const frameUnit = getWeightValue(`frame_${frameType || 'low'}`);
        const studUnit = getWeightValue('stud');
        const sheetTotal = geometry.sheets * sheetUnit;
        const columnTotal = geometry.columns * columnUnit;
        const frameTotal = geometry.frames * frameUnit;
        const studTotal = studs * studUnit;
        return {
            sheetUnit, columnUnit, frameUnit, studUnit,
            sheetTotal, columnTotal, frameTotal, studTotal,
            total: sheetTotal + columnTotal + frameTotal + studTotal
        };
    }

    function syncWeightInputs() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.syncWeightInputs === 'function') {
            PriceWeightSettingsModule.syncWeightInputs(weightInputs(), itemWeights, stageHeightM, pricingInputs(), pricingSettings);
            return;
        }
        const map = {
            weightSheet: 'sheet',
            weightColumnLow: 'column_low',
            weightColumnMiddle: 'column_middle',
            weightColumnHigh: 'column_high',
            weightFrameLow: 'frame_low',
            weightFrameHigh: 'frame_high',
            weightStud: 'stud'
        };
        Object.entries(map).forEach(([id, key]) => {
            const input = document.getElementById(id);
            if (input) input.value = getWeightValue(key);
        });
        if (stageHeightInput) stageHeightInput.value = Math.round(getStageHeightValue() * 100);
        syncPricingInputs();
    }

    function readStageHeightFromInput() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.readStageHeightFromInput === 'function') {
            return PriceWeightSettingsModule.readStageHeightFromInput(stageHeightInput, stageHeightM);
        }
        const valueCm = stageHeightInput ? Number(stageHeightInput.value) : stageHeightM * 100;
        return isNaN(valueCm) || valueCm < 0 ? DEFAULT_STAGE_HEIGHT_M : valueCm / 100;
    }

    function readWeightsFromInputs() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.readWeightsFromInputs === 'function') {
            return PriceWeightSettingsModule.readWeightsFromInputs(weightInputs());
        }
        const map = {
            sheet: 'weightSheet',
            column_low: 'weightColumnLow',
            column_middle: 'weightColumnMiddle',
            column_high: 'weightColumnHigh',
            frame_low: 'weightFrameLow',
            frame_high: 'weightFrameHigh',
            stud: 'weightStud'
        };
        const next = { ...DEFAULT_WEIGHTS };
        Object.entries(map).forEach(([key, id]) => {
            const input = document.getElementById(id);
            const value = input ? Number(input.value) : DEFAULT_WEIGHTS[key];
            next[key] = isNaN(value) || value < 0 ? 0 : value;
        });
        return next;
    }

    function openAppSettingsModal() {
        syncThemeInput();
        syncCloudInputs();
        if (AppSettingsModule && typeof AppSettingsModule.openModal === 'function') {
            AppSettingsModule.openModal(appSettingsModal);
            return;
        }
        if (appSettingsModal) {
            appSettingsModal.classList.add('open');
            appSettingsModal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeAppSettingsModal() {
        if (AppSettingsModule && typeof AppSettingsModule.closeModal === 'function') {
            AppSettingsModule.closeModal(appSettingsModal);
            return;
        }
        if (appSettingsModal) {
            appSettingsModal.classList.remove('open');
            appSettingsModal.setAttribute('aria-hidden', 'true');
        }
    }

    function saveAppSettingsFromModal() {
        appTheme = readThemeFromInput();
        saveCloudSettings();
        applyAppTheme(appTheme);
        if (AppSettingsModule && typeof AppSettingsModule.saveAppTheme === 'function') {
            appTheme = AppSettingsModule.saveAppTheme(appTheme);
        } else {
            localStorage.setItem('appTheme', appTheme);
        }
        refreshCloudAuthStatus();
        closeAppSettingsModal();
        showToast('Настройки приложения сохранены');
    }

    function openTransportModal() {
        syncTransportInputs();
        if (TransportSettingsModule && typeof TransportSettingsModule.openTransportModal === 'function') {
            TransportSettingsModule.openTransportModal(transportModal);
            return;
        }
        if (transportModal) {
            transportModal.classList.add('open');
            transportModal.setAttribute('aria-hidden', 'false');
        }
    }

    function closeTransportModal() {
        if (TransportSettingsModule && typeof TransportSettingsModule.closeTransportModal === 'function') {
            TransportSettingsModule.closeTransportModal(transportModal);
            return;
        }
        if (transportModal) {
            transportModal.classList.remove('open');
            transportModal.setAttribute('aria-hidden', 'true');
        }
    }

    function saveTransportSettingsFromModal() {
        const nextSettings = readTransportFromInputs();
        transportSettings = TransportSettingsModule && typeof TransportSettingsModule.saveTransportSettings === 'function'
            ? TransportSettingsModule.saveTransportSettings(nextSettings)
            : nextSettings;
        if (!TransportSettingsModule) {
            localStorage.setItem('transportSettings', JSON.stringify(transportSettings));
        }
        closeTransportModal();
        if (typeof calc === 'function') calc(false);
        if (window.FEG35BlockConstructor && typeof window.FEG35BlockConstructor.calculate === 'function') {
            window.FEG35BlockConstructor.calculate();
        }
        showToast('Транспорт сохранён');
    }

    function openSettingsModal() {
        syncWeightInputs();
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.openModal === 'function') {
            PriceWeightSettingsModule.openModal(weightsModal);
            return;
        }
        weightsModal.classList.add('open');
        weightsModal.setAttribute('aria-hidden', 'false');
    }

    function closeSettingsModal() {
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.closeModal === 'function') {
            PriceWeightSettingsModule.closeModal(weightsModal);
            return;
        }
        weightsModal.classList.remove('open');
        weightsModal.setAttribute('aria-hidden', 'true');
    }

    function openWeightsModal() { openSettingsModal(); }
    function closeWeightsModal() { closeSettingsModal(); }

    function saveSettingsFromModal() {
        itemWeights = readWeightsFromInputs();
        stageHeightM = readStageHeightFromInput();
        pricingSettings = readPricingFromInputs();
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.saveAll === 'function') {
            const saved = PriceWeightSettingsModule.saveAll({ weights: itemWeights, stageHeightM, pricing: pricingSettings });
            itemWeights = saved.weights;
            stageHeightM = saved.stageHeightM;
            pricingSettings = saved.pricing;
        } else {
            localStorage.setItem('itemWeights', JSON.stringify(itemWeights));
            localStorage.setItem('stageHeightM', String(stageHeightM));
            localStorage.setItem('pricingSettings', JSON.stringify(pricingSettings));
        }
        closeSettingsModal();
        calc(false);
        showToast('Настройки сцены сохранены');
    }

    function saveWeightsFromModal() { saveSettingsFromModal(); }

    function resetWeightsToDefault() {
        itemWeights = { ...DEFAULT_WEIGHTS };
        if (PriceWeightSettingsModule && typeof PriceWeightSettingsModule.saveWeights === 'function') {
            itemWeights = PriceWeightSettingsModule.saveWeights(itemWeights);
        } else {
            localStorage.setItem('itemWeights', JSON.stringify(itemWeights));
        }
        syncWeightInputs();
        calc(false);
        showToast('Вес сброшен');
    }

    function clampGridSize(value, fallback) {
        if (StageCalculatorModule && typeof StageCalculatorModule.clampGridSize === 'function') {
            return StageCalculatorModule.clampGridSize(value, fallback, { min: MIN_GRID_SIZE, max: MAX_GRID_SIZE });
        }
        if (StageGridStateModule && typeof StageGridStateModule.clampGridSize === 'function') {
            return StageGridStateModule.clampGridSize(value, MIN_GRID_SIZE, MAX_GRID_SIZE, fallback);
        }
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) return fallback;
        return Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, parsed));
    }

    function updateGridTemplateVars() {
        stageGrid.style.setProperty('--grid-cols', gridColsCount);
        stageGrid.style.setProperty('--grid-rows', gridRowsCount);
        if (gridColsInput) gridColsInput.value = gridColsCount;
        if (gridRowsInput) gridRowsInput.value = gridRowsCount;
        if (widthInput) {
            widthInput.max = gridColsCount;
            if (Number(widthInput.value) > gridColsCount) widthInput.value = gridColsCount;
        }
        if (depthInput) {
            depthInput.max = gridRowsCount;
            if (Number(depthInput.value) > gridRowsCount) depthInput.value = gridRowsCount;
        }
    }

    function fitGridToScreen() {
        if (!stageGrid || !stageGrid.parentElement) return;
        const wrap = stageGrid.parentElement;
        const wrapStyle = window.getComputedStyle ? window.getComputedStyle(wrap) : null;
        const horizontalPadding = wrapStyle
            ? parseFloat(wrapStyle.paddingLeft || '0') + parseFloat(wrapStyle.paddingRight || '0')
            : 0;
        const horizontalBorder = wrapStyle
            ? parseFloat(wrapStyle.borderLeftWidth || '0') + parseFloat(wrapStyle.borderRightWidth || '0')
            : 0;
        const measuredWidth = wrap.getBoundingClientRect ? wrap.getBoundingClientRect().width : wrap.clientWidth;
        const available = Math.max(220, Math.floor(measuredWidth - horizontalPadding - horizontalBorder - 2));
        const base = Math.floor(available / Math.max(1, gridColsCount));
        const scaled = Math.floor(base * (gridScalePercent / 100));
        const size = Math.max(8, Math.min(96, scaled));
        stageGrid.style.setProperty('--cell-size', `${size}px`);
        if (gridZoomValue) gridZoomValue.textContent = `${gridScalePercent}%`;
    }

    function setGridZoom(value) {
        gridScalePercent = Math.max(50, Math.min(250, Number(value) || 100));
        if (gridZoom) gridZoom.value = gridScalePercent;
        fitGridToScreen();
    }

    function pruneModulesOutsideGrid() {
        selectedModules = new Set(
            Array.from(selectedModules).filter(key => {
                const { x, y } = parseModuleKey(key);
                return x >= 0 && x < gridColsCount && y >= 0 && y < gridRowsCount;
            })
        );
    }

    function setGridDimensions(cols, rows, preserveShape = true) {
        gridColsCount = clampGridSize(cols, gridColsCount);
        gridRowsCount = clampGridSize(rows, gridRowsCount);
        updateGridTemplateVars();
        if (preserveShape) pruneModulesOutsideGrid();
        buildStageGrid();
        fitGridToScreen();
        calc(false);
    }

    function applyGridDimensionsFromInputs() {
        setGridDimensions(gridColsInput.value, gridRowsInput.value, true);
    }

    function buildStageGrid() {
        updateGridTemplateVars();
        stageGrid.innerHTML = '';
        for (let y = 0; y < gridRowsCount; y++) {
            for (let x = 0; x < gridColsCount; x++) {
                const cell = document.createElement('button');
                cell.type = 'button';
                cell.className = 'stage-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.title = `Модуль ${x + 1}:${y + 1}`;
                cell.setAttribute('aria-label', `Модуль ${x + 1}:${y + 1}`);
                if (y === gridRowsCount - 1) cell.classList.add('front-row');
                cell.addEventListener('pointerdown', handleCellPointerDown);
                cell.addEventListener('pointerenter', handleCellPointerEnter);
                cell.addEventListener('pointerup', stopDrawing);
                cell.addEventListener('pointercancel', stopDrawing);
                stageGrid.appendChild(cell);
            }
        }
        stageGrid.setAttribute('aria-label', `Редактор конфигурации сцены ${gridColsCount} на ${gridRowsCount}`);
        renderStageGrid();
        fitGridToScreen();
    }

    function setModuleState(x, y, shouldAdd) {
        const key = moduleKey(x, y);
        if (shouldAdd) selectedModules.add(key);
        else selectedModules.delete(key);
    }

    function handleCellPointerDown(event) {
        event.preventDefault();
        const cell = event.currentTarget;
        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);
        const key = moduleKey(x, y);
        drawMode = selectedModules.has(key) ? 'remove' : 'add';
        isDrawing = true;
        lastDrawnCell = null;
        applyDrawToCell(cell);
    }

    function handleCellPointerEnter(event) {
        if (!isDrawing) return;
        event.preventDefault();
        applyDrawToCell(event.currentTarget);
    }

    function applyDrawToCell(cell) {
        const x = Number(cell.dataset.x);
        const y = Number(cell.dataset.y);
        const key = moduleKey(x, y);
        if (lastDrawnCell === key) return;
        lastDrawnCell = key;
        setModuleState(x, y, drawMode === 'add');
        renderStageGrid();
        calc(false);
    }

    function stopDrawing() {
        isDrawing = false;
        lastDrawnCell = null;
    }

    function handleGridPointerMove(event) {
        if (!isDrawing) return;
        event.preventDefault();
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const cell = element && element.closest ? element.closest('.stage-cell') : null;
        if (cell && stageGrid.contains(cell)) applyDrawToCell(cell);
    }

    stageGrid.addEventListener('pointermove', handleGridPointerMove);
    window.addEventListener('pointerup', stopDrawing);
    window.addEventListener('pointercancel', stopDrawing);

    function renderStageGrid() {
        document.querySelectorAll('.stage-cell').forEach(cell => {
            const key = moduleKey(Number(cell.dataset.x), Number(cell.dataset.y));
            cell.classList.toggle('active', selectedModules.has(key));
        });
        selectedCount.textContent = `Выбрано модулей: ${selectedModules.size}`;
    }

    function normalizeSelectedModules(modules) {
        if (StageCalculatorModule && typeof StageCalculatorModule.normalizeSelectedModules === 'function') {
            return StageCalculatorModule.normalizeSelectedModules(modules);
        }
        if (!modules.length) return [];
        const minX = Math.min(...modules.map(m => m.x));
        const minY = Math.min(...modules.map(m => m.y));
        return modules.map(m => ({ x: m.x - minX, y: m.y - minY }));
    }

    function centerModulesInGrid(modules) {
        if (StageCalculatorModule && typeof StageCalculatorModule.centerModulesInGrid === 'function') {
            return StageCalculatorModule.centerModulesInGrid(modules, gridColsCount, gridRowsCount);
        }
        if (!modules.length) return [];
        const width = Math.max(...modules.map(m => m.x)) + 1;
        const depth = Math.max(...modules.map(m => m.y)) + 1;
        const offsetX = Math.floor((gridColsCount - width) / 2);
        const offsetY = Math.floor((gridRowsCount - depth) / 2);
        return modules.map(m => ({ x: m.x + offsetX, y: m.y + offsetY }))
            .filter(m => m.x >= 0 && m.x < gridColsCount && m.y >= 0 && m.y < gridRowsCount);
    }

    function mirrorStage() {
        const modules = getSelectedModuleList();
        if (!modules.length) return;
        const mirrored = StageCalculatorModule && typeof StageCalculatorModule.mirrorModules === 'function'
            ? StageCalculatorModule.mirrorModules(modules)
            : modules.map(m => {
                const minX = Math.min(...modules.map(mm => mm.x));
                const maxX = Math.max(...modules.map(mm => mm.x));
                return { x: maxX - (m.x - minX), y: m.y };
            });
        selectedModules = new Set(mirrored.map(m => moduleKey(m.x, m.y)));
        renderStageGrid();
        calc(false);
    }

    function rotateStage() {
        const sourceModules = getSelectedModuleList();
        if (!sourceModules.length) return;
        const rotated = StageCalculatorModule && typeof StageCalculatorModule.rotateModules === 'function'
            ? StageCalculatorModule.rotateModules(sourceModules, gridColsCount, gridRowsCount)
            : centerModulesInGrid(normalizeSelectedModules(sourceModules).map(m => {
                const maxY = Math.max(...normalizeSelectedModules(sourceModules).map(mm => mm.y));
                return { x: maxY - m.y, y: m.x };
            }));
        selectedModules = new Set(rotated.map(m => moduleKey(m.x, m.y)));
        renderStageGrid();
        calc(false);
    }

    function clearStageGrid() {
        selectedModules.clear();
        renderStageGrid();
        calc(false);
    }

    function clearStageGridConfirm() {
        if (selectedModules.size && !confirm('Очистить схему сцены?')) return;
        clearStageGrid();
    }

    function applyRectangle() {
        const w = parseInt(widthInput.value);
        const d = parseInt(depthInput.value);
        const rectangle = StageCalculatorModule && typeof StageCalculatorModule.rectangleModules === 'function'
            ? StageCalculatorModule.rectangleModules(w, d, gridColsCount, gridRowsCount)
            : { ok: false, modules: [] };
        if (!rectangle.ok) {
            if (isNaN(w) || isNaN(d) || w <= 0 || d <= 0 || w > gridColsCount || d > gridRowsCount) {
                alert(`Укажите ширину и глубину от 1 до ${gridColsCount} по ширине и до ${gridRowsCount} по глубине`);
                return;
            }
        }
        selectedModules.clear();
        if (rectangle.ok) {
            rectangle.modules.forEach(m => selectedModules.add(moduleKey(m.x, m.y)));
        } else {
            const startX = Math.floor((gridColsCount - w) / 2);
            const startY = gridRowsCount - d;
            for (let y = startY; y < startY + d; y++) {
                for (let x = startX; x < startX + w; x++) selectedModules.add(moduleKey(x, y));
            }
        }
        renderStageGrid();
        calc(false);
    }

    function getSelectedModuleList() {
        return Array.from(selectedModules).map(parseModuleKey);
    }

    function canonicalEdge(a, b) {
        if (StageCalculatorModule && typeof StageCalculatorModule.canonicalEdge === 'function') {
            return StageCalculatorModule.canonicalEdge(a, b);
        }
        if (StageGridStateModule && typeof StageGridStateModule.canonicalEdge === 'function') return StageGridStateModule.canonicalEdge(a, b);
        const first = `${a.x},${a.y}`;
        const second = `${b.x},${b.y}`;
        return first < second ? `${first}-${second}` : `${second}-${first}`;
    }

    function calculateGeometry(modules) {
        if (StageCalculatorModule && typeof StageCalculatorModule.calculateGeometry === 'function') {
            return StageCalculatorModule.calculateGeometry(modules);
        }
        const vertices = new Set();
        const edges = new Set();

        modules.forEach(({ x, y }) => {
            vertices.add(`${x},${y}`);
            vertices.add(`${x + 1},${y}`);
            vertices.add(`${x},${y + 1}`);
            vertices.add(`${x + 1},${y + 1}`);

            edges.add(canonicalEdge({ x, y }, { x: x + 1, y }));
            edges.add(canonicalEdge({ x, y: y + 1 }, { x: x + 1, y: y + 1 }));
            edges.add(canonicalEdge({ x, y }, { x, y: y + 1 }));
            edges.add(canonicalEdge({ x: x + 1, y }, { x: x + 1, y: y + 1 }));
        });

        return {
            sheets: modules.length,
            columns: vertices.size,
            frames: edges.size
        };
    }

    function calculateConnectedComponents(modules) {
        if (StageCalculatorModule && typeof StageCalculatorModule.calculateConnectedComponents === 'function') {
            return StageCalculatorModule.calculateConnectedComponents(modules);
        }
        const keys = new Set(modules.map(m => moduleKey(m.x, m.y)));
        const visited = new Set();
        let components = 0;
        const directions = [
            [0,-1],
            [-1, 0], [1, 0],
            [0, 1]
        ];

        modules.forEach(({ x, y }) => {
            const start = moduleKey(x, y);
            if (visited.has(start)) return;
            components += 1;
            const stack = [start];
            visited.add(start);
            while (stack.length) {
                const current = stack.pop();
                const { x: cx, y: cy } = parseModuleKey(current);
                directions.forEach(([dx, dy]) => {
                    const next = moduleKey(cx + dx, cy + dy);
                    if (keys.has(next) && !visited.has(next)) {
                        visited.add(next);
                        stack.push(next);
                    }
                });
            }
        });
        return components;
    }

    function getDetachedNotice(components) {
        if (StageCalculatorModule && typeof StageCalculatorModule.getDetachedNotice === 'function') {
            return StageCalculatorModule.getDetachedNotice(components);
        }
        if (components <= 1) return 'Единая конструкция';
        return `${components} отдельные конструкции`;
    }

    function getStageBounds(modules) {
        if (StageCalculatorModule && typeof StageCalculatorModule.getStageBounds === 'function') {
            return StageCalculatorModule.getStageBounds(modules);
        }
        if (!modules.length) return { width: 0, depth: 0 };
        const xs = modules.map(m => m.x);
        const ys = modules.map(m => m.y);
        return {
            width: Math.max(...xs) - Math.min(...xs) + 1,
            depth: Math.max(...ys) - Math.min(...ys) + 1
        };
    }

    function buildShapeText(modules) {
        if (StageCalculatorModule && typeof StageCalculatorModule.buildShapeText === 'function') {
            return StageCalculatorModule.buildShapeText(modules);
        }
        if (!modules.length) return 'Нет модулей';
        const keys = new Set(modules.map(m => moduleKey(m.x, m.y)));
        const xs = modules.map(m => m.x);
        const ys = modules.map(m => m.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        let rows = [];
        for (let y = minY; y <= maxY; y++) {
            let row = '';
            for (let x = minX; x <= maxX; x++) {
                row += keys.has(moduleKey(x, y)) ? '■' : '□';
            }
            rows.push(row);
        }
        return rows.join('<br>');
    }

    function addClient() {
        const name = clientNameInput.value.trim();
        if (!name) {
            alert('Введите имя клиента');
            return;
        }
        const before = typeof getClients === 'function' ? getClients().length : 0;
        const client = typeof ensureClientExists === 'function' ? ensureClientExists(name) : null;
        const after = typeof getClients === 'function' ? getClients().length : before;
        if (after === before && client) {
            alert('Такой клиент уже есть в списке');
        }
        renderClients();
        clientNameInput.value = '';
        if (clientSelect && client) clientSelect.value = client.name;
    }

    function renderClients() {
        const clients = typeof getClients === 'function' ? getClients() : [];
        clientSelect.innerHTML = '<option value="">— Выберите клиента —</option>';
        clients.forEach(c => {
            const name = typeof c === 'string' ? c : c.name;
            clientSelect.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
        });
        if (clients.length === 0) {
            clientSelect.innerHTML = '<option value="">Нет клиентов, добавьте</option>';
        }
    }

    function calc(showAlerts = true) {
        const modulesList = getSelectedModuleList();
        const price = parseFloat(priceModuleInput.value);
        let installCost = parseFloat(installInput.value);

        if (modulesList.length === 0) {
            lastResult = null;
            resultDiv.innerHTML = '<div class="result-grid"><div>Конфигурация</div><div>Выберите модули на сетке</div></div>';
            updatePdfContent();
            return;
        }
        if (isNaN(price) || price < 0) {
            if (showAlerts) alert('Укажите корректную цену за модуль');
            return;
        }
        if (isNaN(installCost) || installCost < 0) installCost = 0;

        const geometry = calculateGeometry(modulesList);
        const components = calculateConnectedComponents(modulesList);
        const bounds = getStageBounds(modulesList);
        const modulesCost = geometry.sheets * price;
        const activeTransportSettings = normalizeTransportSettings(transportSettings);
        const transportCost = calculateTransportCost(activeTransportSettings);
        const transportLabel = getTransportLabel(activeTransportSettings);
        const total = modulesCost + installCost + transportCost;
        const columnType = columnTypeSelect ? columnTypeSelect.value : 'middle';
        const frameType = frameTypeSelect ? frameTypeSelect.value : 'low';
        const columnTypeLabel = COLUMN_TYPES[columnType] || COLUMN_TYPES.middle;
        const frameTypeLabel = FRAME_TYPES[frameType] || FRAME_TYPES.low;
        const studs = geometry.columns;
        const feet = geometry.columns;
        const weight = calculateWeightBreakdown(geometry, columnType, frameType, studs);
        const stageHeight = getStageHeightValue();

        lastResult = {
            w: bounds.width,
            d: bounds.depth,
            modules: geometry.sheets,
            sheets: geometry.sheets,
            columns: geometry.columns,
            frames: geometry.frames,
            columnType,
            columnTypeLabel,
            frameType,
            frameTypeLabel,
            studs,
            feet,
            weight,
            totalWeight: weight.total,
            stageHeightM: stageHeight,
            components,
            modulesCost,
            installCost,
            transportCost,
            transportLabel,
            transportSettings: { ...activeTransportSettings },
            total,
            priceModule: price,
            shape: Array.from(selectedModules),
            shapeText: buildShapeText(modulesList),
            widthMeters: bounds.width * MODULE_WIDTH_M,
            depthMeters: bounds.depth * MODULE_DEPTH_M,
            areaMeters: geometry.sheets * MODULE_WIDTH_M * MODULE_DEPTH_M,
            gridCols: gridColsCount,
            gridRows: gridRowsCount,
            weights: { ...itemWeights }
        };

        resultDiv.innerHTML = `
            <div class="result-grid">
                <div>Габариты сцены</div><div>${metric(bounds.width * MODULE_WIDTH_M)} × ${metric(bounds.depth * MODULE_DEPTH_M)} м</div>
                <div>Высота сцены</div><div>${metric(stageHeight * 100)} см</div>
                <div>Зона по сетке</div><div>${bounds.width} × ${bounds.depth} мод.</div>
                <div>Площадь настила</div><div>${metric(geometry.sheets * MODULE_WIDTH_M * MODULE_DEPTH_M)} м²</div>
                <div>Листы настила</div><div>${geometry.sheets} шт</div>
                <div>Столбы-опоры</div><div>${geometry.columns} шт · ${escapeHtml(columnTypeLabel)}</div>
                <div>Перекладины</div><div>${geometry.frames} шт · ${escapeHtml(frameTypeLabel)}</div>
                <div>Шпильки</div><div>${studs} шт</div>
                <div>Пятки</div><div>${feet} шт</div>
                <div>Вес комплекта</div><div>${kg(weight.total)} кг</div>
                <div>Связность</div><div>${getDetachedNotice(components)}</div>
                <div>Прокат сцены</div><div>${money(modulesCost)} ₽</div>
                <div>Монтаж</div><div>${money(installCost)} ₽</div>
                <div>Транспорт</div><div>${money(transportCost)} ₽ · ${escapeHtml(transportLabel)}</div>
                <div><b>ИТОГО</b></div><div><b>${money(total)} ₽</b></div>
            </div>
        `;

        updatePdfContent();
        scheduleStageAutosave();
    }

    function createPdfMiniGrid() {
        const pdfModule = getPdfGenerator && getPdfGenerator();
        if (pdfModule && typeof pdfModule.renderStageSchemeGrid === 'function') {
            return pdfModule.renderStageSchemeGrid({
                modules: getSelectedModuleList(),
                keyFn: moduleKey,
                emptyText: 'Схема не выбрана'
            });
        }
        const modules = getSelectedModuleList();
        if (!modules.length) return '<div style="font-size:12px;color:#69727d;">Схема не выбрана</div>';
        const keys = new Set(modules.map(m => moduleKey(m.x, m.y)));
        const xs = modules.map(m => m.x);
        const ys = modules.map(m => m.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const cols = maxX - minX + 1;
        const rows = maxY - minY + 1;
        const pdfCellSize = Math.max(6, Math.min(18, Math.floor(245 / Math.max(cols, rows, 1))));
        let html = `<div class="pdf-mini-grid" style="--pdf-grid-cols:${cols}; --pdf-cell-size:${pdfCellSize}px;">`;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                html += `<div class="pdf-mini-cell ${keys.has(moduleKey(x, y)) ? 'active' : ''}"></div>`;
            }
        }
        html += '</div>';
        return html;
    }



    function createClientSchemeGrid() {
        const pdfModule = getPdfGenerator && getPdfGenerator();
        if (pdfModule && typeof pdfModule.renderClientStageSchemeGrid === 'function') {
            return pdfModule.renderClientStageSchemeGrid({
                modules: getSelectedModuleList(),
                keyFn: moduleKey,
                emptyText: 'Схема не выбрана',
                widthBudget: 220,
                minCellSize: 12,
                maxCellSize: 34
            });
        }
        const modules = getSelectedModuleList();
        if (!modules.length) return '<div style="font-size:12px;color:#69727d;">Схема не выбрана</div>';
        const keys = new Set(modules.map(m => moduleKey(m.x, m.y)));
        const xs = modules.map(m => m.x);
        const ys = modules.map(m => m.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const cols = maxX - minX + 1;
        const rows = maxY - minY + 1;
        const cellSize = Math.max(12, Math.min(34, Math.floor(220 / Math.max(cols, rows, 1))));
        let html = `<div class="client-scheme-grid" style="--client-grid-cols:${cols}; --client-cell-size:${cellSize}px;">`;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                html += `<div class="client-scheme-cell ${keys.has(moduleKey(x, y)) ? 'active' : ''}"></div>`;
            }
        }
        html += '</div>';
        return html;
    }



    function updateClientPdfContent() {
        const PdfGenerator = getPdfGenerator();
        if (PdfGenerator && PdfGenerator.renderStageClientPdf) {
            return PdfGenerator.renderStageClientPdf({
                lastResult,
                elements: { titleEl: pdfTitleEl, footerEl: pdfFooterEl, dataDiv: pdfDataDiv },
                getClientName: () => clientSelect.value || 'Клиент не выбран',
                getProjectName: () => projectNameInput.value,
                createClientSchemeGrid,
                escapeHtml,
                money,
                metric
            });
        }
        if (pdfTitleEl) pdfTitleEl.textContent = 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ';
        if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — коммерческое предложение для клиента';
        if (!lastResult) {
            pdfDataDiv.innerHTML = '<p>Нет расчёта. Выберите модули на сетке.</p>';
            return;
        }
        const clientName = clientSelect.value || 'Клиент не выбран';
        const project = projectNameInput.value.trim() || 'Без названия';
        const now = new Date();
        const dateText = now.toLocaleDateString('ru-RU');
        const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
        const { sheets, widthMeters, depthMeters, areaMeters, stageHeightM, modulesCost, installCost, transportCost = 0, transportLabel = 'По городу · фиксированная стоимость', total } = lastResult;

        pdfDataDiv.innerHTML = `
            <div class="client-pdf">
                <div class="client-hero">
                    <div>
                        <div class="brand-title"><span>FEG</span> Stage PRO</div>
                        <div class="brand-subtitle">Аренда и монтаж сценической конструкции под мероприятие. Смета подготовлена по выбранной конфигурации сцены.</div>
                    </div>
                    <div class="client-meta">
                        <div><strong>Проект:</strong> ${escapeHtml(project)}</div>
                        <div><strong>Клиент:</strong> ${escapeHtml(clientName)}</div>
                        <div><strong>Дата:</strong> ${dateText}</div>
                        <div><strong>Действительно до:</strong> ${validUntil}</div>
                    </div>
                </div>

                <div class="client-main-grid">
                    <div class="client-card">
                        <div class="client-section-title">Схема сцены</div>
                        <div class="client-scheme-wrap">${createClientSchemeGrid()}</div>
                        <div class="client-note">Схема показывает форму настила. Нижняя часть схемы соответствует переднему краю сцены.</div>
                    </div>

                    <div>
                        <div class="client-card" style="margin-bottom:14px;">
                            <div class="client-section-title">Основные параметры</div>
                            <div class="client-params">
                                <div class="client-param"><span>Габариты</span><strong>${metric(widthMeters)} × ${metric(depthMeters)} м</strong></div>
                                <div class="client-param"><span>Высота сцены</span><strong>${metric(stageHeightM * 100)} см</strong></div>
                                <div class="client-param"><span>Площадь настила</span><strong>${metric(areaMeters)} м²</strong></div>
                                <div class="client-param"><span>Модулей / листов</span><strong>${sheets} шт</strong></div>
                            </div>
                        </div>

                        <div class="client-card">
                            <div class="client-section-title">Стоимость</div>
                            <table class="client-price-table">
                                <thead>
                                    <tr><th>Позиция</th><th>Стоимость</th></tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Прокат сценической конструкции</td>
                                        <td>${money(modulesCost)} ₽</td>
                                    </tr>
                                    <tr>
                                        <td>Монтаж / демонтаж</td>
                                        <td>${money(installCost)} ₽</td>
                                    </tr>
                                    <tr>
                                        <td>Транспорт <span style="font-size:10px;color:#69727d;">(${escapeHtml(transportLabel)})</span></td>
                                        <td>${money(transportCost)} ₽</td>
                                    </tr>
                                    <tr class="client-total-row">
                                        <td>Итого к оплате</td>
                                        <td>${money(total)} ₽</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="client-note">Итоговая стоимость указана для выбранной конфигурации с учётом выбранного параметра транспорта. Дополнительные работы, ограждения, лестницы и прочие опции добавляются отдельно при необходимости.</div>
                        </div>
                    </div>
                </div>

                <div class="client-footer-line">
                    <div>FEG Stage PRO</div>
                    <div>Коммерческое предложение без технической комплектации</div>
                </div>
            </div>
        `;
    }

    function updatePdfContent() {
        const PdfGenerator = getPdfGenerator();
        if (PdfGenerator && PdfGenerator.renderStageTechPdf) {
            return PdfGenerator.renderStageTechPdf({
                lastResult,
                elements: {
                    titleEl: pdfTitleEl,
                    footerEl: pdfFooterEl,
                    dataDiv: pdfDataDiv
                },
                getClientName: () => clientSelect.value || 'Клиент не выбран',
                getProjectName: () => projectNameInput.value.trim() || 'Без названия',
                moduleSize: MODULE_SIZE_LABEL,
                createPdfMiniGrid,
                escapeHtml,
                money,
                metric,
                kg
            });
        }
        if (pdfTitleEl) pdfTitleEl.textContent = 'ТЕХНИЧЕСКИЙ ЛИСТ СБОРКИ СЦЕНЫ';
        if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — технический лист для склада и площадки';
        if (pdfDataDiv) pdfDataDiv.innerHTML = '<p>Нет расчёта. Выберите модули на сетке.</p>';
    }

    function updateSaveOrderMode() {
        if (saveOrderBtn) {
            saveOrderBtn.textContent = editingOrderId ? '↻ Сохранить изменения' : '▱ Сохранить заказ';
        }
        if (editModePill) {
            editModePill.classList.toggle('active', !!editingOrderId);
        }
    }

    function buildOrderSnapshot(id) {
        const project = projectNameInput.value.trim();
        return {
            id: id || Date.now(),
            appVersion: APP_VERSION,
            client: clientSelect.value,
            name: project || 'Без названия',
            status: projectStatusSelect ? projectStatusSelect.value : 'draft',
            w: lastResult.w,
            d: lastResult.d,
            modules: lastResult.modules,
            sheets: lastResult.sheets,
            columns: lastResult.columns,
            frames: lastResult.frames,
            columnType: lastResult.columnType,
            columnTypeLabel: lastResult.columnTypeLabel,
            frameType: lastResult.frameType,
            frameTypeLabel: lastResult.frameTypeLabel,
            studs: lastResult.studs,
            feet: lastResult.feet,
            weight: lastResult.weight,
            totalWeight: lastResult.totalWeight,
            weights: lastResult.weights,
            stageHeightM: lastResult.stageHeightM,
            components: lastResult.components,
            modulesCost: lastResult.modulesCost,
            installCost: lastResult.installCost,
            transportCost: lastResult.transportCost,
            transportLabel: lastResult.transportLabel,
            transportSettings: lastResult.transportSettings,
            total: lastResult.total,
            priceModule: lastResult.priceModule,
            shape: lastResult.shape,
            widthMeters: lastResult.widthMeters,
            depthMeters: lastResult.depthMeters,
            areaMeters: lastResult.areaMeters,
            gridCols: lastResult.gridCols,
            gridRows: lastResult.gridRows,
            date: new Date().toISOString()
        };
    }

    let autosaveTimer = null;

    function loadStageDraft() {
        try {
            const raw = localStorage.getItem(STAGE_DRAFT_KEY);
            const draft = raw ? JSON.parse(raw) : null;
            return draft && draft.shape && Array.isArray(draft.shape) ? draft : null;
        } catch (err) {
            return null;
        }
    }

    function updateAutosaveStatus(text) {
        if (autosaveStatusEl) autosaveStatusEl.textContent = text || 'Автосохранение готово.';
        if (restoreDraftBtn) restoreDraftBtn.style.display = loadStageDraft() ? '' : 'none';
    }

    function saveStageDraft() {
        if (!lastResult || !Array.isArray(lastResult.shape) || !lastResult.shape.length) {
            updateAutosaveStatus('Автосохранение ждёт схему.');
            return false;
        }
        try {
            const draft = {
                ...buildOrderSnapshot(editingOrderId || `draft-${Date.now()}`),
                draftSavedAt: new Date().toISOString(),
                editingOrderId: editingOrderId || null
            };
            localStorage.setItem(STAGE_DRAFT_KEY, JSON.stringify(draft));
            updateAutosaveStatus(`Черновик сохранён: ${new Date(draft.draftSavedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`);
            return true;
        } catch (err) {
            updateAutosaveStatus('Автосохранение не удалось.');
            return false;
        }
    }

    function scheduleStageAutosave() {
        if (autosaveTimer) clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(saveStageDraft, 700);
    }

    function restoreStageDraft() {
        const draft = loadStageDraft();
        if (!draft) {
            showToast('Черновик не найден');
            updateAutosaveStatus();
            return;
        }
        if (!confirm('Восстановить автосохранённый черновик и заменить текущую сцену?')) return;
        applyOrderToEditor(draft);
        editingOrderId = draft.editingOrderId || null;
        updateSaveOrderMode();
        showToast('Черновик восстановлен');
    }

    function bindStageEnhancementControls() {
        [projectNameInput, clientSelect, projectStatusSelect].forEach(el => {
            if (!el || typeof el.addEventListener !== 'function') return;
            el.addEventListener('input', scheduleStageAutosave);
            el.addEventListener('change', scheduleStageAutosave);
        });
        if (ordersSearchInput) ordersSearchInput.addEventListener('input', renderOrders);
        if (ordersStatusFilter) ordersStatusFilter.addEventListener('change', renderOrders);
        updateAutosaveStatus();
    }

    function saveOrder() {
        if (!lastResult) {
            alert('Сначала выберите модули на сетке.');
            return;
        }
        const client = clientSelect.value;
        if (!client) {
            alert('Выберите или добавьте клиентa перед сохранением.');
            return;
        }
        const project = projectNameInput.value.trim();
        if (!project && !confirm('Название проекта не заполнено. Сохранить заказ без названия?')) return;
        ensureClientExists(client);

        const orders = getLocalOrders();
        if (editingOrderId) {
            const idx = orders.findIndex(o => String(o.id || o._id) === String(editingOrderId));
            if (idx >= 0) {
                const updated = buildOrderSnapshot(orders[idx].id || editingOrderId);
                if (ProjectStorageModule && typeof ProjectStorageModule.saveStageOrderSnapshot === 'function') {
                    ProjectStorageModule.saveStageOrderSnapshot(updated, { matchId: editingOrderId, maxItems: 100 });
                } else {
                    updated.createdAt = orders[idx].createdAt || orders[idx].date;
                    updated.updatedAt = new Date().toISOString();
                    updated.cloudId = orders[idx].cloudId || null;
                    updated.cloudUpdatedAt = orders[idx].cloudUpdatedAt || null;
                    orders[idx] = updated;
                    setLocalOrders(orders);
                }
                renderOrders();
                renderClients();
                showToast('Изменения сохранены в заказ!');
                updateSaveOrderMode();
                return;
            }
            editingOrderId = null;
        }

        const newOrder = buildOrderSnapshot(Date.now());
        if (ProjectStorageModule && typeof ProjectStorageModule.saveStageOrderSnapshot === 'function') {
            ProjectStorageModule.saveStageOrderSnapshot(newOrder, { maxItems: 100 });
        } else {
            newOrder.createdAt = newOrder.date;
            let nextOrders = orders;
            nextOrders.unshift(newOrder);
            if (nextOrders.length > 100) nextOrders = nextOrders.slice(0, 100);
            setLocalOrders(nextOrders);
        }
        renderOrders();
        renderClients();
        showToast('Заказ сохранён!');
        updateSaveOrderMode();
    }

    function showToast(text) {
        if (ToastManagerModule && typeof ToastManagerModule.showToast === 'function') {
            return ToastManagerModule.showToast(text);
        }
        const toastMsg = document.createElement('div');
        toastMsg.textContent = text;
        toastMsg.style.position = 'fixed';
        toastMsg.style.bottom = '20px';
        toastMsg.style.left = '50%';
        toastMsg.style.transform = 'translateX(-50%)';
        toastMsg.style.backgroundColor = '#c4a06f';
        toastMsg.style.color = '#111820';
        toastMsg.style.padding = '10px 20px';
        toastMsg.style.borderRadius = '60px';
        toastMsg.style.fontWeight = 'bold';
        toastMsg.style.zIndex = '999';
        document.body.appendChild(toastMsg);
        setTimeout(() => toastMsg.remove(), 2000);
        return toastMsg;
    }

    function formatOrderId(order, fallbackIndex = 0) {
        const raw = String((order && (order.id || order._id || order.orderId)) || fallbackIndex + 1);
        const suffix = raw.length > 6 ? raw.slice(-6) : raw.padStart(6, '0');
        return `FEG-${suffix}`;
    }

    function findSavedOrderById(idRaw) {
        if (ProjectStorageModule && typeof ProjectStorageModule.findStageOrderById === 'function') return ProjectStorageModule.findStageOrderById(idRaw);
        const ordersArr = getLocalOrders();
        if (ProjectStorageModule && typeof ProjectStorageModule.findProjectById === 'function') return ProjectStorageModule.findProjectById(ordersArr, idRaw);
        let order = ordersArr.find(o => String(o.id || o._id) === String(idRaw));
        if (!order) {
            const idx = parseInt(idRaw, 10);
            if (!isNaN(idx)) order = ordersArr[idx];
        }
        return order || null;
    }

    function projectExportPayload(order) {
        if (ProjectStorageModule && typeof ProjectStorageModule.buildStageProjectExportPayload === 'function') {
            return ProjectStorageModule.buildStageProjectExportPayload(order);
        }
        return {
            type: 'feg-stage-pro-project',
            app: 'FEG Stage PRO',
            version: '2.2',
            exportedAt: new Date().toISOString(),
            project: order
        };
    }

    function downloadJson(filename, data) {
        if (ProjectStorageModule && typeof ProjectStorageModule.downloadJson === 'function') {
            ProjectStorageModule.downloadJson(filename, data);
            return;
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function exportOrderJson(order) {
        if (!order) return;
        const safeProject = String(order.name || 'project').replace(/[\/:*?"<>|]/g, '_');
        const idLabel = formatOrderId(order).replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadJson(`${idLabel}_${safeProject}.json`, projectExportPayload(order));
        showToast('Проект экспортирован в JSON');
    }

    function exportCurrentProjectJson() {
        if (!lastResult) {
            alert('Сначала выберите модули на сетке.');
            return;
        }
        const order = buildOrderSnapshot(editingOrderId || Date.now());
        order.createdAt = order.createdAt || new Date().toISOString();
        order.updatedAt = new Date().toISOString();
        exportOrderJson(order);
    }

    function triggerProjectImport() {
        const input = document.getElementById('projectImportInput');
        if (!input) return;
        input.value = '';
        input.click();
    }

    function normalizeImportedProjectData(data) {
        if (ProjectStorageModule && typeof ProjectStorageModule.normalizeImportedStageProject === 'function') {
            return ProjectStorageModule.normalizeImportedStageProject(data);
        }
        const project = data && data.project ? data.project : data;
        if (!project || typeof project !== 'object') {
            throw new Error('Файл не похож на проект FEG Stage PRO');
        }
        if (!Array.isArray(project.shape)) {
            throw new Error('В файле проекта нет схемы сцены');
        }
        return {
            ...project,
            id: project.id || Date.now(),
            date: project.date || new Date().toISOString()
        };
    }

    async function importProjectJsonFromInput(event) {
        const file = event && event.target && event.target.files ? event.target.files[0] : null;
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const project = normalizeImportedProjectData(data);
            applyOrderToEditor(project);
            editingOrderId = null;
            updateSaveOrderMode();
            showToast('Проект импортирован. Проверьте данные и сохраните заказ.');
        } catch (err) {
            console.error(err);
            alert('Не удалось импортировать проект: ' + (err && err.message ? err.message : err));
        } finally {
            if (event && event.target) event.target.value = '';
        }
    }

    function exportAllDataBackup() {
        const backup = {
            type: 'feg-stage-pro-backup',
            version: BACKUP_EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            app: {
                theme: appTheme,
                cloudSettings: {
                    ...normalizeCloudSettings(cloudSettings),
                    anonKey: ''
                },
                pricingSettings,
                transportSettings,
                itemWeights,
                stageHeightM
            },
            stageOrders: getLocalOrders(),
            stageHistory: ProjectStorageModule && typeof ProjectStorageModule.getStageProjectHistory === 'function'
                ? ProjectStorageModule.getStageProjectHistory()
                : [],
            trussProjects: getTrussProjects(),
            clients: getClients()
        };
        const stamp = new Date().toISOString().slice(0, 10);
        downloadJson(`feg_stage_backup_${stamp}.json`, backup);
        showToast('Резервная копия подготовлена');
    }

    function exportStageProjectHistory() {
        const history = ProjectStorageModule && typeof ProjectStorageModule.getStageProjectHistory === 'function'
            ? ProjectStorageModule.getStageProjectHistory()
            : [];
        const payload = {
            type: 'feg-stage-pro-stage-history',
            version: APP_VERSION,
            exportedAt: new Date().toISOString(),
            items: history
        };
        const stamp = new Date().toISOString().slice(0, 10);
        downloadJson(`feg_stage_history_${stamp}.json`, payload);
        showToast(history.length ? 'Журнал изменений экспортирован' : 'Журнал пока пуст');
    }

    function triggerBackupImport() {
        if (!backupImportInput) return;
        backupImportInput.value = '';
        backupImportInput.click();
    }

    function limitBackupArray(value, maxItems) {
        if (!Array.isArray(value)) return [];
        return value.slice(0, Math.max(0, Number(maxItems || 0)));
    }

    function normalizeBackupProjectList(value, type, maxItems) {
        const list = limitBackupArray(value, maxItems);
        const normalizer = type === 'truss'
            ? ProjectStorageModule && ProjectStorageModule.normalizeImportedTrussProject
            : ProjectStorageModule && ProjectStorageModule.normalizeImportedStageProject;
        if (typeof normalizer !== 'function') return list;
        return list.map(item => {
            try {
                return normalizer(item);
            } catch (err) {
                return null;
            }
        }).filter(Boolean);
    }

    function normalizeBackupClients(value) {
        const list = limitBackupArray(value, BACKUP_LIMITS.clients);
        if (ClientsStorageModule && typeof ClientsStorageModule.normalizeClientList === 'function') {
            return ClientsStorageModule.normalizeClientList(list);
        }
        return list;
    }

    async function importAllDataBackupFromInput(event) {
        const file = event && event.target && event.target.files ? event.target.files[0] : null;
        if (!file) return;
        try {
            if (file.size > MAX_BACKUP_FILE_BYTES) {
                throw new Error('Файл резервной копии слишком большой.');
            }
            const data = JSON.parse(await file.text());
            if (!data || data.type !== 'feg-stage-pro-backup') {
                throw new Error('Файл не похож на резервную копию FEG Stage PRO');
            }
            if (!confirm('Восстановить резервную копию? Текущие локальные проекты, фермы и клиенты будут заменены.')) return;
            if (Array.isArray(data.stageOrders)) {
                setLocalOrders(normalizeBackupProjectList(data.stageOrders, 'stage', BACKUP_LIMITS.stageOrders));
            }
            if (Array.isArray(data.stageHistory)) {
                localStorage.setItem('fegStageProjectHistory', JSON.stringify(limitBackupArray(data.stageHistory, BACKUP_LIMITS.stageHistory)));
            }
            if (Array.isArray(data.trussProjects)) {
                setTrussProjects(normalizeBackupProjectList(data.trussProjects, 'truss', BACKUP_LIMITS.trussProjects));
            }
            if (Array.isArray(data.clients)) setClients(normalizeBackupClients(data.clients));
            if (data.app && typeof data.app === 'object') {
                if (data.app.pricingSettings) {
                    pricingSettings = normalizePricingSettings(data.app.pricingSettings);
                    localStorage.setItem('pricingSettings', JSON.stringify(pricingSettings));
                }
                if (data.app.transportSettings) {
                    transportSettings = normalizeTransportSettings(data.app.transportSettings);
                    localStorage.setItem('transportSettings', JSON.stringify(transportSettings));
                }
                if (data.app.itemWeights) {
                    itemWeights = { ...DEFAULT_WEIGHTS, ...data.app.itemWeights };
                    localStorage.setItem('itemWeights', JSON.stringify(itemWeights));
                }
                if (data.app.stageHeightM !== undefined) {
                    stageHeightM = Number(data.app.stageHeightM) || DEFAULT_STAGE_HEIGHT_M;
                    localStorage.setItem('stageHeightM', String(stageHeightM));
                }
            }
            syncPricingInputs();
            syncTransportInputs();
            syncWeightInputs();
            renderOrders();
            renderTrussProjects();
            renderClients();
            calc(false);
            showToast('Резервная копия восстановлена');
        } catch (err) {
            console.error(err);
            alert('Не удалось восстановить копию: ' + (err && err.message ? err.message : err));
        } finally {
            if (event && event.target) event.target.value = '';
        }
    }

    function getLocalOrders() {
        if (ProjectStorageModule && typeof ProjectStorageModule.getStageOrders === 'function') {
            return ProjectStorageModule.getStageOrders();
        }
        if (SupabaseStorageModule && typeof SupabaseStorageModule.getLocalProjects === 'function') {
            return SupabaseStorageModule.getLocalProjects('orders');
        }
        try {
            return JSON.parse(localStorage.getItem('orders') || '[]');
        } catch (err) {
            return [];
        }
    }

    function setLocalOrders(orders) {
        if (ProjectStorageModule && typeof ProjectStorageModule.setStageOrders === 'function') {
            ProjectStorageModule.setStageOrders(orders);
            return;
        }
        if (SupabaseStorageModule && typeof SupabaseStorageModule.setLocalProjects === 'function') {
            SupabaseStorageModule.setLocalProjects('orders', orders);
            return;
        }
        localStorage.setItem('orders', JSON.stringify(orders || []));
    }

    function findLocalOrderIndex(orders, order) {
        if (ProjectStorageModule && typeof ProjectStorageModule.findProjectIndex === 'function') {
            return ProjectStorageModule.findProjectIndex(orders, order);
        }
        if (SupabaseStorageModule && typeof SupabaseStorageModule.findLocalProjectIndex === 'function') {
            return SupabaseStorageModule.findLocalProjectIndex(orders, order);
        }
        if (!order) return -1;
        if (order.cloudId) {
            const byCloud = orders.findIndex(o => String(o.cloudId || '') === String(order.cloudId));
            if (byCloud >= 0) return byCloud;
        }
        return orders.findIndex(o => String(o.id || o._id) === String(order.id || order._id));
    }

    function prepareCloudProjectRow(order) {
        if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.prepareStageCloudRow === 'function') {
            return ProjectManagerModule.prepareStageCloudRow(order, cloudSettings, {
                appVersion: APP_VERSION,
                orderIdFormatter: formatOrderId,
                defaultName: 'Без названия'
            });
        }
        if (SupabaseStorageModule && typeof SupabaseStorageModule.prepareCloudProjectRow === 'function') {
            return SupabaseStorageModule.prepareCloudProjectRow(order, cloudSettings, {
                appVersion: APP_VERSION,
                orderId: formatOrderId(order),
                defaultName: 'Без названия'
            });
        }
        const cfg = normalizeCloudSettings(cloudSettings);
        const payload = {
            ...order,
            appVersion: APP_VERSION,
            syncedAt: new Date().toISOString()
        };
        return {
            workspace_key: cfg.workspaceKey,
            local_id: String(order.id || order._id || Date.now()),
            order_id: formatOrderId(order),
            client: order.client || '',
            name: order.name || 'Без названия',
            total: Number(order.total || 0),
            updated_at: new Date().toISOString(),
            project_data: payload
        };
    }

    async function saveOrderToCloud(order, silent = false) {
        saveCloudSettings();
        let updatedOrder;
        if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.saveStageOrderToCloud === 'function') {
            updatedOrder = await ProjectManagerModule.saveStageOrderToCloud(order, cloudSettings, {
                tableName: CLOUD_TABLE_NAME,
                appVersion: APP_VERSION,
                orderIdFormatter: formatOrderId,
                defaultName: 'Без названия'
            });
        } else if (SupabaseStorageModule && typeof SupabaseStorageModule.saveProjectToCloud === 'function') {
            updatedOrder = await SupabaseStorageModule.saveProjectToCloud(order, cloudSettings, {
                tableName: CLOUD_TABLE_NAME,
                appVersion: APP_VERSION,
                orderId: formatOrderId(order),
                defaultName: 'Без названия'
            });
        } else {
            const db = getSupabaseClient();
            const row = prepareCloudProjectRow(order);

            let result;
            if (order.cloudId) {
                result = await db
                    .from(CLOUD_TABLE_NAME)
                    .update(row)
                    .eq('id', order.cloudId)
                    .select()
                    .single();
            } else {
                const existing = await db
                    .from(CLOUD_TABLE_NAME)
                    .select('id')
                    .eq('workspace_key', row.workspace_key)
                    .eq('local_id', row.local_id)
                    .maybeSingle();

                if (existing.error) throw existing.error;

                if (existing.data && existing.data.id) {
                    result = await db
                        .from(CLOUD_TABLE_NAME)
                        .update(row)
                        .eq('id', existing.data.id)
                        .select()
                        .single();
                } else {
                    result = await db
                        .from(CLOUD_TABLE_NAME)
                        .insert(row)
                        .select()
                        .single();
                }
            }

            if (result.error) throw result.error;

            const saved = result.data;
            updatedOrder = {
                ...order,
                cloudId: saved.id,
                cloudUpdatedAt: saved.updated_at,
                updatedAt: row.updated_at
            };
        }

        if (!silent) showToast('Проект сохранён в облако');
        return updatedOrder;
    }

    async function saveCurrentProjectToCloud() {
        try {
            validateCurrentProjectForSave();

            let orders = getLocalOrders();
            let order;
            let idx = -1;

            if (editingOrderId) {
                idx = orders.findIndex(o => String(o.id || o._id) === String(editingOrderId));
                if (idx >= 0) {
                    order = buildOrderSnapshot(orders[idx].id || editingOrderId);
                    order.createdAt = orders[idx].createdAt || orders[idx].date;
                    order.cloudId = orders[idx].cloudId || null;
                    order.cloudUpdatedAt = orders[idx].cloudUpdatedAt || null;
                }
            }

            if (!order) {
                order = buildOrderSnapshot(Date.now());
                order.createdAt = order.date;
                orders.unshift(order);
                idx = 0;
                editingOrderId = String(order.id);
            }

            order.updatedAt = new Date().toISOString();
            const savedOrder = await saveOrderToCloud(order, true);

            if (ProjectStorageModule && typeof ProjectStorageModule.replaceStageOrderSnapshot === 'function') {
                ProjectStorageModule.replaceStageOrderSnapshot(order, savedOrder, { insertIfMissing: true, maxItems: 100 });
            } else {
                if (idx >= 0) {
                    orders[idx] = savedOrder;
                } else {
                    orders.unshift(savedOrder);
                }
                setLocalOrders(orders.slice(0, 100));
            }
            renderOrders();
            updateSaveOrderMode();
            showToast('Проект сохранён в облако');
        } catch (err) {
            console.error(err);
            const msg = err && err.message ? err.message : String(err);
            if (msg !== 'Сохранение отменено.') alert('Не удалось сохранить в облако: ' + msg);
        }
    }

    async function uploadSavedOrderToCloud(order) {
        if (!order) return;
        try {
            saveCloudSettings();
            if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.uploadStageOrderToCloud === 'function') {
                await ProjectManagerModule.uploadStageOrderToCloud(order, cloudSettings, {
                    tableName: CLOUD_TABLE_NAME,
                    appVersion: APP_VERSION,
                    orderIdFormatter: formatOrderId,
                    defaultName: 'Без названия',
                    maxItems: 100
                });
            } else {
                const savedOrder = await saveOrderToCloud(order, true);
                if (ProjectStorageModule && typeof ProjectStorageModule.replaceStageOrderSnapshot === 'function') {
                    ProjectStorageModule.replaceStageOrderSnapshot(order, savedOrder, { maxItems: 100 });
                } else {
                    const orders = getLocalOrders();
                    const idx = findLocalOrderIndex(orders, order);
                    if (idx >= 0) orders[idx] = savedOrder;
                    setLocalOrders(orders);
                }
            }
            renderOrders();
            showToast('Сохранённый проект отправлен в облако');
        } catch (err) {
            console.error(err);
            alert('Не удалось отправить проект в облако: ' + (err && err.message ? err.message : err));
        }
    }

    function normalizeCloudProjectRow(row) {
        if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.normalizeStageCloudRow === 'function') {
            return ProjectManagerModule.normalizeStageCloudRow(row, { defaultName: 'Без названия' });
        }
        if (SupabaseStorageModule && typeof SupabaseStorageModule.normalizeCloudProjectRow === 'function') {
            return SupabaseStorageModule.normalizeCloudProjectRow(row, { defaultName: 'Без названия' });
        }
        const project = row && row.project_data && typeof row.project_data === 'object' ? row.project_data : {};
        return {
            ...project,
            id: project.id || row.local_id || Date.now(),
            cloudId: row.id,
            cloudUpdatedAt: row.updated_at,
            client: project.client || row.client || '',
            name: project.name || row.name || 'Без названия',
            total: project.total !== undefined ? project.total : Number(row.total || 0),
            updatedAt: project.updatedAt || row.updated_at,
            date: project.date || row.created_at || row.updated_at
        };
    }

    async function loadProjectsFromCloud() {
        try {
            saveCloudSettings();
            if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.loadStageOrdersFromCloud === 'function') {
                const result = await ProjectManagerModule.loadStageOrdersFromCloud(cloudSettings, {
                    tableName: CLOUD_TABLE_NAME,
                    limit: 300,
                    maxItems: 300,
                    defaultName: 'Без названия'
                });
                renderOrders();
                showToast(`Из облака загружено: ${(result.incoming || []).length}`);
                return;
            }
            let incoming;
            if (SupabaseStorageModule && typeof SupabaseStorageModule.fetchProjectsFromCloud === 'function') {
                incoming = await SupabaseStorageModule.fetchProjectsFromCloud(cloudSettings, {
                    tableName: CLOUD_TABLE_NAME,
                    limit: 300,
                    defaultName: 'Без названия'
                });
            } else {
                const db = getSupabaseClient();
                const cfg = normalizeCloudSettings(cloudSettings);

                const { data, error } = await db
                    .from(CLOUD_TABLE_NAME)
                    .select('*')
                    .eq('workspace_key', cfg.workspaceKey)
                    .order('updated_at', { ascending: false })
                    .limit(300);

                if (error) throw error;
                incoming = (data || []).map(normalizeCloudProjectRow);
            }

            let orders = getLocalOrders();
            orders = SupabaseStorageModule && typeof SupabaseStorageModule.mergeCloudProjects === 'function'
                ? SupabaseStorageModule.mergeCloudProjects(orders, incoming, { preserveNewerLocal: true })
                : orders;

            if (!SupabaseStorageModule || typeof SupabaseStorageModule.mergeCloudProjects !== 'function') {
                incoming.forEach(project => {
                    const idx = findLocalOrderIndex(orders, project);
                    if (idx >= 0) {
                        const localUpdated = new Date(orders[idx].updatedAt || orders[idx].date || 0).getTime();
                        const cloudUpdated = new Date(project.updatedAt || project.cloudUpdatedAt || 0).getTime();
                        if (cloudUpdated >= localUpdated) orders[idx] = project;
                        else orders[idx] = { ...orders[idx], cloudId: project.cloudId, cloudUpdatedAt: project.cloudUpdatedAt };
                    } else {
                        orders.push(project);
                    }
                });
                orders.sort((a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0));
            }

            setLocalOrders(orders.slice(0, 300));
            renderOrders();
            showToast(`Из облака загружено: ${incoming.length}`);
        } catch (err) {
            console.error(err);
            alert('Не удалось загрузить проекты из облака: ' + (err && err.message ? err.message : err));
        }
    }

    function renderOrders() {
        const allOrders = getLocalOrders();
        if (!ordersDiv) return;
        const search = ordersSearchInput ? String(ordersSearchInput.value || '').trim().toLowerCase() : '';
        const statusFilter = ordersStatusFilter ? String(ordersStatusFilter.value || '') : '';
        const visibleOrders = allOrders.map((order, originalIndex) => ({ order, originalIndex })).filter(({ order, originalIndex }) => {
            const status = order.status || 'draft';
            if (statusFilter && status !== statusFilter) return false;
            if (!search) return true;
            const haystack = [
                formatOrderId(order, originalIndex),
                order.id,
                order._id,
                order.client,
                order.name,
                projectStatusLabel(status)
            ].join(' ').toLowerCase();
            return haystack.includes(search);
        });
        if (allOrders.length === 0) {
            ordersDiv.innerHTML = '<div class="orders-empty-state">Нет сохранённых проектов. Создайте схему, заполните клиента и сохраните заказ.</div>';
            return;
        }
        if (visibleOrders.length === 0) {
            ordersDiv.innerHTML = '<div class="orders-empty-state">Ничего не найдено по текущему фильтру.</div>';
            return;
        }
        const rows = visibleOrders.map(({ order, originalIndex }) => {
            const orderId = escapeHtml(order.id || originalIndex);
            const fullId = String(order.id || order._id || originalIndex + 1);
            const displayId = escapeHtml(formatOrderId(order, originalIndex));
            const date = order.updatedAt || order.date || order.createdAt;
            const status = order.status || 'draft';
            return `
                <tr>
                    <td class="order-id-cell" title="${escapeHtml(fullId)}">${displayId}${order.cloudId ? '<span class="cloud-badge" title="Есть в облаке">☁</span>' : ''}</td>
                    <td title="${escapeHtml(order.client)}"><strong>${escapeHtml(order.client || '—')}</strong></td>
                    <td title="${escapeHtml(order.name)}">${escapeHtml(order.name || 'Без названия')}<br><span class="client-badge">${escapeHtml(projectStatusLabel(status))}</span></td>
                    <td>${date ? new Date(date).toLocaleDateString('ru-RU') : '—'}</td>
                    <td class="money-cell">${money(order.total)} ₽</td>
                    <td>
                        <div class="orders-table-actions">
                            <button class="edit-order-button" data-id="${orderId}" title="Открыть для правки">✎</button>
                            <button class="pdf-order-button" data-id="${orderId}" title="Открыть технический PDF">▣</button>
                            <button class="client-pdf-order-button" data-id="${orderId}" title="Открыть клиентскую смету PDF">КП</button>
                            <button class="json-order-button" data-id="${orderId}" title="Экспорт проекта JSON">⇩</button>
                            <button class="cloud-order-button" data-id="${orderId}" title="Сохранить проект в облако">☁</button>
                            <button class="delete-order" data-id="${orderId}" title="Удалить заказ">🗑</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        ordersDiv.innerHTML = `
            <div class="orders-table-wrap">
                <table class="orders-table">
                    <colgroup>
                        <col style="width:112px">
                        <col style="width:22%">
                        <col>
                        <col style="width:112px">
                        <col style="width:132px">
                        <col style="width:228px">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>ID заказа</th>
                            <th>Клиент</th>
                            <th>Проект</th>
                            <th>Дата</th>
                            <th>Стоимость</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        document.querySelectorAll('.edit-order-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const order = findSavedOrderById(btn.getAttribute('data-id'));
                if (!order) return;
                loadSavedOrderForEdit(order);
            });
        });

        document.querySelectorAll('.pdf-order-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const order = findSavedOrderById(btn.getAttribute('data-id'));
                if (!order) return;
                openSavedOrderPdf(order);
            });
        });

        document.querySelectorAll('.client-pdf-order-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const order = findSavedOrderById(btn.getAttribute('data-id'));
                if (!order) return;
                openSavedOrderClientPdf(order);
            });
        });

        document.querySelectorAll('.json-order-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const order = findSavedOrderById(btn.getAttribute('data-id'));
                if (!order) return;
                exportOrderJson(order);
            });
        });

        document.querySelectorAll('.cloud-order-button').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const order = findSavedOrderById(btn.getAttribute('data-id'));
                if (!order) return;
                await uploadSavedOrderToCloud(order);
            });
        });

        document.querySelectorAll('.delete-order').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!confirm('Удалить заказ?')) return;
                const idRaw = btn.getAttribute('data-id');
                if (ProjectStorageModule && typeof ProjectStorageModule.deleteStageOrderById === 'function') {
                    ProjectStorageModule.deleteStageOrderById(idRaw, { allowIndexFallback: true });
                } else {
                    let ordersArr = getLocalOrders();
                    const filtered = ordersArr.filter(o => (o.id || o._id) != idRaw);
                    if (filtered.length === ordersArr.length) {
                        const idxToDel = parseInt(idRaw);
                        if (!isNaN(idxToDel) && ordersArr[idxToDel]) ordersArr.splice(idxToDel, 1);
                    } else {
                        ordersArr = filtered;
                    }
                    setLocalOrders(ordersArr);
                }
                if (String(editingOrderId) === String(idRaw)) {
                    editingOrderId = null;
                    updateSaveOrderMode();
                }
                renderOrders();
            });
        });
    }

        function applyOrderToEditor(order) {
        if (!order) return;
        if (order.gridCols || order.gridRows) {
            setGridDimensions(order.gridCols || gridColsCount, order.gridRows || gridRowsCount, false);
        }
        if (Array.isArray(order.shape)) {
            selectedModules = new Set(order.shape);
            pruneModulesOutsideGrid();
            renderStageGrid();
        }
        if (order.client) {
            ensureClientExists(order.client);
            renderClients();
            clientSelect.value = order.client;
        }
        projectNameInput.value = order.name || '';
        if (projectStatusSelect) projectStatusSelect.value = order.status || 'draft';
        if (order.priceModule !== undefined || order.installCost !== undefined) {
            pricingSettings = normalizePricingSettings({
                priceModule: order.priceModule !== undefined ? order.priceModule : pricingSettings.priceModule,
                installCost: order.installCost !== undefined ? order.installCost : pricingSettings.installCost
            });
            localStorage.setItem('pricingSettings', JSON.stringify(pricingSettings));
            syncPricingInputs();
        }
        if (order.columnType && columnTypeSelect) columnTypeSelect.value = order.columnType;
        if (order.frameType && frameTypeSelect) frameTypeSelect.value = order.frameType;
        if (order.weights) {
            itemWeights = { ...DEFAULT_WEIGHTS, ...order.weights };
            localStorage.setItem('itemWeights', JSON.stringify(itemWeights));
        }
        if (order.stageHeightM !== undefined) {
            stageHeightM = Number(order.stageHeightM);
            if (isNaN(stageHeightM) || stageHeightM < 0) stageHeightM = DEFAULT_STAGE_HEIGHT_M;
            localStorage.setItem('stageHeightM', String(stageHeightM));
        }
        if (order.transportSettings) {
            transportSettings = normalizeTransportSettings(order.transportSettings);
        } else if (order.transportCost !== undefined) {
            transportSettings = normalizeTransportSettings({ type: 'city', cityPrice: Number(order.transportCost) || 0 });
        } else {
            transportSettings = { ...DEFAULT_TRANSPORT_SETTINGS };
        }
        localStorage.setItem('transportSettings', JSON.stringify(transportSettings));
        syncWeightInputs();
        calc(false);
    }

    function loadSavedOrderForEdit(order) {
        applyOrderToEditor(order);
        editingOrderId = String(order.id || order._id);
        updateSaveOrderMode();
        showToast('Заказ открыт для правки');
    }

    function openSavedOrderPdf(order) {
        applyOrderToEditor(order);
        openPdfPreview();
    }

    function openSavedOrderClientPdf(order) {
        applyOrderToEditor(order);
        openClientPdfPreview();
    }

    function getPdfGenerator() {
        return window.FEGModules && window.FEGModules.PdfGenerator;
    }

    function getPdfFlow() {
        const PdfGenerator = getPdfGenerator();
        if (!PdfGenerator || !PdfGenerator.createPdfFlow) return null;
        if (!pdfFlow) {
            pdfFlow = PdfGenerator.createPdfFlow({
                getState: buildPdfGeneratorState,
                setState: syncPdfGeneratorState,
                showToast,
                elements: {
                    modal: pdfModal,
                    previewFrame: pdfPreviewFrame,
                    modalTitle: pdfModalTitle
                },
                createContext: (kind) => ({
                    kind,
                    validate: validatePdfKind,
                    renderContent: renderPdfContentByKind,
                    pdfContainer: document.getElementById('pdfContent'),
                    html2canvas,
                    jspdf: window.jspdf,
                    getBaseName: getPdfBaseName,
                    onPrepared: ({ kind: preparedKind, name }) => {
                        preparedPdfKind = preparedKind;
                        preparedPdfName = name;
                    },
                    alert: (message) => alert(message),
                    logError: (err) => console.error(err)
                })
            });
        }
        return pdfFlow;
    }

    function buildPdfGeneratorState() {
        return {
            blob: preparedPdfBlob,
            url: preparedPdfUrl,
            name: preparedPdfName,
            kind: preparedPdfKind
        };
    }

    function syncPdfGeneratorState(nextState) {
        const state = nextState || {};
        preparedPdfBlob = state.blob || preparedPdfBlob;
        preparedPdfUrl = state.url || preparedPdfUrl;
        preparedPdfName = state.name || preparedPdfName;
        preparedPdfKind = state.kind || preparedPdfKind;
    }

    function validatePdfKind(kind) {
        const trussPdfKinds = ['trussTech', 'trussClient'];
        const isTrussPdf = trussPdfKinds.includes(kind);
        const isCombinedPdf = kind === 'combinedClient';

        if (isTrussPdf) {
            try { calculateTruss(); } catch (err) { console.error(err); }
            if (!trussHasScheme()) {
                alert('Нет схемы фермы. Нарисуйте конструкцию, выберите шаблон или включите 3D-табуретку перед созданием PDF.');
                return false;
            }
        } else if (isCombinedPdf) {
            try { if (selectedModules && selectedModules.size && !lastResult) calc(false); } catch (err) { console.error(err); }
            try { calculateTruss(); } catch (err) { console.error(err); }
            if (!lastResult && !trussHasScheme()) {
                alert('Нет активной сцены или ферменной конструкции для общего КП.');
                return false;
            }
        } else if (!lastResult) {
            alert('Нет активного расчёта сцены. Выберите модули на сетке перед созданием PDF.');
            return false;
        }
        return true;
    }

    function renderPdfContentByKind(kind) {
        if (kind === 'client') {
            updateClientPdfContent();
        } else if (kind === 'trussTech') {
            updateTrussTechPdfContent();
        } else if (kind === 'trussClient') {
            updateTrussClientPdfContent();
        } else if (kind === 'combinedClient') {
            updateCombinedClientPdfContent();
        } else {
            updatePdfContent();
        }
    }

    function getPdfBaseName(kind) {
        if (kind === 'trussTech' || kind === 'trussClient') return getTrussText('trussProjectName') || 'truss';
        if (kind === 'combinedClient') return `${projectNameInput.value.trim() || 'stage'}_${getTrussText('trussProjectName') || 'truss'}`;
        return projectNameInput.value.trim() || 'stage';
    }

    async function createPdfBlob(kind = 'tech') {
        const flow = getPdfFlow();
        if (flow && flow.create) return flow.create(kind);
        const PdfGenerator = getPdfGenerator();
        if (!PdfGenerator || !PdfGenerator.createPdfBlob) {
            alert('Модуль PDF не загружен. Обновите страницу и попробуйте снова.');
            return null;
        }
        return PdfGenerator.createPdfBlob({
            kind,
            validate: validatePdfKind,
            renderContent: renderPdfContentByKind,
            pdfContainer: document.getElementById('pdfContent'),
            html2canvas,
            jspdf: window.jspdf,
            getBaseName: getPdfBaseName,
            onPrepared: ({ kind: preparedKind, name }) => {
                preparedPdfKind = preparedKind;
                preparedPdfName = name;
            },
            alert: (message) => alert(message),
            logError: (err) => console.error(err)
        });
    }

    async function openPdfPreview() {
        await openPdfPreviewByKind('tech', 'Предпросмотр технического листа (1 стр., альбом)');
    }

    async function openClientPdfPreview() {
        await openPdfPreviewByKind('client', 'Предпросмотр клиентской сметы');
    }

    function collectPdfWarnings(kind) {
        const warnings = [];
        const wantsStage = ['tech', 'client', 'combinedClient'].includes(kind);
        const wantsClient = ['client', 'trussClient', 'combinedClient'].includes(kind);
        if (wantsStage && !lastResult) warnings.push('нет расчёта сцены');
        if (wantsClient && clientSelect && !clientSelect.value) warnings.push('не выбран клиент');
        if (wantsClient && projectNameInput && !projectNameInput.value.trim()) warnings.push('не заполнено название проекта');
        if (lastResult && Number(lastResult.total || 0) <= 0) warnings.push('итоговая стоимость равна 0');
        if (lastResult && Number(lastResult.components || 0) > 1) warnings.push('сцена состоит из нескольких отдельных конструкций');
        if ((kind === 'trussTech' || kind === 'trussClient' || kind === 'combinedClient') && typeof getActiveTrussSnapshot === 'function') {
            try {
                const snap = getActiveTrussSnapshot();
                if (!snap || !snap.result) warnings.push('нет актуального расчёта ферменной конструкции');
            } catch (err) {}
        }
        return warnings;
    }

    function confirmPdfWarnings(kind) {
        const warnings = collectPdfWarnings(kind);
        if (!warnings.length) return true;
        return confirm('Перед созданием PDF есть предупреждения:\n\n- ' + warnings.join('\n- ') + '\n\nПродолжить?');
    }

    function runCalculatorSelfCheck() {
        const calcModule = StageCalculatorModule || window.FEGModules && window.FEGModules.StageCalculator;
        if (!calcModule || typeof calcModule.calculateGeometry !== 'function') {
            alert('Модуль проверки расчётов не загружен.');
            return false;
        }
        const checks = [];
        const rect4x3 = [];
        for (let y = 0; y < 3; y += 1) {
            for (let x = 0; x < 4; x += 1) rect4x3.push({ x, y });
        }
        const geo = calcModule.calculateGeometry(rect4x3);
        checks.push(['4×3: настил', geo.sheets === 12, `${geo.sheets}`]);
        checks.push(['4×3: габарит', calcModule.getStageBounds(rect4x3).width === 4 && calcModule.getStageBounds(rect4x3).depth === 3, JSON.stringify(calcModule.getStageBounds(rect4x3))]);
        checks.push(['4×3: связность', calcModule.calculateConnectedComponents(rect4x3) === 1, `${calcModule.calculateConnectedComponents(rect4x3)}`]);
        checks.push(['Диагонали не склеиваются', calcModule.calculateConnectedComponents([{ x: 0, y: 0 }, { x: 1, y: 1 }]) === 2, `${calcModule.calculateConnectedComponents([{ x: 0, y: 0 }, { x: 1, y: 1 }])}`]);
        const failed = checks.filter(item => !item[1]);
        if (failed.length) {
            alert('Проверка расчётов нашла ошибки:\n\n' + failed.map(item => `${item[0]}: ${item[2]}`).join('\n'));
            return false;
        }
        showToast('Контрольные расчёты прошли');
        alert('Контрольные расчёты прошли успешно.');
        return true;
    }

    async function openPdfPreviewByKind(kind, title) {
        if (!confirmPdfWarnings(kind)) return;
        const flow = getPdfFlow();
        if (flow && flow.open) { await flow.open(kind, title); return; }
        const PdfGenerator = getPdfGenerator();
        if (!PdfGenerator || !PdfGenerator.openPreview) {
            const blob = await createPdfBlob(kind);
            if (!blob) return;
            preparedPdfBlob = blob;
            if (preparedPdfUrl) URL.revokeObjectURL(preparedPdfUrl);
            preparedPdfUrl = URL.createObjectURL(blob);
            if (pdfModalTitle) pdfModalTitle.textContent = title || 'Предпросмотр PDF';
            pdfPreviewFrame.src = preparedPdfUrl;
            pdfModal.classList.add('open');
            pdfModal.setAttribute('aria-hidden', 'false');
            return;
        }
        await PdfGenerator.openPreview({
            kind,
            title,
            createPdfBlob,
            state: buildPdfGeneratorState(),
            onState: syncPdfGeneratorState,
            elements: {
                modal: pdfModal,
                previewFrame: pdfPreviewFrame,
                modalTitle: pdfModalTitle
            }
        });
    }

    async function openTrussTechPdfPreview() {
        await openPdfPreviewByKind('trussTech', 'Предпросмотр технического листа ферм');
    }

    async function openTrussClientPdfPreview() {
        await openPdfPreviewByKind('trussClient', 'Предпросмотр КП по ферменной конструкции');
    }

    async function openCombinedClientPdfPreview() {
        await openPdfPreviewByKind('combinedClient', 'Предпросмотр общего КП: сцена + фермы');
    }

    function closePdfPreview() {
        const flow = getPdfFlow();
        if (flow && flow.close) { flow.close(); return; }
        const PdfGenerator = getPdfGenerator();
        if (PdfGenerator && PdfGenerator.closePreview) {
            PdfGenerator.closePreview({ modal: pdfModal });
            return;
        }
        pdfModal.classList.remove('open');
        pdfModal.setAttribute('aria-hidden', 'true');
    }

    function downloadPreparedPdf() {
        const flow = getPdfFlow();
        if (flow && flow.download) { flow.download(); return; }
        const PdfGenerator = getPdfGenerator();
        if (PdfGenerator && PdfGenerator.downloadPreparedPdf) {
            PdfGenerator.downloadPreparedPdf(buildPdfGeneratorState());
            return;
        }
        if (!preparedPdfBlob || !preparedPdfUrl) return;
        const link = document.createElement('a');
        link.href = preparedPdfUrl;
        link.download = preparedPdfName;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async function sharePreparedPdf() {
        const flow = getPdfFlow();
        if (flow && flow.share) { await flow.share(); return; }
        const PdfGenerator = getPdfGenerator();
        if (PdfGenerator && PdfGenerator.sharePreparedPdf) {
            await PdfGenerator.sharePreparedPdf({
                state: buildPdfGeneratorState(),
                showToast
            });
            return;
        }
        if (!preparedPdfBlob) return;
        const file = new File([preparedPdfBlob], preparedPdfName, { type: 'application/pdf' });
        const isCommercialPdf = ['client', 'trussClient', 'combinedClient'].includes(preparedPdfKind);
        const shareData = {
            title: isCommercialPdf ? 'FEG Stage PRO — коммерческое предложение' : 'FEG Stage PRO — технический лист',
            text: isCommercialPdf ? 'Коммерческое предложение FEG Stage PRO' : 'Технический лист сборки FEG Stage PRO',
            files: [file]
        };
        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share(shareData);
            } else if (navigator.share) {
                await navigator.share({ title: shareData.title, text: shareData.text });
                showToast('Файл можно скачать из предпросмотра и отправить вручную');
            } else {
                downloadPreparedPdf();
                showToast('PDF скачан. Его можно отправить через почту или мессенджер');
            }
        } catch (err) {
            if (err && err.name !== 'AbortError') {
                console.error(err);
                showToast('Не удалось открыть отправку. Скачайте PDF вручную');
            }
        }
    }

    function emailPreparedPdf() {
        const flow = getPdfFlow();
        if (flow && flow.email) { flow.email(); return; }
        const PdfGenerator = getPdfGenerator();
        if (PdfGenerator && PdfGenerator.emailPreparedPdf) {
            PdfGenerator.emailPreparedPdf({
                state: buildPdfGeneratorState(),
                showToast
            });
            return;
        }
        const isCommercialPdf = ['client', 'trussClient', 'combinedClient'].includes(preparedPdfKind);
        const subject = encodeURIComponent(isCommercialPdf ? 'Коммерческое предложение FEG Stage PRO' : 'Технический лист FEG Stage PRO');
        const body = encodeURIComponent(isCommercialPdf
            ? 'Здравствуйте!\n\nВо вложении коммерческое предложение. Если файл не прикрепился автоматически, я отправлю PDF отдельным сообщением.\n\n'
            : 'Здравствуйте!\n\nВо вложении технический лист. Если файл не прикрепился автоматически, я отправлю PDF отдельным сообщением.\n\n');
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        showToast('Почта открыта. PDF можно приложить из загрузок');
    }

    function bindCommonModals() {
        const modalItems = [
            { modal: pdfModal, close: closePdfPreview },
            { modal: weightsModal, close: closeWeightsModal },
            { modal: appSettingsModal, close: closeAppSettingsModal },
            { modal: transportModal, close: closeTransportModal }
        ].filter(item => item.modal);

        if (ModalManagerModule && typeof ModalManagerModule.bindModalGroup === 'function') {
            ModalManagerModule.bindModalGroup(modalItems, { window });
            return;
        }

        modalItems.forEach(item => {
            item.modal.addEventListener('click', (event) => {
                if (event.target === item.modal) item.close();
            });
        });
        window.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            modalItems.forEach(item => item.close());
        });
    }

    bindCommonModals();


    function getPwaManager() {
        return window.FEGModules && window.FEGModules.PwaManager;
    }

    function isIOS() {
        const manager = getPwaManager();
        if (manager && typeof manager.isIOS === 'function') return manager.isIOS();
        return /iphone|ipad|ipod/i.test(navigator.userAgent);
    }

    function showIosHint() {
        const manager = getPwaManager();
        if (manager && typeof manager.showIosInstallHint === 'function') {
            return manager.showIosInstallHint();
        }
        if (isIOS() && !window.navigator.standalone) {
            const hint = document.createElement('div');
            hint.innerHTML = '👉 Поделиться → На экран Домой';
            hint.style.position = 'fixed';
            hint.style.bottom = '20px';
            hint.style.left = '50%';
            hint.style.transform = 'translateX(-50%)';
            hint.style.background = '#000';
            hint.style.color = '#fff';
            hint.style.padding = '10px 16px';
            hint.style.borderRadius = '20px';
            hint.style.fontSize = '14px';
            hint.style.zIndex = '999';
            document.body.appendChild(hint);
            setTimeout(() => hint.remove(), 5000);
            return hint;
        }
        return null;
    }

    function initPwaBridge() {
        const manager = getPwaManager();
        if (manager && typeof manager.initPwa === 'function') {
            return manager.initPwa({ installButtonId: 'installBtn', serviceWorkerPath: 'sw.js' });
        }
        if ('serviceWorker' in navigator) {
            return navigator.serviceWorker.register('sw.js').catch(console.error);
        }
        return Promise.resolve(null);
    }

    initPwaBridge();
    bindCloudAuthControls();
    bindStageEnhancementControls();

    async function forceServerReload() {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(registration => {
                    if (registration.active) {
                        registration.active.postMessage({ type: 'CLEAR_ALL_CACHES' });
                    }
                    return registration.update().catch(() => null);
                }));
            }
            if (window.caches && typeof window.caches.keys === 'function') {
                const keys = await window.caches.keys();
                await Promise.all(keys.map(key => window.caches.delete(key)));
            }
        } catch (err) {
            console.error(err);
        } finally {
            window.location.reload();
        }
    }

    function getAppBootstrap() {
        return window.FEGModules && window.FEGModules.AppBootstrap;
    }

    function init() {
        const bootstrap = getAppBootstrap();
        if (bootstrap && typeof bootstrap.initStageWorkspace === 'function') {
            return bootstrap.initStageWorkspace({
                window,
                document,
                appTheme,
                applyAppTheme,
                renderClients,
                setGridDimensions,
                defaultGridCols: DEFAULT_GRID_COLS,
                defaultGridRows: DEFAULT_GRID_ROWS,
                renderOrders,
                widthInput,
                depthInput,
                defaultWidth: 4,
                defaultDepth: 3,
                syncWeightInputs,
                gridZoom,
                setGridZoom,
                gridColsInput,
                gridRowsInput,
                applyGridDimensionsFromInputs,
                stageGrid,
                fitGridToScreen,
                applyRectangle,
                columnTypeSelect,
                frameTypeSelect,
                calc,
                syncTransportInputs,
                updateSaveOrderMode,
                showIosHint
            });
        }

        applyAppTheme(appTheme);
        renderClients();
        setGridDimensions(DEFAULT_GRID_COLS, DEFAULT_GRID_ROWS, false);
        renderOrders();
        if (!widthInput.value) widthInput.value = 4;
        if (!depthInput.value) depthInput.value = 3;
        syncWeightInputs();
        if (gridZoom) {
            setGridZoom(gridZoom.value);
            gridZoom.addEventListener('input', () => setGridZoom(gridZoom.value));
        }
        if (gridColsInput) gridColsInput.addEventListener('change', applyGridDimensionsFromInputs);
        if (gridRowsInput) gridRowsInput.addEventListener('change', applyGridDimensionsFromInputs);
        window.addEventListener('resize', fitGridToScreen);
        if ('ResizeObserver' in window && stageGrid.parentElement) {
            new ResizeObserver(fitGridToScreen).observe(stageGrid.parentElement);
        }
        applyRectangle();
        if (columnTypeSelect) columnTypeSelect.addEventListener('change', () => calc(false));
        if (frameTypeSelect) frameTypeSelect.addEventListener('change', () => calc(false));
        widthInput.addEventListener('change', applyRectangle);
        depthInput.addEventListener('change', applyRectangle);
        syncTransportInputs();
        updateSaveOrderMode();
        showIosHint();
    }

    window.addEventListener('load', init);

    /* --- FEG Stage PRO 3.4: конструктор ферм --- */
    const TRUSS_DEFAULT_COLS = 16;
    const TRUSS_DEFAULT_ROWS = 12;
    const TRUSS_STORAGE_KEY = 'fegTrussProjects';
    let trussCols = TRUSS_DEFAULT_COLS;
    let trussRows = TRUSS_DEFAULT_ROWS;
    let trussCellMeters = 0.5;
    let trussZoomPercent = 100;
    let trussSegmentsH = new Set();
    let trussSegmentsV = new Set();
    let trussPointerDown = false;
    let trussLastApplied = '';
    let trussEditingId = null;
    let lastTrussResult = null;

    function trussKey(x, y) { return TrussStateModule && typeof TrussStateModule.key === 'function' ? TrussStateModule.key(x, y) : `${x},${y}`; }
    function parseTrussKey(key) { return TrussStateModule && typeof TrussStateModule.parseKey === 'function' ? TrussStateModule.parseKey(key) : (() => { const [x, y] = String(key).split(',').map(Number); return { x, y }; })(); }
    function trussMoney(value) { return `${Number(value || 0).toLocaleString('ru-RU')} ₽`; }
    function trussMetric(value, digits = 1) {
        const n = Number(value || 0);
        return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
    }
    function getTrussEl(id) { return q(id); }
    function getTrussNumber(id, fallback = 0) { return getNumber(id, fallback); }
    function setTrussNumber(id, value) { return setValue(id, value); }
    function getTrussText(id) { return String(getValue(id, '') || '').trim(); }
    function setTrussText(id, value) { return setValue(id, value || ''); }

    function applyTrussDraftSettings(saved) {
        saved = saved || {};
        trussCols = saved.cols || TRUSS_DEFAULT_COLS;
        trussRows = saved.rows || TRUSS_DEFAULT_ROWS;
        trussCellMeters = saved.cellMeters || 0.5;
        trussZoomPercent = saved.zoom || 100;
        setTrussNumber('trussCols', trussCols);
        setTrussNumber('trussRows', trussRows);
        const cellSel = getTrussEl('trussCellMeters'); if (cellSel) cellSel.value = String(trussCellMeters);
        setTrussNumber('trussZoom', trussZoomPercent);
    }

    function initTrussModule() {
        if (TrussBootstrapModule && typeof TrussBootstrapModule.initTrussWorkspace === 'function') {
            return TrussBootstrapModule.initTrussWorkspace({
                gridId: 'trussGrid',
                getElement: getTrussEl,
                defaultCols: TRUSS_DEFAULT_COLS,
                defaultRows: TRUSS_DEFAULT_ROWS,
                cellMeters: 0.5,
                zoom: 100,
                loadDraftSettings: loadTrussDraftSettings,
                applyDraftSettings: applyTrussDraftSettings,
                bindInputs: bindTrussInputs,
                renderGrid: renderTrussGrid,
                renderProjects: renderTrussProjects,
                calculate: calculateTruss
            });
        }
        const grid = getTrussEl('trussGrid');
        if (!grid) return;
        applyTrussDraftSettings(loadTrussDraftSettings());
        renderTrussGrid();
        bindTrussInputs();
        renderTrussProjects();
        calculateTruss();
    }

    function bindTrussInputs() {
        if (TrussBootstrapModule && typeof TrussBootstrapModule.bindTrussInputs === 'function') {
            return TrussBootstrapModule.bindTrussInputs({
                getElement: getTrussEl,
                applyGridSettings: applyTrussGridSettings,
                calculate: calculateTruss
            });
        }
        ['trussCols','trussRows','trussCellMeters','trussZoom'].forEach(id => {
            const el = getTrussEl(id);
            if (el) el.addEventListener('change', applyTrussGridSettings);
            if (id === 'trussZoom' && el) el.addEventListener('input', applyTrussGridSettings);
        });
        ['trussProjectName','trussClientName','trussSupportCount','trussInstallCost','trussPricePerMeter','trussCornerPrice','trussUprightPrice','trussBasePrice','trussWeightPerMeter','trussCornerWeight','trussUprightWeight','trussBaseWeight'].forEach(id => {
            const el = getTrussEl(id);
            if (el) el.addEventListener('input', () => calculateTruss());
        });
    }

    function loadTrussDraftSettings() {
        if (TrussBootstrapModule && typeof TrussBootstrapModule.loadDraftSettings === 'function') {
            return TrussBootstrapModule.loadDraftSettings({ key: 'trussDraftSettings', storage: localStorage });
        }
        try { return JSON.parse(localStorage.getItem('trussDraftSettings') || '{}'); } catch (err) { return {}; }
    }
    function saveTrussDraftSettings() {
        const snapshot = { cols: trussCols, rows: trussRows, cellMeters: trussCellMeters, zoom: trussZoomPercent };
        if (TrussBootstrapModule && typeof TrussBootstrapModule.saveDraftSettings === 'function') {
            return TrussBootstrapModule.saveDraftSettings(snapshot, { key: 'trussDraftSettings', storage: localStorage });
        }
        localStorage.setItem('trussDraftSettings', JSON.stringify(snapshot));
    }

    function applyTrussGridSettings() {
        const oldCols = trussCols;
        const oldRows = trussRows;
        trussCols = Math.max(4, Math.min(40, Math.round(getTrussNumber('trussCols', trussCols))));
        trussRows = Math.max(4, Math.min(30, Math.round(getTrussNumber('trussRows', trussRows))));
        trussCellMeters = Math.max(0.25, Number(getTrussEl('trussCellMeters') ? getTrussEl('trussCellMeters').value : trussCellMeters));
        trussZoomPercent = Math.max(60, Math.min(180, Math.round(getTrussNumber('trussZoom', trussZoomPercent))));
        setTrussNumber('trussCols', trussCols);
        setTrussNumber('trussRows', trussRows);
        trimTrussSegmentsToGrid();
        saveTrussDraftSettings();
        renderTrussGrid();
        calculateTruss();
    }

    function trimTrussSegmentsToGrid() {
        if (TrussStateModule && typeof TrussStateModule.trimSegmentsToGrid === 'function') {
            const trimmed = TrussStateModule.trimSegmentsToGrid(trussSegmentsH, trussSegmentsV, trussCols, trussRows);
            trussSegmentsH = trimmed.horizontal;
            trussSegmentsV = trimmed.vertical;
            return;
        }
        trussSegmentsH = new Set([...trussSegmentsH].filter(key => { const {x,y}=parseTrussKey(key); return x >= 0 && y >= 0 && x < trussCols && y <= trussRows; }));
        trussSegmentsV = new Set([...trussSegmentsV].filter(key => { const {x,y}=parseTrussKey(key); return x >= 0 && y >= 0 && x <= trussCols && y < trussRows; }));
    }

    function renderTrussGrid() {
        const grid = getTrussEl('trussGrid');
        if (!grid) return;
        const cellPx = Math.round(28 * (trussZoomPercent / 100));
        grid.style.setProperty('--truss-cols', trussCols);
        grid.style.setProperty('--truss-rows', trussRows);
        grid.style.setProperty('--truss-cell', `${cellPx}px`);
        grid.innerHTML = '';
        for (let y = 0; y < trussRows; y++) {
            for (let x = 0; x < trussCols; x++) {
                const hit = document.createElement('button');
                hit.type = 'button';
                hit.className = 'truss-hit';
                hit.dataset.x = x;
                hit.dataset.y = y;
                hit.setAttribute('aria-label', `Клетка фермы ${x}, ${y}`);
                grid.appendChild(hit);
            }
        }
        drawTrussSegments();
        grid.onpointerdown = handleTrussPointerDown;
        grid.onpointermove = handleTrussPointerMove;
        grid.onpointerup = () => { trussPointerDown = false; trussLastApplied = ''; };
        grid.onpointerleave = () => { trussPointerDown = false; trussLastApplied = ''; };
    }

    function handleTrussPointerDown(e) {
        const hit = e.target.closest ? e.target.closest('.truss-hit') : null;
        if (!hit) return;
        trussPointerDown = true;
        trussLastApplied = '';
        applyTrussHit(hit);
        try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
    }
    function handleTrussPointerMove(e) {
        if (!trussPointerDown) return;
        const hit = e.target.closest ? e.target.closest('.truss-hit') : null;
        if (!hit) return;
        applyTrussHit(hit);
        e.preventDefault();
    }

    function currentTrussDir() { const el = getTrussEl('trussDrawDir'); return el ? el.value : 'h'; }
    function currentTrussMode() { const el = getTrussEl('trussDrawMode'); return el ? el.value : 'draw'; }
    function rotateTrussDirection() {
        const el = getTrussEl('trussDrawDir');
        if (el) el.value = el.value === 'h' ? 'v' : 'h';
        showToast(el && el.value === 'v' ? 'Ферма: вертикаль' : 'Ферма: горизонталь');
    }

    function applyTrussHit(hit) {
        const x = Number(hit.dataset.x);
        const y = Number(hit.dataset.y);
        const dir = currentTrussDir();
        const key = trussKey(x, y);
        const actionKey = `${dir}:${key}`;
        if (actionKey === trussLastApplied) return;
        trussLastApplied = actionKey;
        const set = dir === 'h' ? trussSegmentsH : trussSegmentsV;
        if (dir === 'h' && x >= trussCols - 0) { /* allowed from x to x+1 up to cols */ }
        if (dir === 'h' && x >= trussCols) return;
        if (dir === 'v' && y >= trussRows) return;
        const mode = currentTrussMode();
        if (mode === 'erase') set.delete(key);
        else if (mode === 'toggle') set.has(key) ? set.delete(key) : set.add(key);
        else set.add(key);
        trimTrussSegmentsToGrid();
        drawTrussSegments();
        calculateTruss();
    }

    function getTrussNodes() {
        if (TrussStateModule && typeof TrussStateModule.getNodes === 'function') return TrussStateModule.getNodes(trussSegmentsH, trussSegmentsV);
        const nodes = new Map();
        function addNode(x, y, dir) {
            const key = trussKey(x, y);
            const item = nodes.get(key) || { x, y, h: 0, v: 0, degree: 0 };
            if (dir === 'h') item.h += 1;
            if (dir === 'v') item.v += 1;
            item.degree += 1;
            nodes.set(key, item);
        }
        trussSegmentsH.forEach(key => { const {x,y}=parseTrussKey(key); addNode(x,y,'h'); addNode(x+1,y,'h'); });
        trussSegmentsV.forEach(key => { const {x,y}=parseTrussKey(key); addNode(x,y,'v'); addNode(x,y+1,'v'); });
        return nodes;
    }

    function drawTrussSegments() {
        const grid = getTrussEl('trussGrid');
        if (!grid) return;
        grid.querySelectorAll('.truss-seg-h,.truss-seg-v,.truss-node').forEach(n => n.remove());
        const cellPx = Math.round(28 * (trussZoomPercent / 100));
        const thick = Math.max(5, Math.round(cellPx * .18));
        trussSegmentsH.forEach(key => {
            const {x,y} = parseTrussKey(key);
            const seg = document.createElement('div');
            seg.className = 'truss-seg-h';
            seg.style.left = `${x * cellPx}px`;
            seg.style.top = `${y * cellPx - thick/2}px`;
            seg.style.width = `${cellPx}px`;
            seg.style.height = `${thick}px`;
            grid.appendChild(seg);
        });
        trussSegmentsV.forEach(key => {
            const {x,y} = parseTrussKey(key);
            const seg = document.createElement('div');
            seg.className = 'truss-seg-v';
            seg.style.left = `${x * cellPx - thick/2}px`;
            seg.style.top = `${y * cellPx}px`;
            seg.style.width = `${thick}px`;
            seg.style.height = `${cellPx}px`;
            grid.appendChild(seg);
        });
        const nodes = getTrussNodes();
        nodes.forEach(node => {
            if (node.degree < 2) return;
            const dot = document.createElement('div');
            dot.className = 'truss-node';
            dot.style.left = `${node.x * cellPx}px`;
            dot.style.top = `${node.y * cellPx}px`;
            grid.appendChild(dot);
        });
        const label = getTrussEl('trussCountLabel');
        if (label) label.textContent = `Участков: ${trussSegmentsH.size + trussSegmentsV.size}`;
    }

    function getRunsFromSegments(set, orientation) {
        if (TrussStateModule && typeof TrussStateModule.getRunsFromSegments === 'function') {
            return TrussStateModule.getRunsFromSegments(set, orientation, trussCellMeters);
        }
        const map = new Map();
        set.forEach(key => {
            const {x,y} = parseTrussKey(key);
            const line = orientation === 'h' ? y : x;
            const pos = orientation === 'h' ? x : y;
            if (!map.has(line)) map.set(line, []);
            map.get(line).push(pos);
        });
        const runs = [];
        map.forEach((positions, line) => {
            const sorted = [...new Set(positions)].sort((a,b)=>a-b);
            let start = null, prev = null, count = 0;
            sorted.forEach(pos => {
                if (start === null) { start = prev = pos; count = 1; return; }
                if (pos === prev + 1) { prev = pos; count++; }
                else { runs.push({ orientation, line, start, count, meters: count * trussCellMeters }); start = prev = pos; count = 1; }
            });
            if (start !== null) runs.push({ orientation, line, start, count, meters: count * trussCellMeters });
        });
        return runs;
    }

    function splitTrussLength(meters) {
        if (TrussStateModule && typeof TrussStateModule.splitLength === 'function') return TrussStateModule.splitLength(meters);
        const pieces = { 3:0, 2:0, 1:0, 0.5:0 };
        let rest = Math.round(Number(meters || 0) * 2) / 2;
        [3,2,1,0.5].forEach(len => {
            const qty = Math.floor((rest + 1e-9) / len);
            pieces[len] += qty;
            rest = Math.round((rest - qty * len) * 2) / 2;
        });
        if (rest > 0) pieces[0.5] += 1;
        return pieces;
    }

    function calculateTruss() {
        const runs = [...getRunsFromSegments(trussSegmentsH,'h'), ...getRunsFromSegments(trussSegmentsV,'v')];
        const totalMeters = runs.reduce((sum, r) => sum + r.meters, 0);
        const pieces = { '3':0, '2':0, '1':0, '0.5':0 };
        runs.forEach(run => {
            const split = splitTrussLength(run.meters);
            Object.keys(split).forEach(k => { pieces[k] += split[k]; });
        });
        const nodes = getTrussNodes();
        let corners = 0, terminalNodes = 0, crossNodes = 0;
        nodes.forEach(node => {
            if (node.h > 0 && node.v > 0) corners += 1;
            if (node.degree === 1) terminalNodes += 1;
            if (node.degree >= 4) crossNodes += 1;
        });
        const supportCount = Math.max(0, Math.round(getTrussNumber('trussSupportCount', Math.max(0, terminalNodes))));
        const pricePerMeter = getTrussNumber('trussPricePerMeter', 0);
        const cornerPrice = getTrussNumber('trussCornerPrice', 0);
        const uprightPrice = getTrussNumber('trussUprightPrice', 0);
        const basePrice = getTrussNumber('trussBasePrice', 0);
        const install = getTrussNumber('trussInstallCost', 0);
        const transport = typeof calculateTransportCost === 'function' ? calculateTransportCost(transportSettings) : 0;
        const rentalCost = totalMeters * pricePerMeter + corners * cornerPrice + supportCount * (uprightPrice + basePrice);
        const total = rentalCost + install + transport;
        const weight = totalMeters * getTrussNumber('trussWeightPerMeter', 0) + corners * getTrussNumber('trussCornerWeight', 0) + supportCount * (getTrussNumber('trussUprightWeight', 0) + getTrussNumber('trussBaseWeight', 0));
        lastTrussResult = { runs, pieces, totalMeters, corners, terminalNodes, crossNodes, supportCount, rentalCost, install, transport, total, weight, cellMeters: trussCellMeters, cols: trussCols, rows: trussRows };
        renderTrussResult();
        return lastTrussResult;
    }

    function renderTrussResult() {
        const res = lastTrussResult || calculateTruss();
        const box = getTrussEl('trussResult');
        if (box) {
            box.innerHTML = `
                <div>Общий метраж ферм</div><div>${trussMetric(res.totalMeters)} м</div>
                <div>Углы / узлы 90°</div><div>${res.corners} шт</div>
                <div>Стойки + базы</div><div>${res.supportCount} компл.</div>
                <div>Вес комплекта</div><div>${trussMetric(res.weight)} кг</div>
                <div>Прокат конструкции</div><div>${trussMoney(res.rentalCost)}</div>
                <div>Монтаж</div><div>${trussMoney(res.install)}</div>
                <div>Транспорт</div><div>${trussMoney(res.transport)}</div>
                <div><b>ИТОГО</b></div><div><b>${trussMoney(res.total)}</b></div>
            `;
        }
        const body = getTrussEl('trussPiecesBody');
        if (body) {
            body.innerHTML = `
                <tr><td>Ферма 3 м</td><td>${res.pieces['3']} шт</td></tr>
                <tr><td>Ферма 2 м</td><td>${res.pieces['2']} шт</td></tr>
                <tr><td>Ферма 1 м</td><td>${res.pieces['1']} шт</td></tr>
                <tr><td>Ферма 0.5 м</td><td>${res.pieces['0.5']} шт</td></tr>
                <tr><td>Угол / куб / стык 90°</td><td>${res.corners} шт</td></tr>
                <tr><td>Стойка вертикальная</td><td>${res.supportCount} шт</td></tr>
                <tr><td>База / пятка фермы</td><td>${res.supportCount} шт</td></tr>
            `;
        }
    }

    function clearTrussConfirm() {
        if (trussSegmentsH.size + trussSegmentsV.size === 0 || confirm('Очистить схему ферм?')) {
            trussSegmentsH.clear(); trussSegmentsV.clear(); trussEditingId = null; renderTrussGrid(); calculateTruss();
        }
    }

    function applyTrussPortalTemplate() {
        clearTrussWithoutConfirm();
        const wM = getTrussNumber('trussWidthM', 6);
        const hM = getTrussNumber('trussHeightM', 3);
        const w = Math.max(1, Math.round(wM / trussCellMeters));
        const h = Math.max(1, Math.round(hM / trussCellMeters));
        const x0 = Math.max(0, Math.floor((trussCols - w) / 2));
        const y0 = Math.max(0, Math.floor((trussRows - h) / 2));
        for (let x = x0; x < Math.min(trussCols, x0 + w); x++) trussSegmentsH.add(trussKey(x, y0));
        for (let y = y0; y < Math.min(trussRows, y0 + h); y++) { trussSegmentsV.add(trussKey(x0, y)); trussSegmentsV.add(trussKey(x0 + w, y)); }
        setTrussNumber('trussSupportCount', 2);
        trimTrussSegmentsToGrid(); renderTrussGrid(); calculateTruss();
    }

    function applyTrussRectangleTemplate() {
        clearTrussWithoutConfirm();
        const wM = getTrussNumber('trussWidthM', 6);
        const hM = getTrussNumber('trussHeightM', 3);
        const w = Math.max(1, Math.round(wM / trussCellMeters));
        const h = Math.max(1, Math.round(hM / trussCellMeters));
        const x0 = Math.max(0, Math.floor((trussCols - w) / 2));
        const y0 = Math.max(0, Math.floor((trussRows - h) / 2));
        for (let x = x0; x < Math.min(trussCols, x0 + w); x++) { trussSegmentsH.add(trussKey(x, y0)); trussSegmentsH.add(trussKey(x, y0 + h)); }
        for (let y = y0; y < Math.min(trussRows, y0 + h); y++) { trussSegmentsV.add(trussKey(x0, y)); trussSegmentsV.add(trussKey(x0 + w, y)); }
        setTrussNumber('trussSupportCount', 4);
        trimTrussSegmentsToGrid(); renderTrussGrid(); calculateTruss();
    }

    function clearTrussWithoutConfirm() { trussSegmentsH.clear(); trussSegmentsV.clear(); }

    function buildTrussSnapshot(id) {
        if (TrussStateModule && typeof TrussStateModule.buildSnapshot === 'function') {
            return TrussStateModule.buildSnapshot({
                id: id || Date.now(),
                appVersion: APP_VERSION,
                cols: trussCols,
                rows: trussRows,
                cellMeters: trussCellMeters,
                segmentsH: trussSegmentsH,
                segmentsV: trussSegmentsV,
                getText: getTrussText,
                getNumber: getTrussNumber,
                calculate: calculateTruss
            });
        }
        const res = calculateTruss();
        const now = new Date().toISOString();
        return {
            type: 'feg-stage-pro-truss-project', kind: 'truss', appVersion: APP_VERSION,
            id: id || Date.now(), orderId: `TR-${id || Date.now()}`,
            client: getTrussText('trussClientName') || 'Клиент не указан',
            name: getTrussText('trussProjectName') || 'Ферменная конструкция',
            date: now, updatedAt: now,
            cols: trussCols, rows: trussRows, cellMeters: trussCellMeters,
            segmentsH: [...trussSegmentsH], segmentsV: [...trussSegmentsV],
            params: {
                supportCount: getTrussNumber('trussSupportCount', 0), installCost: getTrussNumber('trussInstallCost', 0), pricePerMeter: getTrussNumber('trussPricePerMeter', 0), cornerPrice: getTrussNumber('trussCornerPrice', 0), uprightPrice: getTrussNumber('trussUprightPrice', 0), basePrice: getTrussNumber('trussBasePrice', 0), weightPerMeter: getTrussNumber('trussWeightPerMeter', 0), cornerWeight: getTrussNumber('trussCornerWeight', 0), uprightWeight: getTrussNumber('trussUprightWeight', 0), baseWeight: getTrussNumber('trussBaseWeight', 0), widthM: getTrussNumber('trussWidthM', 6), heightM: getTrussNumber('trussHeightM', 3)
            },
            result: res,
            total: res.total
        };
    }

    function getTrussProjects() {
        if (ProjectStorageModule && typeof ProjectStorageModule.getTrussProjects === 'function') return ProjectStorageModule.getTrussProjects();
        try { return JSON.parse(localStorage.getItem(TRUSS_STORAGE_KEY) || '[]'); } catch(err) { return []; }
    }
    function setTrussProjects(list) {
        if (ProjectStorageModule && typeof ProjectStorageModule.setTrussProjects === 'function') { ProjectStorageModule.setTrussProjects(list); return; }
        localStorage.setItem(TRUSS_STORAGE_KEY, JSON.stringify(list || []));
    }
    function saveTrussProject() {
        let snapshot = buildTrussSnapshot(trussEditingId || Date.now());
        ensureClientExists(snapshot.client);
        if (ProjectStorageModule && typeof ProjectStorageModule.saveTrussProjectSnapshot === 'function') {
            snapshot = ProjectStorageModule.saveTrussProjectSnapshot(snapshot, { maxItems: 100 });
        } else {
            const projects = getTrussProjects();
            const idx = projects.findIndex(p => String(p.id) === String(snapshot.id));
            if (idx >= 0) { snapshot.createdAt = projects[idx].createdAt || projects[idx].date; snapshot.cloudId = projects[idx].cloudId || null; projects[idx] = snapshot; }
            else { snapshot.createdAt = snapshot.date; projects.unshift(snapshot); }
            setTrussProjects(projects.slice(0, 100));
        }
        trussEditingId = snapshot.id;
        renderTrussProjects();
        renderClients();
        showToast('Ферменный проект сохранён');
    }

    function applyTrussProject(project) {
        if (!project) return;
        trussCols = Number(project.cols || TRUSS_DEFAULT_COLS); trussRows = Number(project.rows || TRUSS_DEFAULT_ROWS); trussCellMeters = Number(project.cellMeters || 0.5);
        trussSegmentsH = new Set(project.segmentsH || []); trussSegmentsV = new Set(project.segmentsV || []);
        setTrussNumber('trussCols', trussCols); setTrussNumber('trussRows', trussRows);
        const cellSel = getTrussEl('trussCellMeters'); if (cellSel) cellSel.value = String(trussCellMeters);
        setTrussText('trussClientName', project.client || ''); setTrussText('trussProjectName', project.name || '');
        const p = project.params || {};
        Object.entries({ trussSupportCount:p.supportCount, trussInstallCost:p.installCost, trussPricePerMeter:p.pricePerMeter, trussCornerPrice:p.cornerPrice, trussUprightPrice:p.uprightPrice, trussBasePrice:p.basePrice, trussWeightPerMeter:p.weightPerMeter, trussCornerWeight:p.cornerWeight, trussUprightWeight:p.uprightWeight, trussBaseWeight:p.baseWeight, trussWidthM:p.widthM, trussHeightM:p.heightM }).forEach(([id,val]) => { if (val !== undefined) setTrussNumber(id,val); });
        trussEditingId = project.id;
        saveTrussDraftSettings(); renderTrussGrid(); calculateTruss();
        (document.getElementById('blockTrussModule') || document.getElementById('trussPage') || document.body).scrollIntoView({behavior:'smooth', block:'start'});
        showToast('Ферменный проект открыт');
    }

    function renderTrussProjects() {
        const wrap = getTrussEl('trussProjectsList'); if (!wrap) return;
        const list = getTrussProjects();
        if (TrussProjectsUIModule && typeof TrussProjectsUIModule.renderProjectsList === 'function') {
            TrussProjectsUIModule.renderProjectsList(wrap, list, { escapeHtml, money: trussMoney });
            return;
        }
        if (!list.length) { wrap.innerHTML = '<div class="orders-empty-state">Нет сохранённых ферменных проектов.</div>'; return; }
        const rows = list.map((p, idx) => `
            <tr>
                <td><strong>${p.orderId || ('TR-' + (p.id || idx))}${p.cloudId ? ' ☁' : ''}</strong></td>
                <td>${escapeHtml(p.client || '—')}</td>
                <td>${escapeHtml(p.name || '—')}</td>
                <td>${new Date(p.updatedAt || p.date || Date.now()).toLocaleDateString('ru-RU')}</td>
                <td><strong>${trussMoney(p.total || (p.result && p.result.total) || 0)}</strong></td>
                <td><div class="truss-project-actions">
                    <button type="button" title="Открыть" onclick="openTrussProject('${p.id}')">✎</button>
                    <button type="button" title="Тех PDF" onclick="downloadSavedTrussPdf('${p.id}', 'tech')">PDF</button>
                    <button type="button" title="КП PDF" onclick="downloadSavedTrussPdf('${p.id}', 'client')">КП</button>
                    <button type="button" title="Облако" onclick="uploadSavedTrussToCloud('${p.id}')">☁</button>
                    <button type="button" title="Удалить" onclick="deleteTrussProject('${p.id}')">🗑</button>
                </div></td>
            </tr>`).join('');
        wrap.innerHTML = `<div class="truss-project-table-wrap"><table class="truss-project-table"><thead><tr><th>ID</th><th>Клиент</th><th>Проект</th><th>Дата</th><th>Стоимость</th><th>Действия</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    function openTrussProject(id) {
        const p = ProjectStorageModule && typeof ProjectStorageModule.findTrussProjectById === 'function'
            ? ProjectStorageModule.findTrussProjectById(id)
            : getTrussProjects().find(x => String(x.id) === String(id));
        applyTrussProject(p);
    }
    function deleteTrussProject(id) {
        if (!confirm('Удалить ферменный проект?')) return;
        if (ProjectStorageModule && typeof ProjectStorageModule.deleteTrussProjectById === 'function') ProjectStorageModule.deleteTrussProjectById(id);
        else setTrussProjects(getTrussProjects().filter(p => String(p.id) !== String(id)));
        renderTrussProjects();
    }
    async function downloadSavedTrussPdf(id, kind) {
        const current = buildTrussSnapshot(trussEditingId || Date.now());
        const p = ProjectStorageModule && typeof ProjectStorageModule.findTrussProjectById === 'function'
            ? ProjectStorageModule.findTrussProjectById(id)
            : getTrussProjects().find(x => String(x.id) === String(id));
        if (!p) return;
        applyTrussProject(p);
        await new Promise(resolve => setTimeout(resolve, 80));
        await (kind === 'client' ? openTrussClientPdfPreview() : openTrussTechPdfPreview());
        applyTrussProject(current);
    }

    function exportTrussJson() {
        const snapshot = buildTrussSnapshot(trussEditingId || Date.now());
        const payload = ProjectStorageModule && typeof ProjectStorageModule.buildTrussProjectExportPayload === 'function'
            ? ProjectStorageModule.buildTrussProjectExportPayload(snapshot)
            : { type:'feg-stage-pro-truss-export', exportedAt:new Date().toISOString(), project:snapshot };
        const safeName = ProjectStorageModule && typeof ProjectStorageModule.safeFileNamePart === 'function'
            ? ProjectStorageModule.safeFileNamePart(snapshot.name, 'project')
            : (snapshot.name || 'project').replace(/[\\/:*?"<>|]/g,'_');
        downloadJson(`truss_${safeName}_${snapshot.id}.json`, payload);
    }
    function triggerTrussImport() { const input = getTrussEl('trussImportInput'); if (input) { input.value=''; input.click(); } }
    async function importTrussJsonFromInput(event) {
        const file = event && event.target && event.target.files ? event.target.files[0] : null;
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            const project = ProjectStorageModule && typeof ProjectStorageModule.normalizeImportedTrussProject === 'function'
                ? ProjectStorageModule.normalizeImportedTrussProject(data)
                : data.project || data;
            if (!Array.isArray(project.segmentsH) || !Array.isArray(project.segmentsV)) throw new Error('Нет схемы ферм');
            applyTrussProject(project); showToast('Ферменный проект импортирован');
        }
        catch(err) { alert('Не удалось импортировать фермы: ' + (err && err.message ? err.message : err)); }
        finally { if (event && event.target) event.target.value = ''; }
    }

    function getTrussBounds() {
        if (TrussStateModule && typeof TrussStateModule.getBounds === 'function') {
            return TrussStateModule.getBounds(trussSegmentsH, trussSegmentsV, { minX:0, minY:0, maxX:trussCols, maxY:trussRows });
        }
        const nodes = [...getTrussNodes().values()];
        if (!nodes.length) return { minX:0, minY:0, maxX:trussCols, maxY:trussRows };
        return { minX: Math.min(...nodes.map(n=>n.x)), minY: Math.min(...nodes.map(n=>n.y)), maxX: Math.max(...nodes.map(n=>n.x)), maxY: Math.max(...nodes.map(n=>n.y)) };
    }
    function createTrussCanvas(width=700, height=360) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,width,height);
        const b = getTrussBounds(); const pad = 34;
        const scale = Math.min((width-pad*2)/Math.max(1,b.maxX-b.minX), (height-pad*2)/Math.max(1,b.maxY-b.minY));
        function px(x) { return pad + (x - b.minX) * scale; }
        function py(y) { return pad + (y - b.minY) * scale; }
        ctx.strokeStyle = '#d5d9de'; ctx.lineWidth = 1;
        for(let x=Math.floor(b.minX); x<=Math.ceil(b.maxX); x++){ ctx.beginPath(); ctx.moveTo(px(x), pad/2); ctx.lineTo(px(x), height-pad/2); ctx.stroke(); }
        for(let y=Math.floor(b.minY); y<=Math.ceil(b.maxY); y++){ ctx.beginPath(); ctx.moveTo(pad/2, py(y)); ctx.lineTo(width-pad/2, py(y)); ctx.stroke(); }
        ctx.strokeStyle = '#2E8B57'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        trussSegmentsH.forEach(key => { const {x,y}=parseTrussKey(key); ctx.beginPath(); ctx.moveTo(px(x),py(y)); ctx.lineTo(px(x+1),py(y)); ctx.stroke(); });
        trussSegmentsV.forEach(key => { const {x,y}=parseTrussKey(key); ctx.beginPath(); ctx.moveTo(px(x),py(y)); ctx.lineTo(px(x),py(y+1)); ctx.stroke(); });
        ctx.fillStyle = '#3b2a1c'; ctx.font = '14px Arial'; ctx.fillText(`Клетка: ${trussCellMeters} м`, 16, height-14);
        return canvas;
    }

    function trussHasScheme() {
        if (TrussStateModule && typeof TrussStateModule.hasScheme === 'function') return TrussStateModule.hasScheme(trussSegmentsH, trussSegmentsV);
        return (trussSegmentsH && trussSegmentsH.size) || (trussSegmentsV && trussSegmentsV.size);
    }

    function createTrussSchemeImageHtml(width = 520, height = 260) {
        if (!trussHasScheme()) return '<div style="font-size:12px;color:#69727d;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Схема фермы не выбрана</div>';
        const dataUrl = createTrussCanvas(900, 460).toDataURL('image/png');
        return `<img src="${dataUrl}" style="width:100%;max-height:${height}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
    }

    function getTrussPdfSnapshot() {
        const res = calculateTruss();
        const snap = buildTrussSnapshot(trussEditingId || Date.now());
        return { res, snap };
    }

    function updateTrussTechPdfContent() {
        if (pdfTitleEl) pdfTitleEl.textContent = 'ТЕХНИЧЕСКИЙ ЛИСТ ФЕРМЕННОЙ КОНСТРУКЦИИ';
        if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — технический лист ферменной конструкции для склада и площадки';
        if (!trussHasScheme()) {
            pdfDataDiv.innerHTML = '<p>Нет схемы фермы. Нарисуйте конструкцию или выберите шаблон.</p>';
            return;
        }
        const { res, snap } = getTrussPdfSnapshot();
        const dateText = new Date().toLocaleDateString('ru-RU');
        const timeText = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        const transportLabel = typeof getTransportLabel === 'function' ? getTransportLabel(normalizeTransportSettings(transportSettings)) : 'Транспорт';
        pdfDataDiv.innerHTML = `
            <div class="tech-pdf">
                <div class="tech-top">
                    <div class="tech-box">
                        <div><strong>Проект:</strong> ${escapeHtml(snap.name || 'Ферменная конструкция')}</div>
                        <div><strong>Клиент:</strong> ${escapeHtml(snap.client || 'Клиент не указан')}</div>
                        <div><strong>Дата/время:</strong> ${dateText} ${timeText}</div>
                    </div>
                    <div class="tech-box">
                        <div><strong>Документ:</strong> технический лист для склада и монтажа</div>
                        <div><strong>Клетка схемы:</strong> ${trussMetric(res.cellMeters)} м</div>
                        <div><strong>Общий метраж:</strong> ${trussMetric(res.totalMeters)} м</div>
                        <div><strong>Транспорт:</strong> ${escapeHtml(transportLabel)} · ${trussMoney(res.transport)}</div>
                        <div><strong>Вес комплекта:</strong> ${trussMetric(res.weight)} кг</div>
                    </div>
                </div>

                <div class="section-title">1. Схема ферменной конструкции</div>
                <div class="scheme-row">
                    <div>${createTrussSchemeImageHtml(520, 250)}</div>
                    <div class="notes">
                        <table>
                            <tr><th>Параметр</th><th class="qty">Значение</th></tr>
                            <tr><td>Общий метраж ферм</td><td class="qty">${trussMetric(res.totalMeters)} м</td></tr>
                            <tr><td>Ферма 3 м</td><td class="qty">${res.pieces['3']} шт</td></tr>
                            <tr><td>Ферма 2 м</td><td class="qty">${res.pieces['2']} шт</td></tr>
                            <tr><td>Ферма 1 м</td><td class="qty">${res.pieces['1']} шт</td></tr>
                            <tr><td>Ферма 0.5 м</td><td class="qty">${res.pieces['0.5']} шт</td></tr>
                            <tr><td>Углы / кубы / узлы 90°</td><td class="qty">${res.corners} шт</td></tr>
                            <tr><td>Стойки вертикальные</td><td class="qty">${res.supportCount} шт</td></tr>
                            <tr><td>Базы / пятки</td><td class="qty">${res.supportCount} шт</td></tr>
                            <tr><td>Вес комплекта</td><td class="qty">${trussMetric(res.weight)} кг</td></tr>
                        </table>
                    </div>
                </div>

                <div class="section-title">2. Комплектация для погрузки</div>
                <table>
                    <thead><tr><th style="width:38px;text-align:center;">№</th><th>Наименование</th><th class="qty">Кол-во</th><th style="width:70px;text-align:center;">Ед.</th><th style="width:90px;text-align:center;">Примечание</th></tr></thead>
                    <tbody>
                        <tr><td style="text-align:center;">1</td><td>Ферма прямая 3 м</td><td class="qty">${res.pieces['3']}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                        <tr><td style="text-align:center;">2</td><td>Ферма прямая 2 м</td><td class="qty">${res.pieces['2']}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                        <tr><td style="text-align:center;">3</td><td>Ферма прямая 1 м</td><td class="qty">${res.pieces['1']}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                        <tr><td style="text-align:center;">4</td><td>Ферма прямая 0.5 м</td><td class="qty">${res.pieces['0.5']}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                        <tr><td style="text-align:center;">5</td><td>Угол / куб / стык 90°</td><td class="qty">${res.corners}</td><td style="text-align:center;">шт</td><td style="text-align:center;">узлы</td></tr>
                        <tr><td style="text-align:center;">6</td><td>Стойка вертикальная</td><td class="qty">${res.supportCount}</td><td style="text-align:center;">шт</td><td style="text-align:center;">опора</td></tr>
                        <tr><td style="text-align:center;">7</td><td>База / пятка фермы</td><td class="qty">${res.supportCount}</td><td style="text-align:center;">шт</td><td style="text-align:center;">опора</td></tr>
                    </tbody>
                </table>

                <div class="section-title">3. Примечание по безопасности</div>
                <div class="notes">Расчёт является комплектовочной ведомостью и сметой. Допустимые нагрузки, подвесы, балласт, ветровые нагрузки и безопасность конструкции проверяются по паспортам производителя и/или ответственным инженером.</div>

                <div class="signature-row">
                    <div>Погрузил: <div class="sign-line"></div></div>
                    <div>Принял на площадке: <div class="sign-line"></div></div>
                </div>
            </div>
        `;
    }

    function updateTrussClientPdfContent() {
        if (pdfTitleEl) pdfTitleEl.textContent = 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ';
        if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — коммерческое предложение по ферменной конструкции';
        if (!trussHasScheme()) {
            pdfDataDiv.innerHTML = '<p>Нет схемы фермы. Нарисуйте конструкцию или выберите шаблон.</p>';
            return;
        }
        const { res, snap } = getTrussPdfSnapshot();
        const now = new Date();
        const dateText = now.toLocaleDateString('ru-RU');
        const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
        const transportLabel = typeof getTransportLabel === 'function' ? getTransportLabel(normalizeTransportSettings(transportSettings)) : 'Транспорт';
        pdfDataDiv.innerHTML = `
            <div class="client-pdf">
                <div class="client-hero">
                    <div>
                        <div class="brand-title"><span>FEG</span> Stage PRO</div>
                        <div class="brand-subtitle">Аренда и монтаж ферменной конструкции под мероприятие. Смета подготовлена по выбранной схеме.</div>
                    </div>
                    <div class="client-meta">
                        <div><strong>Проект:</strong> ${escapeHtml(snap.name || 'Ферменная конструкция')}</div>
                        <div><strong>Клиент:</strong> ${escapeHtml(snap.client || 'Клиент не указан')}</div>
                        <div><strong>Дата:</strong> ${dateText}</div>
                        <div><strong>Действительно до:</strong> ${validUntil}</div>
                    </div>
                </div>
                <div class="client-main-grid">
                    <div class="client-card">
                        <div class="client-section-title">Схема конструкции</div>
                        <div class="client-scheme-wrap">${createTrussSchemeImageHtml(520, 270)}</div>
                        <div class="client-note">Схема показывает общую геометрию ферменной конструкции без инженерного расчёта нагрузок.</div>
                    </div>
                    <div>
                        <div class="client-card" style="margin-bottom:14px;">
                            <div class="client-section-title">Основные параметры</div>
                            <div class="client-params">
                                <div class="client-param"><span>Общий метраж</span><strong>${trussMetric(res.totalMeters)} м</strong></div>
                                <div class="client-param"><span>Узлы / углы</span><strong>${res.corners} шт</strong></div>
                                <div class="client-param"><span>Стойки / базы</span><strong>${res.supportCount} компл.</strong></div>
                                <div class="client-param"><span>Вес комплекта</span><strong>${trussMetric(res.weight)} кг</strong></div>
                            </div>
                        </div>
                        <div class="client-card">
                            <div class="client-section-title">Стоимость</div>
                            <table class="client-price-table">
                                <thead><tr><th>Позиция</th><th>Стоимость</th></tr></thead>
                                <tbody>
                                    <tr><td>Прокат ферменной конструкции</td><td>${trussMoney(res.rentalCost)}</td></tr>
                                    <tr><td>Монтаж / демонтаж</td><td>${trussMoney(res.install)}</td></tr>
                                    <tr><td>Транспорт <span style="font-size:10px;color:#69727d;">(${escapeHtml(transportLabel)})</span></td><td>${trussMoney(res.transport)}</td></tr>
                                    <tr class="client-total-row"><td>Итого к оплате</td><td>${trussMoney(res.total)}</td></tr>
                                </tbody>
                            </table>
                            <div class="client-note">Нагрузки, подвесы, ветровые условия и балласт уточняются отдельно по паспортам производителя и техническому заданию.</div>
                        </div>
                    </div>
                </div>
                <div class="client-footer-line"><div>FEG Stage PRO</div><div>Коммерческое предложение без технической комплектации</div></div>
            </div>
        `;
    }

    function updateCombinedClientPdfContent() {
        if (selectedModules && selectedModules.size && !lastResult) calc(false);
        const hasStage = !!lastResult;
        const hasTruss = trussHasScheme();
        if (pdfTitleEl) pdfTitleEl.textContent = 'ОБЩЕЕ КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ';
        if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — общее коммерческое предложение: сцена + фермы';
        if (!hasStage && !hasTruss) {
            pdfDataDiv.innerHTML = '<p>Нет активной сцены или ферменной конструкции для общего КП.</p>';
            return;
        }
        const tr = hasTruss ? calculateTruss() : null;
        const transport = typeof calculateTransportCost === 'function' ? calculateTransportCost(normalizeTransportSettings(transportSettings)) : 0;
        const transportLabel = typeof getTransportLabel === 'function' ? getTransportLabel(normalizeTransportSettings(transportSettings)) : 'Транспорт';
        const stageRental = hasStage ? Number(lastResult.modulesCost || 0) : 0;
        const stageInstall = hasStage ? Number(lastResult.installCost || 0) : 0;
        const trussRental = hasTruss ? Number(tr.rentalCost || 0) : 0;
        const trussInstall = hasTruss ? Number(tr.install || 0) : 0;
        const total = stageRental + stageInstall + trussRental + trussInstall + transport;
        const clientName = (clientSelect && clientSelect.value) || getTrussText('trussClientName') || 'Клиент не выбран';
        const stageProject = projectNameInput.value.trim() || 'Сценическая конструкция';
        const trussProject = getTrussText('trussProjectName') || 'Ферменная конструкция';
        const now = new Date();
        const dateText = now.toLocaleDateString('ru-RU');
        const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
        const stageSummary = hasStage ? `${metric(lastResult.widthMeters)} × ${metric(lastResult.depthMeters)} м · ${metric(lastResult.areaMeters)} м² · высота ${metric(lastResult.stageHeightM * 100)} см` : 'Не включена';
        const trussSummary = hasTruss ? `${trussMetric(tr.totalMeters)} м ферм · ${tr.corners} узлов · ${tr.supportCount} стоек/баз` : 'Не включены';
        pdfDataDiv.innerHTML = `
            <div class="client-pdf">
                <div class="client-hero">
                    <div>
                        <div class="brand-title"><span>FEG</span> Stage PRO</div>
                        <div class="brand-subtitle">Комплексное коммерческое предложение по сцене и ферменной конструкции для мероприятия.</div>
                    </div>
                    <div class="client-meta">
                        <div><strong>Клиент:</strong> ${escapeHtml(clientName)}</div>
                        <div><strong>Дата:</strong> ${dateText}</div>
                        <div><strong>Действительно до:</strong> ${validUntil}</div>
                    </div>
                </div>
                <div class="client-main-grid">
                    <div class="client-card">
                        <div class="client-section-title">Схемы</div>
                        ${hasStage ? `<div style="font-weight:800;margin-bottom:6px;">Сцена: ${escapeHtml(stageProject)}</div><div class="client-scheme-wrap" style="margin-bottom:10px;">${createClientSchemeGrid()}</div>` : ''}
                        ${hasTruss ? `<div style="font-weight:800;margin-bottom:6px;">Фермы: ${escapeHtml(trussProject)}</div><div class="client-scheme-wrap">${createTrussSchemeImageHtml(520, 190)}</div>` : ''}
                    </div>
                    <div>
                        <div class="client-card" style="margin-bottom:14px;">
                            <div class="client-section-title">Сводка проекта</div>
                            <div class="client-params">
                                <div class="client-param"><span>Сцена</span><strong>${escapeHtml(stageSummary)}</strong></div>
                                <div class="client-param"><span>Фермы</span><strong>${escapeHtml(trussSummary)}</strong></div>
                                <div class="client-param"><span>Транспорт</span><strong>${escapeHtml(transportLabel)}</strong></div>
                            </div>
                        </div>
                        <div class="client-card">
                            <div class="client-section-title">Стоимость</div>
                            <table class="client-price-table">
                                <thead><tr><th>Позиция</th><th>Стоимость</th></tr></thead>
                                <tbody>
                                    ${hasStage ? `<tr><td>Прокат сценической конструкции</td><td>${money(stageRental)} ₽</td></tr><tr><td>Монтаж / демонтаж сцены</td><td>${money(stageInstall)} ₽</td></tr>` : ''}
                                    ${hasTruss ? `<tr><td>Прокат ферменной конструкции</td><td>${trussMoney(trussRental)}</td></tr><tr><td>Монтаж / демонтаж ферм</td><td>${trussMoney(trussInstall)}</td></tr>` : ''}
                                    <tr><td>Транспорт общий <span style="font-size:10px;color:#69727d;">(${escapeHtml(transportLabel)})</span></td><td>${money(transport)} ₽</td></tr>
                                    <tr class="client-total-row"><td>Итого к оплате</td><td>${money(total)} ₽</td></tr>
                                </tbody>
                            </table>
                            <div class="client-note">Общее КП объединяет сцену и фермы в одном документе. Техническая комплектация, нагрузки и дополнительные опции уточняются отдельно.</div>
                        </div>
                    </div>
                </div>
                <div class="client-footer-line"><div>FEG Stage PRO</div><div>Общее коммерческое предложение</div></div>
            </div>
        `;
    }

    function downloadTrussTechPdf() { openTrussTechPdfPreview(); }
    function downloadTrussClientPdf() { openTrussClientPdfPreview(); }

    function prepareTrussCloudRow(project) {
        if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.prepareTrussCloudRow === 'function') {
            return ProjectManagerModule.prepareTrussCloudRow(project, cloudSettings, {
                tableName: CLOUD_TABLE_NAME,
                workspaceSuffix: '-truss',
                appVersion: APP_VERSION,
                orderId: project.orderId || ('TR-' + project.id),
                defaultName: 'Фермы'
            });
        }
        if (SupabaseStorageModule && typeof SupabaseStorageModule.prepareCloudProjectRow === 'function') {
            return SupabaseStorageModule.prepareCloudProjectRow(project, cloudSettings, {
                workspaceSuffix: '-truss',
                appVersion: APP_VERSION,
                orderId: project.orderId || ('TR-' + project.id),
                defaultName: 'Фермы'
            });
        }
        const cfg = normalizeCloudSettings(cloudSettings);
        const payload = { ...project, appVersion:APP_VERSION, syncedAt:new Date().toISOString() };
        return { workspace_key: `${cfg.workspaceKey}-truss`, local_id: String(project.id), order_id: project.orderId || ('TR-'+project.id), client: project.client || '', name: project.name || 'Фермы', total: Number(project.total || 0), updated_at: new Date().toISOString(), project_data: payload };
    }
    async function saveTrussProjectToCloud(project) {
        saveCloudSettings();
        if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.saveTrussProjectToCloud === 'function') {
            return await ProjectManagerModule.saveTrussProjectToCloud(project, cloudSettings, {
                tableName: CLOUD_TABLE_NAME,
                workspaceSuffix: '-truss',
                appVersion: APP_VERSION,
                orderId: project.orderId || ('TR-' + project.id),
                defaultName: 'Фермы'
            });
        }
        if (SupabaseStorageModule && typeof SupabaseStorageModule.saveProjectToCloud === 'function') {
            return await SupabaseStorageModule.saveProjectToCloud(project, cloudSettings, {
                tableName: CLOUD_TABLE_NAME,
                workspaceSuffix: '-truss',
                appVersion: APP_VERSION,
                orderId: project.orderId || ('TR-' + project.id),
                defaultName: 'Фермы'
            });
        }
        const db = getSupabaseClient(); const row = prepareTrussCloudRow(project);
        let result;
        if (project.cloudId) result = await db.from(CLOUD_TABLE_NAME).update(row).eq('id', project.cloudId).select().single();
        else {
            const existing = await db.from(CLOUD_TABLE_NAME).select('id').eq('workspace_key', row.workspace_key).eq('local_id', row.local_id).maybeSingle();
            if (existing.error) throw existing.error;
            result = existing.data && existing.data.id ? await db.from(CLOUD_TABLE_NAME).update(row).eq('id', existing.data.id).select().single() : await db.from(CLOUD_TABLE_NAME).insert(row).select().single();
        }
        if (result.error) throw result.error;
        return { ...project, cloudId: result.data.id, cloudUpdatedAt: result.data.updated_at, updatedAt: row.updated_at };
    }
    async function saveCurrentTrussToCloud() {
        try {
            let project = buildTrussSnapshot(trussEditingId || Date.now());
            if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.uploadTrussProjectToCloud === 'function') {
                saveCloudSettings();
                const result = await ProjectManagerModule.uploadTrussProjectToCloud(project, cloudSettings, {
                    tableName: CLOUD_TABLE_NAME,
                    workspaceSuffix: '-truss',
                    appVersion: APP_VERSION,
                    orderId: project.orderId || ('TR-' + project.id),
                    defaultName: 'Фермы',
                    insertIfMissing: true
                });
                trussEditingId = result.project.id;
            } else {
                const saved = await saveTrussProjectToCloud(project);
                const list = getTrussProjects(); const idx = list.findIndex(p => String(p.id) === String(saved.id));
                if (idx >= 0) list[idx] = saved; else list.unshift(saved);
                setTrussProjects(list);
                trussEditingId = saved.id;
            }
            renderTrussProjects(); showToast('Фермы сохранены в облако');
        } catch(err) { console.error(err); alert('Не удалось сохранить фермы в облако: ' + (err && err.message ? err.message : err)); }
    }
    async function uploadSavedTrussToCloud(id) {
        const list = getTrussProjects(); const idx = list.findIndex(p => String(p.id) === String(id)); if (idx < 0) return;
        try {
            if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.uploadTrussProjectToCloud === 'function') {
                saveCloudSettings();
                await ProjectManagerModule.uploadTrussProjectToCloud(list[idx], cloudSettings, {
                    tableName: CLOUD_TABLE_NAME,
                    workspaceSuffix: '-truss',
                    appVersion: APP_VERSION,
                    orderId: list[idx].orderId || ('TR-' + list[idx].id),
                    defaultName: 'Фермы'
                });
            } else {
                list[idx] = await saveTrussProjectToCloud(list[idx]);
                setTrussProjects(list);
            }
            renderTrussProjects(); showToast('Фермы отправлены в облако');
        }
        catch(err) { alert('Не удалось отправить фермы в облако: ' + (err && err.message ? err.message : err)); }
    }
    async function loadTrussesFromCloud() {
        try {
            saveCloudSettings();
            let incoming;
            if (ProjectManagerModule && SupabaseStorageModule && typeof ProjectManagerModule.loadTrussProjectsFromCloud === 'function') {
                const result = await ProjectManagerModule.loadTrussProjectsFromCloud(cloudSettings, {
                    tableName: CLOUD_TABLE_NAME,
                    workspaceSuffix: '-truss',
                    limit: 300,
                    maxItems: 300,
                    defaultName: 'Фермы',
                    preserveNewerLocal: false
                });
                incoming = result.incoming || [];
            } else {
                if (SupabaseStorageModule && typeof SupabaseStorageModule.fetchProjectsFromCloud === 'function') {
                    incoming = await SupabaseStorageModule.fetchProjectsFromCloud(cloudSettings, {
                        tableName: CLOUD_TABLE_NAME,
                        workspaceSuffix: '-truss',
                        limit: 300,
                        defaultName: 'Фермы'
                    });
                } else {
                    const db = getSupabaseClient(); const cfg = normalizeCloudSettings(cloudSettings);
                    const {data, error} = await db.from(CLOUD_TABLE_NAME).select('*').eq('workspace_key', `${cfg.workspaceKey}-truss`).order('updated_at', {ascending:false}).limit(300);
                    if (error) throw error;
                    incoming = (data||[]).map(row => ({ ...(row.project_data || {}), id: (row.project_data && row.project_data.id) || row.local_id, cloudId: row.id, cloudUpdatedAt: row.updated_at, updatedAt: row.updated_at, total: row.total }));
                }
                let list = getTrussProjects();
                if (SupabaseStorageModule && typeof SupabaseStorageModule.mergeCloudProjects === 'function') {
                    list = SupabaseStorageModule.mergeCloudProjects(list, incoming, { preserveNewerLocal: false });
                } else {
                    incoming.forEach(p => { const idx = list.findIndex(x => String(x.cloudId||'')===String(p.cloudId) || String(x.id)===String(p.id)); if (idx>=0) list[idx]=p; else list.push(p); });
                    list.sort((a,b)=>new Date(b.updatedAt||b.date||0)-new Date(a.updatedAt||a.date||0));
                }
                setTrussProjects(list.slice(0,300));
            }
            renderTrussProjects(); showToast(`Фермы из облака: ${incoming.length}`);
        } catch(err) { console.error(err); alert('Не удалось загрузить фермы из облака: ' + (err && err.message ? err.message : err)); }
    }

    window.addEventListener('load', initTrussModule);




    /* --- FEG Stage PRO 3.6.39: база клиентов — bridge к ClientsStorage/ClientsManager/ClientsUI --- */
    let editingClientId = null;

    function makeClientId() {
        if (ClientsStorageModule && typeof ClientsStorageModule.makeClientId === 'function') {
            return ClientsStorageModule.makeClientId();
        }
        return 'CL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    }

    function getClientsWorkspaceKey() {
        if (ClientsManagerModule && typeof ClientsManagerModule.getClientsWorkspaceKey === 'function') {
            return ClientsManagerModule.getClientsWorkspaceKey(cloudSettings, { fallbackWorkspaceKey: makeLocalWorkspaceKey() });
        }
        const base = normalizeCloudSettings(cloudSettings).workspaceKey || makeLocalWorkspaceKey();
        return `${base}-clients`;
    }

    function normalizeClient(raw) {
        if (ClientsStorageModule && typeof ClientsStorageModule.normalizeClient === 'function') {
            return ClientsStorageModule.normalizeClient(raw);
        }
        if (typeof raw === 'string') {
            const name = raw.trim();
            return name ? {
                id: makeClientId(), name, contact: '', phone: '', email: '', address: '', note: '',
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), cloudId: null, cloudUpdatedAt: null
            } : null;
        }
        const source = raw && typeof raw === 'object' ? raw : {};
        const name = String(source.name || source.client || source.title || '').trim();
        if (!name) return null;
        return {
            id: source.id || source.local_id || makeClientId(),
            name,
            contact: String(source.contact || '').trim(),
            phone: String(source.phone || '').trim(),
            email: String(source.email || '').trim(),
            address: String(source.address || '').trim(),
            note: String(source.note || source.comment || '').trim(),
            createdAt: source.createdAt || source.created_at || new Date().toISOString(),
            updatedAt: source.updatedAt || source.updated_at || new Date().toISOString(),
            cloudId: source.cloudId || source.cloud_id || null,
            cloudUpdatedAt: source.cloudUpdatedAt || source.cloud_updated_at || null
        };
    }

    function getClients() {
        if (ClientsStorageModule && typeof ClientsStorageModule.getClients === 'function') {
            return ClientsStorageModule.getClients();
        }
        let result = [];
        try { result = JSON.parse(localStorage.getItem('fegClients') || '[]'); } catch (e) { result = []; }
        if (!Array.isArray(result) || result.length === 0) {
            try {
                const legacy = JSON.parse(localStorage.getItem('clients') || '[]');
                if (Array.isArray(legacy) && legacy.length) result = legacy;
            } catch (e) {}
        }
        return setClients(result);
    }

    function setClients(clients) {
        if (ClientsStorageModule && typeof ClientsStorageModule.setClients === 'function') {
            return ClientsStorageModule.setClients(clients);
        }
        const seen = new Set();
        const normalized = [];
        (clients || []).forEach(item => {
            const client = normalizeClient(item);
            if (!client) return;
            const key = client.name.toLowerCase();
            if (seen.has(key)) {
                const idx = normalized.findIndex(c => c.name.toLowerCase() === key);
                if (idx >= 0) normalized[idx] = { ...normalized[idx], ...client, updatedAt: client.updatedAt || normalized[idx].updatedAt };
                return;
            }
            seen.add(key);
            normalized.push(client);
        });
        normalized.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        localStorage.setItem('fegClients', JSON.stringify(normalized));
        localStorage.setItem('clients', JSON.stringify(normalized.map(c => c.name)));
        return normalized;
    }

    function getClientByName(name) {
        if (ClientsStorageModule && typeof ClientsStorageModule.getClientByName === 'function') {
            return ClientsStorageModule.getClientByName(name);
        }
        const target = String(name || '').trim().toLowerCase();
        if (!target) return null;
        return getClients().find(c => c.name.toLowerCase() === target) || null;
    }

    function ensureClientExists(name, extra = {}) {
        let client = null;
        if (ClientsStorageModule && typeof ClientsStorageModule.ensureClientExists === 'function') {
            client = ClientsStorageModule.ensureClientExists(name, extra);
            renderClients();
            return client;
        }
        const clean = String(name || '').trim();
        if (!clean) return null;
        const clients = getClients();
        let existing = clients.find(c => c.name.toLowerCase() === clean.toLowerCase());
        if (existing) {
            const idx = clients.findIndex(c => c.id === existing.id);
            const next = { ...existing, ...Object.fromEntries(Object.entries(extra).filter(([k, v]) => v !== undefined && v !== null && String(v).trim() !== '')), updatedAt: new Date().toISOString() };
            clients[idx] = next;
            setClients(clients);
            renderClients();
            return next;
        }
        client = normalizeClient({ name: clean, ...extra });
        clients.push(client);
        setClients(clients);
        renderClients();
        return client;
    }

    function getClientProjectCounts(name) {
        const target = String(name || '').trim().toLowerCase();
        let stageCount = 0;
        let trussCount = 0;
        try {
            if (ProjectStorageModule && typeof ProjectStorageModule.countByClient === 'function') {
                stageCount = ProjectStorageModule.countByClient(getLocalOrders(), target);
            } else {
                stageCount = getLocalOrders().filter(o => String(o.client || '').trim().toLowerCase() === target).length;
            }
        } catch (e) {}
        try {
            if (ProjectStorageModule && typeof ProjectStorageModule.countByClient === 'function') {
                trussCount = ProjectStorageModule.countByClient(getTrussProjects(), target);
            } else {
                trussCount = getTrussProjects().filter(o => String(o.client || '').trim().toLowerCase() === target).length;
            }
        } catch (e) {}
        return { stageCount, trussCount };
    }

    function addClient() {
        const name = clientNameInput.value.trim();
        if (!name) { alert('Введите имя клиента'); return; }
        const before = getClients().length;
        const client = ensureClientExists(name);
        const after = getClients().length;
        if (after === before && client) alert('Такой клиент уже есть в списке');
        clientNameInput.value = '';
        if (clientSelect) clientSelect.value = client.name;
        renderClients();
    }

    function renderClients() {
        const clients = getClients();
        if (ClientsUIModule && typeof ClientsUIModule.renderClients === 'function') {
            ClientsUIModule.renderClients({
                clients,
                clientSelect,
                document,
                escapeHtml,
                renderClientsTable
            });
            return;
        }
        const currentStage = clientSelect ? clientSelect.value : '';
        if (clientSelect) {
            clientSelect.innerHTML = '<option value="">— Выберите клиента —</option>';
            clients.forEach(c => {
                const label = [c.name, c.contact, c.phone].filter(Boolean).join(' · ');
                clientSelect.innerHTML += `<option value="${escapeHtml(c.name)}" title="${escapeHtml(label)}">${escapeHtml(c.name)}</option>`;
            });
            if (clients.length === 0) clientSelect.innerHTML = '<option value="">Нет клиентов, добавьте</option>';
            if (currentStage && clients.some(c => c.name === currentStage)) clientSelect.value = currentStage;
        }
        const datalist = document.getElementById('clientDatalist');
        if (datalist) {
            datalist.innerHTML = clients.map(c => `<option value="${escapeHtml(c.name)}"></option>`).join('');
        }
        renderClientsTable();
    }

    function resetClientForm() {
        editingClientId = null;
        if (ClientsUIModule && typeof ClientsUIModule.resetClientForm === 'function') {
            ClientsUIModule.resetClientForm({ document });
            return;
        }
        ['clientDbId','clientDbName','clientDbContact','clientDbPhone','clientDbEmail','clientDbAddress','clientDbNote'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const title = document.getElementById('clientFormTitle');
        if (title) title.textContent = 'Карточка клиента';
    }

    function fillClientForm(client) {
        if (!client) return;
        editingClientId = client.id;
        if (ClientsUIModule && typeof ClientsUIModule.fillClientForm === 'function') {
            ClientsUIModule.fillClientForm(client, { document });
            setAppPage('clients');
            return;
        }
        const map = {
            clientDbId: client.id,
            clientDbName: client.name,
            clientDbContact: client.contact,
            clientDbPhone: client.phone,
            clientDbEmail: client.email,
            clientDbAddress: client.address,
            clientDbNote: client.note
        };
        Object.entries(map).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        });
        const title = document.getElementById('clientFormTitle');
        if (title) title.textContent = 'Редактирование клиента';
        setAppPage('clients');
    }

    function readClientForm() {
        if (ClientsUIModule && typeof ClientsUIModule.readClientForm === 'function') {
            return ClientsUIModule.readClientForm({
                document,
                editingClientId,
                getClients,
                normalizeClient,
                makeClientId
            });
        }
        const val = id => {
            const el = document.getElementById(id);
            return el ? String(el.value || '').trim() : '';
        };
        const name = val('clientDbName');
        if (!name) throw new Error('Введите название клиента / компании.');
        const old = editingClientId ? getClients().find(c => c.id === editingClientId) : null;
        return normalizeClient({
            ...(old || {}),
            id: editingClientId || val('clientDbId') || makeClientId(),
            name,
            contact: val('clientDbContact'),
            phone: val('clientDbPhone'),
            email: val('clientDbEmail'),
            address: val('clientDbAddress'),
            note: val('clientDbNote'),
            createdAt: old && old.createdAt ? old.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            cloudId: old && old.cloudId ? old.cloudId : null,
            cloudUpdatedAt: old && old.cloudUpdatedAt ? old.cloudUpdatedAt : null
        });
    }

    function saveClientCard() {
        try {
            const client = readClientForm();
            let clients = getClients();
            const sameName = clients.find(c => c.name.toLowerCase() === client.name.toLowerCase() && c.id !== client.id);
            if (sameName && !confirm('Клиент с таким названием уже есть. Объединить данные?')) return;
            if (sameName) client.id = sameName.id;
            if (ClientsStorageModule && typeof ClientsStorageModule.upsertClient === 'function') {
                ClientsStorageModule.upsertClient(client);
            } else {
                const idx = clients.findIndex(c => c.id === client.id || c.name.toLowerCase() === client.name.toLowerCase());
                if (idx >= 0) clients[idx] = { ...clients[idx], ...client };
                else clients.push(client);
                setClients(clients);
            }
            renderClients();
            resetClientForm();
            showToast('Клиент сохранён');
        } catch (err) {
            alert(err.message || err);
        }
    }

    function renderClientsTable() {
        const holder = document.getElementById('clientsTable');
        if (!holder) return;
        const clients = getClients();
        if (ClientsUIModule && typeof ClientsUIModule.renderClientsTable === 'function') {
            ClientsUIModule.renderClientsTable({
                document,
                holder,
                clients,
                escapeHtml,
                getClientProjectCounts,
                onEdit: client => fillClientForm(client),
                onSelectStage: client => {
                    if (clientSelect) clientSelect.value = client.name;
                    setAppPage('stage');
                    showToast('Клиент выбран для сцены');
                },
                onSelectTruss: client => {
                    const input = document.getElementById('trussClientName');
                    if (input) input.value = client.name;
                    setAppPage('truss');
                    if (typeof calculateTruss === 'function') calculateTruss();
                    showToast('Клиент выбран для фермы');
                },
                onSaveCloud: async client => saveClientToCloud(client),
                onDelete: (client, counts) => {
                    const warning = counts.stageCount || counts.trussCount ? `

У клиента есть проекты: сцены ${counts.stageCount}, фермы ${counts.trussCount}. Проекты не будут удалены.` : '';
                    if (!confirm(`Удалить клиента ${client.name}?${warning}`)) return;
                    if (ClientsStorageModule && typeof ClientsStorageModule.deleteClientById === 'function') {
                        ClientsStorageModule.deleteClientById(client.id);
                    } else {
                        setClients(getClients().filter(c => c.id !== client.id));
                    }
                    renderClients();
                    if (editingClientId === client.id) resetClientForm();
                }
            });
            return;
        }
        let totalStage = 0;
        let totalTruss = 0;
        const rows = clients.map(client => {
            const counts = getClientProjectCounts(client.name);
            totalStage += counts.stageCount;
            totalTruss += counts.trussCount;
            return `
                <tr>
                    <td><strong>${escapeHtml(client.name)}</strong>${client.cloudId ? ' <span class="client-badge" title="Есть в облаке">☁</span>' : ''}</td>
                    <td>${escapeHtml(client.contact || '—')}</td>
                    <td>${escapeHtml(client.phone || '—')}</td>
                    <td>${escapeHtml(client.email || '—')}</td>
                    <td>${escapeHtml(client.address || '—')}</td>
                    <td><span class="client-badge">Сцены: ${counts.stageCount}</span> <span class="client-badge">Фермы: ${counts.trussCount}</span></td>
                    <td>
                        <div class="client-actions">
                            <button class="client-edit" data-id="${escapeHtml(client.id)}" title="Редактировать">✎</button>
                            <button class="client-stage" data-id="${escapeHtml(client.id)}" title="Выбрать для сцены">▦</button>
                            <button class="client-truss" data-id="${escapeHtml(client.id)}" title="Выбрать для фермы">△</button>
                            <button class="client-cloud" data-id="${escapeHtml(client.id)}" title="Сохранить клиента в облако">☁</button>
                            <button class="client-delete" data-id="${escapeHtml(client.id)}" title="Удалить клиента">🗑</button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
        const statCount = document.getElementById('clientStatCount');
        const statStage = document.getElementById('clientStatStageProjects');
        const statTruss = document.getElementById('clientStatTrussProjects');
        if (statCount) statCount.textContent = clients.length;
        if (statStage) statStage.textContent = totalStage;
        if (statTruss) statTruss.textContent = totalTruss;
        if (clients.length === 0) {
            holder.innerHTML = '<div class="client-empty-state">Клиентов пока нет. Добавьте первого клиента в карточке слева или загрузите из облака.</div>';
            return;
        }
        holder.innerHTML = `
            <div class="client-table-wrap">
                <table class="client-table">
                    <thead><tr><th>Клиент</th><th>Контакт</th><th>Телефон</th><th>Email</th><th>Адрес</th><th>История</th><th>Действия</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        holder.querySelectorAll('.client-edit').forEach(btn => btn.addEventListener('click', () => {
            const client = getClients().find(c => c.id === btn.dataset.id); if (client) fillClientForm(client);
        }));
        holder.querySelectorAll('.client-stage').forEach(btn => btn.addEventListener('click', () => {
            const client = getClients().find(c => c.id === btn.dataset.id); if (!client) return;
            if (clientSelect) clientSelect.value = client.name;
            setAppPage('stage');
            showToast('Клиент выбран для сцены');
        }));
        holder.querySelectorAll('.client-truss').forEach(btn => btn.addEventListener('click', () => {
            const client = getClients().find(c => c.id === btn.dataset.id); if (!client) return;
            const input = document.getElementById('trussClientName'); if (input) input.value = client.name;
            setAppPage('truss');
            if (typeof calculateTruss === 'function') calculateTruss();
            showToast('Клиент выбран для фермы');
        }));
        holder.querySelectorAll('.client-cloud').forEach(btn => btn.addEventListener('click', async () => {
            const client = getClients().find(c => c.id === btn.dataset.id); if (client) await saveClientToCloud(client);
        }));
        holder.querySelectorAll('.client-delete').forEach(btn => btn.addEventListener('click', () => {
            const client = getClients().find(c => c.id === btn.dataset.id); if (!client) return;
            const counts = getClientProjectCounts(client.name);
            const warning = counts.stageCount || counts.trussCount ? `

У клиента есть проекты: сцены ${counts.stageCount}, фермы ${counts.trussCount}. Проекты не будут удалены.` : '';
            if (!confirm(`Удалить клиента ${client.name}?${warning}`)) return;
            if (ClientsStorageModule && typeof ClientsStorageModule.deleteClientById === 'function') {
                ClientsStorageModule.deleteClientById(client.id);
            } else {
                setClients(getClients().filter(c => c.id !== client.id));
            }
            renderClients();
            if (editingClientId === client.id) resetClientForm();
        }));
    }

    function clientCloudPayload(client) {
        if (ClientsManagerModule && typeof ClientsManagerModule.clientCloudPayload === 'function') {
            return ClientsManagerModule.clientCloudPayload(client, cloudSettings, { fallbackWorkspaceKey: makeLocalWorkspaceKey(), tableName: CLOUD_TABLE_NAME });
        }
        return {
            workspace_key: getClientsWorkspaceKey(),
            local_id: String(client.id),
            order_id: String(client.id),
            client: client.name,
            name: client.name,
            total: 0,
            project_data: { type: 'feg-stage-pro-client', version: '3.4', client }
        };
    }

    function clientFromCloudRow(row) {
        if (ClientsManagerModule && typeof ClientsManagerModule.clientFromCloudRow === 'function') {
            return ClientsManagerModule.clientFromCloudRow(row);
        }
        const data = row && row.project_data && row.project_data.client ? row.project_data.client : (row.project_data || {});
        const client = normalizeClient({ ...data, id: data.id || row.local_id, name: data.name || row.name || row.client });
        if (!client) return null;
        client.cloudId = row.id;
        client.cloudUpdatedAt = row.updated_at;
        client.updatedAt = client.updatedAt || row.updated_at;
        return client;
    }

    async function saveClientToCloud(client) {
        try {
            saveCloudSettings();
            let saved;
            if (ClientsManagerModule && typeof ClientsManagerModule.saveClientToCloud === 'function') {
                saved = await ClientsManagerModule.saveClientToCloud(client, cloudSettings, { fallbackWorkspaceKey: makeLocalWorkspaceKey(), tableName: CLOUD_TABLE_NAME });
            } else {
                const db = getSupabaseClient();
                const payload = clientCloudPayload(client);
                const { data, error } = await db.from(CLOUD_TABLE_NAME).upsert(payload, { onConflict: 'workspace_key,local_id' }).select().single();
                if (error) throw error;
                saved = clientFromCloudRow(data) || client;
            }
            const clients = getClients();
            const idx = clients.findIndex(c => c.id === client.id);
            if (idx >= 0) clients[idx] = { ...clients[idx], cloudId: saved.cloudId, cloudUpdatedAt: saved.cloudUpdatedAt, updatedAt: saved.updatedAt || clients[idx].updatedAt };
            setClients(clients);
            renderClients();
            showToast('Клиент сохранён в облако');
        } catch (err) {
            alert('Не удалось сохранить клиента в облако: ' + (err && err.message ? err.message : err));
        }
    }

    async function saveAllClientsToCloud() {
        const clients = getClients();
        if (!clients.length) { alert('Нет клиентов для сохранения.'); return; }
        for (const client of clients) await saveClientToCloud(client);
    }

    async function loadClientsFromCloud() {
        try {
            saveCloudSettings();
            if (ClientsManagerModule && typeof ClientsManagerModule.loadClientsFromCloud === 'function') {
                const result = await ClientsManagerModule.loadClientsFromCloud(cloudSettings, { fallbackWorkspaceKey: makeLocalWorkspaceKey(), tableName: CLOUD_TABLE_NAME });
                renderClients();
                showToast(`Загружено клиентов из облака: ${result.incoming.length}`);
                return;
            }
            const db = getSupabaseClient();
            const { data, error } = await db.from(CLOUD_TABLE_NAME)
                .select('*')
                .eq('workspace_key', getClientsWorkspaceKey())
                .order('updated_at', { ascending: false });
            if (error) throw error;
            const incoming = (data || []).map(clientFromCloudRow).filter(Boolean);
            let clients = getClients();
            incoming.forEach(client => {
                const idx = clients.findIndex(c => c.id === client.id || c.name.toLowerCase() === client.name.toLowerCase() || (client.cloudId && c.cloudId === client.cloudId));
                if (idx >= 0) {
                    const localTime = new Date(clients[idx].updatedAt || 0).getTime();
                    const cloudTime = new Date(client.updatedAt || client.cloudUpdatedAt || 0).getTime();
                    clients[idx] = cloudTime >= localTime ? { ...clients[idx], ...client } : { ...clients[idx], cloudId: client.cloudId, cloudUpdatedAt: client.cloudUpdatedAt };
                } else {
                    clients.push(client);
                }
            });
            setClients(clients);
            renderClients();
            showToast(`Загружено клиентов из облака: ${incoming.length}`);
        } catch (err) {
            alert('Не удалось загрузить клиентов из облака: ' + (err && err.message ? err.message : err));
        }
    }



    /* --- FEG Stage PRO 3.4: переключение страниц stage / clients / truss --- */
    function getNavigationCallbacks() {
        return {
            renderTrussGrid: typeof renderTrussGrid === 'function' ? renderTrussGrid : null,
            calculateTruss: typeof calculateTruss === 'function' ? calculateTruss : null,
            renderClients: typeof renderClients === 'function' ? renderClients : null,
            fitGridToScreen: typeof fitGridToScreen === 'function' ? fitGridToScreen : null,
            calc: typeof calc === 'function' ? calc : null
        };
    }

    function normalizeAppPage(page) {
        if (NavigationManagerModule && typeof NavigationManagerModule.normalizePage === 'function') {
            return NavigationManagerModule.normalizePage(page);
        }
        const target = String(page || '').replace(/^#/, '').trim().toLowerCase();
        return target === 'truss' ? 'truss' : (target === 'clients' ? 'clients' : 'stage');
    }

    function setAppPage(page, updateHash = true) {
        const target = normalizeAppPage(page);
        if (NavigationManagerModule && typeof NavigationManagerModule.setPage === 'function') {
            return NavigationManagerModule.setPage(target, {
                document,
                window,
                updateHash,
                callbacks: getNavigationCallbacks()
            });
        }

        const isStage = target === 'stage';
        const isClients = target === 'clients';
        const isTruss = target === 'truss';
        const stagePage = document.getElementById('stagePage');
        const clientsPage = document.getElementById('clientsPage');
        const trussPage = document.getElementById('trussPage');
        const stageBtn = document.getElementById('navStageBtn');
        const clientsBtn = document.getElementById('navClientsBtn');
        const trussBtn = document.getElementById('navTrussBtn');

        if (stagePage) stagePage.classList.toggle('active-page', isStage);
        if (clientsPage) clientsPage.classList.toggle('active-page', isClients);
        if (trussPage) trussPage.classList.toggle('active-page', isTruss);
        document.body.classList.toggle('page-stage', isStage);
        document.body.classList.toggle('page-clients', isClients);
        document.body.classList.toggle('page-truss', isTruss);

        [
            [stageBtn, isStage],
            [clientsBtn, isClients],
            [trussBtn, isTruss]
        ].forEach(([btn, active]) => {
            if (!btn) return;
            btn.classList.toggle('active', !!active);
            btn.classList.toggle('btn-primary', !!active);
            btn.classList.toggle('btn-secondary', !active);
            btn.setAttribute('aria-current', active ? 'page' : 'false');
        });

        if (updateHash && window.location.hash !== `#${target}`) {
            history.replaceState(null, '', `#${target}`);
        }

        setTimeout(() => {
            if (isTruss) {
                if (typeof renderTrussGrid === 'function') renderTrussGrid();
                if (typeof calculateTruss === 'function') calculateTruss();
            } else if (isClients) {
                if (typeof renderClients === 'function') renderClients();
            } else {
                if (typeof fitGridToScreen === 'function') fitGridToScreen();
                if (typeof calc === 'function') calc(false);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 40);

        return target;
    }

    function getAppPageFromHash() {
        if (NavigationManagerModule && typeof NavigationManagerModule.pageFromHash === 'function') {
            return NavigationManagerModule.pageFromHash(window.location.hash);
        }
        return normalizeAppPage(window.location.hash);
    }

    function bindAppNavigation() {
        if (NavigationManagerModule && typeof NavigationManagerModule.initNavigation === 'function') {
            return NavigationManagerModule.initNavigation({
                document,
                window,
                getPage: getAppPageFromHash,
                onNavigate: (page, updateHash) => setAppPage(page, updateHash),
                afterInitialRender: () => renderClients()
            });
        }

        window.addEventListener('load', () => {
            setAppPage(getAppPageFromHash(), false);
            renderClients();
        });

        window.addEventListener('hashchange', () => {
            setAppPage(getAppPageFromHash(), false);
        });

        return function noopUnbindNavigation() {};
    }

    bindAppNavigation();



    /* --- FEG Stage PRO 3.4: 3D-конструкции из ферм, тип "табуретка" --- */
    const FEG34_originalCalculateTruss = calculateTruss;
    const FEG34_originalRenderTrussResult = renderTrussResult;
    const FEG34_originalTrussHasScheme = trussHasScheme;
    const FEG34_originalBuildTrussSnapshot = buildTrussSnapshot;
    const FEG34_originalApplyTrussProject = applyTrussProject;
    const FEG34_originalCreateTrussSchemeImageHtml = createTrussSchemeImageHtml;
    const FEG34_originalCreateTrussCanvas = createTrussCanvas;
    const FEG34_originalClearTrussConfirm = clearTrussConfirm;
    const FEG34_originalPrepareTrussCloudRow = prepareTrussCloudRow;

    function installTruss3DUI() {
        const controls = document.querySelector('#trussModule .truss-controls');
        if (controls && !document.getElementById('trussConstructionType')) {
            const wrap = document.createElement('div');
            wrap.innerHTML = '<label for="trussConstructionType">Тип конструкции</label><select id="trussConstructionType"><option value="2d" selected>2D фермы / портал</option><option value="stool3d">3D табуретка</option></select>';
            controls.insertBefore(wrap, controls.firstChild);
        }
        const side = document.querySelector('#trussModule .truss-side-grid');
        if (side && !document.getElementById('trussDepthM')) {
            const depth = document.createElement('div');
            depth.innerHTML = '<label for="trussDepthM">Глубина 3D, м</label><input id="trussDepthM" type="number" min="0.5" step="0.5" value="3">';
            const height = document.getElementById('trussHeightM');
            const heightBox = height ? height.closest('div') : null;
            if (heightBox && heightBox.nextSibling) side.insertBefore(depth, heightBox.nextSibling);
            else side.appendChild(depth);
        }
        const toolbar = document.querySelector('#trussModule .truss-toolbar');
        if (toolbar && !document.getElementById('trussStoolTemplateBtn')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'trussStoolTemplateBtn';
            btn.className = 'btn-secondary';
            btn.textContent = 'Табуретка 3D';
            btn.onclick = applyTrussStool3DTemplate;
            toolbar.insertBefore(btn, toolbar.firstChild);
        }
        const gridWrap = document.querySelector('#trussModule .truss-grid-wrap');
        if (gridWrap && !document.getElementById('truss3DPreview')) {
            const preview = document.createElement('div');
            preview.id = 'truss3DPreview';
            preview.className = 'truss-3d-preview';
            gridWrap.insertAdjacentElement('afterend', preview);
        }
        ['trussConstructionType','trussDepthM','trussWidthM','trussHeightM','trussPricePerMeter','trussCornerPrice','trussBasePrice','trussInstallCost','trussWeightPerMeter','trussCornerWeight','trussBaseWeight'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.truss3dBound) {
                el.dataset.truss3dBound = '1';
                el.addEventListener('input', () => { updateTruss3DModeUI(); calculateTruss(); });
                el.addEventListener('change', () => { updateTruss3DModeUI(); calculateTruss(); });
            }
        });
        updateTruss3DModeUI();
    }

    function getTrussConstructionType() {
        const el = document.getElementById('trussConstructionType');
        return el ? el.value : '2d';
    }
    function isTruss3DStool() { return getTrussConstructionType() === 'stool3d'; }
    function setTrussConstructionType(value) {
        const el = document.getElementById('trussConstructionType');
        if (el) el.value = value || '2d';
        updateTruss3DModeUI();
    }
    function getTrussDepthM() { return Math.max(0.5, getTrussNumber('trussDepthM', 3)); }

    function updateTruss3DModeUI() {
        const is3d = isTruss3DStool();
        const gridWrap = document.querySelector('#trussModule .truss-grid-wrap');
        const caption = document.querySelector('#trussModule .truss-caption');
        const preview = document.getElementById('truss3DPreview');
        const depthBox = document.getElementById('trussDepthM') ? document.getElementById('trussDepthM').closest('div') : null;
        if (gridWrap) gridWrap.style.display = is3d ? 'none' : '';
        if (caption) caption.style.display = is3d ? 'none' : '';
        if (depthBox) depthBox.style.display = is3d ? '' : 'none';
        if (preview) {
            preview.classList.toggle('active', is3d);
            if (is3d) preview.innerHTML = createTruss3DSvgHtml(900, 430, true);
        }
        const countLabel = document.getElementById('trussCountLabel');
        if (countLabel && is3d) countLabel.textContent = '3D табуретка';
    }

    function applyTrussStool3DTemplate() {
        setTrussConstructionType('stool3d');
        trussSegmentsH.clear();
        trussSegmentsV.clear();
        setTrussNumber('trussSupportCount', 4);
        if (!getTrussText('trussProjectName')) setTrussText('trussProjectName', '3D конструкция «табуретка»');
        renderTrussGrid();
        calculateTruss();
        showToast('Включён расчёт 3D конструкции типа «табуретка»');
    }

    function calculateTruss3DStool() {
        const widthM = Math.max(0.5, getTrussNumber('trussWidthM', 6));
        const depthM = getTrussDepthM();
        const heightM = Math.max(0.5, getTrussNumber('trussHeightM', 3));
        const topRuns = [widthM, widthM, depthM, depthM];
        const verticalRuns = [heightM, heightM, heightM, heightM];
        const runs = [
            ...topRuns.map((meters, i) => ({ orientation: i < 2 ? '3d-width' : '3d-depth', line: i, start: 0, count: 1, meters })),
            ...verticalRuns.map((meters, i) => ({ orientation: '3d-height', line: i, start: 0, count: 1, meters }))
        ];
        const totalMeters = runs.reduce((sum, r) => sum + r.meters, 0);
        const topPerimeterMeters = topRuns.reduce((a,b)=>a+b,0);
        const verticalMeters = verticalRuns.reduce((a,b)=>a+b,0);
        const pieces = { '3':0, '2':0, '1':0, '0.5':0 };
        runs.forEach(run => {
            const split = splitTrussLength(run.meters);
            Object.keys(split).forEach(k => { pieces[k] += split[k]; });
        });
        const topCubes = 4;
        const bases = 4;
        const pricePerMeter = getTrussNumber('trussPricePerMeter', 0);
        const cornerPrice = getTrussNumber('trussCornerPrice', 0);
        const basePrice = getTrussNumber('trussBasePrice', 0);
        const install = getTrussNumber('trussInstallCost', 0);
        const transport = typeof calculateTransportCost === 'function' ? calculateTransportCost(transportSettings) : 0;
        const rentalCost = totalMeters * pricePerMeter + topCubes * cornerPrice + bases * basePrice;
        const total = rentalCost + install + transport;
        const weight = totalMeters * getTrussNumber('trussWeightPerMeter', 0) + topCubes * getTrussNumber('trussCornerWeight', 0) + bases * getTrussNumber('trussBaseWeight', 0);
        return {
            is3D: true,
            constructionType: 'stool3d',
            constructionLabel: '3D табуретка',
            widthM, depthM, heightM,
            dimensionsLabel: `${trussMetric(widthM)} × ${trussMetric(depthM)} × ${trussMetric(heightM)} м`,
            runs, pieces, totalMeters, topPerimeterMeters, verticalMeters,
            corners: topCubes,
            topCubes,
            bases,
            terminalNodes: 0,
            crossNodes: 0,
            supportCount: bases,
            rentalCost, install, transport, total, weight,
            cellMeters: trussCellMeters, cols: trussCols, rows: trussRows
        };
    }

    function calculateTruss() {
        installTruss3DUI();
        if (isTruss3DStool()) {
            lastTrussResult = calculateTruss3DStool();
            renderTrussResult();
            updateTruss3DModeUI();
            return lastTrussResult;
        }
        const result = FEG34_originalCalculateTruss();
        if (result) result.constructionType = '2d';
        updateTruss3DModeUI();
        return result;
    }

    function renderTrussResult() {
        const res = lastTrussResult || calculateTruss();
        if (!res || !res.is3D) return FEG34_originalRenderTrussResult();
        const box = getTrussEl('trussResult');
        if (box) {
            box.innerHTML = `
                <div>Тип конструкции</div><div><span class="truss-3d-badge">▧ ${escapeHtml(res.constructionLabel)}</span></div>
                <div>Габариты Ш×Г×В</div><div>${escapeHtml(res.dimensionsLabel)}</div>
                <div>Верхний периметр</div><div>${trussMetric(res.topPerimeterMeters)} м</div>
                <div>Вертикальные ноги</div><div>${trussMetric(res.verticalMeters)} м</div>
                <div>Общий метраж ферм</div><div>${trussMetric(res.totalMeters)} м</div>
                <div>Верхние кубы / углы</div><div>${res.topCubes} шт</div>
                <div>Базы / пятки</div><div>${res.bases} шт</div>
                <div>Вес комплекта</div><div>${trussMetric(res.weight)} кг</div>
                <div>Прокат конструкции</div><div>${trussMoney(res.rentalCost)}</div>
                <div>Монтаж</div><div>${trussMoney(res.install)}</div>
                <div>Транспорт</div><div>${trussMoney(res.transport)}</div>
                <div><b>ИТОГО</b></div><div><b>${trussMoney(res.total)}</b></div>
            `;
        }
        const body = getTrussEl('trussPiecesBody');
        if (body) {
            body.innerHTML = `
                <tr><td>Ферма 3 м</td><td>${res.pieces['3']} шт</td></tr>
                <tr><td>Ферма 2 м</td><td>${res.pieces['2']} шт</td></tr>
                <tr><td>Ферма 1 м</td><td>${res.pieces['1']} шт</td></tr>
                <tr><td>Ферма 0.5 м</td><td>${res.pieces['0.5']} шт</td></tr>
                <tr><td>Верхний прямоугольник</td><td>${trussMetric(res.topPerimeterMeters)} м</td></tr>
                <tr><td>Вертикальные ноги из ферм</td><td>4 × ${trussMetric(res.heightM)} м</td></tr>
                <tr><td>Верхний куб / угол</td><td>${res.topCubes} шт</td></tr>
                <tr><td>База / пятка</td><td>${res.bases} шт</td></tr>
            `;
        }
    }

    function trussHasScheme() {
        return isTruss3DStool() || FEG34_originalTrussHasScheme();
    }

    function createTruss3DSvgHtml(width = 900, height = 430, withLabels = true) {
        const widthM = Math.max(0.5, getTrussNumber('trussWidthM', 6));
        const depthM = getTrussDepthM();
        const heightM = Math.max(0.5, getTrussNumber('trussHeightM', 3));
        const maxW = Math.max(widthM, depthM, heightM, 1);
        const sx = Math.min(58, Math.max(30, 360 / Math.max(widthM + depthM * .55, 1)));
        const sy = Math.min(56, Math.max(30, 210 / Math.max(heightM, 1)));
        const ox = 78;
        const oy = 70;
        const dx = depthM * sx * .55;
        const dy = depthM * sx * .32;
        const wx = widthM * sx;
        const hz = heightM * sy;
        const A = [ox, oy];
        const B = [ox + wx, oy];
        const D = [ox + dx, oy + dy];
        const C = [ox + wx + dx, oy + dy];
        const A2 = [A[0], A[1] + hz];
        const B2 = [B[0], B[1] + hz];
        const C2 = [C[0], C[1] + hz];
        const D2 = [D[0], D[1] + hz];
        const minX = Math.min(A[0],B[0],C[0],D[0],A2[0],B2[0],C2[0],D2[0]);
        const maxX = Math.max(A[0],B[0],C[0],D[0],A2[0],B2[0],C2[0],D2[0]);
        const minY = Math.min(A[1],B[1],C[1],D[1]);
        const maxY = Math.max(A2[1],B2[1],C2[1],D2[1]);
        const viewW = Math.max(width, maxX + 120);
        const viewH = Math.max(height, maxY + 80);
        const p = (pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`;
        const line = (p1,p2,cls='main') => `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" class="${cls}"/>`;
        const dot = (pt,label='') => `<circle cx="${pt[0]}" cy="${pt[1]}" r="7" class="node"/>${label ? `<text x="${pt[0]+10}" y="${pt[1]-8}" class="node-label">${label}</text>` : ''}`;
        const labels = withLabels ? `
            <text x="${(A[0]+B[0])/2-35}" y="${A[1]-16}" class="dim">Ширина ${trussMetric(widthM)} м</text>
            <text x="${C[0]+10}" y="${(C[1]+C2[1])/2}" class="dim">Высота ${trussMetric(heightM)} м</text>
            <text x="${D[0]-10}" y="${D[1]+26}" class="dim">Глубина ${trussMetric(depthM)} м</text>
        ` : '';
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}" role="img" aria-label="3D конструкция табуретка">
                <defs>
                    <linearGradient id="trussGreen34" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stop-color="#b8d3c4"/>
                        <stop offset="0.5" stop-color="#2E8B57"/>
                        <stop offset="1" stop-color="#154d31"/>
                    </linearGradient>
                    <filter id="shadow34" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#000" flood-opacity=".22"/></filter>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" rx="22" fill="#ffffff"/>
                <g stroke="#e2e8f0" stroke-width="1">
                    <path d="M40 ${A2[1]+34} H${viewW-50}"/>
                    <path d="M40 ${A2[1]+64} H${viewW-80}"/>
                </g>
                <g filter="url(#shadow34)" stroke-linecap="round" stroke-linejoin="round">
                    ${line(A,B)}${line(B,C)}${line(C,D)}${line(D,A)}
                    ${line(A,A2)}${line(B,B2)}${line(C,C2)}${line(D,D2)}
                    ${line(A2,B2,'base')}${line(B2,C2,'base')}${line(C2,D2,'base')}${line(D2,A2,'base')}
                    ${dot(A,'куб')}${dot(B,'куб')}${dot(C,'куб')}${dot(D,'куб')}
                    ${dot(A2,'база')}${dot(B2,'база')}${dot(C2,'база')}${dot(D2,'база')}
                </g>
                ${labels}
                <text x="40" y="38" class="title">3D конструкция «табуретка» · ${trussMetric(widthM)} × ${trussMetric(depthM)} × ${trussMetric(heightM)} м</text>
                <text x="40" y="${viewH-24}" class="note">Комплектовочная схема. Нагрузки и балласт проверяются отдельно.</text>
                <style>
                    .main{stroke:url(#trussGreen34);stroke-width:12;}
                    .base{stroke:#8b6b45;stroke-width:5;opacity:.6;stroke-dasharray:8 8;}
                    .node{fill:#2E8B57;stroke:#ffffff;stroke-width:3;}
                    .title{font:700 22px Arial, sans-serif;fill:#183527;}
                    .dim{font:700 15px Arial, sans-serif;fill:#3b2a1c;}
                    .note,.node-label{font:600 12px Arial, sans-serif;fill:#69727d;}
                </style>
            </svg>`;
        return svg;
    }

    function createTruss3DCanvas(width = 900, height = 460) {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
        const widthM = Math.max(0.5, getTrussNumber('trussWidthM', 6));
        const depthM = getTrussDepthM();
        const heightM = Math.max(0.5, getTrussNumber('trussHeightM', 3));
        const sx = Math.min(58, Math.max(30, 360 / Math.max(widthM + depthM * .55, 1)));
        const sy = Math.min(56, Math.max(30, 210 / Math.max(heightM, 1)));
        const ox = 80, oy = 70, dx = depthM * sx * .55, dy = depthM * sx * .32, wx = widthM * sx, hz = heightM * sy;
        const A=[ox,oy], B=[ox+wx,oy], D=[ox+dx,oy+dy], C=[ox+wx+dx,oy+dy], A2=[A[0],A[1]+hz], B2=[B[0],B[1]+hz], C2=[C[0],C[1]+hz], D2=[D[0],D[1]+hz];
        function drawLine(p1,p2,color,w){ ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]); ctx.stroke(); }
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; for(let y=A2[1]+34; y<height-25; y+=30){ ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(width-50,y); ctx.stroke(); }
        [ [A,B],[B,C],[C,D],[D,A],[A,A2],[B,B2],[C,C2],[D,D2] ].forEach(pair=>drawLine(pair[0],pair[1],'#2E8B57',12));
        [ [A2,B2],[B2,C2],[C2,D2],[D2,A2] ].forEach(pair=>drawLine(pair[0],pair[1],'rgba(139,107,69,.55)',5));
        ctx.fillStyle = '#2E8B57'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
        [A,B,C,D,A2,B2,C2,D2].forEach(pt=>{ ctx.beginPath(); ctx.arc(pt[0],pt[1],7,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
        ctx.fillStyle = '#183527'; ctx.font = 'bold 22px Arial'; ctx.fillText(`3D конструкция «табуретка» · ${trussMetric(widthM)} × ${trussMetric(depthM)} × ${trussMetric(heightM)} м`, 40, 38);
        ctx.fillStyle = '#69727d'; ctx.font = '12px Arial'; ctx.fillText('Комплектовочная схема. Нагрузки и балласт проверяются отдельно.', 40, height-22);
        return canvas;
    }

    function createTrussCanvas(width=700, height=360) {
        if (isTruss3DStool()) return createTruss3DCanvas(width, height);
        return FEG34_originalCreateTrussCanvas(width, height);
    }

    function createTrussSchemeImageHtml(width = 520, height = 260) {
        if (isTruss3DStool()) {
            const svg = createTruss3DSvgHtml(900, 430, true);
            const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            return `<img src="${dataUrl}" style="width:100%;max-height:${height}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
        }
        return FEG34_originalCreateTrussSchemeImageHtml(width, height);
    }

    function buildTrussSnapshot(id) {
        const snap = FEG34_originalBuildTrussSnapshot(id);
        const type = getTrussConstructionType();
        snap.appVersion = '3.4.7';
        snap.constructionType = type;
        snap.params = snap.params || {};
        snap.params.constructionType = type;
        snap.params.depthM = getTrussDepthM();
        if (type === 'stool3d') {
            snap.name = getTrussText('trussProjectName') || '3D конструкция «табуретка»';
            snap.segmentsH = [];
            snap.segmentsV = [];
        }
        snap.result = lastTrussResult || calculateTruss();
        snap.total = snap.result ? snap.result.total : snap.total;
        return snap;
    }

    function applyTrussProject(project) {
        if (!project) return;
        const type = (project.constructionType || (project.params && project.params.constructionType) || '2d');
        setTrussConstructionType(type);
        if (type === 'stool3d') {
            trussCols = Number(project.cols || TRUSS_DEFAULT_COLS);
            trussRows = Number(project.rows || TRUSS_DEFAULT_ROWS);
            trussCellMeters = Number(project.cellMeters || 0.5);
            trussSegmentsH = new Set(project.segmentsH || []);
            trussSegmentsV = new Set(project.segmentsV || []);
            setTrussNumber('trussCols', trussCols); setTrussNumber('trussRows', trussRows);
            const cellSel = getTrussEl('trussCellMeters'); if (cellSel) cellSel.value = String(trussCellMeters);
            setTrussText('trussClientName', project.client || ''); setTrussText('trussProjectName', project.name || '');
            const p = project.params || {};
            Object.entries({ trussSupportCount:p.supportCount, trussInstallCost:p.installCost, trussPricePerMeter:p.pricePerMeter, trussCornerPrice:p.cornerPrice, trussUprightPrice:p.uprightPrice, trussBasePrice:p.basePrice, trussWeightPerMeter:p.weightPerMeter, trussCornerWeight:p.cornerWeight, trussUprightWeight:p.uprightWeight, trussBaseWeight:p.baseWeight, trussWidthM:p.widthM, trussHeightM:p.heightM, trussDepthM:p.depthM }).forEach(([id,val]) => { if (val !== undefined) setTrussNumber(id,val); });
            if (!p.supportCount) setTrussNumber('trussSupportCount', 4);
            trussEditingId = project.id;
            saveTrussDraftSettings(); renderTrussGrid(); calculateTruss();
            const module = document.getElementById('blockTrussModule') || document.getElementById('trussPage'); if (module) module.scrollIntoView({behavior:'smooth', block:'start'});
            showToast('3D ферменный проект открыт');
            return;
        }
        FEG34_originalApplyTrussProject(project);
        setTrussConstructionType('2d');
        updateTruss3DModeUI();
    }

    function clearTrussConfirm() {
        if (isTruss3DStool()) {
            if (confirm('Очистить 3D конструкцию и вернуться к 2D ферме?')) {
                setTrussConstructionType('2d');
                trussSegmentsH.clear(); trussSegmentsV.clear(); trussEditingId = null;
                renderTrussGrid(); calculateTruss();
            }
            return;
        }
        return FEG34_originalClearTrussConfirm();
    }

    prepareTrussCloudRow = function(project) {
        const row = FEG34_originalPrepareTrussCloudRow(project);
        if (row && row.project_data) {
            row.project_data.appVersion = '3.4.7';
            row.project_data.constructionType = project.constructionType || (project.params && project.params.constructionType) || '2d';
        }
        return row;
    };

    installTruss3DUI();
    window.addEventListener('load', () => {
        installTruss3DUI();
        calculateTruss();
    });


    /* --- FEG Stage PRO 3.4.7: защита кнопок ферменного блока и PDF без активной сцены --- */
    const FEG341_saveTrussProject = saveTrussProject;
    saveTrussProject = function() {
        try {
            return FEG341_saveTrussProject();
        } catch (err) {
            console.error(err);
            alert('Не удалось сохранить ферменный проект: ' + (err && err.message ? err.message : err));
        }
    };
    const FEG341_openTrussTechPdfPreview = openTrussTechPdfPreview;
    openTrussTechPdfPreview = async function() {
        try { return await FEG341_openTrussTechPdfPreview(); }
        catch (err) { console.error(err); alert('Не удалось открыть технический PDF ферм: ' + (err && err.message ? err.message : err)); }
    };
    const FEG341_openTrussClientPdfPreview = openTrussClientPdfPreview;
    openTrussClientPdfPreview = async function() {
        try { return await FEG341_openTrussClientPdfPreview(); }
        catch (err) { console.error(err); alert('Не удалось открыть КП по фермам: ' + (err && err.message ? err.message : err)); }
    };
    const FEG341_openCombinedClientPdfPreview = openCombinedClientPdfPreview;
    openCombinedClientPdfPreview = async function() {
        try { return await FEG341_openCombinedClientPdfPreview(); }
        catch (err) { console.error(err); alert('Не удалось открыть общее КП: ' + (err && err.message ? err.message : err)); }
    };



    /* --- FEG Stage PRO 3.4.7: окончательный безопасный общий PDF без рекурсии --- */
    (function(){
        function f343Money(v) {
            try { return typeof money === 'function' ? money(v) : Number(v || 0).toLocaleString('ru-RU'); }
            catch(e) { return String(Math.round(Number(v || 0))); }
        }
        function f343Metric(v) {
            try { return typeof metric === 'function' ? metric(v) : Number(v || 0).toFixed(1).replace('.0',''); }
            catch(e) { return String(v || 0); }
        }
        function f343TrussMetric(v) {
            try { return typeof trussMetric === 'function' ? trussMetric(v) : Number(v || 0).toFixed(1).replace('.0',''); }
            catch(e) { return String(v || 0); }
        }
        function f343Escape(v) {
            try { return typeof escapeHtml === 'function' ? escapeHtml(String(v ?? '')) : String(v ?? ''); }
            catch(e) { return String(v ?? ''); }
        }
        function f343HasStage() {
            try {
                if (typeof selectedModules !== 'undefined' && selectedModules && selectedModules.size && !lastResult && typeof calc === 'function') calc(false);
            } catch (e) { console.error(e); }
            return !!(typeof lastResult !== 'undefined' && lastResult);
        }
        function f343HasTruss() {
            try {
                if (typeof isTruss3DStool === 'function' && isTruss3DStool()) return true;
                return !!((typeof trussSegmentsH !== 'undefined' && trussSegmentsH && trussSegmentsH.size) || (typeof trussSegmentsV !== 'undefined' && trussSegmentsV && trussSegmentsV.size));
            } catch (e) { console.error(e); return false; }
        }
        function f343CalcTransport() {
            try {
                const ts = typeof normalizeTransportSettings === 'function' ? normalizeTransportSettings(transportSettings) : transportSettings;
                return typeof calculateTransportCost === 'function' ? Number(calculateTransportCost(ts) || 0) : 0;
            } catch(e) { console.error(e); return 0; }
        }
        function f343TransportLabel() {
            try {
                const ts = typeof normalizeTransportSettings === 'function' ? normalizeTransportSettings(transportSettings) : transportSettings;
                return typeof getTransportLabel === 'function' ? getTransportLabel(ts) : 'Транспорт';
            } catch(e) { return 'Транспорт'; }
        }
        function f343CalcTrussNoRender() {
            if (!f343HasTruss()) return null;
            try {
                if (typeof isTruss3DStool === 'function' && isTruss3DStool() && typeof calculateTruss3DStool === 'function') {
                    const res3d = calculateTruss3DStool();
                    lastTrussResult = res3d;
                    return res3d;
                }
                const runs = [
                    ...getRunsFromSegments(trussSegmentsH, 'h'),
                    ...getRunsFromSegments(trussSegmentsV, 'v')
                ];
                const totalMeters = runs.reduce((sum, r) => sum + Number(r.meters || 0), 0);
                const pieces = { '3':0, '2':0, '1':0, '0.5':0 };
                runs.forEach(run => {
                    const split = splitTrussLength(Number(run.meters || 0));
                    Object.keys(split).forEach(k => { pieces[k] += Number(split[k] || 0); });
                });
                const nodes = getTrussNodes();
                let corners = 0, terminalNodes = 0, crossNodes = 0;
                nodes.forEach(node => {
                    if (node.h > 0 && node.v > 0) corners += 1;
                    if (node.degree === 1) terminalNodes += 1;
                    if (node.degree >= 4) crossNodes += 1;
                });
                const supportCount = Math.max(0, Math.round(getTrussNumber('trussSupportCount', Math.max(0, terminalNodes))));
                const pricePerMeter = getTrussNumber('trussPricePerMeter', 0);
                const cornerPrice = getTrussNumber('trussCornerPrice', 0);
                const uprightPrice = getTrussNumber('trussUprightPrice', 0);
                const basePrice = getTrussNumber('trussBasePrice', 0);
                const install = getTrussNumber('trussInstallCost', 0);
                const rentalCost = totalMeters * pricePerMeter + corners * cornerPrice + supportCount * (uprightPrice + basePrice);
                const weight = totalMeters * getTrussNumber('trussWeightPerMeter', 0) + corners * getTrussNumber('trussCornerWeight', 0) + supportCount * (getTrussNumber('trussUprightWeight', 0) + getTrussNumber('trussBaseWeight', 0));
                const res = { is3D:false, constructionType:'2d', runs, pieces, totalMeters, corners, terminalNodes, crossNodes, supportCount, rentalCost, install, transport:f343CalcTransport(), total:rentalCost + install + f343CalcTransport(), weight, cellMeters: trussCellMeters, cols: trussCols, rows: trussRows };
                lastTrussResult = res;
                return res;
            } catch (e) {
                console.error(e);
                return null;
            }
        }
        function f343TrussSchemeHtml(width = 520, height = 190) {
            if (!f343HasTruss()) return '<div style="font-size:12px;color:#69727d;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Схема фермы не выбрана</div>';
            try {
                if (typeof isTruss3DStool === 'function' && isTruss3DStool() && typeof createTruss3DSvgHtml === 'function') {
                    const svg = createTruss3DSvgHtml(900, 430, true);
                    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
                    return `<img src="${dataUrl}" style="width:100%;max-height:${height}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
                }
                const maker = (typeof FEG34_originalCreateTrussCanvas === 'function') ? FEG34_originalCreateTrussCanvas : createTrussCanvas;
                const canvas = maker(900, 460);
                const dataUrl = canvas.toDataURL('image/png');
                return `<img src="${dataUrl}" style="width:100%;max-height:${height}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
            } catch (e) {
                console.error(e);
                return '<div style="font-size:12px;color:#69727d;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Не удалось отрисовать схему фермы</div>';
            }
        }
        function f343UpdateCombinedClientPdfContent() {
            const hasStage = f343HasStage();
            const hasTruss = f343HasTruss();
            if (pdfTitleEl) pdfTitleEl.textContent = 'ОБЩЕЕ КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ';
            if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — общее коммерческое предложение: сцена + фермы';
            if (!hasStage && !hasTruss) {
                pdfDataDiv.innerHTML = '<p>Нет активной сцены или ферменной конструкции для общего КП.</p>';
                return false;
            }
            const tr = hasTruss ? f343CalcTrussNoRender() : null;
            const transport = f343CalcTransport();
            const transportLabel = f343TransportLabel();
            const stageRental = hasStage ? Number(lastResult.modulesCost || 0) : 0;
            const stageInstall = hasStage ? Number(lastResult.installCost || 0) : 0;
            const trussRental = hasTruss && tr ? Number(tr.rentalCost || 0) : 0;
            const trussInstall = hasTruss && tr ? Number(tr.install || 0) : 0;
            const total = stageRental + stageInstall + trussRental + trussInstall + transport;
            const clientName = (typeof clientSelect !== 'undefined' && clientSelect && clientSelect.value) || (typeof getTrussText === 'function' ? getTrussText('trussClientName') : '') || 'Клиент не выбран';
            const stageProject = (typeof projectNameInput !== 'undefined' && projectNameInput && projectNameInput.value.trim()) || 'Сценическая конструкция';
            const trussProject = (typeof getTrussText === 'function' ? getTrussText('trussProjectName') : '') || 'Ферменная конструкция';
            const now = new Date();
            const dateText = now.toLocaleDateString('ru-RU');
            const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
            const stageSummary = hasStage ? `${f343Metric(lastResult.widthMeters || 0)} × ${f343Metric(lastResult.depthMeters || 0)} м · ${f343Metric(lastResult.areaMeters || 0)} м² · высота ${f343Metric((lastResult.stageHeightM || stageHeightM || 0) * 100)} см` : 'Не включена';
            const trussSummary = hasTruss && tr ? (tr.is3D ? `${f343Escape(tr.dimensionsLabel || '')} · ${f343TrussMetric(tr.totalMeters || 0)} м ферм` : `${f343TrussMetric(tr.totalMeters || 0)} м ферм · ${Number(tr.corners || 0)} узлов · ${Number(tr.supportCount || 0)} стоек/баз`) : 'Не включены';
            const stageScheme = (hasStage && typeof createClientSchemeGrid === 'function') ? createClientSchemeGrid() : '';
            const trussScheme = hasTruss ? f343TrussSchemeHtml(520, 190) : '';
            pdfDataDiv.innerHTML = `
                <div class="client-pdf">
                    <div class="client-hero">
                        <div>
                            <div class="brand-title"><span>FEG</span> Stage PRO</div>
                            <div class="brand-subtitle">Комплексное коммерческое предложение по сцене и ферменной конструкции для мероприятия.</div>
                        </div>
                        <div class="client-meta">
                            <div><strong>Клиент:</strong> ${f343Escape(clientName)}</div>
                            <div><strong>Дата:</strong> ${dateText}</div>
                            <div><strong>Действительно до:</strong> ${validUntil}</div>
                        </div>
                    </div>
                    <div class="client-main-grid">
                        <div class="client-card">
                            <div class="client-section-title">Схемы</div>
                            ${hasStage ? `<div style="font-weight:800;margin-bottom:6px;">Сцена: ${f343Escape(stageProject)}</div><div class="client-scheme-wrap" style="margin-bottom:10px;">${stageScheme}</div>` : ''}
                            ${hasTruss ? `<div style="font-weight:800;margin-bottom:6px;">Фермы: ${f343Escape(trussProject)}</div><div class="client-scheme-wrap">${trussScheme}</div>` : ''}
                        </div>
                        <div>
                            <div class="client-card" style="margin-bottom:14px;">
                                <div class="client-section-title">Сводка проекта</div>
                                <div class="client-params">
                                    <div class="client-param"><span>Сцена</span><strong>${f343Escape(stageSummary)}</strong></div>
                                    <div class="client-param"><span>Фермы</span><strong>${f343Escape(trussSummary)}</strong></div>
                                    <div class="client-param"><span>Транспорт</span><strong>${f343Escape(transportLabel)}</strong></div>
                                </div>
                            </div>
                            <div class="client-card">
                                <div class="client-section-title">Стоимость</div>
                                <table class="client-price-table">
                                    <thead><tr><th>Позиция</th><th>Стоимость</th></tr></thead>
                                    <tbody>
                                        ${hasStage ? `<tr><td>Прокат сценической конструкции</td><td>${f343Money(stageRental)} ₽</td></tr><tr><td>Монтаж / демонтаж сцены</td><td>${f343Money(stageInstall)} ₽</td></tr>` : ''}
                                        ${hasTruss ? `<tr><td>Прокат ферменной конструкции</td><td>${f343Money(trussRental)} ₽</td></tr><tr><td>Монтаж / демонтаж ферм</td><td>${f343Money(trussInstall)} ₽</td></tr>` : ''}
                                        <tr><td>Транспорт общий <span style="font-size:10px;color:#69727d;">(${f343Escape(transportLabel)})</span></td><td>${f343Money(transport)} ₽</td></tr>
                                        <tr class="client-total-row"><td>Итого к оплате</td><td>${f343Money(total)} ₽</td></tr>
                                    </tbody>
                                </table>
                                <div class="client-note">Общее КП объединяет сцену и фермы в одном документе. Техническая комплектация, нагрузки и дополнительные опции уточняются отдельно.</div>
                            </div>
                        </div>
                    </div>
                    <div class="client-footer-line"><div>FEG Stage PRO</div><div>Общее коммерческое предложение</div></div>
                </div>
            `;
            return true;
        }
        async function f343CreateCombinedPdfBlob() {
            if (!f343UpdateCombinedClientPdfContent()) return null;
            const pdfContainer = document.getElementById('pdfContent');
            if (!pdfContainer) return null;
            pdfContainer.style.display = 'block';
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.top = '-9999px';
            pdfContainer.style.left = '0';
            pdfContainer.style.width = '1120px';
            pdfContainer.style.background = 'white';
            try {
                const canvas = await html2canvas(pdfContainer, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: false });
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('l', 'mm', 'a4');
                const pageWidth = 297, pageHeight = 210, margin = 6;
                const maxWidth = pageWidth - margin * 2;
                const maxHeight = pageHeight - margin * 2;
                let renderWidth = maxWidth;
                let renderHeight = (canvas.height * renderWidth) / canvas.width;
                if (renderHeight > maxHeight) {
                    renderHeight = maxHeight;
                    renderWidth = (canvas.width * renderHeight) / canvas.height;
                }
                doc.addImage(imgData, 'PNG', (pageWidth - renderWidth) / 2, (pageHeight - renderHeight) / 2, renderWidth, renderHeight, undefined, 'FAST');
                const baseName = `${(typeof projectNameInput !== 'undefined' && projectNameInput && projectNameInput.value.trim()) || 'stage'}_${(typeof getTrussText === 'function' && getTrussText('trussProjectName')) || 'truss'}`.replace(/[\\/:*?"<>|]/g, '_');
                preparedPdfKind = 'combinedClient';
                preparedPdfName = `kp_full_${baseName}_${Date.now()}.pdf`;
                return doc.output('blob');
            } catch (e) {
                console.error(e);
                alert('Ошибка при создании общего КП: ' + (e && e.message ? e.message : e));
                return null;
            } finally {
                pdfContainer.style.display = 'none';
                pdfContainer.style.position = '';
            }
        }
        const f343BaseCreatePdfBlob = createPdfBlob;
        createPdfBlob = async function(kind = 'tech') {
            if (kind === 'combinedClient') return await f343CreateCombinedPdfBlob();
            return await f343BaseCreatePdfBlob(kind);
        };
        updateCombinedClientPdfContent = f343UpdateCombinedClientPdfContent;
        openCombinedClientPdfPreview = async function() {
            try {
                const blob = await f343CreateCombinedPdfBlob();
                if (!blob) return;
                preparedPdfBlob = blob;
                if (preparedPdfUrl) URL.revokeObjectURL(preparedPdfUrl);
                preparedPdfUrl = URL.createObjectURL(blob);
                if (pdfModalTitle) pdfModalTitle.textContent = 'Предпросмотр общего КП: сцена + фермы';
                pdfPreviewFrame.src = preparedPdfUrl;
                pdfModal.classList.add('open');
                pdfModal.setAttribute('aria-hidden', 'false');
            } catch (e) {
                console.error(e);
                alert('Не удалось открыть общее КП: ' + (e && e.message ? e.message : e));
            }
        };
        window.FEG343_createCombinedPdfBlob = f343CreateCombinedPdfBlob;
    })();


    /* --- FEG Stage PRO 3.4.7: безопасные PDF для ферм без зависимостей от сцены --- */
    (function(){
        function f344Money(v) {
            try { return typeof trussMoney === 'function' ? trussMoney(v) : (Number(v || 0).toLocaleString('ru-RU') + ' ₽'); }
            catch(e) { return String(Math.round(Number(v || 0))) + ' ₽'; }
        }
        function f344Metric(v) {
            try { return typeof trussMetric === 'function' ? trussMetric(v) : Number(v || 0).toFixed(1).replace('.0',''); }
            catch(e) { return String(v || 0); }
        }
        function f344Escape(v) {
            try { return typeof escapeHtml === 'function' ? escapeHtml(String(v ?? '')) : String(v ?? ''); }
            catch(e) { return String(v ?? ''); }
        }
        function f344GetText(id, fallback = '') {
            try { return typeof getTrussText === 'function' ? (getTrussText(id) || fallback) : ((document.getElementById(id) && document.getElementById(id).value) || fallback); }
            catch(e) { return fallback; }
        }
        function f344HasTruss() {
            try {
                if (typeof isTruss3DStool === 'function' && isTruss3DStool()) return true;
                if (typeof trussSegmentsH !== 'undefined' && trussSegmentsH && trussSegmentsH.size) return true;
                if (typeof trussSegmentsV !== 'undefined' && trussSegmentsV && trussSegmentsV.size) return true;
                if (typeof trussHasScheme === 'function') return !!trussHasScheme();
            } catch(e) { console.error(e); }
            return false;
        }
        function f344CalculateTrussSafe() {
            try { if (typeof calculateTruss === 'function') return calculateTruss(); }
            catch(e) { console.error('calculateTruss failed', e); }
            try { if (typeof lastTrussResult !== 'undefined' && lastTrussResult) return lastTrussResult; }
            catch(e) { console.error(e); }
            return null;
        }
        function f344TrussSchemeImageHtml(maxHeight = 250) {
            try {
                if (typeof createTrussCanvas === 'function') {
                    const canvas = createTrussCanvas(900, 460);
                    const url = canvas.toDataURL('image/png');
                    return `<img src="${url}" style="width:100%;max-height:${maxHeight}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
                }
            } catch(e) { console.error('truss canvas failed', e); }
            try {
                if (typeof createTrussSchemeImageHtml === 'function') return createTrussSchemeImageHtml(520, maxHeight);
            } catch(e) { console.error('truss scheme html failed', e); }
            return '<div style="font-size:12px;color:#69727d;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Не удалось отрисовать схему фермы</div>';
        }
        function f344TransportLabel() {
            try { return typeof getTransportLabel === 'function' ? getTransportLabel(normalizeTransportSettings(transportSettings)) : 'Транспорт'; }
            catch(e) { return 'Транспорт'; }
        }
        function f344PiecesRows(res) {
            const p = (res && res.pieces) || { '3':0, '2':0, '1':0, '0.5':0 };
            return `
                <tr><td style="text-align:center;">1</td><td>Ферма прямая 3 м</td><td class="qty">${p['3'] || 0}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                <tr><td style="text-align:center;">2</td><td>Ферма прямая 2 м</td><td class="qty">${p['2'] || 0}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                <tr><td style="text-align:center;">3</td><td>Ферма прямая 1 м</td><td class="qty">${p['1'] || 0}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                <tr><td style="text-align:center;">4</td><td>Ферма прямая 0.5 м</td><td class="qty">${p['0.5'] || 0}</td><td style="text-align:center;">шт</td><td style="text-align:center;">прокат</td></tr>
                <tr><td style="text-align:center;">5</td><td>${res && res.is3D ? 'Верхний куб / угол' : 'Угол / куб / стык 90°'}</td><td class="qty">${res ? (res.topCubes ?? res.corners ?? 0) : 0}</td><td style="text-align:center;">шт</td><td style="text-align:center;">узлы</td></tr>
                <tr><td style="text-align:center;">6</td><td>${res && res.is3D ? 'База / пятка' : 'Стойка вертикальная'}</td><td class="qty">${res ? (res.bases ?? res.supportCount ?? 0) : 0}</td><td style="text-align:center;">шт</td><td style="text-align:center;">опора</td></tr>
                ${res && !res.is3D ? `<tr><td style="text-align:center;">7</td><td>База / пятка фермы</td><td class="qty">${res.supportCount || 0}</td><td style="text-align:center;">шт</td><td style="text-align:center;">опора</td></tr>` : ''}
            `;
        }
        function f344TrussDescription(res) {
            if (!res) return 'Ферменная конструкция';
            if (res.is3D) return `${f344Escape(res.dimensionsLabel || '')} · общий метраж ${f344Metric(res.totalMeters || 0)} м`;
            return `${f344Metric(res.totalMeters || 0)} м ферм · ${Number(res.corners || 0)} узлов · ${Number(res.supportCount || 0)} стоек/баз`;
        }
        function f344UpdateTrussTechPdfContent() {
            const res = f344CalculateTrussSafe();
            if (pdfTitleEl) pdfTitleEl.textContent = 'ТЕХНИЧЕСКИЙ ЛИСТ ФЕРМЕННОЙ КОНСТРУКЦИИ';
            if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — технический лист ферменной конструкции для склада и площадки';
            if (!res || !f344HasTruss()) {
                pdfDataDiv.innerHTML = '<p>Нет схемы фермы. Нарисуйте конструкцию, выберите шаблон или включите 3D-табуретку.</p>';
                return false;
            }
            const dateText = new Date().toLocaleDateString('ru-RU');
            const timeText = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            const project = f344GetText('trussProjectName', res.is3D ? '3D конструкция «табуретка»' : 'Ферменная конструкция');
            const client = f344GetText('trussClientName', 'Клиент не указан');
            pdfDataDiv.innerHTML = `
                <div class="tech-pdf">
                    <div class="tech-top">
                        <div class="tech-box">
                            <div><strong>Проект:</strong> ${f344Escape(project)}</div>
                            <div><strong>Клиент:</strong> ${f344Escape(client)}</div>
                            <div><strong>Дата/время:</strong> ${dateText} ${timeText}</div>
                        </div>
                        <div class="tech-box">
                            <div><strong>Документ:</strong> технический лист для склада и монтажа</div>
                            <div><strong>Тип:</strong> ${res.is3D ? '3D конструкция «табуретка»' : '2D ферменная конструкция'}</div>
                            <div><strong>Габариты/сводка:</strong> ${f344TrussDescription(res)}</div>
                            <div><strong>Транспорт:</strong> ${f344Escape(f344TransportLabel())} · ${f344Money(res.transport || 0)}</div>
                            <div><strong>Вес комплекта:</strong> ${f344Metric(res.weight || 0)} кг</div>
                        </div>
                    </div>

                    <div class="section-title">1. Схема ферменной конструкции</div>
                    <div class="scheme-row">
                        <div>${f344TrussSchemeImageHtml(250)}</div>
                        <div class="notes">
                            <table>
                                <tr><th>Параметр</th><th class="qty">Значение</th></tr>
                                ${res.is3D ? `<tr><td>Габариты Ш×Г×В</td><td class="qty">${f344Escape(res.dimensionsLabel || '')}</td></tr><tr><td>Верхний периметр</td><td class="qty">${f344Metric(res.topPerimeterMeters || 0)} м</td></tr><tr><td>Вертикальные ноги</td><td class="qty">${f344Metric(res.verticalMeters || 0)} м</td></tr>` : ''}
                                <tr><td>Общий метраж ферм</td><td class="qty">${f344Metric(res.totalMeters || 0)} м</td></tr>
                                <tr><td>Ферма 3 м</td><td class="qty">${(res.pieces && res.pieces['3']) || 0} шт</td></tr>
                                <tr><td>Ферма 2 м</td><td class="qty">${(res.pieces && res.pieces['2']) || 0} шт</td></tr>
                                <tr><td>Ферма 1 м</td><td class="qty">${(res.pieces && res.pieces['1']) || 0} шт</td></tr>
                                <tr><td>Ферма 0.5 м</td><td class="qty">${(res.pieces && res.pieces['0.5']) || 0} шт</td></tr>
                                <tr><td>Углы / кубы / узлы 90°</td><td class="qty">${res.topCubes ?? res.corners ?? 0} шт</td></tr>
                                <tr><td>Стойки / базы</td><td class="qty">${res.bases ?? res.supportCount ?? 0} шт</td></tr>
                                <tr><td>Вес комплекта</td><td class="qty">${f344Metric(res.weight || 0)} кг</td></tr>
                            </table>
                        </div>
                    </div>

                    <div class="section-title">2. Комплектация для погрузки</div>
                    <table>
                        <thead><tr><th style="width:38px;text-align:center;">№</th><th>Наименование</th><th class="qty">Кол-во</th><th style="width:70px;text-align:center;">Ед.</th><th style="width:90px;text-align:center;">Примечание</th></tr></thead>
                        <tbody>${f344PiecesRows(res)}</tbody>
                    </table>

                    <div class="section-title">3. Примечание по безопасности</div>
                    <div class="notes">Расчёт является комплектовочной ведомостью и сметой. Допустимые нагрузки, подвесы, балласт, ветровые нагрузки и безопасность конструкции проверяются по паспортам производителя и/или ответственным инженером.</div>

                    <div class="signature-row">
                        <div>Погрузил: <div class="sign-line"></div></div>
                        <div>Принял на площадке: <div class="sign-line"></div></div>
                    </div>
                </div>
            `;
            return true;
        }
        function f344UpdateTrussClientPdfContent() {
            const res = f344CalculateTrussSafe();
            if (pdfTitleEl) pdfTitleEl.textContent = 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ';
            if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — коммерческое предложение по ферменной конструкции';
            if (!res || !f344HasTruss()) {
                pdfDataDiv.innerHTML = '<p>Нет схемы фермы. Нарисуйте конструкцию, выберите шаблон или включите 3D-табуретку.</p>';
                return false;
            }
            const now = new Date();
            const dateText = now.toLocaleDateString('ru-RU');
            const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
            const project = f344GetText('trussProjectName', res.is3D ? '3D конструкция «табуретка»' : 'Ферменная конструкция');
            const client = f344GetText('trussClientName', 'Клиент не указан');
            pdfDataDiv.innerHTML = `
                <div class="client-pdf">
                    <div class="client-hero">
                        <div>
                            <div class="brand-title"><span>FEG</span> Stage PRO</div>
                            <div class="brand-subtitle">Аренда и монтаж ферменной конструкции под мероприятие. Смета подготовлена по выбранной схеме.</div>
                        </div>
                        <div class="client-meta">
                            <div><strong>Проект:</strong> ${f344Escape(project)}</div>
                            <div><strong>Клиент:</strong> ${f344Escape(client)}</div>
                            <div><strong>Дата:</strong> ${dateText}</div>
                            <div><strong>Действительно до:</strong> ${validUntil}</div>
                        </div>
                    </div>
                    <div class="client-main-grid">
                        <div class="client-card">
                            <div class="client-section-title">Схема конструкции</div>
                            <div class="client-scheme-wrap">${f344TrussSchemeImageHtml(270)}</div>
                            <div class="client-note">Схема показывает общую геометрию ферменной конструкции без инженерного расчёта нагрузок.</div>
                        </div>
                        <div>
                            <div class="client-card" style="margin-bottom:14px;">
                                <div class="client-section-title">Основные параметры</div>
                                <div class="client-params">
                                    <div class="client-param"><span>Тип</span><strong>${res.is3D ? '3D табуретка' : '2D ферма'}</strong></div>
                                    <div class="client-param"><span>Сводка</span><strong>${f344Escape(f344TrussDescription(res))}</strong></div>
                                    <div class="client-param"><span>Узлы / углы</span><strong>${res.topCubes ?? res.corners ?? 0} шт</strong></div>
                                    <div class="client-param"><span>Вес комплекта</span><strong>${f344Metric(res.weight || 0)} кг</strong></div>
                                </div>
                            </div>
                            <div class="client-card">
                                <div class="client-section-title">Стоимость</div>
                                <table class="client-price-table">
                                    <thead><tr><th>Позиция</th><th>Стоимость</th></tr></thead>
                                    <tbody>
                                        <tr><td>Прокат ферменной конструкции</td><td>${f344Money(res.rentalCost || 0)}</td></tr>
                                        <tr><td>Монтаж / демонтаж</td><td>${f344Money(res.install || 0)}</td></tr>
                                        <tr><td>Транспорт <span style="font-size:10px;color:#69727d;">(${f344Escape(f344TransportLabel())})</span></td><td>${f344Money(res.transport || 0)}</td></tr>
                                        <tr class="client-total-row"><td>Итого к оплате</td><td>${f344Money(res.total || 0)}</td></tr>
                                    </tbody>
                                </table>
                                <div class="client-note">Нагрузки, подвесы, ветровые условия и балласт уточняются отдельно по паспортам производителя и техническому заданию.</div>
                            </div>
                        </div>
                    </div>
                    <div class="client-footer-line"><div>FEG Stage PRO</div><div>Коммерческое предложение без технической комплектации</div></div>
                </div>
            `;
            return true;
        }
        async function f344CreateTrussPdfBlob(kind) {
            if (!f344HasTruss()) {
                alert('Нет схемы фермы. Нарисуйте конструкцию, выберите шаблон или включите 3D-табуретку перед созданием PDF.');
                return null;
            }
            const ok = kind === 'trussClient' ? f344UpdateTrussClientPdfContent() : f344UpdateTrussTechPdfContent();
            if (!ok) return null;
            const pdfContainer = document.getElementById('pdfContent');
            if (!pdfContainer) return null;
            pdfContainer.style.display = 'block';
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.top = '-9999px';
            pdfContainer.style.left = '0';
            pdfContainer.style.width = '1120px';
            pdfContainer.style.background = 'white';
            try {
                const canvas = await html2canvas(pdfContainer, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: false });
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('l', 'mm', 'a4');
                const pageWidth = 297, pageHeight = 210, margin = 6;
                const maxWidth = pageWidth - margin * 2;
                const maxHeight = pageHeight - margin * 2;
                let renderWidth = maxWidth;
                let renderHeight = (canvas.height * renderWidth) / canvas.width;
                if (renderHeight > maxHeight) {
                    renderHeight = maxHeight;
                    renderWidth = (canvas.width * renderHeight) / canvas.height;
                }
                doc.addImage(imgData, 'PNG', (pageWidth - renderWidth) / 2, (pageHeight - renderHeight) / 2, renderWidth, renderHeight, undefined, 'FAST');
                const baseName = (f344GetText('trussProjectName', 'truss') || 'truss').replace(/[\/:*?"<>|]/g, '_');
                preparedPdfKind = kind;
                preparedPdfName = kind === 'trussClient' ? `kp_truss_${baseName}_${Date.now()}.pdf` : `tech_truss_${baseName}_${Date.now()}.pdf`;
                return doc.output('blob');
            } catch(e) {
                console.error(e);
                alert('Ошибка при создании PDF ферм: ' + (e && e.message ? e.message : e));
                return null;
            } finally {
                pdfContainer.style.display = 'none';
                pdfContainer.style.position = '';
            }
        }
        const f344BaseCreatePdfBlob = createPdfBlob;
        createPdfBlob = async function(kind = 'tech') {
            if (kind === 'trussTech' || kind === 'trussClient') return await f344CreateTrussPdfBlob(kind);
            return await f344BaseCreatePdfBlob(kind);
        };
        updateTrussTechPdfContent = f344UpdateTrussTechPdfContent;
        updateTrussClientPdfContent = f344UpdateTrussClientPdfContent;
        openTrussTechPdfPreview = async function() {
            try {
                const blob = await f344CreateTrussPdfBlob('trussTech');
                if (!blob) return;
                preparedPdfBlob = blob;
                if (preparedPdfUrl) URL.revokeObjectURL(preparedPdfUrl);
                preparedPdfUrl = URL.createObjectURL(blob);
                if (pdfModalTitle) pdfModalTitle.textContent = 'Предпросмотр технического листа ферм';
                pdfPreviewFrame.src = preparedPdfUrl;
                pdfModal.classList.add('open');
                pdfModal.setAttribute('aria-hidden', 'false');
            } catch(e) {
                console.error(e);
                alert('Не удалось открыть технический PDF ферм: ' + (e && e.message ? e.message : e));
            }
        };
        openTrussClientPdfPreview = async function() {
            try {
                const blob = await f344CreateTrussPdfBlob('trussClient');
                if (!blob) return;
                preparedPdfBlob = blob;
                if (preparedPdfUrl) URL.revokeObjectURL(preparedPdfUrl);
                preparedPdfUrl = URL.createObjectURL(blob);
                if (pdfModalTitle) pdfModalTitle.textContent = 'Предпросмотр КП по ферменной конструкции';
                pdfPreviewFrame.src = preparedPdfUrl;
                pdfModal.classList.add('open');
                pdfModal.setAttribute('aria-hidden', 'false');
            } catch(e) {
                console.error(e);
                alert('Не удалось открыть КП по фермам: ' + (e && e.message ? e.message : e));
            }
        };
        window.FEG344_createTrussPdfBlob = f344CreateTrussPdfBlob;
    })();


    /* --- FEG Stage PRO 3.4.7: фикс отрисовки ферм на поле и в PDF --- */
    (function(){
        const VERSION = APP_VERSION;

        function f345InstallStyle(){
            if (document.getElementById('feg345TrussFixStyle')) return;
            const style = document.createElement('style');
            style.id = 'feg345TrussFixStyle';
            style.textContent = `
                #trussGrid { touch-action: none; user-select: none; -webkit-user-select: none; }
                #trussGrid .truss-hit { z-index: 10; pointer-events: auto; background: transparent !important; }
                #trussGrid .truss-seg-h, #trussGrid .truss-seg-v { z-index: 7; pointer-events: none; }
                #trussGrid .truss-node { z-index: 8; pointer-events: none; }
            `;
            document.head.appendChild(style);
        }

        function f345HitFromEvent(e){
            try {
                const direct = e && e.target && e.target.closest ? e.target.closest('.truss-hit') : null;
                if (direct) return direct;
                const el = document.elementFromPoint(e.clientX, e.clientY);
                return el && el.closest ? el.closest('.truss-hit') : null;
            } catch(err) { return null; }
        }

        function f345SwitchTo2DForDrawing(){
            try {
                if (typeof isTruss3DStool === 'function' && isTruss3DStool() && typeof setTrussConstructionType === 'function') {
                    setTrussConstructionType('2d');
                    const gridWrap = document.querySelector('#trussModule .truss-grid-wrap');
                    const caption = document.querySelector('#trussModule .truss-caption');
                    const preview = document.getElementById('truss3DPreview');
                    if (gridWrap) gridWrap.style.display = '';
                    if (caption) caption.style.display = '';
                    if (preview) preview.classList.remove('active');
                    if (typeof showToast === 'function') showToast('Переключено в 2D-режим ферм');
                }
            } catch(err) { console.error(err); }
        }

        let f345Down = false;
        let f345Last = '';

        function f345ApplyHit(hit){
            if (!hit || !hit.dataset) return;
            f345SwitchTo2DForDrawing();
            const x = Number(hit.dataset.x);
            const y = Number(hit.dataset.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            const dir = (typeof currentTrussDir === 'function') ? currentTrussDir() : 'h';
            const mode = (typeof currentTrussMode === 'function') ? currentTrussMode() : 'draw';
            if (dir === 'h') {
                if (x < 0 || y < 0 || x >= trussCols || y > trussRows) return;
            } else {
                if (x < 0 || y < 0 || x > trussCols || y >= trussRows) return;
            }
            const key = (typeof trussKey === 'function') ? trussKey(x, y) : `${x},${y}`;
            const actionKey = `${dir}:${key}`;
            if (actionKey === f345Last) return;
            f345Last = actionKey;
            const set = dir === 'h' ? trussSegmentsH : trussSegmentsV;
            if (!set) return;
            if (mode === 'erase') set.delete(key);
            else if (mode === 'toggle') set.has(key) ? set.delete(key) : set.add(key);
            else set.add(key);
            try { if (typeof trimTrussSegmentsToGrid === 'function') trimTrussSegmentsToGrid(); } catch(err) { console.error(err); }
            try { if (typeof drawTrussSegments === 'function') drawTrussSegments(); } catch(err) { console.error(err); }
            try { if (typeof calculateTruss === 'function') calculateTruss(); } catch(err) { console.error(err); }
        }

        function f345PointerDown(e){
            const hit = f345HitFromEvent(e);
            if (!hit) return;
            f345Down = true;
            f345Last = '';
            f345ApplyHit(hit);
            try { hit.setPointerCapture && hit.setPointerCapture(e.pointerId); } catch(err) {}
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
        function f345PointerMove(e){
            if (!f345Down) return;
            const hit = f345HitFromEvent(e);
            if (!hit) return;
            f345ApplyHit(hit);
            e.preventDefault();
            e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        }
        function f345PointerUp(){ f345Down = false; f345Last = ''; }

        function f345InstallGridHandlers(){
            f345InstallStyle();
            const grid = document.getElementById('trussGrid');
            if (!grid) return;
            grid.style.touchAction = 'none';
            if (grid.dataset.feg345DrawFix === '1') return;
            grid.dataset.feg345DrawFix = '1';
            grid.addEventListener('pointerdown', f345PointerDown, true);
            grid.addEventListener('pointermove', f345PointerMove, true);
            grid.addEventListener('pointerup', f345PointerUp, true);
            grid.addEventListener('pointercancel', f345PointerUp, true);
            grid.addEventListener('pointerleave', f345PointerUp, true);
            document.addEventListener('pointerup', f345PointerUp, true);
        }

        try {
            const previousRenderTrussGrid = renderTrussGrid;
            renderTrussGrid = function(){
                const result = previousRenderTrussGrid.apply(this, arguments);
                setTimeout(f345InstallGridHandlers, 0);
                return result;
            };
        } catch(err) { console.error(err); }

        try {
            applyTrussHit = function(hit){ f345ApplyHit(hit); };
        } catch(err) { console.error(err); }

        function f345CollectBounds(){
            const pts = [];
            try {
                trussSegmentsH.forEach(key => { const p = parseTrussKey(key); pts.push([p.x, p.y], [p.x + 1, p.y]); });
                trussSegmentsV.forEach(key => { const p = parseTrussKey(key); pts.push([p.x, p.y], [p.x, p.y + 1]); });
            } catch(err) {}
            if (!pts.length) return { minX:0, minY:0, maxX:Math.max(1,trussCols), maxY:Math.max(1,trussRows) };
            return {
                minX: Math.min(...pts.map(p => p[0])),
                minY: Math.min(...pts.map(p => p[1])),
                maxX: Math.max(...pts.map(p => p[0])),
                maxY: Math.max(...pts.map(p => p[1]))
            };
        }

        function f345Create2DTrussCanvas(width = 900, height = 460){
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            const b = f345CollectBounds();
            const pad = 46;
            const spanX = Math.max(1, b.maxX - b.minX);
            const spanY = Math.max(1, b.maxY - b.minY);
            const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
            function px(x){ return pad + (x - b.minX) * scale; }
            function py(y){ return pad + (y - b.minY) * scale; }

            ctx.strokeStyle = '#e1e6eb';
            ctx.lineWidth = 1;
            for(let x = Math.floor(b.minX); x <= Math.ceil(b.maxX); x++){
                ctx.beginPath(); ctx.moveTo(px(x), pad * .45); ctx.lineTo(px(x), height - pad * .45); ctx.stroke();
            }
            for(let y = Math.floor(b.minY); y <= Math.ceil(b.maxY); y++){
                ctx.beginPath(); ctx.moveTo(pad * .45, py(y)); ctx.lineTo(width - pad * .45, py(y)); ctx.stroke();
            }

            const thick = Math.max(7, Math.min(16, scale * .16));
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = '#2E8B57';
            ctx.lineWidth = thick;
            try {
                trussSegmentsH.forEach(key => { const p = parseTrussKey(key); ctx.beginPath(); ctx.moveTo(px(p.x), py(p.y)); ctx.lineTo(px(p.x + 1), py(p.y)); ctx.stroke(); });
                trussSegmentsV.forEach(key => { const p = parseTrussKey(key); ctx.beginPath(); ctx.moveTo(px(p.x), py(p.y)); ctx.lineTo(px(p.x), py(p.y + 1)); ctx.stroke(); });
            } catch(err) { console.error(err); }

            ctx.strokeStyle = 'rgba(255,255,255,.75)';
            ctx.lineWidth = Math.max(1, thick * .18);
            try {
                trussSegmentsH.forEach(key => { const p = parseTrussKey(key); ctx.beginPath(); ctx.moveTo(px(p.x)+4, py(p.y)); ctx.lineTo(px(p.x + 1)-4, py(p.y)); ctx.stroke(); });
                trussSegmentsV.forEach(key => { const p = parseTrussKey(key); ctx.beginPath(); ctx.moveTo(px(p.x), py(p.y)+4); ctx.lineTo(px(p.x), py(p.y + 1)-4); ctx.stroke(); });
            } catch(err) {}

            try {
                const nodes = getTrussNodes();
                ctx.fillStyle = '#f4dfb9';
                ctx.strokeStyle = '#2b1b0e';
                ctx.lineWidth = 2;
                nodes.forEach(node => {
                    if (node.degree < 2) return;
                    ctx.beginPath();
                    ctx.arc(px(node.x), py(node.y), Math.max(4, thick * .45), 0, Math.PI * 2);
                    ctx.fill(); ctx.stroke();
                });
            } catch(err) {}

            ctx.fillStyle = '#243142';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('Схема ферменной конструкции', 24, 28);
            ctx.fillStyle = '#69727d';
            ctx.font = '13px Arial';
            ctx.fillText(`Клетка: ${typeof trussMetric === 'function' ? trussMetric(trussCellMeters) : trussCellMeters} м`, 24, height - 18);
            return canvas;
        }

        try {
            const previousCreateTrussCanvas = (typeof createTrussCanvas === 'function') ? createTrussCanvas : null;
            createTrussCanvas = function(width = 900, height = 460){
                try {
                    if (typeof isTruss3DStool === 'function' && isTruss3DStool() && typeof createTruss3DCanvas === 'function') {
                        return createTruss3DCanvas(width, height);
                    }
                    return f345Create2DTrussCanvas(width, height);
                } catch(err) {
                    console.error(err);
                    if (previousCreateTrussCanvas) return previousCreateTrussCanvas(width, height);
                    return f345Create2DTrussCanvas(width, height);
                }
            };
            createTrussSchemeImageHtml = function(width = 520, height = 260){
                try {
                    const canvas = createTrussCanvas(900, 460);
                    const url = canvas.toDataURL('image/png');
                    return `<img src="${url}" style="width:100%;max-height:${height}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
                } catch(err) {
                    console.error(err);
                    return '<div style="font-size:12px;color:#69727d;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Не удалось отрисовать схему фермы</div>';
                }
            };
        } catch(err) { console.error(err); }

        window.addEventListener('load', () => {
            setTimeout(() => {
                try { f345InstallGridHandlers(); } catch(err) { console.error(err); }
                try { if (typeof renderTrussGrid === 'function') { drawTrussSegments(); } } catch(err) { console.error(err); }
            }, 200);
        });

        window.FEG345_TRUSS_DRAW_FIX = VERSION;
    })();



    /* --- FEG Stage PRO 3.4.7: фикс очистки, возврата 2D и схемы ферм в общем КП --- */
    (function(){
        const VERSION = '3.4.7';

        function f346Money(v){
            try { return Number(v || 0).toLocaleString('ru-RU'); } catch(e) { return String(v || 0); }
        }
        function f346Rub(v){ return f346Money(v) + ' ₽'; }
        function f346Metric(v, digits = 1){
            try {
                const n = Number(v || 0);
                if (Number.isInteger(n)) return String(n);
                return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
            } catch(e) { return String(v || 0); }
        }
        function f346Escape(v){
            try { return typeof escapeHtml === 'function' ? escapeHtml(String(v ?? '')) : String(v ?? ''); }
            catch(e) { return String(v ?? ''); }
        }
        function f346Text(id, fallback = ''){
            try {
                if (typeof getTrussText === 'function') return getTrussText(id) || fallback;
                const el = document.getElementById(id);
                return (el && el.value ? el.value.trim() : '') || fallback;
            } catch(e) { return fallback; }
        }
        function f346Is3D(){
            try { return typeof isTruss3DStool === 'function' && isTruss3DStool(); }
            catch(e) { return false; }
        }
        function f346HasTruss(){
            try {
                if (f346Is3D()) return true;
                if (typeof trussSegmentsH !== 'undefined' && trussSegmentsH && trussSegmentsH.size) return true;
                if (typeof trussSegmentsV !== 'undefined' && trussSegmentsV && trussSegmentsV.size) return true;
                return false;
            } catch(e) { return false; }
        }
        function f346Show2DUI(){
            const gridWrap = document.querySelector('#trussModule .truss-grid-wrap');
            const caption = document.querySelector('#trussModule .truss-caption');
            const preview = document.getElementById('truss3DPreview');
            const depthBox = document.getElementById('trussDepthM') ? document.getElementById('trussDepthM').closest('div') : null;
            if (gridWrap) gridWrap.style.display = '';
            if (caption) caption.style.display = '';
            if (preview) { preview.classList.remove('active'); preview.innerHTML = ''; }
            if (depthBox) depthBox.style.display = 'none';
        }
        function f346Set2DMode(options = {}){
            try { if (typeof installTruss3DUI === 'function') installTruss3DUI(); } catch(e) {}
            const el = document.getElementById('trussConstructionType');
            if (el && el.value !== '2d') el.value = '2d';
            f346Show2DUI();
            if (options.clearResult) {
                try { lastTrussResult = null; } catch(e) {}
            }
        }

        // Явный обработчик селектора: если вручную выбрали 2D — поле возвращается сразу.
        function f346BindTypeSelector(){
            const el = document.getElementById('trussConstructionType');
            if (!el || el.dataset.feg346Bound === '1') return;
            el.dataset.feg346Bound = '1';
            el.addEventListener('change', () => {
                if (el.value === '2d') {
                    f346Show2DUI();
                    try { lastTrussResult = null; } catch(e) {}
                    try { if (typeof drawTrussSegments === 'function') drawTrussSegments(); } catch(e) {}
                    try { if (typeof calculateTruss === 'function') calculateTruss(); } catch(e) { console.error(e); }
                } else {
                    try { if (typeof updateTruss3DModeUI === 'function') updateTruss3DModeUI(); } catch(e) { console.error(e); }
                    try { if (typeof calculateTruss === 'function') calculateTruss(); } catch(e) { console.error(e); }
                }
            }, true);
        }

        const f346PrevInstallTruss3DUI = (typeof installTruss3DUI === 'function') ? installTruss3DUI : null;
        if (f346PrevInstallTruss3DUI) {
            installTruss3DUI = function(){
                const out = f346PrevInstallTruss3DUI.apply(this, arguments);
                f346BindTypeSelector();
                return out;
            };
        }

        // Очистка: работает и из 3D, и из 2D. После очистки всегда возвращает режим 2D.
        clearTrussConfirm = function(){
            let hasContent = false;
            try { hasContent = f346Is3D() || (trussSegmentsH && trussSegmentsH.size) || (trussSegmentsV && trussSegmentsV.size); } catch(e) {}
            if (hasContent && !confirm('Очистить схему ферм?')) return;
            try { trussSegmentsH.clear(); } catch(e) {}
            try { trussSegmentsV.clear(); } catch(e) {}
            try { trussEditingId = null; } catch(e) {}
            try { lastTrussResult = null; } catch(e) {}
            f346Set2DMode({clearResult:true});
            try { if (typeof renderTrussGrid === 'function') renderTrussGrid(); } catch(e) { console.error(e); }
            try { if (typeof calculateTruss === 'function') calculateTruss(); } catch(e) { console.error(e); }
            try { if (typeof showToast === 'function') showToast('Схема ферм очищена'); } catch(e) {}
        };

        // Шаблоны всегда переводят конструктор в 2D перед построением.
        const f346PrevPortal = (typeof applyTrussPortalTemplate === 'function') ? applyTrussPortalTemplate : null;
        if (f346PrevPortal) {
            applyTrussPortalTemplate = function(){
                f346Set2DMode({clearResult:true});
                return f346PrevPortal.apply(this, arguments);
            };
        }
        const f346PrevRectangle = (typeof applyTrussRectangleTemplate === 'function') ? applyTrussRectangleTemplate : null;
        if (f346PrevRectangle) {
            applyTrussRectangleTemplate = function(){
                f346Set2DMode({clearResult:true});
                return f346PrevRectangle.apply(this, arguments);
            };
        }

        // Любое рисование на сетке также принудительно возвращает 2D.
        const f346PrevApplyHit = (typeof applyTrussHit === 'function') ? applyTrussHit : null;
        if (f346PrevApplyHit) {
            applyTrussHit = function(hit){
                f346Set2DMode({clearResult:true});
                return f346PrevApplyHit.apply(this, arguments);
            };
        }

        function f346CalcTransport(){
            try {
                const ts = typeof normalizeTransportSettings === 'function' ? normalizeTransportSettings(transportSettings) : transportSettings;
                return typeof calculateTransportCost === 'function' ? Number(calculateTransportCost(ts) || 0) : 0;
            } catch(e) { return 0; }
        }
        function f346TransportLabel(){
            try {
                const ts = typeof normalizeTransportSettings === 'function' ? normalizeTransportSettings(transportSettings) : transportSettings;
                return typeof getTransportLabel === 'function' ? getTransportLabel(ts) : 'Транспорт';
            } catch(e) { return 'Транспорт'; }
        }
        function f346HasStage(){
            try {
                if (typeof selectedModules !== 'undefined' && selectedModules && selectedModules.size && !lastResult && typeof calc === 'function') calc(false);
                return !!(typeof lastResult !== 'undefined' && lastResult);
            } catch(e) { return false; }
        }
        function f346CalcTrussSafe(){
            if (!f346HasTruss()) return null;
            try {
                if (f346Is3D() && typeof calculateTruss3DStool === 'function') {
                    const res = calculateTruss3DStool();
                    lastTrussResult = res;
                    return res;
                }
                // Безопасный 2D-расчёт без вызова renderTrussResult, чтобы не ловить рекурсию.
                const runs = [
                    ...getRunsFromSegments(trussSegmentsH, 'h'),
                    ...getRunsFromSegments(trussSegmentsV, 'v')
                ];
                const totalMeters = runs.reduce((sum, r) => sum + Number(r.meters || 0), 0);
                const pieces = { '3':0, '2':0, '1':0, '0.5':0 };
                runs.forEach(run => {
                    const split = splitTrussLength(Number(run.meters || 0));
                    Object.keys(split).forEach(k => pieces[k] += Number(split[k] || 0));
                });
                const nodes = getTrussNodes();
                let corners = 0, terminalNodes = 0, crossNodes = 0;
                nodes.forEach(node => {
                    if (node.h > 0 && node.v > 0) corners += 1;
                    if (node.degree === 1) terminalNodes += 1;
                    if (node.degree >= 4) crossNodes += 1;
                });
                const supportCount = Math.max(0, Math.round(getTrussNumber('trussSupportCount', Math.max(0, terminalNodes))));
                const pricePerMeter = getTrussNumber('trussPricePerMeter', 0);
                const cornerPrice = getTrussNumber('trussCornerPrice', 0);
                const uprightPrice = getTrussNumber('trussUprightPrice', 0);
                const basePrice = getTrussNumber('trussBasePrice', 0);
                const install = getTrussNumber('trussInstallCost', 0);
                const transport = f346CalcTransport();
                const rentalCost = totalMeters * pricePerMeter + corners * cornerPrice + supportCount * (uprightPrice + basePrice);
                const weight = totalMeters * getTrussNumber('trussWeightPerMeter', 0) + corners * getTrussNumber('trussCornerWeight', 0) + supportCount * (getTrussNumber('trussUprightWeight', 0) + getTrussNumber('trussBaseWeight', 0));
                const res = { is3D:false, constructionType:'2d', runs, pieces, totalMeters, corners, terminalNodes, crossNodes, supportCount, rentalCost, install, transport, total:rentalCost + install + transport, weight, cellMeters:trussCellMeters, cols:trussCols, rows:trussRows };
                lastTrussResult = res;
                return res;
            } catch(e) {
                console.error(e);
                return null;
            }
        }

        function f346TrussSchemeHtml(maxHeight = 190){
            if (!f346HasTruss()) return '<div style="font-size:12px;color:#69727d;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Схема фермы не выбрана</div>';
            try {
                if (f346Is3D() && typeof createTruss3DSvgHtml === 'function') {
                    const svg = createTruss3DSvgHtml(900, 430, true);
                    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
                    return `<img src="${url}" style="width:100%;max-height:${maxHeight}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
                }
                // ВАЖНО: используем текущий createTrussCanvas, а не старую сохранённую функцию.
                if (typeof createTrussCanvas === 'function') {
                    const canvas = createTrussCanvas(900, 460);
                    const url = canvas.toDataURL('image/png');
                    return `<img src="${url}" style="width:100%;max-height:${maxHeight}px;object-fit:contain;border:1px solid #d7dde3;border-radius:16px;background:#fff;display:block;">`;
                }
            } catch(e) { console.error(e); }
            return '<div style="font-size:12px;color:#69727d;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Не удалось отрисовать схему фермы</div>';
        }

        updateCombinedClientPdfContent = function(){
            const hasStage = f346HasStage();
            const hasTruss = f346HasTruss();
            if (pdfTitleEl) pdfTitleEl.textContent = 'ОБЩЕЕ КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ';
            if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — общее коммерческое предложение: сцена + фермы';
            if (!hasStage && !hasTruss) {
                pdfDataDiv.innerHTML = '<p>Нет активной сцены или ферменной конструкции для общего КП.</p>';
                return false;
            }
            const tr = hasTruss ? f346CalcTrussSafe() : null;
            const transport = f346CalcTransport();
            const transportLabel = f346TransportLabel();
            const stageRental = hasStage ? Number(lastResult.modulesCost || 0) : 0;
            const stageInstall = hasStage ? Number(lastResult.installCost || 0) : 0;
            const trussRental = hasTruss && tr ? Number(tr.rentalCost || 0) : 0;
            const trussInstall = hasTruss && tr ? Number(tr.install || 0) : 0;
            const total = stageRental + stageInstall + trussRental + trussInstall + transport;
            const clientName = (typeof clientSelect !== 'undefined' && clientSelect && clientSelect.value) || f346Text('trussClientName') || 'Клиент не выбран';
            const stageProject = (typeof projectNameInput !== 'undefined' && projectNameInput && projectNameInput.value.trim()) || 'Сценическая конструкция';
            const trussProject = f346Text('trussProjectName', tr && tr.is3D ? '3D конструкция «табуретка»' : 'Ферменная конструкция');
            const now = new Date();
            const dateText = now.toLocaleDateString('ru-RU');
            const validUntil = new Date(now.getTime() + 7*24*60*60*1000).toLocaleDateString('ru-RU');
            const stageSummary = hasStage ? `${f346Metric(lastResult.widthMeters || 0)} × ${f346Metric(lastResult.depthMeters || 0)} м · ${f346Metric(lastResult.areaMeters || 0)} м² · высота ${f346Metric((lastResult.stageHeightM || stageHeightM || 0) * 100)} см` : 'Не включена';
            const trussSummary = hasTruss && tr ? (tr.is3D ? `${f346Escape(tr.dimensionsLabel || '')} · ${f346Metric(tr.totalMeters || 0)} м ферм` : `${f346Metric(tr.totalMeters || 0)} м ферм · ${Number(tr.corners || 0)} узлов · ${Number(tr.supportCount || 0)} стоек/баз`) : 'Не включены';
            const stageScheme = hasStage && typeof createClientSchemeGrid === 'function' ? createClientSchemeGrid() : '';
            const trussScheme = hasTruss ? f346TrussSchemeHtml(190) : '';
            pdfDataDiv.innerHTML = `
                <div class="client-pdf">
                    <div class="client-hero">
                        <div>
                            <div class="brand-title"><span>FEG</span> Stage PRO</div>
                            <div class="brand-subtitle">Комплексное коммерческое предложение по сцене и ферменной конструкции для мероприятия.</div>
                        </div>
                        <div class="client-meta">
                            <div><strong>Клиент:</strong> ${f346Escape(clientName)}</div>
                            <div><strong>Дата:</strong> ${dateText}</div>
                            <div><strong>Действительно до:</strong> ${validUntil}</div>
                        </div>
                    </div>
                    <div class="client-main-grid">
                        <div class="client-card">
                            <div class="client-section-title">Схемы</div>
                            ${hasStage ? `<div style="font-weight:800;margin-bottom:6px;">Сцена: ${f346Escape(stageProject)}</div><div class="client-scheme-wrap" style="margin-bottom:10px;">${stageScheme}</div>` : ''}
                            ${hasTruss ? `<div style="font-weight:800;margin-bottom:6px;">Фермы: ${f346Escape(trussProject)}</div><div class="client-scheme-wrap">${trussScheme}</div>` : ''}
                        </div>
                        <div>
                            <div class="client-card" style="margin-bottom:14px;">
                                <div class="client-section-title">Сводка проекта</div>
                                <div class="client-params">
                                    <div class="client-param"><span>Сцена</span><strong>${f346Escape(stageSummary)}</strong></div>
                                    <div class="client-param"><span>Фермы</span><strong>${f346Escape(trussSummary)}</strong></div>
                                    <div class="client-param"><span>Транспорт</span><strong>${f346Escape(transportLabel)}</strong></div>
                                </div>
                            </div>
                            <div class="client-card">
                                <div class="client-section-title">Стоимость</div>
                                <table class="client-price-table">
                                    <thead><tr><th>Позиция</th><th>Стоимость</th></tr></thead>
                                    <tbody>
                                        ${hasStage ? `<tr><td>Прокат сценической конструкции</td><td>${f346Rub(stageRental)}</td></tr><tr><td>Монтаж / демонтаж сцены</td><td>${f346Rub(stageInstall)}</td></tr>` : ''}
                                        ${hasTruss ? `<tr><td>Прокат ферменной конструкции</td><td>${f346Rub(trussRental)}</td></tr><tr><td>Монтаж / демонтаж ферм</td><td>${f346Rub(trussInstall)}</td></tr>` : ''}
                                        <tr><td>Транспорт общий <span style="font-size:10px;color:#69727d;">(${f346Escape(transportLabel)})</span></td><td>${f346Rub(transport)}</td></tr>
                                        <tr class="client-total-row"><td>Итого к оплате</td><td>${f346Rub(total)}</td></tr>
                                    </tbody>
                                </table>
                                <div class="client-note">Общее КП объединяет сцену и фермы в одном документе. Техническая комплектация, нагрузки и дополнительные опции уточняются отдельно.</div>
                            </div>
                        </div>
                    </div>
                    <div class="client-footer-line"><div>FEG Stage PRO</div><div>Общее коммерческое предложение</div></div>
                </div>
            `;
            return true;
        };

        async function f346WaitImages(root){
            const imgs = Array.from(root.querySelectorAll('img'));
            await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = img.onerror = resolve; })));
        }
        async function f346CreateCombinedPdfBlob(){
            if (!updateCombinedClientPdfContent()) return null;
            const pdfContainer = document.getElementById('pdfContent');
            if (!pdfContainer) return null;
            pdfContainer.style.display = 'block';
            pdfContainer.style.position = 'absolute';
            pdfContainer.style.top = '-9999px';
            pdfContainer.style.left = '0';
            pdfContainer.style.width = '1120px';
            pdfContainer.style.background = 'white';
            try {
                await f346WaitImages(pdfContainer);
                const canvas = await html2canvas(pdfContainer, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: false });
                const imgData = canvas.toDataURL('image/png');
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('l', 'mm', 'a4');
                const pageWidth = 297, pageHeight = 210, margin = 6;
                const maxWidth = pageWidth - margin*2, maxHeight = pageHeight - margin*2;
                let renderWidth = maxWidth;
                let renderHeight = (canvas.height * renderWidth) / canvas.width;
                if (renderHeight > maxHeight) { renderHeight = maxHeight; renderWidth = (canvas.width * renderHeight) / canvas.height; }
                doc.addImage(imgData, 'PNG', (pageWidth-renderWidth)/2, (pageHeight-renderHeight)/2, renderWidth, renderHeight, undefined, 'FAST');
                const baseName = `${(typeof projectNameInput !== 'undefined' && projectNameInput && projectNameInput.value.trim()) || 'stage'}_${f346Text('trussProjectName','truss')}`.replace(/[\\/:*?"<>|]/g, '_');
                preparedPdfKind = 'combinedClient';
                preparedPdfName = `kp_full_${baseName}_${Date.now()}.pdf`;
                return doc.output('blob');
            } finally {
                pdfContainer.style.display = 'none';
                pdfContainer.style.position = '';
            }
        }

        const f346PrevCreatePdfBlob = (typeof createPdfBlob === 'function') ? createPdfBlob : null;
        if (f346PrevCreatePdfBlob) {
            createPdfBlob = async function(kind = 'tech'){
                if (kind === 'combinedClient') return await f346CreateCombinedPdfBlob();
                return await f346PrevCreatePdfBlob(kind);
            };
        }
        openCombinedClientPdfPreview = async function(){
            try {
                const blob = await f346CreateCombinedPdfBlob();
                if (!blob) return;
                preparedPdfBlob = blob;
                if (preparedPdfUrl) URL.revokeObjectURL(preparedPdfUrl);
                preparedPdfUrl = URL.createObjectURL(blob);
                if (pdfModalTitle) pdfModalTitle.textContent = 'Предпросмотр общего КП: сцена + фермы';
                pdfPreviewFrame.src = preparedPdfUrl;
                pdfModal.classList.add('open');
                pdfModal.setAttribute('aria-hidden', 'false');
            } catch(e) {
                console.error(e);
                alert('Не удалось открыть общее КП: ' + (e && e.message ? e.message : e));
            }
        };

        window.addEventListener('load', () => {
            try { if (typeof installTruss3DUI === 'function') installTruss3DUI(); } catch(e) {}
            f346BindTypeSelector();
        });
        window.FEG346_FIX = VERSION;
    })();


    /* --- FEG Stage PRO 3.4.7: стабильный 2D-расчёт ферм без рекурсии --- */
    (function(){
        const VERSION = '3.4.7';

        function q(id){ return document.getElementById(id); }
        function esc(v){
            try { return typeof escapeHtml === 'function' ? escapeHtml(String(v ?? '')) : String(v ?? ''); }
            catch(e) { return String(v ?? ''); }
        }
        function metric(v, digits = 1){
            const n = Number(v || 0);
            if (!Number.isFinite(n)) return '0';
            if (Number.isInteger(n)) return String(n);
            return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
        }
        function money(v){
            const n = Number(v || 0);
            return n.toLocaleString('ru-RU') + ' ₽';
        }
        function getNum(id, fallback = 0){
            try {
                if (typeof getTrussNumber === 'function') return getTrussNumber(id, fallback);
                const el = q(id);
                const v = el ? Number(String(el.value || '').replace(',', '.')) : fallback;
                return Number.isFinite(v) ? v : fallback;
            } catch(e) { return fallback; }
        }
        function calcTransport(){
            try {
                const ts = typeof normalizeTransportSettings === 'function' ? normalizeTransportSettings(transportSettings) : transportSettings;
                return typeof calculateTransportCost === 'function' ? Number(calculateTransportCost(ts) || 0) : 0;
            } catch(e) { return 0; }
        }
        function getType(){
            const el = q('trussConstructionType');
            return el && el.value === 'stool3d' ? 'stool3d' : '2d';
        }
        function setType2D(){
            try { if (typeof installTruss3DUI === 'function') installTruss3DUI(); } catch(e) {}
            const el = q('trussConstructionType');
            if (el) el.value = '2d';
            const gridWrap = document.querySelector('#trussModule .truss-grid-wrap');
            const caption = document.querySelector('#trussModule .truss-caption');
            const preview = q('truss3DPreview');
            const depthBox = q('trussDepthM') ? q('trussDepthM').closest('div') : null;
            if (gridWrap) gridWrap.style.display = '';
            if (caption) caption.style.display = '';
            if (preview) { preview.classList.remove('active'); preview.innerHTML = ''; }
            if (depthBox) depthBox.style.display = 'none';
        }

        function collectRuns(){
            try {
                return [
                    ...getRunsFromSegments(trussSegmentsH, 'h'),
                    ...getRunsFromSegments(trussSegmentsV, 'v')
                ];
            } catch(e) {
                console.error('2D truss runs error', e);
                return [];
            }
        }

        function calc2DTruss(){
            setType2D();
            const runs = collectRuns();
            const totalMeters = runs.reduce((sum, r) => sum + Number(r.meters || 0), 0);
            const pieces = { '3':0, '2':0, '1':0, '0.5':0 };
            runs.forEach(run => {
                try {
                    const split = splitTrussLength(Number(run.meters || 0));
                    Object.keys(pieces).forEach(k => pieces[k] += Number(split[k] || 0));
                } catch(e) {}
            });

            let nodes = [];
            try { nodes = getTrussNodes(); } catch(e) { nodes = []; }
            let corners = 0, terminalNodes = 0, crossNodes = 0;
            nodes.forEach(node => {
                if (Number(node.h || 0) > 0 && Number(node.v || 0) > 0) corners += 1;
                if (Number(node.degree || 0) === 1) terminalNodes += 1;
                if (Number(node.degree || 0) >= 4) crossNodes += 1;
            });

            const supportCount = Math.max(0, Math.round(getNum('trussSupportCount', Math.max(0, terminalNodes))));
            const pricePerMeter = getNum('trussPricePerMeter', 0);
            const cornerPrice = getNum('trussCornerPrice', 0);
            const uprightPrice = getNum('trussUprightPrice', 0);
            const basePrice = getNum('trussBasePrice', 0);
            const install = getNum('trussInstallCost', 0);
            const transport = calcTransport();

            const rentalCost = totalMeters * pricePerMeter + corners * cornerPrice + supportCount * (uprightPrice + basePrice);
            const weight = totalMeters * getNum('trussWeightPerMeter', 0) +
                corners * getNum('trussCornerWeight', 0) +
                supportCount * (getNum('trussUprightWeight', 0) + getNum('trussBaseWeight', 0));

            const res = {
                is3D: false,
                constructionType: '2d',
                constructionLabel: '2D фермы / портал',
                runs, pieces, totalMeters, corners, terminalNodes, crossNodes, supportCount,
                rentalCost, install, transport, total: rentalCost + install + transport, weight,
                cellMeters: typeof trussCellMeters !== 'undefined' ? trussCellMeters : 1,
                cols: typeof trussCols !== 'undefined' ? trussCols : 20,
                rows: typeof trussRows !== 'undefined' ? trussRows : 20
            };
            lastTrussResult = res;
            return res;
        }

        function render2DResult(res){
            const box = typeof getTrussEl === 'function' ? getTrussEl('trussResult') : q('trussResult');
            if (box) {
                box.innerHTML = `
                    <div>Тип конструкции</div><div>${esc(res.constructionLabel)}</div>
                    <div>Общий метраж ферм</div><div>${metric(res.totalMeters)} м</div>
                    <div>Углы / узлы 90°</div><div>${Number(res.corners || 0)} шт</div>
                    <div>Стойки + базы</div><div>${Number(res.supportCount || 0)} компл.</div>
                    <div>Вес комплекта</div><div>${metric(res.weight)} кг</div>
                    <div>Прокат конструкции</div><div>${money(res.rentalCost)}</div>
                    <div>Монтаж</div><div>${money(res.install)}</div>
                    <div>Транспорт</div><div>${money(res.transport)}</div>
                    <div><b>ИТОГО</b></div><div><b>${money(res.total)}</b></div>
                `;
            }
            const body = typeof getTrussEl === 'function' ? getTrussEl('trussPiecesBody') : q('trussPiecesBody');
            if (body) {
                body.innerHTML = `
                    <tr><td>Ферма 3 м</td><td>${Number(res.pieces['3'] || 0)} шт</td></tr>
                    <tr><td>Ферма 2 м</td><td>${Number(res.pieces['2'] || 0)} шт</td></tr>
                    <tr><td>Ферма 1 м</td><td>${Number(res.pieces['1'] || 0)} шт</td></tr>
                    <tr><td>Ферма 0.5 м</td><td>${Number(res.pieces['0.5'] || 0)} шт</td></tr>
                    <tr><td>Угол / куб / стык 90°</td><td>${Number(res.corners || 0)} шт</td></tr>
                    <tr><td>Стойка вертикальная</td><td>${Number(res.supportCount || 0)} шт</td></tr>
                    <tr><td>База / пятка фермы</td><td>${Number(res.supportCount || 0)} шт</td></tr>
                `;
            }
            const label = q('trussCountLabel');
            if (label) {
                const h = trussSegmentsH && trussSegmentsH.size ? trussSegmentsH.size : 0;
                const v = trussSegmentsV && trussSegmentsV.size ? trussSegmentsV.size : 0;
                label.textContent = `Участков: ${h + v} · Метраж: ${metric(res.totalMeters)} м`;
            }
        }

        function render3DResult(res){
            const box = typeof getTrussEl === 'function' ? getTrussEl('trussResult') : q('trussResult');
            if (box) {
                box.innerHTML = `
                    <div>Тип конструкции</div><div><span class="truss-3d-badge">▧ ${esc(res.constructionLabel || '3D табуретка')}</span></div>
                    <div>Габариты Ш×Г×В</div><div>${esc(res.dimensionsLabel || '')}</div>
                    <div>Верхний периметр</div><div>${metric(res.topPerimeterMeters)} м</div>
                    <div>Вертикальные ноги</div><div>${metric(res.verticalMeters)} м</div>
                    <div>Общий метраж ферм</div><div>${metric(res.totalMeters)} м</div>
                    <div>Верхние кубы / углы</div><div>${Number(res.topCubes || 0)} шт</div>
                    <div>Базы / пятки</div><div>${Number(res.bases || 0)} шт</div>
                    <div>Вес комплекта</div><div>${metric(res.weight)} кг</div>
                    <div>Прокат конструкции</div><div>${money(res.rentalCost)}</div>
                    <div>Монтаж</div><div>${money(res.install)}</div>
                    <div>Транспорт</div><div>${money(res.transport)}</div>
                    <div><b>ИТОГО</b></div><div><b>${money(res.total)}</b></div>
                `;
            }
            const body = typeof getTrussEl === 'function' ? getTrussEl('trussPiecesBody') : q('trussPiecesBody');
            if (body) {
                body.innerHTML = `
                    <tr><td>Ферма 3 м</td><td>${Number(res.pieces && res.pieces['3'] || 0)} шт</td></tr>
                    <tr><td>Ферма 2 м</td><td>${Number(res.pieces && res.pieces['2'] || 0)} шт</td></tr>
                    <tr><td>Ферма 1 м</td><td>${Number(res.pieces && res.pieces['1'] || 0)} шт</td></tr>
                    <tr><td>Ферма 0.5 м</td><td>${Number(res.pieces && res.pieces['0.5'] || 0)} шт</td></tr>
                    <tr><td>Верхний прямоугольник</td><td>${metric(res.topPerimeterMeters)} м</td></tr>
                    <tr><td>Вертикальные ноги из ферм</td><td>4 × ${metric(res.heightM)} м</td></tr>
                    <tr><td>Верхний куб / угол</td><td>${Number(res.topCubes || 0)} шт</td></tr>
                    <tr><td>База / пятка</td><td>${Number(res.bases || 0)} шт</td></tr>
                `;
            }
            const label = q('trussCountLabel');
            if (label) label.textContent = '3D табуретка';
        }

        window.calculateTruss = calculateTruss = function(){
            try {
                if (getType() === 'stool3d' && typeof calculateTruss3DStool === 'function') {
                    lastTrussResult = calculateTruss3DStool();
                    render3DResult(lastTrussResult);
                    try { if (typeof updateTruss3DModeUI === 'function') updateTruss3DModeUI(); } catch(e) {}
                    return lastTrussResult;
                }
                const res = calc2DTruss();
                render2DResult(res);
                return res;
            } catch(e) {
                console.error('FEG 3.4.7 calculateTruss failed', e);
                const res = calc2DTruss();
                render2DResult(res);
                return res;
            }
        };

        window.renderTrussResult = renderTrussResult = function(){
            try {
                const res = lastTrussResult && ((getType() === 'stool3d' && lastTrussResult.is3D) || (getType() !== 'stool3d' && !lastTrussResult.is3D))
                    ? lastTrussResult
                    : calculateTruss();
                if (res && res.is3D) render3DResult(res);
                else render2DResult(res || calc2DTruss());
            } catch(e) {
                console.error('FEG 3.4.7 renderTrussResult failed', e);
            }
        };

        // Переключатель типа конструкции: при выборе 2D сразу пересчитываем именно 2D.
        function bindType(){
            const el = q('trussConstructionType');
            if (!el || el.dataset.feg347Bound === '1') return;
            el.dataset.feg347Bound = '1';
            el.addEventListener('change', () => {
                if (el.value === '2d') {
                    setType2D();
                    lastTrussResult = null;
                    try { if (typeof drawTrussSegments === 'function') drawTrussSegments(); } catch(e) {}
                    calculateTruss();
                } else {
                    try { if (typeof updateTruss3DModeUI === 'function') updateTruss3DModeUI(); } catch(e) {}
                    calculateTruss();
                }
            }, true);
        }

        const prevInstall = typeof installTruss3DUI === 'function' ? installTruss3DUI : null;
        if (prevInstall) {
            installTruss3DUI = function(){
                const out = prevInstall.apply(this, arguments);
                bindType();
                return out;
            };
        }

        // На всякий случай фиксируем вызовы после рисования/шаблонов.
        const prevApplyHit = typeof applyTrussHit === 'function' ? applyTrussHit : null;
        if (prevApplyHit) {
            applyTrussHit = function(hit){
                setType2D();
                const out = prevApplyHit.apply(this, arguments);
                calculateTruss();
                return out;
            };
        }

        const prevClear = typeof clearTrussConfirm === 'function' ? clearTrussConfirm : null;
        clearTrussConfirm = function(){
            if (prevClear) {
                try { return prevClear.apply(this, arguments); }
                finally {
                    setType2D();
                    lastTrussResult = null;
                    calculateTruss();
                }
            }
            try { trussSegmentsH.clear(); trussSegmentsV.clear(); } catch(e) {}
            setType2D();
            lastTrussResult = null;
            try { if (typeof renderTrussGrid === 'function') renderTrussGrid(); } catch(e) {}
            calculateTruss();
        };

        window.addEventListener('load', () => {
            setTimeout(() => {
                try { if (typeof installTruss3DUI === 'function') installTruss3DUI(); } catch(e) {}
                bindType();
                try { calculateTruss(); } catch(e) {}
            }, 250);
        });

        window.FEG347_TRUSS_CALC_FIX = VERSION;
    })();



    /* --- FEG Stage PRO 3.5: блочный конструктор ферм --- */
    (function(){
        const VERSION = APP_VERSION;
        const STORAGE_KEY = 'fegTrussBlockConstructorDraftV35';
        const DEFAULTS = {
            cols: 24,
            rows: 16,
            cellMeters: 0.5,
            zoom: 100,
            selected: 'truss3',
            orientation: 'h',
            mode: 'place',
            manualPins: 0,
            selectedItemId: null,
            pricePerMeter: 600,
            nodePrice: 300,
            basePrice: 300,
            pinPrice: 80,
            install: 5000,
            weightPerMeter: 6,
            nodeWeight: 4,
            baseWeight: 12,
            halfConnectorPrice: 0,
            halfConnectorWeight: 0.27,
            pinWeight: 0.25,
            c2PinWeight: 0.04,
            cotterWeight: 0,
            trussSeries: 'T29Q',
            spanManual: 0,
            factDistributedKgM: 0,
            factPointKg: 0,
            pointScheme: 'p1',
            cantileverLength: 0,
            cantileverView: 'Q',
            bgMode: 'clean',
            gridDensity: 'medium',
            templateWidthM: 6,
            templateHeightM: 3,
            projectName: '',
            clientName: ''
        };

        const TrussBlockModule = window.FEGModules && window.FEGModules.TrussBlockConstructor;
        const LoadCheckerModule = window.FEGModules && window.FEGModules.LoadChecker;
        const SPECS = TrussBlockModule && typeof TrussBlockModule.getDefaultSpecs === 'function'
            ? TrussBlockModule.getDefaultSpecs()
            : {
            truss3:   { id:'truss3',   label:'Ферма 3 м',   short:'3 м',   kind:'straight', length:3,   icon:'▰3' },
            truss25:  { id:'truss25',  label:'Ферма 2.5 м', short:'2.5 м', kind:'straight', length:2.5, icon:'▰2.5' },
            truss2:   { id:'truss2',   label:'Ферма 2 м',   short:'2 м',   kind:'straight', length:2,   icon:'▰2' },
            truss15:  { id:'truss15',  label:'Ферма 1.5 м', short:'1.5 м', kind:'straight', length:1.5, icon:'▰1.5' },
            truss1:   { id:'truss1',   label:'Ферма 1 м',   short:'1 м',   kind:'straight', length:1,   icon:'▰1' },
            truss05:  { id:'truss05',  label:'Ферма 0.5 м', short:'0.5 м', kind:'straight', length:0.5, icon:'▰0.5' },
            cornerU003:{ id:'cornerU003', label:'U003 · угол 90° · 2 направления',  short:'U003 90°', kind:'node', icon:'∟',   u:'003', angle:'90°',  directions:2, weights:{T29Q:5.2,  T39Q:6.4} },
            base:     { id:'base',     label:'База / блин', short:'База',  kind:'base', icon:'◉' },
            pin:      { id:'pin',      label:'Конусный коннектор C2-88 / бабышка', short:'C2-88', kind:'pin', icon:'C2', hidden:true }
        };

        const LEGACY_TYPE_MAP = TrussBlockModule && typeof TrussBlockModule.getLegacyTypeMap === 'function'
            ? TrussBlockModule.getLegacyTypeMap()
            : { angle90:'cornerU003', cube:'cornerU022', tee:'cornerU017', cross:'cornerU016' };

        const STRAIGHT_ORDER = [3, 2.5, 2, 1.5, 1, 0.5];
        const NODE_EXTENSION_M = 0.5; // Реальный вынос подключённого угла/U-блока вдоль присоединённой фермы: 2 м + угол = 2.5 м
        const C2_67_WEIGHT_KG = 0.04; // масса пальца C2-67 по карточке МДМТ
        const C2_COTTER_WEIGHT_KG = 0; // вес шплинта пока не задан в базе
        const C3_83_WEIGHT_KG = 0.27; // масса полуконнектора C3-83 по карточке
        const HALF_STEP = 0.5;

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

        let state = Object.assign({}, DEFAULTS, { items: [] });
        let uidCounter = Date.now();
        let dragState = null;
        let suppressClickUntil = 0;

        const q = (id) => document.getElementById(id);
        const esc = (value) => {
            if (typeof escapeHtml === 'function') return escapeHtml(String(value ?? ''));
            return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
        };
        const money = (value) => `${Math.round(Number(value || 0)).toLocaleString('ru-RU')} ₽`;
        const metric = (value, digits = 1) => {
            const n = Number(value || 0);
            return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
        };
        const makeId = () => `b${++uidCounter}`;
        const cellCount = (meters) => TrussBlockModule && typeof TrussBlockModule.cellCount === 'function'
            ? TrussBlockModule.cellCount(meters, state.cellMeters)
            : Math.max(1, Math.round(Number(meters || 0) / Number(state.cellMeters || 0.5)));
        const transportCost = () => {
            try {
                if (typeof calculateTransportCost === 'function' && typeof transportSettings !== 'undefined') return Number(calculateTransportCost(transportSettings) || 0);
            } catch(err) {}
            return 0;
        };

        function seriesSizeCode(seriesId){
            return seriesId === 'T39Q' ? '39x39' : '29x29';
        }
        function mdmtCode(spec, seriesId = state.trussSeries){
            if (!spec || spec.kind !== 'node' || !spec.u) return '';
            return `CQ${seriesSizeCode(seriesId)}U${spec.u}CXV`;
        }
        function specDisplayName(spec){
            if (!spec) return '';
            const code = mdmtCode(spec);
            return code ? `${code} — ${spec.label}` : spec.label;
        }
        function mdmtNodeWeight(spec){
            if (!spec || spec.kind !== 'node') return 0;
            const weights = spec.weights || {};
            return Number(weights[state.trussSeries] ?? weights.T29Q ?? state.nodeWeight ?? 0);
        }
        function trussModuleApi(name){
            return TrussBlockModule && typeof TrussBlockModule[name] === 'function' ? TrussBlockModule[name] : null;
        }
        function normalizeStateItems(){
            const normalizeItemsFn = trussModuleApi('normalizeItems');
            const normalizeSelectedTypeFn = trussModuleApi('normalizeSelectedType');
            const selectedItemExistsFn = trussModuleApi('selectedItemExists');
            state.items = normalizeItemsFn ? normalizeItemsFn(state.items, SPECS, LEGACY_TYPE_MAP) : (Array.isArray(state.items) ? state.items : []);
            state.selected = normalizeSelectedTypeFn ? normalizeSelectedTypeFn(state.selected, SPECS, LEGACY_TYPE_MAP, DEFAULTS.selected) : (SPECS[state.selected] && !SPECS[state.selected].hidden ? state.selected : DEFAULTS.selected);
            state.manualPins = 0;
            if (state.selectedItemId) {
                const exists = selectedItemExistsFn ? selectedItemExistsFn(state.items, state.selectedItemId) : state.items.some(item => item.id === state.selectedItemId);
                if (!exists) state.selectedItemId = null;
            }
        }

        function readNumber(id, fallback) {
            const el = q(id);
            const n = Number(el ? el.value : fallback);
            return Number.isFinite(n) ? n : fallback;
        }
        function writeValue(id, value) {
            const el = q(id);
            if (el) el.value = value;
        }

        function installStyles(){
            if (q('feg35BlockConstructorStyle')) return;
            const style = document.createElement('style');
            style.id = 'feg35BlockConstructorStyle';
            style.textContent = `
                .block-truss-section { margin-top: 18px; padding: 16px; border: 1px solid rgba(255,255,255,.10); border-radius: 22px; background: linear-gradient(180deg, rgba(20,24,30,.98), rgba(10,13,18,.98)); box-shadow: 0 18px 44px rgba(0,0,0,.30); }
                .block-truss-header { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px; }
                .block-truss-header h3 { margin: 0 0 6px; }
                .block-truss-layout { display:grid; grid-template-columns: minmax(0, 1.35fr) minmax(340px, .65fr); gap:14px; align-items:start; }
                .block-truss-card { border: 1px solid rgba(255,255,255,.08); border-radius: 18px; padding: 12px; background: rgba(255,255,255,.075); min-width: 0; }
                .block-project-panel { display:grid; grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) minmax(220px, .8fr); gap:10px; margin: 0 0 12px; padding: 12px; border:1px solid rgba(255,255,255,.08); border-radius:18px; background:rgba(255,255,255,.055); }
                .block-project-panel label { display:block; color:var(--muted); font-size:.72rem; margin-bottom:4px; }
                .block-project-panel input { width:100%; min-width:0; }
                .block-clean-note { min-height:40px; display:flex; align-items:center; border-radius:12px; border:1px solid rgba(75,179,120,.26); background:rgba(75,179,120,.12); color:#dfffea; padding:8px 10px; font-weight:800; font-size:.8rem; box-sizing:border-box; line-height:1.2; }
                .block-truss-controls, .block-truss-prices { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:8px; margin-bottom:10px; }
                .block-truss-controls label, .block-truss-prices label { display:block; color:var(--muted); font-size:.72rem; margin-bottom:4px; }
                .block-truss-controls input, .block-truss-controls select, .block-truss-prices input { width:100%; min-width:0; }
                .block-display-control { position:relative; min-width:0; }
                .block-display-menu { position:relative; }
                .block-display-menu summary { min-height:36px; display:flex; align-items:center; justify-content:space-between; gap:10px; border-radius:10px; border:1px solid rgba(196,160,111,.26); background:rgba(196,160,111,.12); color:#f5dfbd; padding:8px 9px; font-weight:900; font-size:.78rem; box-sizing:border-box; cursor:pointer; list-style:none; }
                .block-display-menu summary::-webkit-details-marker { display:none; }
                .block-display-menu summary small { color:var(--muted); font-size:.68rem; font-weight:800; white-space:nowrap; }
                .block-display-menu[open] summary { border-color:rgba(196,160,111,.55); background:rgba(196,160,111,.18); }
                .block-display-menu-body { position:absolute; z-index:80; top:calc(100% + 7px); left:0; min-width:260px; display:grid; gap:8px; padding:10px; border:1px solid rgba(255,255,255,.12); border-radius:14px; background:rgba(17,21,27,.98); box-shadow:0 16px 38px rgba(0,0,0,.42); }
                .block-check-row { display:flex !important; align-items:center; gap:8px; margin:0 !important; color:#edf2f8 !important; font-size:.78rem !important; font-weight:800; }
                .block-check-row input { width:auto !important; min-width:auto !important; }
                .block-check-row input[type="checkbox"] { width:16px !important; height:16px; accent-color:#c4a06f; cursor:pointer; flex:0 0 auto; }
                .block-check-group { display:grid; gap:7px; padding:8px; border-radius:12px; background:rgba(255,255,255,.045); }
                .block-check-group-title { color:var(--muted); font-size:.68rem; font-weight:900; text-transform:uppercase; letter-spacing:.04em; }
                .block-hidden-select { display:none !important; }
                body.theme-light .block-display-menu-body { background:#fff7e9; border-color:#d7c9b5; box-shadow:0 16px 38px rgba(53,38,19,.18); }
                body.theme-light .block-check-row { color:#2d261f !important; }
                .block-mode-note { min-height:36px; display:flex; align-items:center; border-radius:10px; border:1px solid rgba(196,160,111,.26); background:rgba(196,160,111,.12); color:#f5dfbd; padding:8px 9px; font-weight:800; font-size:.78rem; box-sizing:border-box; }
                .block-library { display:flex; flex-wrap:wrap; gap:7px; margin: 10px 0; align-items:center; }
                .block-library button { width:48px; height:48px; min-width:48px; min-height:48px; padding:0 !important; border-radius:14px; border: 1px solid rgba(255,255,255,.10); background: linear-gradient(180deg, rgba(41,47,56,.95), rgba(24,28,34,.95)); color: #e8edf4; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:.75rem; line-height:1; font-weight:900; position:relative; }
                .block-library button .block-object-icon { display:block; max-width:42px; overflow:hidden; text-overflow:clip; white-space:nowrap; font-size:.9rem; line-height:1; transform:translateY(-1px); }
                .block-library button[data-kind="node"] .block-object-icon { font-size:1.02rem; }
                .block-library button[data-kind="base"] .block-object-icon { font-size:1.15rem; }
                .block-library button.active { border-color: rgba(205,214,224,.95); box-shadow: 0 0 0 2px rgba(205,214,224,.16) inset; background: linear-gradient(180deg, rgba(92,101,114,.98), rgba(42,49,58,.98)); }
                .block-truss-toolbar { display:flex; flex-wrap:wrap; gap:8px; margin: 10px 0; align-items:center; }
                .block-truss-toolbar .block-icon-button { width:44px; height:44px; min-width:44px; padding:0 !important; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; font-size:1.22rem; line-height:1; font-weight:900; }
                .block-truss-toolbar .block-icon-button .block-action-icon { display:block; line-height:1; transform:translateY(-1px); }
                .block-scheme-footer { display:flex; justify-content:flex-end; gap:8px; margin:9px 0 0; }
                .block-scheme-export-button { min-height:38px; padding:8px 13px !important; border-radius:12px; font-weight:900; }
                .block-grid-wrap { overflow:auto; border-radius:18px; border:1px solid rgba(255,255,255,.10); background: linear-gradient(180deg, rgba(15,18,24,.98), rgba(7,10,14,.98)); padding:12px; max-height: 72vh; }
                .block-grid { position:relative; display:grid; grid-template-columns: repeat(var(--block-cols,24), var(--block-cell,28px)); grid-template-rows: repeat(var(--block-rows,16), var(--block-cell,28px)); width:max-content; min-width: 100%; border:1px solid rgba(255,255,255,.08); background-color:#14181f; }
                .block-grid[data-bg-mode="clean"] { background-image:none; }
                .block-grid[data-bg-mode="grid"][data-bg-density="thin"] { background-image: linear-gradient(to right, rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.12) 1px, transparent 1px); background-size: var(--block-cell,28px) var(--block-cell,28px), var(--block-cell,28px) var(--block-cell,28px); }
                .block-grid[data-bg-mode="grid"][data-bg-density="medium"] { background-image: linear-gradient(to right, rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,.075) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.075) 1px, transparent 1px); background-size: var(--block-cell,28px) var(--block-cell,28px), var(--block-cell,28px) var(--block-cell,28px), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2); }
                .block-grid[data-bg-mode="grid"][data-bg-density="dense"] { background-image: linear-gradient(to right, rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.055) 1px, transparent 1px); background-size: var(--block-cell,28px) var(--block-cell,28px), var(--block-cell,28px) var(--block-cell,28px), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2), calc(var(--block-cell,28px) / 4) calc(var(--block-cell,28px) / 4), calc(var(--block-cell,28px) / 4) calc(var(--block-cell,28px) / 4); }
                .block-hit { width:var(--block-cell,28px); height:var(--block-cell,28px); border:0; background:transparent; padding:0; margin:0; cursor:crosshair; z-index:2; }
                .block-item { position:absolute; box-sizing:border-box; z-index:4; pointer-events:auto; cursor:grab; touch-action:none; user-select:none; -webkit-user-select:none; display:flex; align-items:center; justify-content:center; color:#effaf3; font-weight:900; font-size:11px; line-height:1; text-align:center; text-shadow: 0 1px 2px rgba(0,0,0,.45); transition: box-shadow .12s ease, outline-color .12s ease; overflow:visible; }
                .block-item.dragging { cursor:grabbing; opacity:.92; }
                .block-item.selected { outline: 3px solid #ffdd69; outline-offset: 2px; box-shadow: 0 0 0 4px rgba(255,221,105,.18), 0 2px 12px rgba(0,0,0,.35); }
                .block-item-straight { border-radius:10px; border: 0; background: transparent; box-shadow:none; }
                .block-item-straight.v { background: transparent; }
                .block-item svg { width:100%; height:100%; display:block; overflow:visible; }
                .truss-rail { stroke:#d4dae2; stroke-width:5; stroke-linecap:round; fill:none; filter: drop-shadow(0 1px 1px rgba(0,0,0,.35)); }
                .truss-web { stroke:#edf1f5; stroke-width:2.2; stroke-linecap:round; opacity:.92; fill:none; }
                .truss-end { stroke:#f9fbfd; stroke-width:2.4; stroke-linecap:round; opacity:.92; }
                .truss-label { fill:#ffffff; font-weight:900; paint-order:stroke; stroke:rgba(0,0,0,.55); stroke-width:3px; stroke-linejoin:round; }
                .node-tube { stroke:#b9d2e8; stroke-width:12; stroke-linecap:round; stroke-linejoin:round; fill:none; filter: drop-shadow(0 1px 1px rgba(0,0,0,.28)); }
                .node-tube-corner { stroke:#b9d2e8; stroke-width:13; stroke-linecap:round; stroke-linejoin:round; fill:none; filter: drop-shadow(0 1px 1px rgba(0,0,0,.28)); }
                .node-truss-rail { stroke:#d6dce4; stroke-width:5; stroke-linecap:round; stroke-linejoin:round; fill:none; filter: drop-shadow(0 1px 1px rgba(0,0,0,.28)); }

                .u003-reference-svg .u003-ref-tube {
                    fill: #f2f4f7;
                    stroke: rgba(255,255,255,.35);
                    stroke-width: 1.2;
                    stroke-linejoin: round;
                }

                .node-truss-web { stroke:#f0f4f8; stroke-width:2.4; stroke-linecap:round; opacity:.92; fill:none; }
                .node-end-plate { stroke:#fafcff; stroke-width:2.8; stroke-linecap:round; opacity:.95; }
                .node-core { fill:#7f8995; stroke:rgba(255,255,255,.92); stroke-width:4; }
                .node-port-dot { fill:#cfd6df; stroke:rgba(255,255,255,.85); stroke-width:1.6; }
                .node-label { fill:#f7f9fb; font-size:18px; font-weight:900; paint-order:stroke; stroke:rgba(0,0,0,.65); stroke-width:4px; stroke-linejoin:round; }
                .block-item-node { border-radius: 12px; background: transparent; border: 0; color:#fff; }

                .micro-tuner-fab {
                    position: fixed; right: 18px; bottom: 18px; z-index: 9997;
                    border: 0; border-radius: 14px; padding: 10px 13px;
                    font-weight: 900; background: #ffdd69; color: #2f2408;
                    box-shadow: 0 8px 24px rgba(0,0,0,.35); cursor: pointer;
                }
                .micro-tuner {
                    position: fixed; right: 18px; bottom: 72px;
                    width: min(390px, calc(100vw - 36px)); max-height: calc(100vh - 100px);
                    overflow: auto; z-index: 9998; display: none;
                    background: rgba(15,20,28,.96); color: #f3f6fa;
                    border: 1px solid rgba(255,255,255,.16); border-radius: 18px;
                    box-shadow: 0 18px 50px rgba(0,0,0,.45); padding: 14px;
                }
                .micro-tuner.open { display:block; }
                .micro-tuner h4 { margin: 0 0 6px; font-size: 15px; font-weight: 900; }
                .micro-tuner .sub { margin: 0 0 10px; font-size: 12px; color: rgba(243,246,250,.7); }
                .micro-row { display:grid; grid-template-columns: 88px 1fr 64px; gap:8px; align-items:center; margin:8px 0; font-size:12px; }
                .micro-row input[type="range"] { width:100%; }
                .micro-row input[type="number"], .micro-row input[type="color"], .micro-row input[type="text"] {
                    width:100%; box-sizing:border-box; border-radius:9px; border:1px solid rgba(255,255,255,.16);
                    background:rgba(255,255,255,.08); color:#f3f6fa; padding:6px 7px;
                }
                .micro-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
                .micro-actions button { border:0; border-radius:11px; padding:8px 10px; font-weight:800; cursor:pointer; background:rgba(255,255,255,.12); color:#f3f6fa; }
                .micro-actions button.primary { background:#ffdd69; color:#2f2408; }
                .micro-hint { margin-top:9px; font-size:11px; line-height:1.35; color:rgba(243,246,250,.68); }
                .micro-pin-backdrop {
                    position: fixed; inset: 0; z-index: 9999; display: none;
                    align-items: center; justify-content: center; padding: 18px;
                    background: rgba(3,7,12,.56); backdrop-filter: blur(10px);
                }
                .micro-pin-backdrop.open { display:flex; }
                .micro-pin-modal {
                    width: min(360px, 100%); border-radius: 22px; padding: 18px;
                    background: linear-gradient(180deg, rgba(25,32,43,.98), rgba(12,17,24,.98));
                    border: 1px solid rgba(255,255,255,.16); color: #f3f6fa;
                    box-shadow: 0 24px 80px rgba(0,0,0,.48);
                }
                .micro-pin-modal h4 { margin:0 0 8px; font-size:16px; font-weight:950; }
                .micro-pin-modal p { margin:0 0 12px; font-size:12px; line-height:1.4; color:rgba(243,246,250,.72); }
                .micro-pin-modal input {
                    width:100%; box-sizing:border-box; border-radius:13px; border:1px solid rgba(255,255,255,.18);
                    background:rgba(255,255,255,.08); color:#f3f6fa; padding:11px 12px;
                    font-size:18px; font-weight:900; letter-spacing:.22em; text-align:center;
                }
                .micro-pin-error { min-height:16px; margin-top:8px; font-size:12px; color:#ffb4a6; font-weight:800; }
                .micro-pin-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px; }
                .micro-pin-actions button { border:0; border-radius:12px; padding:9px 12px; font-weight:900; cursor:pointer; background:rgba(255,255,255,.12); color:#f3f6fa; }
                .micro-pin-actions button.primary { background:#ffdd69; color:#2f2408; }

.block-item-base { border-radius: 50%; background: transparent; border: 0; color:#eef2f6; box-shadow:none; }
                .block-item-pin { border-radius: 50%; background: #f1c55e; color:#3b2a12; border: 2px solid rgba(0,0,0,.16); font-size: 14px; }
                .block-connection-dot { position:absolute; min-width:18px; height:16px; padding:0 4px; border-radius:999px; margin:-8px 0 0 -9px; background:#ffdd69; color:#2e2208; border:1px solid rgba(0,0,0,.25); z-index:5; pointer-events:none; font-size:9px; font-weight:900; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.25); }
                .block-connection-dot.hot { background:#ff8b69; }
                .block-caption { display:flex; justify-content:space-between; gap:10px; color:var(--muted); font-size:.78rem; margin-top:8px; }
                .block-calc-table-wrap { overflow:auto; border:1px solid var(--line); border-radius:14px; margin:10px 0; background:rgba(255,255,255,.025); }
                .block-calc-table { width:100%; border-collapse:collapse; min-width:420px; font-size:.80rem; }
                .block-calc-table caption { text-align:left; padding:9px 10px; color:#f4d7a8; font-weight:900; background:rgba(255,255,255,.045); border-bottom:1px solid rgba(255,255,255,.08); }
                .block-calc-table th, .block-calc-table td { padding:8px 9px; border-bottom:1px solid rgba(255,255,255,.08); vertical-align:middle; }
                .block-calc-table th { color:var(--muted); background:rgba(255,255,255,.035); font-weight:900; text-align:left; }
                .block-calc-table td:nth-child(n+2), .block-calc-table th:nth-child(n+2) { text-align:right; }
                .block-calc-table tr:last-child td, .block-calc-table tr:last-child th { border-bottom:none; }
                .block-calc-table .block-total-row td { font-weight:950; color:#ffe3aa; background:rgba(196,160,111,.10); }
                .block-calc-table .block-muted-cell { color:var(--muted); font-size:.72rem; font-weight:800; }
                .block-calc-inputs input { width:100%; min-width:86px; text-align:right; }
                .block-calc-inputs input[disabled] { opacity:.82; }
                .block-calc-bom-style td:first-child { min-width:160px; }
                .block-calc-bom-style .block-muted-cell { line-height:1.35; }
                .block-calc-bom-style td:nth-child(4), .block-calc-bom-style th:nth-child(4) { text-align:right; white-space:nowrap; }
                .block-bom-wrap { overflow:auto; border:1px solid var(--line); border-radius:14px; }
                .block-bom { width:100%; border-collapse:collapse; min-width: 520px; font-size:.78rem; }
                .block-bom th, .block-bom td { padding:8px 9px; border-bottom:1px solid rgba(255,255,255,.08); text-align:left; }
                .block-bom th { color:var(--muted); background:rgba(255,255,255,.035); font-weight:800; }
                .block-bom td:nth-child(n+2), .block-bom th:nth-child(n+2) { text-align:right; }
                .block-load-launcher { margin: 10px 0 12px; display:grid; gap:8px; }
                .block-settings-launcher { margin: 0 0 12px; display:grid; gap:8px; }
                .block-load-launcher-button, .block-settings-launcher-button { width:100%; justify-content:space-between; align-items:center; display:flex; gap:10px; padding:10px 12px !important; border-radius:14px !important; }
                .block-settings-launcher-button .block-load-launcher-main span { max-width:100%; }
                .block-settings-modal-backdrop { z-index: 2350; }
                .block-load-launcher-main { display:flex; flex-direction:column; gap:2px; text-align:left; }
                .block-load-launcher-main strong { font-size:.92rem; }
                .block-load-launcher-main span { color:var(--muted); font-size:.74rem; font-weight:700; }
                .block-load-launcher-status { white-space:nowrap; border-radius:999px; padding:5px 8px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); font-size:.72rem; font-weight:900; }
                .block-load-launcher-status.ok { color:#bff1d1; border-color:rgba(46,139,87,.65); background:rgba(46,139,87,.16); }
                .block-load-launcher-status.risk { color:#ffe3a3; border-color:rgba(255,196,87,.75); background:rgba(255,196,87,.14); }
                .block-load-launcher-status.bad { color:#ffd0d0; border-color:rgba(255,105,105,.8); background:rgba(255,105,105,.16); }
                .block-pdf-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin:10px 0; }
                .block-pdf-actions .full { grid-column:1/-1; }
                .block-pdf-actions button { min-height:40px; font-weight:900; }
                .block-load-modal-backdrop { z-index: 2300; }
                .block-load-modal { width:min(1080px, 100%); max-height:92vh; background:#121a22; border:1px solid var(--line); border-radius:28px; box-shadow:0 24px 80px rgba(15,23,42,.44); overflow:hidden; display:flex; flex-direction:column; }
                .block-load-modal-body { padding:16px; overflow:auto; display:grid; gap:14px; }
                .block-load-hero { display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,.34fr); gap:12px; align-items:stretch; }
                .block-load-hero-card { border:1px solid rgba(255,255,255,.10); border-radius:18px; padding:12px; background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.035)); }
                .block-load-hero-title { font-weight:900; font-size:1rem; margin-bottom:5px; }
                .block-load-hero-sub { color:var(--muted); font-size:.8rem; line-height:1.35; }
                .block-load-panel-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; }
                .block-load-panel { border:1px solid rgba(255,255,255,.10); border-radius:18px; padding:12px; background:rgba(255,255,255,.055); box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
                .block-load-panel-title { color:#f4d7a8; font-weight:900; font-size:.76rem; text-transform:uppercase; letter-spacing:.055em; margin-bottom:9px; }
                .block-load-fields { display:grid; grid-template-columns:1fr; gap:9px; }
                .block-load-fields label { display:block; color:var(--muted); font-size:.74rem; margin-bottom:5px; }
                .block-load-fields input, .block-load-fields select { width:100%; min-width:0; border-radius:11px; }
                .block-load-summary { display:grid; gap:12px; font-size:.82rem; }
                .block-load-status { padding:10px 12px; border-radius:16px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); font-weight:900; line-height:1.35; }
                .block-load-status.ok { border-color: rgba(46,139,87,.65); background: rgba(46,139,87,.16); color:#bff1d1; }
                .block-load-status.risk { border-color: rgba(255,196,87,.75); background: rgba(255,196,87,.14); color:#ffe3a3; }
                .block-load-status.bad { border-color: rgba(255,105,105,.8); background: rgba(255,105,105,.16); color:#ffd0d0; }
                .block-load-grid { display:grid; grid-template-columns: minmax(0,1fr) minmax(96px,auto); border:1px solid rgba(255,255,255,.10); border-radius:0 0 16px 16px; overflow:hidden; }
                .block-load-grid > div { padding:8px 10px; border-bottom:1px solid rgba(255,255,255,.08); min-width:0; overflow-wrap:anywhere; }
                .block-load-grid > div:nth-child(odd) { color:var(--muted); background:rgba(255,255,255,.025); }
                .block-load-grid > div:nth-child(even) { text-align:right; font-weight:900; }
                .block-load-grid > div:nth-last-child(-n+2) { border-bottom:none; }
                .block-load-note { color: var(--muted); font-size: .76rem; line-height: 1.45; border:1px solid rgba(255,255,255,.10); border-radius:16px; padding:11px 12px; background:rgba(255,255,255,.035); }
                .block-load-sections { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
                .block-load-section { border:1px solid rgba(255,255,255,.10); border-radius:16px; overflow:hidden; background:rgba(255,255,255,.035); }
                .block-load-section h5 { margin:0; padding:10px 12px; background:rgba(255,255,255,.055); font-size:.8rem; color:#f4d7a8; font-weight:900; }
                /* v3.5.50: отдельная светлая палитра для блочного конструктора. Темная тема не затрагивается. */
                body.theme-light #blockTrussModule.block-truss-section { color:#201c17; background:linear-gradient(180deg, #fffdf8, #f3ede3); border-color:rgba(91,67,45,.20); box-shadow:0 18px 44px rgba(70,53,34,.14), inset 0 1px 0 rgba(255,255,255,.78); }
                body.theme-light .block-truss-header h3 { color:#2a241e; }
                body.theme-light .block-truss-header .truss-subtitle { color:#6d6255; }
                body.theme-light .block-truss-card { color:#201c17; background:linear-gradient(180deg, #fffaf2, #f4ecde); border-color:#d7c9b5; box-shadow:inset 0 1px 0 rgba(255,255,255,.75); }
                body.theme-light .block-project-panel { color:#201c17; background:linear-gradient(180deg, #fbf6ed, #efe5d6); border-color:#d7c9b5; box-shadow:inset 0 1px 0 rgba(255,255,255,.68); }
                body.theme-light .block-project-panel label,
                body.theme-light .block-truss-controls label,
                body.theme-light .block-truss-prices label,
                body.theme-light .block-caption,
                body.theme-light .block-load-launcher-main span { color:#6d6255; }
                body.theme-light .block-clean-note { color:#165b36; background:#e6f4e8; border-color:#b8d9c0; }
                body.theme-light .block-display-menu summary { color:#5b432d; background:#f4ecde; border-color:#cdbb9f; }
                body.theme-light .block-display-menu summary small { color:#7f7467; }
                body.theme-light .block-display-menu[open] summary { background:#eadcc8; border-color:#9b784e; }
                body.theme-light .block-display-menu-body { background:#fffaf2; border-color:#d7c9b5; box-shadow:0 16px 38px rgba(53,38,19,.18); }
                body.theme-light .block-check-row { color:#2d261f !important; }
                body.theme-light .block-check-group { background:#f4ecde; border:1px solid rgba(91,67,45,.10); }
                body.theme-light .block-check-group-title { color:#7a5732; }
                body.theme-light .block-library button { background:linear-gradient(180deg, #fffaf2, #ece2d2); color:#2a241e; border-color:#d4c3ad; box-shadow:inset 0 1px 0 rgba(255,255,255,.74), 0 1px 2px rgba(70,53,34,.08); }
                body.theme-light .block-library button:hover { background:linear-gradient(180deg, #ffffff, #e5d7c2); border-color:#b99970; }
                body.theme-light .block-library button.active { color:#261b11; background:linear-gradient(180deg, #ead8bc, #d5bd98); border-color:#8b6842; box-shadow:0 0 0 2px rgba(139,104,66,.18) inset, 0 6px 14px rgba(70,53,34,.12); }
                body.theme-light .block-library button .block-object-icon { color:#2a241e; }
                body.theme-light .block-grid-wrap { background:linear-gradient(180deg, #e8dfd1, #d9cbb8); border-color:#cab8a1; box-shadow:inset 0 1px 0 rgba(255,255,255,.55); }
                body.theme-light .block-grid { background-color:#fbf6ed; border-color:#c7b59e; }
                body.theme-light .block-grid[data-bg-mode="grid"][data-bg-density="thin"] { background-image:linear-gradient(to right, rgba(70,53,34,.20) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,53,34,.20) 1px, transparent 1px); background-size:var(--block-cell,28px) var(--block-cell,28px), var(--block-cell,28px) var(--block-cell,28px); }
                body.theme-light .block-grid[data-bg-mode="grid"][data-bg-density="medium"] { background-image:linear-gradient(to right, rgba(70,53,34,.24) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,53,34,.24) 1px, transparent 1px), linear-gradient(to right, rgba(70,53,34,.11) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,53,34,.11) 1px, transparent 1px); background-size:var(--block-cell,28px) var(--block-cell,28px), var(--block-cell,28px) var(--block-cell,28px), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2); }
                body.theme-light .block-grid[data-bg-mode="grid"][data-bg-density="dense"] { background-image:linear-gradient(to right, rgba(70,53,34,.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,53,34,.28) 1px, transparent 1px), linear-gradient(to right, rgba(70,53,34,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,53,34,.14) 1px, transparent 1px), linear-gradient(to right, rgba(70,53,34,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(70,53,34,.07) 1px, transparent 1px); background-size:var(--block-cell,28px) var(--block-cell,28px), var(--block-cell,28px) var(--block-cell,28px), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2), calc(var(--block-cell,28px) / 2) calc(var(--block-cell,28px) / 2), calc(var(--block-cell,28px) / 4) calc(var(--block-cell,28px) / 4), calc(var(--block-cell,28px) / 4) calc(var(--block-cell,28px) / 4); }
                body.theme-light .block-item.selected { outline-color:#9b784e; box-shadow:0 0 0 4px rgba(139,104,66,.22), 0 2px 14px rgba(70,53,34,.20); }
                body.theme-light .truss-rail { stroke:#4c5c6c; filter:drop-shadow(0 1px 1px rgba(255,255,255,.55)); }
                body.theme-light .truss-web { stroke:#6e7f8f; opacity:.96; }
                body.theme-light .truss-end { stroke:#344556; opacity:.96; }
                body.theme-light .truss-label { fill:#201c17; stroke:rgba(255,255,255,.82); text-shadow:none; }
                body.theme-light .node-tube,
                body.theme-light .node-tube-corner,
                body.theme-light .node-truss-rail { stroke:#526577; filter:drop-shadow(0 1px 1px rgba(255,255,255,.55)); }
                body.theme-light .node-truss-web { stroke:#718394; }
                body.theme-light .node-end-plate { stroke:#35495d; }
                body.theme-light .node-core { fill:#8693a0; stroke:rgba(255,255,255,.92); }
                body.theme-light .node-port-dot { fill:#596878; stroke:rgba(255,255,255,.85); }
                body.theme-light .node-label { fill:#201c17; stroke:rgba(255,255,255,.88); }
                body.theme-light .u003-reference-svg .u003-ref-tube { fill:#5f7182; stroke:rgba(255,255,255,.65); }
                body.theme-light .block-calc-table-wrap,
                body.theme-light .block-bom-wrap { background:#fffaf2; border-color:#d7c9b5; }
                body.theme-light .block-calc-table caption { color:#7a5732; background:#efe4d4; border-bottom-color:#d7c9b5; }
                body.theme-light .block-calc-table th,
                body.theme-light .block-bom th { color:#5b432d; background:#efe4d4; border-bottom-color:#d7c9b5; }
                body.theme-light .block-calc-table td,
                body.theme-light .block-bom td { color:#201c17; border-bottom-color:#d7c9b5; }
                body.theme-light .block-calc-table .block-muted-cell { color:#7a6f62; }
                body.theme-light .block-calc-table .block-total-row td { color:#4c371f; background:#eadcc8; }
                body.theme-light .block-load-launcher-button,
                body.theme-light .block-settings-launcher-button { background:#fffaf2; border-color:#d7c9b5; color:#201c17; }
                body.theme-light .block-pdf-actions button { border-color:#d7c9b5; }
                body.theme-light .block-load-launcher-status { color:#5b432d; background:#f4ecde; border-color:#d7c9b5; }
                body.theme-light .block-load-grid, body.theme-light .block-load-panel, body.theme-light .block-load-section, body.theme-light .block-load-hero-card, body.theme-light .block-load-note, body.theme-light .block-load-modal { border-color:#d7c9b5; }
                body.theme-light .block-load-modal { background:linear-gradient(180deg, #ffffff, #f6f1e8); color:#201c17; }
                body.theme-light .block-load-hero-card, body.theme-light .block-load-panel, body.theme-light .block-load-section, body.theme-light .block-load-note { background:#fff7e9; }
                body.theme-light .block-load-grid > div { border-bottom-color:#d7c9b5; color:#201c17; }
                body.theme-light .block-load-grid > div:nth-child(odd) { background:#f4ecde; color:#6d6255; }
                body.theme-light .block-load-panel-title, body.theme-light .block-load-section h5 { color:#7a5732; }
                body.theme-light .block-load-section h5 { background:#efe4d4; }
                body.theme-light .block-load-status.ok, body.theme-light .block-load-launcher-status.ok { color:#1d6b3a; background:#e4f5e7; border-color:#a9d6b4; }
                body.theme-light .block-load-status.risk, body.theme-light .block-load-launcher-status.risk { color:#805b00; background:#fff2c9; border-color:#e6cb78; }
                body.theme-light .block-load-status.bad, body.theme-light .block-load-launcher-status.bad { color:#a53838; background:#ffe0dc; border-color:#e7aaa4; }
                @media (max-width: 1050px) { .block-truss-layout, .block-project-panel { grid-template-columns: 1fr; } }
                @media (max-width: 1050px) { .block-load-panel-grid, .block-load-hero, .block-load-sections { grid-template-columns:1fr; } }
                @media (max-width: 700px) { .block-truss-controls, .block-truss-prices { grid-template-columns: repeat(2, minmax(0,1fr)); } .block-truss-header { flex-direction:column; } }

                /* v3.5.55: mobile-first layout for the block truss constructor. Desktop rules above are untouched. */
                @media (max-width: 760px) {
                    html, body { width:100%; max-width:100%; overflow-x:hidden; }
                    body { padding:0 !important; }
                    .app-container,
                    .app-shell {
                        width:100% !important;
                        max-width:100% !important;
                        min-height:100dvh;
                        margin:0 !important;
                        padding: max(8px, env(safe-area-inset-top)) 8px calc(18px + env(safe-area-inset-bottom)) !important;
                        border-radius:0 !important;
                        border-left:0 !important;
                        border-right:0 !important;
                    }
                    .app-header { align-items:center !important; gap:10px !important; margin-bottom:8px !important; }
                    .logo img { width:76px !important; max-width:76px !important; border-radius:14px !important; }
                    .app-title h1 { font-size:1.45rem !important; line-height:.96 !important; letter-spacing:-.035em !important; }
                    .app-title p { margin-top:4px !important; font-size:.78rem !important; line-height:1.2 !important; }
                    .page-switch-panel {
                        top:0 !important;
                        margin:0 -8px 10px !important;
                        padding:8px !important;
                        border-radius:0 0 16px 16px !important;
                        display:flex !important;
                        gap:6px !important;
                        overflow-x:auto !important;
                        overscroll-behavior-x:contain;
                        -webkit-overflow-scrolling:touch;
                    }
                    .page-tab {
                        flex:1 0 auto !important;
                        min-width:max-content !important;
                        height:42px !important;
                        padding:0 12px !important;
                        border-radius:999px !important;
                        font-size:.82rem !important;
                        white-space:nowrap !important;
                    }
                    .app-tools-panel {
                        flex:1 0 100% !important;
                        margin-top:2px !important;
                        gap:6px !important;
                    }
                    .app-tools-panel button {
                        flex:1 0 auto !important;
                        min-width:max-content !important;
                        min-height:38px !important;
                        padding:0 10px !important;
                        border-radius:999px !important;
                        font-size:.78rem !important;
                    }
                    .page-tab.active::after { display:none !important; }
                    #trussPage .truss-section,
                    #blockTrussModule.block-truss-section {
                        margin:0 !important;
                        padding:0 !important;
                        border:0 !important;
                        border-radius:0 !important;
                        box-shadow:none !important;
                        background:transparent !important;
                    }
                    .block-truss-header {
                        position:sticky;
                        top:58px;
                        z-index:25;
                        flex-direction:row !important;
                        align-items:center !important;
                        margin:0 -8px 8px !important;
                        padding:8px !important;
                        background:rgba(12,17,22,.92);
                        border-bottom:1px solid var(--line);
                        backdrop-filter:blur(14px);
                    }
                    body.theme-light .block-truss-header { background:rgba(255,250,242,.92); border-color:#d7c9b5; }
                    .block-truss-header h3 { font-size:1rem !important; line-height:1.08 !important; margin:0 !important; padding-left:8px !important; }
                    .block-truss-header .truss-subtitle { display:none !important; }
                    .block-truss-header button { flex:0 0 auto; padding:8px 10px !important; border-radius:999px !important; font-size:.78rem !important; }
                    .block-project-panel {
                        grid-template-columns:1fr !important;
                        gap:8px !important;
                        padding:8px !important;
                        margin:0 0 8px !important;
                        border-radius:14px !important;
                    }
                    .block-project-panel > div:nth-child(3) { display:none !important; }
                    .block-truss-layout { grid-template-columns:1fr !important; gap:8px !important; }
                    .block-truss-card { padding:8px !important; border-radius:14px !important; }
                    .block-truss-controls { grid-template-columns:repeat(2, minmax(0,1fr)) !important; gap:7px !important; margin-bottom:6px !important; }
                    .block-truss-controls label { font-size:.64rem !important; margin-bottom:3px !important; }
                    .block-truss-controls input,
                    .block-truss-controls select {
                        min-height:38px !important;
                        padding:8px 10px !important;
                        border-radius:12px !important;
                        font-size:.88rem !important;
                    }
                    .block-display-control { grid-column:1 / -1 !important; }
                    .block-display-menu summary { min-height:38px !important; border-radius:12px !important; }
                    .block-display-menu-body {
                        position:fixed !important;
                        left:8px !important;
                        right:8px !important;
                        top:auto !important;
                        bottom:calc(10px + env(safe-area-inset-bottom)) !important;
                        min-width:0 !important;
                        max-height:55dvh !important;
                        overflow:auto !important;
                        z-index:3000 !important;
                    }
                    .block-library {
                        display:flex !important;
                        grid-template-columns:none !important;
                        overflow-x:auto !important;
                        gap:7px !important;
                        margin:8px -8px 6px !important;
                        padding:0 8px 8px !important;
                        scroll-snap-type:x proximity;
                        overscroll-behavior-x:contain;
                        -webkit-overflow-scrolling:touch;
                    }
                    .block-library button {
                        flex:0 0 44px !important;
                        width:44px !important;
                        min-width:44px !important;
                        height:44px !important;
                        min-height:44px !important;
                        padding:0 !important;
                        border-radius:13px !important;
                        font-size:.68rem !important;
                        scroll-snap-align:start;
                    }
                    .block-library button .block-object-icon { max-width:38px !important; font-size:.82rem !important; }
                    .block-library button[data-kind="node"] .block-object-icon { font-size:.96rem !important; }
                    .block-library button[data-kind="base"] .block-object-icon { font-size:1.08rem !important; }
                    .block-truss-toolbar {
                        flex-wrap:nowrap !important;
                        overflow-x:auto !important;
                        gap:6px !important;
                        margin:6px -8px 8px !important;
                        padding:0 8px 8px !important;
                        overscroll-behavior-x:contain;
                        -webkit-overflow-scrolling:touch;
                    }
                    .block-truss-toolbar button {
                        flex:0 0 auto !important;
                        min-height:38px !important;
                        padding:8px 10px !important;
                        border-radius:999px !important;
                        white-space:nowrap !important;
                        font-size:.78rem !important;
                    }
                    .block-truss-toolbar .block-icon-button {
                        flex:0 0 42px !important;
                        width:42px !important;
                        min-width:42px !important;
                        height:42px !important;
                        min-height:42px !important;
                        padding:0 !important;
                        border-radius:14px !important;
                        font-size:1.14rem !important;
                    }
                    .block-scheme-footer { display:none !important; }
                    .block-grid-wrap {
                        margin:0 -8px !important;
                        padding:8px !important;
                        border-left:0 !important;
                        border-right:0 !important;
                        border-radius:0 !important;
                        max-height:58dvh !important;
                        min-height:260px !important;
                        overscroll-behavior:contain;
                        -webkit-overflow-scrolling:touch;
                    }
                    .block-grid { min-width:max-content !important; }
                    .block-item { font-size:9px !important; }
                    .block-caption { display:block !important; font-size:.66rem !important; line-height:1.35 !important; }
                    .block-caption span:first-child { display:block; max-height:2.8em; overflow:hidden; }
                    .block-caption #blockCountLabel { display:block; margin-top:4px; font-weight:900; }
                    .block-truss-layout aside.block-truss-card { margin-top:8px !important; }
                    .block-truss-layout aside.block-truss-card h3 { font-size:.92rem !important; margin:0 0 8px !important; padding-left:8px !important; }
                    .block-load-launcher,
                    .block-settings-launcher { margin:8px 0 !important; }
                    .block-load-launcher-button,
                    .block-settings-launcher-button { min-height:46px !important; padding:8px 10px !important; align-items:flex-start !important; }
                    .block-load-launcher-main strong { font-size:.82rem !important; }
                    .block-load-launcher-main span { display:none !important; }
                    .block-load-launcher-status { padding:4px 7px !important; font-size:.66rem !important; }
                    .block-calc-table-wrap,
                    .block-bom-wrap { margin:8px -8px 0 !important; border-left:0 !important; border-right:0 !important; border-radius:0 !important; }
                    .block-calc-table,
                    .block-bom { min-width:0 !important; font-size:.68rem !important; }
                    .block-calc-table caption { padding:7px 8px !important; }
                    .block-calc-table th,
                    .block-calc-table td,
                    .block-bom th,
                    .block-bom td { padding:7px 6px !important; }
                    .block-bom th:nth-child(3),
                    .block-bom td:nth-child(3) { display:none !important; }
                    .block-bom th:first-child,
                    .block-bom td:first-child { width:42% !important; }
                    .modal-backdrop { padding:0 !important; align-items:stretch !important; justify-content:stretch !important; }
                    .block-load-modal,
                    .weights-modal,
                    .pdf-modal {
                        width:100% !important;
                        height:100dvh !important;
                        max-height:none !important;
                        border-radius:0 !important;
                        border-left:0 !important;
                        border-right:0 !important;
                    }
                    .pdf-modal-header {
                        min-height:52px !important;
                        padding:10px 12px !important;
                        position:sticky;
                        top:0;
                        z-index:3;
                        background:inherit;
                    }
                    .pdf-modal-title { font-size:.94rem !important; line-height:1.2 !important; }
                    .close-modal { width:38px !important; height:38px !important; flex:0 0 38px !important; }
                    .pdf-modal-actions { padding:10px 12px !important; gap:7px !important; }
                    .pdf-modal-actions button { flex:1 1 140px !important; min-height:38px !important; }
                    .block-load-modal-body { padding:10px !important; gap:10px !important; }
                    .block-load-hero { display:block !important; }
                    .block-load-hero-card { padding:10px !important; border-radius:14px !important; }
                    .block-load-hero-title { font-size:.92rem !important; line-height:1.2 !important; }
                    .block-load-hero-sub { display:none !important; }
                    .block-load-status { margin-top:8px !important; padding:8px 9px !important; font-size:.74rem !important; }
                    .block-load-panel-grid,
                    .block-load-sections { grid-template-columns:1fr !important; gap:8px !important; }
                    .block-load-panel { padding:10px !important; border-radius:14px !important; }
                    .block-load-panel-title { margin-bottom:7px !important; font-size:.70rem !important; }
                    .block-load-fields { gap:7px !important; }
                    .block-load-fields label { font-size:.68rem !important; margin-bottom:3px !important; }
                    .block-load-fields input,
                    .block-load-fields select { min-height:38px !important; padding:8px 10px !important; }
                    .block-load-grid { grid-template-columns:minmax(0,1fr) minmax(82px,auto) !important; font-size:.72rem !important; }
                    .block-load-grid > div { padding:7px 8px !important; }
                    .block-calc-bom-style td:first-child { min-width:0 !important; }
                    .block-calc-inputs input { min-width:0 !important; padding:7px !important; font-size:.8rem !important; }
                    .micro-tuner-fab { display:none !important; }
                    .micro-tuner { left:8px !important; right:8px !important; bottom:calc(58px + env(safe-area-inset-bottom)) !important; width:auto !important; max-height:calc(100dvh - 78px) !important; }
                }
                @media (max-width: 430px) {
                    .app-title h1 { font-size:1.32rem !important; }
                    .app-title p { font-size:.72rem !important; }
                    .block-library button { flex-basis:42px !important; width:42px !important; min-width:42px !important; height:42px !important; min-height:42px !important; }
                    .block-truss-toolbar button { font-size:.74rem !important; }
                    .block-truss-toolbar .block-icon-button { font-size:1.08rem !important; }
                    .block-load-launcher-status { max-width:92px; overflow:hidden; text-overflow:ellipsis; }
                }
                /* v3.5.59: старый режим удалён, PDF комплект перенесён на блочный конструктор */
                .block-library { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px; align-items:start; margin:10px 0; }
                .block-object-group { min-width:0; border-radius:16px; border:1px solid rgba(255,255,255,.10); background:rgba(255,255,255,.035); overflow:hidden; box-shadow:inset 0 1px 0 rgba(255,255,255,.035); }
                .block-object-group[open] { background:rgba(255,255,255,.055); }
                .block-object-group.active { border-color:rgba(205,214,224,.42); box-shadow:0 0 0 2px rgba(205,214,224,.08) inset; }
                .block-object-group summary { list-style:none; min-height:44px; padding:0 10px; display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; -webkit-user-select:none; color:#f4d7a8; font-weight:950; font-size:.78rem; letter-spacing:.01em; }
                .block-object-group summary::-webkit-details-marker { display:none; }
                .block-object-group summary::after { content:'▾'; margin-left:auto; color:var(--muted); font-size:.8rem; transition:transform .15s ease; }
                .block-object-group[open] summary::after { transform:rotate(180deg); }
                .block-group-icon { width:24px; height:24px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; color:#eff4fa; background:rgba(255,255,255,.10); font-weight:950; flex:0 0 24px; }
                .block-group-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                .block-group-count { margin-left:auto; min-width:20px; height:20px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; color:#e8edf4; background:rgba(255,255,255,.10); font-size:.68rem; font-weight:950; }
                .block-object-group summary::after + * { margin-left:0; }
                .block-object-group-body { padding:8px; display:grid; grid-template-columns:repeat(auto-fill, minmax(44px, 44px)); gap:7px; align-items:center; }
                .block-object-group:not([open]) .block-object-group-body { display:none; }
                .block-object-group-body button { margin:0; }
                body.theme-light .block-object-group { background:#fff8ec; border-color:#dccab2; box-shadow:inset 0 1px 0 rgba(255,255,255,.72), 0 1px 2px rgba(70,53,34,.07); }
                body.theme-light .block-object-group[open] { background:#fffaf2; }
                body.theme-light .block-object-group.active { border-color:#9b7449; box-shadow:0 0 0 2px rgba(139,104,66,.12) inset, 0 4px 12px rgba(70,53,34,.09); }
                body.theme-light .block-object-group summary { color:#3b2d1e; }
                body.theme-light .block-group-icon, body.theme-light .block-group-count { color:#2d241b; background:#eadbc5; }
                @media (max-width: 760px) {
                    .block-library { display:grid !important; grid-template-columns:1fr !important; overflow:visible !important; margin:8px 0 8px !important; padding:0 !important; gap:7px !important; scroll-snap-type:none !important; }
                    .block-object-group { border-radius:14px !important; }
                    .block-object-group summary { min-height:40px !important; padding:0 9px !important; font-size:.76rem !important; }
                    .block-group-icon { width:22px !important; height:22px !important; flex-basis:22px !important; border-radius:8px !important; }
                    .block-object-group-body { display:flex !important; overflow-x:auto !important; gap:7px !important; padding:7px !important; overscroll-behavior-x:contain; -webkit-overflow-scrolling:touch; }
                    .block-object-group:not([open]) .block-object-group-body { display:none !important; }
                    .block-object-group-body button { flex:0 0 44px !important; scroll-snap-align:start; }
                }
                @media (max-width: 430px) {
                    .block-object-group-body button { flex-basis:42px !important; }
                }
            `;
            document.head.appendChild(style);
        }

        function readOldDefaults(){
            state.pricePerMeter = readNumber('trussPricePerMeter', state.pricePerMeter);
            state.nodePrice = readNumber('trussCornerPrice', state.nodePrice);
            state.basePrice = readNumber('trussBasePrice', state.basePrice);
            state.install = readNumber('trussInstallCost', state.install);
            state.weightPerMeter = readNumber('trussWeightPerMeter', state.weightPerMeter);
            state.nodeWeight = readNumber('trussCornerWeight', state.nodeWeight);
            state.baseWeight = readNumber('trussBaseWeight', state.baseWeight);
        }

        function installUI(){
            if (q('blockTrussModule')) return;
            installStyles();
            readOldDefaults();
            loadDraft();
            microLoadCalibrationFile();
            const host = q('trussPage') || q('trussModule');
            if (!host) return;
            const legacyModule = q('trussModule');
            if (legacyModule && legacyModule !== host) legacyModule.remove();
            host.classList.add('truss-clean-v35');
            host.querySelectorAll(':scope > .truss-header-row, :scope > .truss-layout, :scope > .truss-projects').forEach(el => el.remove());
            const html = `
                <section id="blockTrussModule" class="block-truss-section" aria-label="Блочный конструктор ферм">
                    <div class="block-truss-header">
                        <div>
                            <h3>Блочный конструктор ферм</h3>
                            <div class="truss-subtitle">Чистый рабочий экран: библиотека блоков, поле сборки, ведомость, стоимость, PDF и проверка нагрузки без старого режима рисования 2D/3D.</div>
                        </div>
                        <button type="button" class="btn-secondary" onclick="FEG35BlockConstructor.clear(true)">⌫ Очистить блоки</button>
                    </div>
                    <div class="block-project-panel">
                        <div><label for="trussProjectName">Проект</label><input id="trussProjectName" placeholder="Портал, LED-экран, задник"></div>
                        <div><label for="trussClientName">Клиент</label><input id="trussClientName" list="clientDatalist" placeholder="Клиент / компания"></div>
                        <div><label>Уборка</label><div class="block-clean-note">Старый режим рисования удалён. Активен только блочный конструктор.</div></div>
                    </div>
                    <div class="block-truss-layout">
                        <div class="block-truss-card">
                            <div class="block-truss-controls">
                                <div><label for="blockCols">Сетка Ш</label><input id="blockCols" type="number" min="6" max="60" step="1"></div>
                                <div><label for="blockRows">Сетка В</label><input id="blockRows" type="number" min="6" max="40" step="1"></div>
                                <div><label for="blockCellMeters">Клетка, м</label><select id="blockCellMeters"><option value="0.5">0.5 м</option><option value="1">1 м</option></select></div>
                                <div><label for="blockZoom">Масштаб</label><input id="blockZoom" type="range" min="60" max="180" step="5"></div>
                                <select id="blockOrientation" class="block-hidden-select" aria-hidden="true"><option value="h">Горизонтально</option><option value="v">Вертикально</option></select>
                                <div class="block-display-control">
                                    <label>Фон / разметка</label>
                                    <details id="blockDisplayDetails" class="block-display-menu">
                                        <summary><span>Настроить вид</span><small id="blockDisplaySummary">чистый фон</small></summary>
                                        <div class="block-display-menu-body">
                                            <label class="block-check-row"><input id="blockGridEnabled" type="checkbox"> Показывать разметку</label>
                                            <div class="block-check-group">
                                                <div class="block-check-group-title">Плотность разметки</div>
                                                <label class="block-check-row"><input id="blockGridThin" type="checkbox" data-grid-density="thin"> Тонкая</label>
                                                <label class="block-check-row"><input id="blockGridMedium" type="checkbox" data-grid-density="medium"> Средняя</label>
                                                <label class="block-check-row"><input id="blockGridDense" type="checkbox" data-grid-density="dense"> Плотная</label>
                                            </div>
                                            <select id="blockBgMode" class="block-hidden-select" aria-hidden="true"><option value="clean">Чистый фон</option><option value="grid">Фон с разметкой</option></select>
                                            <select id="blockGridDensity" class="block-hidden-select" aria-hidden="true"><option value="thin">Тонкая</option><option value="medium">Средняя</option><option value="dense">Плотная</option></select>
                                        </div>
                                    </details>
                                </div>
                                <div><label for="blockTemplateWidthM">Шаблон Ш, м</label><input id="blockTemplateWidthM" type="number" min="1" max="50" step="0.5"></div>
                                <div><label for="blockTemplateHeightM">Шаблон В, м</label><input id="blockTemplateHeightM" type="number" min="1" max="30" step="0.5"></div>
                            </div>
                            <div id="blockLibrary" class="block-library"></div>
                            <div class="block-truss-toolbar" aria-label="Действия со схемой">
                                <button type="button" class="btn-secondary block-icon-button" onclick="FEG35BlockConstructor.template('portal')" title="Портал" aria-label="Портал"><span class="block-action-icon">⊓</span></button>
                                <button type="button" class="btn-secondary block-icon-button" onclick="FEG35BlockConstructor.template('frame')" title="Рама" aria-label="Рама"><span class="block-action-icon">□</span></button>
                                <button type="button" class="btn-secondary block-icon-button" onclick="FEG35BlockConstructor.rotateSelected()" title="Повернуть выбранный на 90°" aria-label="Повернуть выбранный на 90 градусов"><span class="block-action-icon">⟳</span></button>
                                <button type="button" class="btn-secondary block-icon-button" onclick="FEG35BlockConstructor.deleteSelected()" title="Удалить выбранный" aria-label="Удалить выбранный"><span class="block-action-icon">🗑</span></button>
                            </div>
                            <div class="block-grid-wrap"><div id="blockGrid" class="block-grid"></div></div>
                            <div class="block-scheme-footer"><button type="button" class="btn-secondary block-scheme-export-button" onclick="FEG35BlockConstructor.exportJson()">⇩ Экспорт схемы</button></div>
                            <div class="block-caption"><span>Клик/тап по сетке ставит выбранный блок и сразу выделяет его. Существующий элемент можно выбрать и перетаскивать мышкой или пальцем. Торцы магнитятся к ближайшим торцам и узлам CQ. Углы/U-блоки в расчётном габарите добавляют по 0.5 м на подключённый торец. Кнопка ⟳ поворачивает выбранный на 90°, кнопка 🗑 удаляет только выделенный объект.</span><span id="blockCountLabel">Блоков: 0</span></div>
                        </div>
                        <aside class="block-truss-card">
                            <h3 style="margin-top:0">Итог комплектации</h3>
                            <div class="block-settings-launcher">
                                <button id="blockPricingOpenButton" type="button" class="btn-secondary block-settings-launcher-button" onclick="FEG35BlockConstructor.openPricingModal()">
                                    <span class="block-load-launcher-main"><strong>⚙ Настройки цен/веса</strong><span>Прокат, монтаж, вес ферм, баз/блинов и крепежа</span></span>
                                    <span class="block-load-launcher-status">открыть</span>
                                </button>
                            </div>
                            <div class="block-load-launcher">
                                <button id="blockLoadOpenButton" type="button" class="btn-secondary block-load-launcher-button" onclick="FEG35BlockConstructor.openLoadModal()">
                                    <span class="block-load-launcher-main"><strong>⚖ Проверка нагрузки</strong><span id="blockLoadLauncherSub">Таблицы MDM T29/T39 · пролёт, точка, консоль</span></span>
                                    <span id="blockLoadLauncherStatus" class="block-load-launcher-status">не задано</span>
                                </button>
                            </div>
                            <div class="block-pdf-actions" aria-label="Общие действия и PDF документы по блочной ферменной конструкции">
                                <button type="button" class="btn-secondary" onclick="openTransportModal()">🚚 Транспорт</button>
                                <button type="button" class="btn-secondary" onclick="openAppSettingsModal()">⚙ Приложение</button>
                                <button type="button" class="btn-secondary" onclick="openTrussTechPdfPreview()">▣ Технический PDF</button>
                                <button type="button" class="btn-primary" onclick="openTrussClientPdfPreview()">◈ Смета клиенту</button>
                                <button type="button" class="btn-primary full" onclick="openCombinedClientPdfPreview()">◈ Сцена + фермы</button>
                            </div>
                            <div id="blockSummary" class="block-calc-table-wrap"></div>
                            <div class="block-bom-wrap"><table class="block-bom" aria-label="Ведомость блоков ферм"><thead><tr><th>Элемент</th><th>Кол-во</th><th>Метраж</th><th>Вес</th><th>Прокат</th></tr></thead><tbody id="blockBomBody"></tbody></table></div>
                        </aside>
                        <div id="blockPricingModal" class="modal-backdrop block-settings-modal-backdrop" aria-hidden="true">
                            <div class="block-load-modal" role="dialog" aria-modal="true" aria-label="Настройки цен и веса блочной комплектации">
                                <div class="pdf-modal-header">
                                    <div class="pdf-modal-title">⚙ Настройки цен/веса</div>
                                    <button type="button" class="close-modal" onclick="FEG35BlockConstructor.closePricingModal()" aria-label="Закрыть">×</button>
                                </div>
                                <div class="block-load-modal-body">
                                    <div class="block-load-hero">
                                        <div class="block-load-hero-card">
                                            <div class="block-load-hero-title">Расчётные параметры блочной комплектации</div>
                                            <div class="block-load-hero-sub">Здесь настраиваются цены и веса, которые участвуют в итоговой комплектации, ведомости, массе и стоимости. Сам рабочий экран конструктора остаётся чистым.</div>
                                        </div>
                                        <div class="block-load-status">Изменения применяются сразу после ввода и сохраняются в черновике конструктора.</div>
                                    </div>
                                    <div class="block-calc-table-wrap">
                                        <table class="block-calc-table block-calc-inputs block-calc-bom-style" aria-label="Параметры расчёта блочной комплектации">
                                            <caption>Расчётная комплектация</caption>
                                            <thead><tr><th>Позиция</th><th>Цена</th><th>Вес</th><th>Ед.</th></tr></thead>
                                            <tbody>
                                                <tr><td><b>Монтаж / демонтаж</b></td><td><input id="blockInstall" type="number" min="0" step="500"></td><td class="block-muted-cell">—</td><td class="block-muted-cell">₽</td></tr>
                                                <tr><td><b>Прямая ферма</b><br><span class="block-muted-cell">T29/T39, расчёт по метражу</span></td><td><input id="blockPricePerMeter" type="number" min="0" step="50"></td><td><input id="blockWeightPerMeter" type="number" min="0" step="0.1"></td><td class="block-muted-cell">₽/м · кг/м</td></tr>
                                                <tr><td><b>Углы / U-блоки</b><br><span class="block-muted-cell">вес берётся по выбранной серии МДМТ</span></td><td><input id="blockNodePrice" type="number" min="0" step="50"></td><td><input value="по МДМТ" disabled title="Масса угловых блоков берётся по выбранной серии T29/T39"></td><td class="block-muted-cell">₽/шт</td></tr>
                                                <tr><td><b>База / блин</b><br><span class="block-muted-cell">отдельно указывается вес одной базы</span></td><td><input id="blockBasePrice" type="number" min="0" step="50"></td><td><input id="blockBaseWeight" type="number" min="0" step="0.1"></td><td class="block-muted-cell">₽/шт · кг/шт</td></tr>
                                                <tr><td><b>Полуконнектор C3-83</b><br><span class="block-muted-cell">4 шт на одну базу / блин</span></td><td><input id="blockHalfConnectorPrice" type="number" min="0" step="10"></td><td><input id="blockHalfConnectorWeight" type="number" min="0" step="0.01"></td><td class="block-muted-cell">₽/шт · кг/шт</td></tr>
                                                <tr><td><b>Конусный коннектор C2-88</b><br><span class="block-muted-cell">4 шт на один CQ2-стык</span></td><td><input id="blockPinPrice" type="number" min="0" step="10"></td><td><input id="blockPinWeight" type="number" min="0" step="0.05"></td><td class="block-muted-cell">₽/шт · кг/шт</td></tr>
                                                <tr><td><b>Палец C2-67</b><br><span class="block-muted-cell">8 шт на один CQ2-стык</span></td><td class="block-muted-cell">—</td><td><input id="blockC2PinWeight" value="0.04" disabled title="Масса пальца C2-67 по карточке МДМТ"></td><td class="block-muted-cell">кг/шт</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="block-load-note">Вес угловых блоков U001–U024 берётся из базы по выбранной серии T29/T39. Вес базы/блина указывается отдельно и участвует в общей массе комплекта.</div>
                                </div>
                            </div>
                        </div>
                        <div id="blockLoadModal" class="modal-backdrop block-load-modal-backdrop" aria-hidden="true">
                            <div class="block-load-modal" role="dialog" aria-modal="true" aria-label="Проверка нагрузки по таблицам MDM">
                                <div class="pdf-modal-header">
                                    <div class="pdf-modal-title">⚖ Проверка нагрузки по таблицам MDM</div>
                                    <button type="button" class="close-modal" onclick="FEG35BlockConstructor.closeLoadModal()" aria-label="Закрыть">×</button>
                                </div>
                                <div class="block-load-modal-body">
                                    <div class="block-load-hero">
                                        <div class="block-load-hero-card">
                                            <div class="block-load-hero-title">Паспортный контроль пролёта, равномерной, точечной и консольной нагрузки</div>
                                            <div class="block-load-hero-sub">Окно использует те же данные конструктора: авто-пролёт считает прямые фермы и подключённые U-блоки, ручной пролёт переопределяет авто-значение. Это справочная проверка по таблице, не инженерный расчёт.</div>
                                        </div>
                                        <div id="blockLoadModalStatus" class="block-load-status block-load-modal-status">Введите фактическую нагрузку для проверки</div>
                                    </div>
                                    <div class="block-load-panel-grid">
                                        <div class="block-load-panel">
                                            <div class="block-load-panel-title">1. Ферма и пролёт</div>
                                            <div class="block-load-fields">
                                                <div><label for="blockTrussSeries">Тип фермы</label><select id="blockTrussSeries"><option value="T29Q">T29 вид Q</option><option value="T39Q">T39 вид Q</option></select></div>
                                                <div><label for="blockLoadSpan">Пролёт L, м / 0 = авто с углами</label><input id="blockLoadSpan" type="number" min="0" max="30" step="0.5"></div>
                                            </div>
                                        </div>
                                        <div class="block-load-panel">
                                            <div class="block-load-panel-title">2. Фактическая нагрузка</div>
                                            <div class="block-load-fields">
                                                <div><label for="blockFactDistributed">Распределённая, кг/м</label><input id="blockFactDistributed" type="number" min="0" step="1"></div>
                                                <div><label for="blockPointScheme">Схема точечной</label><select id="blockPointScheme"><option value="p1">P1 / центр</option><option value="p2">P2 / две точки</option><option value="p3">P3 / три точки</option><option value="p4">P4 / 4 точки</option></select></div>
                                                <div><label for="blockFactPoint">Точечная, кг</label><input id="blockFactPoint" type="number" min="0" step="1"></div>
                                            </div>
                                        </div>
                                        <div class="block-load-panel">
                                            <div class="block-load-panel-title">3. Консоль</div>
                                            <div class="block-load-fields">
                                                <div><label for="blockCantileverLength">Консоль Lк, м</label><input id="blockCantileverLength" type="number" min="0" max="6" step="0.5"></div>
                                                <div><label for="blockCantileverView">Вид консоли</label><select id="blockCantileverView"><option value="Q">Q</option><option value="T">T</option></select></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div id="blockLoadSummary" class="block-load-summary"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>`;
            host.insertAdjacentHTML('beforeend', html);
            bindUI();
            bindPricingModal();
            bindLoadModal();
            syncInputsFromState();
            renderLibrary();
            renderGrid();
            calculate();
            window.FEG35_BLOCK_CONSTRUCTOR = VERSION;
        }

        function loadDraft(){
            const loadDraftFn = trussModuleApi('loadDraftState');
            if (loadDraftFn) {
                state = loadDraftFn(STORAGE_KEY, state, DEFAULTS, SPECS, LEGACY_TYPE_MAP, localStorage);
                return;
            }
            try {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                state = Object.assign({}, state, saved || {});
                normalizeStateItems();
            } catch(err) { state.items = []; }
            normalizeStateItems();
            if (!['clean','grid'].includes(state.bgMode)) state.bgMode = 'clean';
            if (!['thin','medium','dense'].includes(state.gridDensity)) state.gridDensity = 'medium';
            state.mode = 'place';
            state.templateWidthM = Math.max(1, Number(state.templateWidthM || 6));
            state.templateHeightM = Math.max(1, Number(state.templateHeightM || 3));
        }
        function saveDraft(){
            const saveDraftFn = trussModuleApi('saveDraftState');
            if (saveDraftFn && saveDraftFn(STORAGE_KEY, state, localStorage)) return;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(err) {}
        }

        function openPricingModal(){
            const modal = q('blockPricingModal');
            if (!modal) return;
            syncInputsFromState();
            calculate();
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            const first = q('blockInstall');
            if (first) setTimeout(() => first.focus(), 0);
        }
        function closePricingModal(){
            const modal = q('blockPricingModal');
            if (!modal) return;
            syncStateFromInputs();
            calculate();
            saveDraft();
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
        function bindPricingModal(){
            const modal = q('blockPricingModal');
            if (!modal || modal.dataset.feg35Bound === '1') return;
            modal.dataset.feg35Bound = '1';
            modal.addEventListener('click', (event) => { if (event.target === modal) closePricingModal(); });
            window.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && modal.classList.contains('open')) closePricingModal();
            });
        }

        function openLoadModal(){
            if (LoadCheckerModule && typeof LoadCheckerModule.openLoadModal === 'function') {
                LoadCheckerModule.openLoadModal({ q, calculate, focusId:'blockTrussSeries' });
                return;
            }
            const modal = q('blockLoadModal');
            if (!modal) return;
            calculate();
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            const first = q('blockTrussSeries');
            if (first) setTimeout(() => first.focus(), 0);
        }
        function closeLoadModal(){
            if (LoadCheckerModule && typeof LoadCheckerModule.closeLoadModal === 'function') {
                LoadCheckerModule.closeLoadModal({ q });
                return;
            }
            const modal = q('blockLoadModal');
            if (!modal) return;
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
        function bindLoadModal(){
            if (LoadCheckerModule && typeof LoadCheckerModule.bindLoadModal === 'function') {
                LoadCheckerModule.bindLoadModal({ q, close: closeLoadModal });
                return;
            }
            const modal = q('blockLoadModal');
            if (!modal || modal.dataset.feg35Bound === '1') return;
            modal.dataset.feg35Bound = '1';
            modal.addEventListener('click', (event) => { if (event.target === modal) closeLoadModal(); });
            window.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && modal.classList.contains('open')) closeLoadModal();
            });
        }

        function setChecked(id, value){
            const el = q(id);
            if (el) el.checked = !!value;
        }
        function densityLabel(value){
            const fn = trussModuleApi('densityLabel');
            return fn ? fn(value) : (value === 'thin' ? 'тонкая' : value === 'dense' ? 'плотная' : 'средняя');
        }
        function syncDisplayControlsFromState(){
            const bg = state.bgMode || 'clean';
            const density = state.gridDensity || 'medium';
            setChecked('blockGridEnabled', bg === 'grid');
            setChecked('blockGridThin', density === 'thin');
            setChecked('blockGridMedium', density === 'medium');
            setChecked('blockGridDense', density === 'dense');
            writeValue('blockBgMode', bg);
            writeValue('blockGridDensity', density);
            const summary = q('blockDisplaySummary');
            const summaryFn = trussModuleApi('displaySummaryText');
            if (summary) summary.textContent = summaryFn ? summaryFn(state) : (bg === 'grid' ? `сетка · ${densityLabel(density)}` : 'чистый фон');
        }
        function setGridDensity(value){
            const setDensityFn = trussModuleApi('setDisplayDensity');
            if (setDensityFn) state = setDensityFn(state, value);
            else state.gridDensity = ['thin','medium','dense'].includes(value) ? value : 'medium';
            const density = state.gridDensity || 'medium';
            writeValue('blockGridDensity', density);
            setChecked('blockGridThin', density === 'thin');
            setChecked('blockGridMedium', density === 'medium');
            setChecked('blockGridDense', density === 'dense');
        }
        function refreshAfterDisplayChange(){
            syncDisplayControlsFromState();
            renderLibrary(); renderGrid(); calculate(); saveDraft();
        }
        function bindDisplayControls(){
            const gridEnabled = q('blockGridEnabled');
            if (gridEnabled && gridEnabled.dataset.feg35Bound !== '1') {
                gridEnabled.dataset.feg35Bound = '1';
                gridEnabled.addEventListener('change', () => {
                    const setGridFn = trussModuleApi('setDisplayGridEnabled');
                    state = setGridFn ? setGridFn(state, gridEnabled.checked) : Object.assign(state, { bgMode: gridEnabled.checked ? 'grid' : 'clean' });
                    writeValue('blockBgMode', state.bgMode);
                    refreshAfterDisplayChange();
                });
            }
            ['blockGridThin','blockGridMedium','blockGridDense'].forEach(id => {
                const el = q(id);
                if (!el || el.dataset.feg35Bound === '1') return;
                el.dataset.feg35Bound = '1';
                el.addEventListener('change', () => {
                    const density = el.dataset.gridDensity || 'medium';
                    state.bgMode = 'grid';
                    writeValue('blockBgMode', 'grid');
                    if (gridEnabled) gridEnabled.checked = true;
                    setGridDensity(density);
                    refreshAfterDisplayChange();
                });
            });
        }

        function bindUI(){
            ['trussProjectName','trussClientName','blockCols','blockRows','blockCellMeters','blockZoom','blockOrientation','blockBgMode','blockGridDensity','blockTemplateWidthM','blockTemplateHeightM','blockInstall','blockPricePerMeter','blockNodePrice','blockBasePrice','blockBaseWeight','blockHalfConnectorPrice','blockHalfConnectorWeight','blockPinPrice','blockWeightPerMeter','blockPinWeight','blockTrussSeries','blockLoadSpan','blockFactDistributed','blockPointScheme','blockFactPoint','blockCantileverLength','blockCantileverView'].forEach(id => {
                const el = q(id);
                if (!el || el.dataset.feg35Bound === '1') return;
                el.dataset.feg35Bound = '1';
                const handler = () => { syncStateFromInputs(); renderLibrary(); renderGrid(); calculate(); saveDraft(); };
                el.addEventListener('input', handler);
                el.addEventListener('change', handler);
            });
            bindDisplayControls();
        }

        function syncInputsFromState(){
            writeValue('trussProjectName', state.projectName || '');
            writeValue('trussClientName', state.clientName || '');
            writeValue('blockCols', state.cols);
            writeValue('blockRows', state.rows);
            writeValue('blockCellMeters', String(state.cellMeters));
            writeValue('blockZoom', state.zoom);
            writeValue('blockOrientation', state.orientation);
            state.mode = 'place';
            writeValue('blockBgMode', state.bgMode || 'clean');
            writeValue('blockGridDensity', state.gridDensity || 'medium');
            syncDisplayControlsFromState();
            writeValue('blockTemplateWidthM', state.templateWidthM || 6);
            writeValue('blockTemplateHeightM', state.templateHeightM || 3);
            state.manualPins = 0;
            writeValue('blockInstall', state.install);
            writeValue('blockPricePerMeter', state.pricePerMeter);
            writeValue('blockNodePrice', state.nodePrice);
            writeValue('blockBasePrice', state.basePrice);
            writeValue('blockBaseWeight', state.baseWeight);
            writeValue('blockHalfConnectorPrice', state.halfConnectorPrice || 0);
            writeValue('blockHalfConnectorWeight', state.halfConnectorWeight || C3_83_WEIGHT_KG);
            writeValue('blockPinPrice', state.pinPrice);
            writeValue('blockWeightPerMeter', state.weightPerMeter);
            writeValue('blockPinWeight', state.pinWeight);
            writeValue('blockC2PinWeight', state.c2PinWeight || C2_67_WEIGHT_KG);
            if (LoadCheckerModule && typeof LoadCheckerModule.writeLoadInputs === 'function') {
                LoadCheckerModule.writeLoadInputs(state, { writeValue });
            } else {
                writeValue('blockTrussSeries', state.trussSeries);
                writeValue('blockLoadSpan', state.spanManual);
                writeValue('blockFactDistributed', state.factDistributedKgM);
                writeValue('blockPointScheme', state.pointScheme);
                writeValue('blockFactPoint', state.factPointKg);
                writeValue('blockCantileverLength', state.cantileverLength);
                writeValue('blockCantileverView', state.cantileverView);
            }
        }
        function syncStateFromInputs(){
            state.projectName = q('trussProjectName') ? String(q('trussProjectName').value || '') : (state.projectName || '');
            state.clientName = q('trussClientName') ? String(q('trussClientName').value || '') : (state.clientName || '');
            state.cols = Math.max(6, Math.min(60, Math.round(readNumber('blockCols', state.cols))));
            state.rows = Math.max(6, Math.min(40, Math.round(readNumber('blockRows', state.rows))));
            state.cellMeters = Number(q('blockCellMeters') ? q('blockCellMeters').value : state.cellMeters) || 0.5;
            state.zoom = Math.max(60, Math.min(180, Math.round(readNumber('blockZoom', state.zoom))));
            state.orientation = q('blockOrientation') ? q('blockOrientation').value : state.orientation;
            state.mode = 'place';
            state.bgMode = q('blockBgMode') ? q('blockBgMode').value : (state.bgMode || 'clean');
            if (q('blockGridEnabled')) state.bgMode = q('blockGridEnabled').checked ? 'grid' : 'clean';
            if (!['clean','grid'].includes(state.bgMode)) state.bgMode = 'clean';
            state.gridDensity = q('blockGridDensity') ? q('blockGridDensity').value : (state.gridDensity || 'medium');
            if (!['thin','medium','dense'].includes(state.gridDensity)) state.gridDensity = 'medium';
            writeValue('blockBgMode', state.bgMode);
            writeValue('blockGridDensity', state.gridDensity);
            syncDisplayControlsFromState();
            state.templateWidthM = Math.max(1, Math.min(50, readNumber('blockTemplateWidthM', state.templateWidthM || 6)));
            state.templateHeightM = Math.max(1, Math.min(30, readNumber('blockTemplateHeightM', state.templateHeightM || 3)));
            state.manualPins = 0;
            state.install = Math.max(0, readNumber('blockInstall', state.install));
            state.pricePerMeter = Math.max(0, readNumber('blockPricePerMeter', state.pricePerMeter));
            state.nodePrice = Math.max(0, readNumber('blockNodePrice', state.nodePrice));
            state.basePrice = Math.max(0, readNumber('blockBasePrice', state.basePrice));
            state.baseWeight = Math.max(0, readNumber('blockBaseWeight', state.baseWeight));
            state.halfConnectorPrice = Math.max(0, readNumber('blockHalfConnectorPrice', state.halfConnectorPrice || 0));
            state.halfConnectorWeight = Math.max(0, readNumber('blockHalfConnectorWeight', state.halfConnectorWeight || C3_83_WEIGHT_KG));
            state.pinPrice = Math.max(0, readNumber('blockPinPrice', state.pinPrice));
            state.weightPerMeter = Math.max(0, readNumber('blockWeightPerMeter', state.weightPerMeter));
            state.pinWeight = Math.max(0, readNumber('blockPinWeight', state.pinWeight));
            state.c2PinWeight = C2_67_WEIGHT_KG;
            state.cotterWeight = C2_COTTER_WEIGHT_KG;
            if (LoadCheckerModule && typeof LoadCheckerModule.readLoadInputs === 'function') {
                state = LoadCheckerModule.readLoadInputs(state, { q, readNumber });
            } else {
                state.trussSeries = q('blockTrussSeries') ? q('blockTrussSeries').value : state.trussSeries;
                if (!TRUSS_LOAD_TABLES[state.trussSeries]) state.trussSeries = 'T29Q';
                state.spanManual = Math.max(0, readNumber('blockLoadSpan', state.spanManual));
                state.factDistributedKgM = Math.max(0, readNumber('blockFactDistributed', state.factDistributedKgM));
                state.pointScheme = q('blockPointScheme') ? q('blockPointScheme').value : state.pointScheme;
                if (!['p1','p2','p3','p4'].includes(state.pointScheme)) state.pointScheme = 'p1';
                state.factPointKg = Math.max(0, readNumber('blockFactPoint', state.factPointKg));
                state.cantileverLength = Math.max(0, readNumber('blockCantileverLength', state.cantileverLength));
                state.cantileverView = q('blockCantileverView') ? q('blockCantileverView').value : state.cantileverView;
                if (!['Q','T'].includes(state.cantileverView)) state.cantileverView = 'Q';
            }
            writeValue('blockCols', state.cols); writeValue('blockRows', state.rows);
        }

        function renderLibrary(){
            const box = q('blockLibrary'); if (!box) return;
            const groups = TrussBlockModule && typeof TrussBlockModule.getLibraryGroups === 'function'
                ? TrussBlockModule.getLibraryGroups(SPECS)
                : [
                    { id:'straight', title:'Прямые фермы', icon:'▰', items:['truss3','truss25','truss2','truss15','truss1','truss05'] },
                    { id:'angles2d', title:'2D углы', icon:'∟', items:['cornerU003','cornerU017','cornerU016','cornerU001','cornerU002','cornerU004','cornerU005'] },
                    { id:'nodes3d', title:'3D узлы', icon:'◼', items:['cornerU012','cornerU020','cornerU022','cornerU024','base'] }
                ].map(group => ({ ...group, specs: group.items.map(id => SPECS[id]).filter(spec => spec && !spec.hidden) }))
                 .filter(group => group.specs.length);
            if (TrussBlockModule && typeof TrussBlockModule.renderLibraryHtml === 'function') {
                box.innerHTML = TrussBlockModule.renderLibraryHtml({
                    specs: SPECS,
                    groups,
                    selected: state.selected,
                    escape: esc,
                    specDisplayName,
                    mdmtCode,
                    nodeWeight: mdmtNodeWeight,
                    metric,
                    selectCall: 'FEG35BlockConstructor.select'
                });
                return;
            }
            const makeButton = (spec) => {
                if (!spec || spec.hidden) return '';
                const code = mdmtCode(spec);
                const weight = spec.kind === 'node' ? ` · ${metric(mdmtNodeWeight(spec), 2)} кг` : '';
                const detail = code ? `${code}${weight}` : spec.label;
                const tooltip = `${specDisplayName(spec)} · ${detail}`;
                return `
                    <button type="button" class="${state.selected === spec.id ? 'active' : ''}" data-kind="${esc(spec.kind)}" onclick="FEG35BlockConstructor.select('${spec.id}')" title="${esc(tooltip)}" aria-label="${esc(tooltip)}">
                        <span class="block-object-icon" aria-hidden="true">${esc(spec.icon)}</span>
                    </button>`;
            };
            box.innerHTML = groups.map((group, index) => {
                const active = group.specs.some(spec => spec.id === state.selected);
                const open = active || (!state.selected && index === 0);
                const title = `${group.title}: ${group.specs.map(spec => spec.short || spec.label).join(', ')}`;
                return `
                    <details class="block-object-group ${active ? 'active' : ''}" data-group="${esc(group.id)}" ${open ? 'open' : ''}>
                        <summary title="${esc(title)}" aria-label="${esc(group.title)}">
                            <span class="block-group-icon" aria-hidden="true">${esc(group.icon)}</span>
                            <span class="block-group-title">${esc(group.title)}</span>
                            <span class="block-group-count">${group.specs.length}</span>
                        </summary>
                        <div class="block-object-group-body">${group.specs.map(makeButton).join('')}</div>
                    </details>`;
            }).join('');
        }

        function renderGrid(){
            const grid = q('blockGrid'); if (!grid) return;
            const isMobileViewport = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
            const baseCellPx = isMobileViewport ? 22 : 28;
            const cellPx = Math.round(baseCellPx * (Number(state.zoom || 100) / 100));
            grid.style.setProperty('--block-cols', state.cols);
            grid.style.setProperty('--block-rows', state.rows);
            grid.style.setProperty('--block-cell', `${cellPx}px`);
            grid.dataset.bgMode = state.bgMode || 'clean';
            grid.dataset.bgDensity = state.gridDensity || 'medium';
            grid.innerHTML = '';
            for (let y = 0; y < state.rows; y++) {
                for (let x = 0; x < state.cols; x++) {
                    const hit = document.createElement('button');
                    hit.type = 'button'; hit.className = 'block-hit'; hit.dataset.x = String(x); hit.dataset.y = String(y);
                    hit.setAttribute('aria-label', `Блок ${x}, ${y}`);
                    hit.addEventListener('click', () => handleCellClick(x, y));
                    grid.appendChild(hit);
                }
            }
            drawItems(cellPx);
            drawConnectionDots(cellPx);
        }

        function straightSvg(item, spec){
            return TrussBlockModule && typeof TrussBlockModule.renderStraightSvg === 'function' ? TrussBlockModule.renderStraightSvg(item, spec) : '';
        }
        function nodePorts(spec){
            return TrussBlockModule && typeof TrussBlockModule.nodePorts === 'function' ? TrussBlockModule.nodePorts(spec) : ['E','S'];
        }
        function nodeTubeSvg(port){
            return TrussBlockModule && typeof TrussBlockModule.nodeTubeSvg === 'function' ? TrussBlockModule.nodeTubeSvg(port) : '';
        }
        function nodeBasePortOffsets(spec){
            return TrussBlockModule && typeof TrussBlockModule.nodeBasePortOffsets === 'function' ? TrussBlockModule.nodeBasePortOffsets(spec) : [];
        }
        function rotatePortOffset(p, deg){
            return TrussBlockModule && typeof TrussBlockModule.rotatePortOffset === 'function' ? TrussBlockModule.rotatePortOffset(p, deg) : { x:Number(p && p.x || 0), y:Number(p && p.y || 0) };
        }
        function nodePortPoints(item, spec){
            return TrussBlockModule && typeof TrussBlockModule.nodePortPoints === 'function' ? TrussBlockModule.nodePortPoints(item, spec) : [];
        }
        function nodeStyleSvg(content, label, r, vb='0 0 100 100', cx=50, cy=50, lx=50, ly=56){
            return TrussBlockModule && typeof TrussBlockModule.nodeStyleSvg === 'function' ? TrussBlockModule.nodeStyleSvg(content, label, r, vb, cx, cy, lx, ly) : '';
        }
        function renderAngledNode(kind){
            return TrussBlockModule && typeof TrussBlockModule.renderAngledNode === 'function' ? TrussBlockModule.renderAngledNode(kind) : '';
        }
        function nodeSvg(item, spec){
            return TrussBlockModule && typeof TrussBlockModule.renderNodeSvg === 'function' ? TrussBlockModule.renderNodeSvg(item, spec) : '';
        }
        function baseSnapOffsets(){
            return TrussBlockModule && typeof TrussBlockModule.baseSnapOffsets === 'function' ? TrussBlockModule.baseSnapOffsets() : [];
        }
        function baseSvg(){
            return TrussBlockModule && typeof TrussBlockModule.renderBaseSvg === 'function' ? TrussBlockModule.renderBaseSvg() : '';
        }

        const MICRO_DEFAULTS = Object.freeze(CalibrationManagerModule && CalibrationManagerModule.DEFAULTS ? CalibrationManagerModule.DEFAULTS : {
            dx:0, dy:0, scale:1, scaleX:1, scaleY:1, rotate:0, opacity:1, brightness:1, lineWidth:0, fill:'', stroke:''
        });
        const MICRO_ADMIN_PIN = CalibrationManagerModule && CalibrationManagerModule.ADMIN_PIN ? CalibrationManagerModule.ADMIN_PIN : '7663';
        const MICRO_PIN_SESSION_KEY = CalibrationManagerModule && CalibrationManagerModule.PIN_SESSION_KEY ? CalibrationManagerModule.PIN_SESSION_KEY : 'feg.micro.admin.pin.ok';
        const MICRO_CALIBRATION_FILE = CalibrationManagerModule && CalibrationManagerModule.CALIBRATION_FILE ? CalibrationManagerModule.CALIBRATION_FILE : 'feg_svg_calibration.json';
        let microFileDefaults = {};
        let microFileLoadStarted = false;
        let microFileLoaded = false;
        function microCleanNumber(value, fallback){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.cleanNumber === 'function') return CalibrationManagerModule.cleanNumber(value, fallback);
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
        }
        function microNormalizeValue(micro){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.normalizeValue === 'function') return CalibrationManagerModule.normalizeValue(micro);
            const raw = { ...MICRO_DEFAULTS, ...(micro || {}) };
            return {
                dx: microCleanNumber(raw.dx, 0),
                dy: microCleanNumber(raw.dy, 0),
                scale: microCleanNumber(raw.scale, 1),
                scaleX: microCleanNumber(raw.scaleX, 1),
                scaleY: microCleanNumber(raw.scaleY, 1),
                rotate: microCleanNumber(raw.rotate, 0),
                opacity: microCleanNumber(raw.opacity, 1),
                brightness: microCleanNumber(raw.brightness, 1),
                lineWidth: microCleanNumber(raw.lineWidth, 0),
                fill: /^#[0-9a-f]{6}$/i.test(String(raw.fill || '').trim()) ? String(raw.fill).trim() : '',
                stroke: /^#[0-9a-f]{6}$/i.test(String(raw.stroke || '').trim()) ? String(raw.stroke).trim() : ''
            };
        }
        function microIsCustom(micro){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.isCustom === 'function') return CalibrationManagerModule.isCustom(micro);
            const m = microNormalizeValue(micro);
            return Object.keys(MICRO_DEFAULTS).some(key => String(m[key]) !== String(MICRO_DEFAULTS[key]));
        }
        function microNormalizeCalibrationFile(data){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.normalizeCalibrationFile === 'function') return CalibrationManagerModule.normalizeCalibrationFile(data);
            const source = data && typeof data === 'object' ? (data.items || data.calibration || data.defaults || data) : {};
            const out = {};
            Object.entries(source || {}).forEach(([type, rotations]) => {
                if (!rotations || typeof rotations !== 'object') return;
                const cleanType = String(type || '').trim();
                if (!cleanType) return;
                Object.entries(rotations).forEach(([rotation, micro]) => {
                    const rot = microRotationKey(rotation);
                    const value = microNormalizeValue(micro);
                    if (!microIsCustom(value)) return;
                    if (!out[cleanType]) out[cleanType] = {};
                    out[cleanType][rot] = value;
                });
            });
            return out;
        }
        function microLoadCalibrationFile(){
            if (microFileLoadStarted) return;
            microFileLoadStarted = true;
            if (CalibrationManagerModule && typeof CalibrationManagerModule.loadCalibrationFile === 'function') {
                CalibrationManagerModule.loadCalibrationFile({
                    version: VERSION,
                    onLoaded: (next) => {
                        microFileDefaults = next || {};
                        microFileLoaded = true;
                        if (Object.keys(microFileDefaults).length) {
                            try { renderGrid(); calculate(); microFill(); } catch (e) {}
                        }
                    },
                    onError: () => { microFileDefaults = {}; microFileLoaded = false; }
                });
                return;
            }
            if (typeof fetch !== 'function') return;
            fetch(`${MICRO_CALIBRATION_FILE}?v=${encodeURIComponent(VERSION)}`, { cache:'no-store' })
                .then(response => response && response.ok ? response.json() : null)
                .then(data => {
                    const next = microNormalizeCalibrationFile(data);
                    microFileDefaults = next;
                    microFileLoaded = true;
                    if (Object.keys(next).length) {
                        try { renderGrid(); calculate(); microFill(); } catch (e) {}
                    }
                })
                .catch(() => { microFileDefaults = {}; microFileLoaded = false; });
        }
        function microAdminUnlocked(){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.adminUnlocked === 'function') return CalibrationManagerModule.adminUnlocked();
            try { return sessionStorage.getItem(MICRO_PIN_SESSION_KEY) === '1'; }
            catch (e) { return false; }
        }
        function microSetAdminUnlocked(){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.setAdminUnlocked === 'function') return CalibrationManagerModule.setAdminUnlocked();
            try { sessionStorage.setItem(MICRO_PIN_SESSION_KEY, '1'); }
            catch (e) {}
        }
        function microEnsurePinModal(){
            let modal = document.getElementById('microPinModal');
            if (modal) return modal;
            modal = document.createElement('div');
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
                if (event.target === modal) microClosePinModal();
                const action = event.target && event.target.dataset ? event.target.dataset.microPinAction : '';
                if (action === 'cancel') microClosePinModal();
                if (action === 'submit') microSubmitPin();
            });
            modal.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') microSubmitPin();
                if (event.key === 'Escape') microClosePinModal();
            });
            document.body.appendChild(modal);
            return modal;
        }
        function microOpenPinModal(afterUnlock){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.openPinModal === 'function') {
                CalibrationManagerModule.openPinModal(afterUnlock, { onToast: (message) => { if (typeof showToast === 'function') showToast(message); } });
                return;
            }
            if (microAdminUnlocked()) {
                if (typeof afterUnlock === 'function') afterUnlock();
                return;
            }
            const modal = microEnsurePinModal();
            modal._afterUnlock = afterUnlock;
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
        function microClosePinModal(){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.closePinModal === 'function') return CalibrationManagerModule.closePinModal();
            const modal = document.getElementById('microPinModal');
            if (!modal) return;
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        }
        function microSubmitPin(){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.submitPin === 'function') return CalibrationManagerModule.submitPin({ onToast: (message) => { if (typeof showToast === 'function') showToast(message); } });
            const modal = document.getElementById('microPinModal');
            if (!modal) return;
            const input = modal.querySelector('#microPinInput');
            const err = modal.querySelector('#microPinError');
            const pin = input ? String(input.value || '').trim() : '';
            if (pin === MICRO_ADMIN_PIN) {
                microSetAdminUnlocked();
                microClosePinModal();
                if (typeof showToast === 'function') showToast('Админ-калибровка открыта');
                if (typeof modal._afterUnlock === 'function') modal._afterUnlock();
                return;
            }
            if (err) err.textContent = 'Неверный PIN-код';
            if (input) {
                input.select();
                input.focus();
            }
        }
        function microGet(item){
            if (!item) return { ...MICRO_DEFAULTS };
            const typeDefault = microGetTypeDefault(item.type, item.r || 0);
            return { ...MICRO_DEFAULTS, ...(typeDefault || {}), ...(item.micro || {}) };
        }
        function microRotationKey(r){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.rotationKey === 'function') return CalibrationManagerModule.rotationKey(r);
            const deg = ((Math.round(Number(r || 0) / 90) * 90) % 360 + 360) % 360;
            return String(deg);
        }
        function microDefaultKey(type, rotation){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.defaultKey === 'function') return CalibrationManagerModule.defaultKey(type, rotation);
            return `feg.micro.default.${String(type || '')}.${microRotationKey(rotation)}`;
        }
        function microGetFileTypeDefault(type, rotation){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.getFileTypeDefault === 'function') return CalibrationManagerModule.getFileTypeDefault(microFileDefaults, type, rotation);
            const typeKey = String(type || '');
            const rot = microRotationKey(rotation);
            const value = microFileDefaults && microFileDefaults[typeKey] ? microFileDefaults[typeKey][rot] : null;
            return value ? microNormalizeValue(value) : null;
        }
        function microGetLocalTypeDefault(type, rotation){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.getLocalTypeDefault === 'function') return CalibrationManagerModule.getLocalTypeDefault(type, rotation);
            try {
                const raw = localStorage.getItem(microDefaultKey(type, rotation));
                return raw ? microNormalizeValue(JSON.parse(raw)) : null;
            } catch (e) {
                return null;
            }
        }
        function microGetTypeDefault(type, rotation){
            const fileValue = microGetFileTypeDefault(type, rotation);
            const localValue = microGetLocalTypeDefault(type, rotation);
            if (!fileValue && !localValue) return null;
            return microNormalizeValue({ ...(fileValue || {}), ...(localValue || {}) });
        }
        function microSaveTypeDefault(type, rotation, micro){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.saveLocalTypeDefault === 'function') return CalibrationManagerModule.saveLocalTypeDefault(type, rotation, micro);
            if (!type || !micro) return;
            localStorage.setItem(microDefaultKey(type, rotation), JSON.stringify(microNormalizeValue(micro)));
        }
        function microClearTypeDefault(type, rotation){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.clearLocalTypeDefault === 'function') return CalibrationManagerModule.clearLocalTypeDefault(type, rotation);
            if (!type) return;
            localStorage.removeItem(microDefaultKey(type, rotation));
        }
        function microKnownCalibrationTypes(){
            const out = new Set(Object.keys(SPECS || {}).filter(type => SPECS[type] && SPECS[type].kind === 'node'));
            Object.keys(microFileDefaults || {}).forEach(type => out.add(type));
            if (CalibrationManagerModule && typeof CalibrationManagerModule.listTypesFromLocal === 'function') {
                CalibrationManagerModule.listTypesFromLocal().forEach(type => out.add(type));
            } else {
                try {
                    for (let i = 0; i < localStorage.length; i += 1) {
                        const key = localStorage.key(i) || '';
                        if (!key.startsWith('feg.micro.default.')) continue;
                        const tail = key.replace('feg.micro.default.', '');
                        const parts = tail.split('.');
                        if (parts.length >= 2) out.add(parts.slice(0, -1).join('.'));
                    }
                } catch (e) {}
            }
            return Array.from(out).filter(Boolean).sort();
        }
        function microCollectCalibrationForFile(){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.collectCalibrationForFile === 'function') {
                return CalibrationManagerModule.collectCalibrationForFile({ types: microKnownCalibrationTypes(), fileDefaults: microFileDefaults, version: VERSION });
            }
            const items = {};
            const rotations = ['0','90','180','270'];
            microKnownCalibrationTypes().forEach(type => {
                rotations.forEach(rotation => {
                    const fileValue = microGetFileTypeDefault(type, rotation);
                    const localValue = microGetLocalTypeDefault(type, rotation);
                    const value = microNormalizeValue({ ...(fileValue || {}), ...(localValue || {}) });
                    if (!microIsCustom(value)) return;
                    if (!items[type]) items[type] = {};
                    items[type][rotation] = value;
                });
            });
            return {
                schema: 'feg-stage-pro-svg-calibration-v1',
                version: VERSION,
                updatedAt: new Date().toISOString(),
                fileName: MICRO_CALIBRATION_FILE,
                note: 'Этот файл лежит рядом с index.html. FEG Stage PRO загружает его при старте и применяет как серверную SVG-калибровку. Локальные настройки браузера имеют приоритет только как временный черновик администратора.',
                items
            };
        }
        function microDownloadCalibrationFile(){
            if (CalibrationManagerModule && typeof CalibrationManagerModule.downloadCalibrationFile === 'function') {
                return CalibrationManagerModule.downloadCalibrationFile({ data: microCollectCalibrationForFile(), onToast: (message) => { if (typeof showToast === 'function') showToast(message); } });
            }
            const data = microCollectCalibrationForFile();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = MICRO_CALIBRATION_FILE;
            a.click();
            URL.revokeObjectURL(a.href);
            if (typeof showToast === 'function') showToast(`Скачан ${MICRO_CALIBRATION_FILE}. Положи файл рядом с index.html и загрузи на сервер/GitHub.`);
        }

        function microCss(item){
            if (!item || !item.micro) return '';
            const m = microGet(item);
            const transforms = [];
            if (m.dx || m.dy) transforms.push(`translate(${Number(m.dx)}px, ${Number(m.dy)}px)`);
            if (m.rotate) transforms.push(`rotate(${Number(m.rotate)}deg)`);
            if (Number(m.scale) !== 1) transforms.push(`scale(${Number(m.scale)})`);
            const filters = [];
            if (Number(m.brightness) !== 1) filters.push(`brightness(${Number(m.brightness)})`);
            return [
                transforms.length ? `transform:${transforms.join(' ')};` : '',
                'transform-origin:center center;',
                Number(m.opacity) !== 1 ? `opacity:${Number(m.opacity)};` : '',
                filters.length ? `filter:${filters.join(' ')};` : ''
            ].join('');
        }
        function microSelected(){
            if (!state || !state.selectedItemId) return null;
            return state.items.find(item => String(item.id) === String(state.selectedItemId)) || null;
        }
        function microSetSelected(next){
            const item = microSelected();
            if (!item) return false;
            const calibrated = { ...MICRO_DEFAULTS, ...next };
            microSaveTypeDefault(item.type, item.r || 0, calibrated);
            delete item.micro;
            return true;
        }
        function microResetSelected(){
            const item = microSelected();
            if (!item) return false;
            delete item.micro;
            return true;
        }
        function microMount(){
            if (document.getElementById('microTunerButton')) return;
            const btn = document.createElement('button');
            btn.id = 'microTunerButton';
            btn.type = 'button';
            btn.className = 'micro-tuner-fab';
            btn.textContent = 'Калибр.'
            btn.title = 'Админ-калибровка SVG элемента';
            btn.addEventListener('click', microOpen);
            document.body.appendChild(btn);
        }
        function microOpen(){
            microOpenPinModal(microOpenUnlocked);
        }
        function microOpenUnlocked(){
            let panel = document.getElementById('microTunerPanel');
            if (!panel) panel = microCreatePanel();
            microFill();
            panel.classList.add('open');
        }
        function microClose(){
            const panel = document.getElementById('microTunerPanel');
            if (panel) panel.classList.remove('open');
        }
        function microRow(key, label, min, max, step){
            return `<div class="micro-row">
                <label>${label}</label>
                <input type="range" data-micro-key="${key}" min="${min}" max="${max}" step="${step}">
                <input type="number" data-micro-num="${key}" min="${min}" max="${max}" step="${step}">
            </div>`;
        }
        function microCreatePanel(){
            const panel = document.createElement('div');
            panel.id = 'microTunerPanel';
            panel.className = 'micro-tuner';
            panel.innerHTML = `
                <h4>Админ-калибровка SVG</h4>
                <div class="sub" id="microSubtitle">Выдели элемент на поле</div>
                ${microRow('dx','X, px',-120,120,1)}
                ${microRow('dy','Y, px',-120,120,1)}
                ${microRow('scale','Масштаб',0.2,2,0.01)}
                ${microRow('scaleX','Раст. X',0.2,2.5,0.01)}
                ${microRow('scaleY','Раст. Y',0.2,2.5,0.01)}
                ${microRow('rotate','Поворот',-180,180,1)}
                ${microRow('opacity','Прозрачн.',0.1,1,0.01)}
                ${microRow('brightness','Яркость',0.4,1.8,0.01)}
                ${microRow('lineWidth','Линия',0,20,0.5)}
                <div class="micro-row">
                    <label>Заливка</label>
                    <input type="color" data-micro-key="fill">
                    <input type="text" data-micro-num="fillText" placeholder="#f2f4f7">
                </div>
                <div class="micro-row">
                    <label>Контур</label>
                    <input type="color" data-micro-key="stroke">
                    <input type="text" data-micro-num="strokeText" placeholder="#d6dce4">
                </div>
                <div class="micro-actions">
                    <button class="primary" type="button" data-micro-action="save">Сохранить</button>
                    <button type="button" data-micro-action="export-file">Скачать файл калибровки</button>
                    <button type="button" data-micro-action="reset">Сбросить объект</button>
                    <button type="button" data-micro-action="clear-default">Сбросить локальную калибровку типа</button>
                    <button type="button" data-micro-action="close">Закрыть</button>
                </div>
                <div class="micro-hint">Это админ-калибровка SVG выбранного типа и выбранного поворота. «Сохранить» пишет локальный админ-черновик в браузер. Чтобы калибровка стала частью программы на сервере, нажми «Скачать файл калибровки» и положи <b>feg_svg_calibration.json</b> рядом с index.html перед заливкой на GitHub/сервер.</div>
            `;
            panel.addEventListener('input', microHandle);
            panel.addEventListener('change', microHandle);
            panel.addEventListener('click', (e) => {
                const action = e.target && e.target.dataset ? e.target.dataset.microAction : '';
                if (action === 'save') {
                    const item = microSelected();
                    if (item && microSetSelected(microRead())) {
                        renderGrid(); calculate(); saveDraft(); microFill();
                        if (typeof showToast === 'function') showToast(`Калибровка ${microRotationKey(item.r || 0)}° сохранена`);
                    }
                } else if (action === 'export-file') {
                    microDownloadCalibrationFile();
                } else if (action === 'reset') {
                    if (microResetSelected()) {
                        renderGrid(); calculate(); saveDraft(); microFill();
                        if (typeof showToast === 'function') showToast('Индивидуальная настройка сброшена');
                    }
                } else if (action === 'clear-default') {
                    const item = microSelected();
                    if (item) {
                        microClearTypeDefault(item.type, item.r || 0);
                        renderGrid(); calculate(); saveDraft(); microFill();
                        if (typeof showToast === 'function') showToast(`Локальная калибровка ${microRotationKey(item.r || 0)}° сброшена`);
                    }
                } else if (action === 'close') microClose();
            });
            document.body.appendChild(panel);
            return panel;
        }
        function microFill(){
            const panel = document.getElementById('microTunerPanel');
            if (!panel) return;
            const item = microSelected();
            const spec = item ? SPECS[item.type] : null;
            const sub = panel.querySelector('#microSubtitle');
            if (sub) sub.textContent = item && spec ? `Выбран: ${specDisplayName(spec)} · ${microRotationKey(item.r || 0)}°` : 'Выдели элемент на поле';
            const m = microGet(item);
            panel.querySelectorAll('[data-micro-key]').forEach(input => {
                const key = input.dataset.microKey;
                if (input.type === 'color') {
                    input.value = /^#[0-9a-f]{6}$/i.test(m[key] || '') ? m[key] : '#f2f4f7';
                } else input.value = m[key];
            });
            panel.querySelectorAll('[data-micro-num]').forEach(input => {
                const key = input.dataset.microNum;
                if (key === 'fillText') input.value = m.fill || '';
                else if (key === 'strokeText') input.value = m.stroke || '';
                else input.value = m[key];
            });
        }
        function microRead(){
            const panel = document.getElementById('microTunerPanel');
            const out = {};
            if (!panel) return out;
            panel.querySelectorAll('[data-micro-key]').forEach(input => {
                const key = input.dataset.microKey;
                out[key] = input.type === 'color' ? input.value : Number(input.value);
            });
            const fillText = panel.querySelector('[data-micro-num="fillText"]');
            const strokeText = panel.querySelector('[data-micro-num="strokeText"]');
            if (fillText && /^#[0-9a-f]{6}$/i.test(fillText.value.trim())) out.fill = fillText.value.trim();
            if (strokeText && /^#[0-9a-f]{6}$/i.test(strokeText.value.trim())) out.stroke = strokeText.value.trim();
            if (fillText && fillText.value.trim() === '') out.fill = '';
            if (strokeText && strokeText.value.trim() === '') out.stroke = '';
            return out;
        }

        function microApplySvgOverrides(div, item){
            if (!div || !item || !item.micro) return;
            const m = microGet(item);
            const hasFill = typeof m.fill === 'string' && /^#[0-9a-f]{6}$/i.test(m.fill);
            const hasStroke = typeof m.stroke === 'string' && /^#[0-9a-f]{6}$/i.test(m.stroke);
            const lineWidth = Number(m.lineWidth || 0);
            if (!hasFill && !hasStroke && !lineWidth) return;
            div.querySelectorAll('svg path, svg line, svg circle, svg rect, svg ellipse, svg polygon, svg polyline').forEach(node => {
                if (hasFill && node.getAttribute('fill') !== 'none') node.setAttribute('fill', m.fill);
                if (hasStroke) node.setAttribute('stroke', m.stroke);
                if (lineWidth) {
                    node.setAttribute('stroke-width', String(lineWidth));
                    node.setAttribute('stroke-linecap', 'round');
                    node.setAttribute('stroke-linejoin', 'round');
                }
            });
        }

        function adminSvgCalibrationForItem(item){
            const base = microGetTypeDefault(item && item.type, item && item.r);
            const own = item && item.micro ? item.micro : null;
            return { ...MICRO_DEFAULTS, ...(base || {}), ...(own || {}) };
        }
        function adminSvgCalibrateElement(div, item){
            if (!div || !item) return;
            const c = adminSvgCalibrationForItem(item);
            const svg = div.querySelector('svg');
            if (!svg) return;

            // Переносим трансформацию внутрь SVG, а не на внешний DOM-контейнер:
            // так калибровка становится фундаментальной частью визуала элемента.
            if (!svg.dataset.adminCalibrated) {
                const ns = 'http://www.w3.org/2000/svg';
                const g = document.createElementNS(ns, 'g');
                g.setAttribute('class', 'admin-svg-calibrated-content');
                while (svg.firstChild) g.appendChild(svg.firstChild);
                svg.appendChild(g);
                svg.dataset.adminCalibrated = '1';
            }
            const g = svg.querySelector('.admin-svg-calibrated-content');
            const vb = (svg.getAttribute('viewBox') || '0 0 100 100').trim().split(/\s+/).map(Number);
            const cx = Number.isFinite(vb[0]) && Number.isFinite(vb[2]) ? vb[0] + vb[2] / 2 : 50;
            const cy = Number.isFinite(vb[1]) && Number.isFinite(vb[3]) ? vb[1] + vb[3] / 2 : 50;
            const dx = Number(c.dx || 0);
            const dy = Number(c.dy || 0);
            const scale = Number(c.scale || 1);
            const rotate = Number(c.rotate || 0);
            const scaleX = Number(c.scaleX || 1);
            const scaleY = Number(c.scaleY || 1);
            g.setAttribute('transform', `translate(${dx} ${dy}) rotate(${rotate} ${cx} ${cy}) translate(${cx} ${cy}) scale(${scale * scaleX} ${scale * scaleY}) translate(${-cx} ${-cy})`);

            const hasFill = typeof c.fill === 'string' && /^#[0-9a-f]{6}$/i.test(c.fill);
            const hasStroke = typeof c.stroke === 'string' && /^#[0-9a-f]{6}$/i.test(c.stroke);
            const lineWidth = Number(c.lineWidth || 0);
            if (hasFill || hasStroke || lineWidth) {
                g.querySelectorAll('path, line, circle, rect, ellipse, polygon, polyline').forEach(node => {
                    if (hasFill && node.getAttribute('fill') !== 'none') node.setAttribute('fill', c.fill);
                    if (hasStroke) node.setAttribute('stroke', c.stroke);
                    if (lineWidth) {
                        node.setAttribute('stroke-width', String(lineWidth));
                        node.setAttribute('stroke-linecap', 'round');
                        node.setAttribute('stroke-linejoin', 'round');
                    }
                });
            }
            div.style.opacity = String(Number(c.opacity || 1));
            div.style.filter = Number(c.brightness || 1) !== 1 ? `brightness(${Number(c.brightness)})` : '';
        }
        function microApplyLive(){
            const item = microSelected();
            if (!item) return;
            const div = document.querySelector(`.block-item[data-item-id="${String(item.id)}"]`);
            if (!div) { renderGrid(); return; }
            adminSvgCalibrateElement(div, item);
        }
        function microHandle(e){
            if (!microSelected()) {
                if (typeof showToast === 'function') showToast('Сначала выдели элемент на поле');
                microFill();
                return;
            }
            const key = e.target && (e.target.dataset.microKey || e.target.dataset.microNum);
            if (!key) return;
            const panel = document.getElementById('microTunerPanel');
            if (key === 'fillText' || key === 'strokeText') {
                const target = key === 'fillText' ? 'fill' : 'stroke';
                const val = e.target.value.trim();
                if (/^#[0-9a-f]{6}$/i.test(val)) {
                    const colorInput = panel.querySelector(`[data-micro-key="${target}"]`);
                    if (colorInput) colorInput.value = val;
                }
            } else {
                const pair = e.target.dataset.microKey ? panel.querySelector(`[data-micro-num="${key}"]`) : panel.querySelector(`[data-micro-key="${key}"]`);
                if (pair) pair.value = e.target.value;
            }
            microSetSelected(microRead());
            microApplyLive();
            saveDraft();
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', microMount);
        else setTimeout(microMount, 0);
        function drawItems(cellPx){
            const grid = q('blockGrid'); if (!grid) return;
            if (TrussBlockModule && typeof TrussBlockModule.renderFieldItems === 'function') {
                TrussBlockModule.renderFieldItems({
                    document,
                    grid,
                    items: state.items,
                    specs: SPECS,
                    selectedItemId: state.selectedItemId,
                    cellPx,
                    cellMeters: state.cellMeters,
                    specDisplayName,
                    calibrate: adminSvgCalibrateElement,
                    onPointerDown: (event, item) => {
                        state.selectedItemId = item.id;
                        setTimeout(microFill, 0);
                        startItemDrag(event, item.id);
                    },
                    onClick: (event, item) => {
                        event.stopPropagation();
                        if (Date.now() < suppressClickUntil) return;
                        selectItem(item.id);
                        setTimeout(microFill, 0);
                        renderGrid(); calculate(); saveDraft();
                    }
                });
                return;
            }
            state.items.forEach(item => {
                const spec = SPECS[item.type]; if (!spec) return;
                const isStraight = spec.kind === 'straight';
                const div = document.createElement('div');
                div.className = `block-item ${isStraight ? 'block-item-straight ' + (item.o || 'h') : 'block-item-' + spec.kind}${state.selectedItemId === item.id ? ' selected' : ''}`;
                div.title = specDisplayName(spec) + ' · клик: выбрать';
                div.dataset.itemId = item.id;
                const cells = isStraight ? cellCount(spec.length) : 1;
                div.style.left = `${item.x * cellPx + 3}px`;
                div.style.top = `${item.y * cellPx + 3}px`;
                div.style.width = `${((isStraight && item.o === 'h') ? cells : 1) * cellPx - 6}px`;
                div.style.height = `${((isStraight && item.o === 'v') ? cells : 1) * cellPx - 6}px`;
                if (spec.kind === 'node') {
                    const scale = spec.id === 'cornerU003' ? 1.00 : 1.24;
                    const extra = ((scale - 1) * cellPx) / 2;
                    div.style.left = `${item.x * cellPx + 3 - extra}px`;
                    div.style.top = `${item.y * cellPx + 3 - extra}px`;
                    div.style.width = `${cellPx * scale - 6}px`;
                    div.style.height = `${cellPx * scale - 6}px`;
                }
                if (!isStraight && spec.kind !== 'node' && Number(item.r || 0)) div.style.transform = `rotate(${Number(item.r || 0)}deg)`;
                if (isStraight) div.innerHTML = straightSvg(item, spec);
                else if (spec.kind === 'node') div.innerHTML = nodeSvg(item, spec);
                else if (spec.kind === 'base') div.innerHTML = baseSvg();
                else div.textContent = spec.short;
                adminSvgCalibrateElement(div, item);
                div.addEventListener('pointerdown', (event) => {
                    state.selectedItemId = item.id;
                    setTimeout(microFill, 0);
                    startItemDrag(event, item.id);
                });
                div.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (Date.now() < suppressClickUntil) return;
                    selectItem(item.id);
                    setTimeout(microFill, 0);
                    renderGrid(); calculate(); saveDraft();
                });
                grid.appendChild(div);
            });
        }

        function pointKey(x, y){
            return TrussBlockModule && typeof TrussBlockModule.pointKey === 'function' ? TrussBlockModule.pointKey(x, y) : `${x},${y}`;
        }
        function straightPortPoints(item, spec){
            if (TrussBlockModule && typeof TrussBlockModule.straightPortPoints === 'function') return TrussBlockModule.straightPortPoints(item, spec, state.cellMeters);
            const cells = cellCount(spec.length);
            return item.o === 'v'
                ? [{x:item.x + 0.5, y:item.y}, {x:item.x + 0.5, y:item.y + cells}]
                : [{x:item.x, y:item.y + 0.5}, {x:item.x + cells, y:item.y + 0.5}];
        }
        function itemPoints(item){
            const spec = SPECS[item.type]; if (!spec) return [];
            if (TrussBlockModule && typeof TrussBlockModule.itemPoints === 'function') {
                return TrussBlockModule.itemPoints(item, SPECS, { cellMeters: state.cellMeters, nodePortPoints });
            }
            if (spec.kind === 'straight') return straightPortPoints(item, spec);
            if (spec.kind === 'node') return nodePortPoints(item, spec);
            if (spec.kind === 'base') return [];
            return [{x:item.x + 0.5,y:item.y + 0.5}];
        }
        function connectionMap(){
            if (TrussBlockModule && typeof TrussBlockModule.connectionMap === 'function') {
                return TrussBlockModule.connectionMap(state.items, SPECS, { cellMeters: state.cellMeters, nodePortPoints });
            }
            const map = new Map();
            state.items.forEach(item => itemPoints(item).forEach(pt => {
                const key = pointKey(pt.x, pt.y);
                const entry = map.get(key) || { x:pt.x, y:pt.y, count:0, items:[] };
                entry.count += 1; entry.items.push(item);
                map.set(key, entry);
            }));
            return map;
        }
        function drawConnectionDots(cellPx){
            // CQ2 считается в спецификации, но больше не рисуется на схеме, чтобы не портить вид конструкции.
            return;
            const grid = q('blockGrid'); if (!grid) return;
            connectionMap().forEach(entry => {
                if (entry.count < 2) return;
                const dot = document.createElement('div');
                dot.className = `block-connection-dot ${entry.count >= 3 ? 'hot' : ''}`;
                dot.title = `${entry.count} элементов в точке · CQ2: ${Math.max(0, entry.count - 1)} компл. · C2-88: ${Math.max(0, entry.count - 1) * 4} шт`;
                dot.textContent = 'CQ2';
                dot.style.left = `${entry.x * cellPx}px`;
                dot.style.top = `${entry.y * cellPx}px`;
                grid.appendChild(dot);
            });
        }

        function containsCell(item, x, y){
            const spec = SPECS[item.type]; if (!spec) return false;
            if (TrussBlockModule && typeof TrussBlockModule.containsCell === 'function') return TrussBlockModule.containsCell(item, spec, x, y, state.cellMeters);
            if (spec.kind !== 'straight') return item.x === x && item.y === y;
            const cells = cellCount(spec.length);
            if (item.o === 'v') return item.x === x && y >= item.y && y < item.y + cells;
            return item.y === y && x >= item.x && x < item.x + cells;
        }
        function inBounds(type, x, y, o){
            const spec = SPECS[type]; if (!spec) return false;
            if (TrussBlockModule && typeof TrussBlockModule.inBounds === 'function') return TrussBlockModule.inBounds(type, x, y, o, state, SPECS, state.cellMeters);
            if (x < 0 || y < 0) return false;
            if (spec.kind === 'node') return x + 1 <= state.cols && y + 1 <= state.rows;
            if (spec.kind !== 'straight') return x < state.cols && y < state.rows;
            const cells = cellCount(spec.length);
            return o === 'v' ? (x < state.cols && y + cells <= state.rows) : (x + cells <= state.cols && y < state.rows);
        }
        function findNearestEndpoint(x, y, radius = 1.15, ignoreId = null){
            if (TrussBlockModule && typeof TrussBlockModule.findNearestEndpoint === 'function') {
                return TrussBlockModule.findNearestEndpoint(state.items, x, y, radius, ignoreId, SPECS, { cellMeters: state.cellMeters, nodePortPoints });
            }
            let best = null;
            state.items.forEach(item => {
                if (ignoreId && item.id === ignoreId) return;
                itemPoints(item).forEach(pt => {
                    const dx = pt.x - x, dy = pt.y - y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius && (!best || dist < best.dist)) best = { x:pt.x, y:pt.y, dist };
                });
            });
            return best;
        }
        function getSnappedPlacement(type, x, y, o, ignoreId = null, fixedRotation = null){
            const spec = SPECS[type];
            if (!spec) return { x, y, o };
            if (TrussBlockModule && typeof TrussBlockModule.getSnappedPlacement === 'function') {
                return TrussBlockModule.getSnappedPlacement(type, x, y, o, state.items, SPECS, state, {
                    cellMeters: state.cellMeters,
                    ignoreId,
                    fixedRotation,
                    nodePortPoints,
                    nodeBasePortOffsets,
                    rotatePortOffset,
                    baseSnapOffsets,
                    inBounds: (candidateType, cx, cy, co) => inBounds(candidateType, cx, cy, co)
                });
            }
            if (spec.kind === 'node') {
                const candidates = [];
                const rotations = fixedRotation === null || typeof fixedRotation === 'undefined' ? [0,90,180,270] : [Number(fixedRotation || 0)];
                rotations.forEach(r => {
                    const ports = nodeBasePortOffsets(spec).map(p => rotatePortOffset(p, r));
                    ports.forEach(p => {
                        const desired = { x: x + p.x, y: y + p.y };
                        const anchor = findNearestEndpoint(desired.x, desired.y, 1.15, ignoreId);
                        if (!anchor) return;
                        const cx = anchor.x - p.x;
                        const cy = anchor.y - p.y;
                        if (!inBounds(type, cx, cy, 'n')) return;
                        let contacts = 0;
                        let contactDistance = 0;
                        ports.forEach(pp => {
                            const a = findNearestEndpoint(cx + pp.x, cy + pp.y, 0.2, ignoreId);
                            if (a) { contacts += 1; contactDistance += a.dist || 0; }
                        });
                        const d = Math.hypot(cx - x, cy - y) + anchor.dist * .25 + contactDistance * .1;
                        candidates.push({ x:cx, y:cy, o:'n', r, d, contacts });
                    });
                });
                // Сначала выбираем ориентацию, которая попала сразу в два торца, потом ближайшую по месту клика/перетаскивания.
                candidates.sort((a,b) => (b.contacts || 0) - (a.contacts || 0) || a.d - b.d);
                return candidates[0] || { x, y, o:'n', r: Number(fixedRotation || 0) };
            }
            if (spec.kind === 'straight') {
                const cells = cellCount(spec.length);
                const candidates = [];
                const pts = o === 'v' ? [{x:x + 0.5, y, end:false}, {x:x + 0.5, y:y + cells, end:true}] : [{x, y:y + 0.5, end:false}, {x:x + cells, y:y + 0.5, end:true}];
                pts.forEach(pt => {
                    const anchor = findNearestEndpoint(pt.x, pt.y, 1.15, ignoreId);
                    if (!anchor) return;
                    const candidate = o === 'v'
                        ? { x: anchor.x - 0.5, y: pt.end ? anchor.y - cells : anchor.y, o }
                        : { x: pt.end ? anchor.x - cells : anchor.x, y: anchor.y - 0.5, o };
                    if (!inBounds(type, candidate.x, candidate.y, o)) return;
                    candidate.d = Math.hypot(candidate.x - x, candidate.y - y) + anchor.dist * .25;
                    candidates.push(candidate);
                });
                candidates.sort((a,b) => a.d - b.d);
                if (candidates[0]) return candidates[0];
                return { x, y, o };
            }
            if (spec.kind === 'base') {
                const candidates = [];
                baseSnapOffsets().forEach(p => {
                    const desired = { x:x + p.x, y:y + p.y };
                    const anchor = findNearestEndpoint(desired.x, desired.y, 1.2, ignoreId);
                    if (!anchor) return;
                    const cx = anchor.x - p.x;
                    const cy = anchor.y - p.y;
                    if (!inBounds(type, cx, cy, 'n')) return;
                    const centerPenalty = p.edge === 'C' ? 0.35 : 0;
                    const d = Math.hypot(cx - x, cy - y) + anchor.dist * .25 + centerPenalty;
                    candidates.push({ x:cx, y:cy, o:'n', d });
                });
                candidates.sort((a,b) => a.d - b.d);
                return candidates[0] || { x, y, o:'n' };
            }
            const anchor = findNearestEndpoint(x + 0.5, y + 0.5, 1.15, ignoreId);
            if (!anchor) return { x, y, o };
            return { x: anchor.x - 0.5, y: anchor.y - 0.5, o: 'n' };
        }

        function blockCellPx(){ return Math.round(28 * (Number(state.zoom || 100) / 100)); }
        function rawGridPointFromEvent(event){
            const grid = q('blockGrid');
            const helper = trussModuleApi('gridPointFromEvent');
            if (helper) return helper(event, grid, blockCellPx());
            if (!grid) return { x:0, y:0 };
            const rect = grid.getBoundingClientRect();
            const cellPx = blockCellPx();
            return { x:(event.clientX - rect.left) / cellPx, y:(event.clientY - rect.top) / cellPx };
        }
        function startItemDrag(event, itemId){
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            const item = state.items.find(entry => entry.id === itemId);
            if (!item) return;
            event.preventDefault();
            event.stopPropagation();
            syncStateFromInputs();
            selectItem(itemId);
            const grid = q('blockGrid');
            const createDragState = trussModuleApi('createItemDragState');
            if (createDragState) {
                dragState = createDragState({ event, item, grid, cellPx:blockCellPx() });
            } else {
                const raw = rawGridPointFromEvent(event);
                dragState = { id:itemId, startClientX:event.clientX, startClientY:event.clientY, offsetX:raw.x - item.x, offsetY:raw.y - item.y, moved:false };
            }
            const attachDragListeners = trussModuleApi('attachItemDragListeners');
            if (attachDragListeners) {
                attachDragListeners({ target:window, onMove:handleItemDragMove, onFinish:finishItemDrag });
            } else {
                window.addEventListener('pointermove', handleItemDragMove, { passive:false });
                window.addEventListener('pointerup', finishItemDrag, { passive:false, once:true });
                window.addEventListener('pointercancel', finishItemDrag, { passive:false, once:true });
            }
        }
        function handleItemDragMove(event){
            if (!dragState) return;
            event.preventDefault();
            const item = state.items.find(entry => entry.id === dragState.id);
            if (!item) return;
            const spec = SPECS[item.type]; if (!spec) return;
            const applyDragMove = trussModuleApi('applyItemDragMove');
            if (applyDragMove) {
                const result = applyDragMove({
                    dragState,
                    event,
                    item,
                    spec,
                    grid:q('blockGrid'),
                    cellPx:blockCellPx(),
                    getSnappedPlacement,
                    inBounds
                });
                if (!result || !result.changed) return;
            } else {
                const movedPx = Math.hypot(event.clientX - dragState.startClientX, event.clientY - dragState.startClientY);
                if (movedPx < 3 && !dragState.moved) return;
                dragState.moved = true;
                const raw = rawGridPointFromEvent(event);
                let nx = Math.round(raw.x - dragState.offsetX);
                let ny = Math.round(raw.y - dragState.offsetY);
                let place = getSnappedPlacement(item.type, nx, ny, item.o || 'n', item.id, spec.kind === 'node' ? item.r : null);
                if (!inBounds(item.type, place.x, place.y, place.o || item.o || 'n')) return;
                item.x = place.x;
                item.y = place.y;
                if (spec.kind === 'straight') item.o = place.o || item.o || 'h';
                if (spec.kind === 'node') item.r = Number(place.r ?? item.r ?? 0);
            }
            renderGrid();
            drawDragClass(item.id);
            calculate();
        }
        function drawDragClass(itemId){
            const grid = q('blockGrid'); if (!grid) return;
            const marker = trussModuleApi('markDragging');
            if (marker) { marker(grid, itemId); return; }
            const el = grid.querySelector(`[data-item-id="${itemId}"]`);
            if (el) el.classList.add('dragging');
        }
        function finishItemDrag(event){
            if (!dragState) return;
            const didMove = trussModuleApi('didDragMove');
            if (didMove ? didMove(dragState) : dragState.moved) suppressClickUntil = Date.now() + 250;
            dragState = null;
            const detachDragListeners = trussModuleApi('detachItemDragListeners');
            if (detachDragListeners) {
                detachDragListeners({ target:window, onMove:handleItemDragMove, onFinish:finishItemDrag });
            } else {
                window.removeEventListener('pointermove', handleItemDragMove);
            }
            renderGrid(); calculate(); saveDraft();
        }

        function addItem(type, x, y, o){
            const action = trussModuleApi('addAndSelectItem');
            if (action) {
                const res = action({
                    items: state.items,
                    selectedItemId: state.selectedItemId,
                    type, x, y,
                    orientation: o,
                    specs: SPECS,
                    makeId,
                    getSnappedPlacement,
                    inBounds
                });
                state.items = res.items || state.items;
                state.selectedItemId = res.selectedItemId || state.selectedItemId || null;
                if (!res.ok) {
                    if (res.reason === 'out-of-bounds' && typeof showToast === 'function') showToast('Блок не помещается в сетку');
                    return false;
                }
                return res.item;
            }
            if (type === 'pin') return false;
            const spec = SPECS[type]; if (!spec) return false;
            const place = getSnappedPlacement(type, x, y, o);
            if (!inBounds(type, place.x, place.y, place.o)) { if (typeof showToast === 'function') showToast('Блок не помещается в сетку'); return false; }
            const createItemFn = trussModuleApi('createItem');
            const item = createItemFn
                ? createItemFn(makeId(), type, place.x, place.y, spec.kind === 'straight' ? place.o : 'n', place.r || 0, SPECS)
                : { id: makeId(), type, x: place.x, y: place.y, o: spec.kind === 'straight' ? place.o : 'n', r: Number(place.r || 0) };
            if (!item) return false;
            state.items.push(item);
            state.selectedItemId = item.id;
            return item;
        }
        function removeItemById(id){
            const removeFn = trussModuleApi('removeItemById');
            if (removeFn) {
                const res = removeFn(state.items, state.selectedItemId, id);
                state.items = res.items || state.items;
                state.selectedItemId = res.selectedItemId || null;
                return !!res.removed;
            }
            const idx = state.items.findIndex(item => item.id === id);
            if (idx < 0) return false;
            state.items.splice(idx, 1);
            if (state.selectedItemId === id) state.selectedItemId = null;
            return true;
        }
        function removeAt(x, y){
            const removeAtFn = trussModuleApi('removeAt');
            if (removeAtFn) {
                const res = removeAtFn(state.items, state.selectedItemId, x, y, SPECS, state.cellMeters);
                state.items = res.items || state.items;
                state.selectedItemId = res.selectedItemId || null;
                return !!res.removed;
            }
            const idx = [...state.items].reverse().findIndex(item => containsCell(item, x, y));
            if (idx < 0) return false;
            const realIndex = state.items.length - 1 - idx;
            const id = state.items[realIndex].id;
            state.items.splice(realIndex, 1);
            if (state.selectedItemId === id) state.selectedItemId = null;
            return true;
        }
        function selectItem(id){
            setTimeout(microFill, 0);
            const action = trussModuleApi('selectItemAction');
            if (action) {
                const res = action({ items: state.items, id });
                state.selectedItemId = res.selectedItemId || null;
                return;
            }
            const selectFn = trussModuleApi('selectItemId');
            state.selectedItemId = selectFn ? selectFn(state.items, id) : (state.items.some(item => item.id === id) ? id : null);
        }
        function deleteSelected(){
            syncStateFromInputs();
            const action = trussModuleApi('deleteSelectedAction');
            if (action) {
                const res = action({ items: state.items, selectedItemId: state.selectedItemId });
                state.items = res.items || state.items;
                state.selectedItemId = res.selectedItemId || null;
                if (!res.ok) {
                    if (typeof showToast === 'function') showToast('Сначала выберите объект на сетке');
                    return false;
                }
                renderGrid(); calculate(); saveDraft(); setTimeout(microFill, 0);
                if (typeof showToast === 'function') showToast('Выделенный объект удалён');
                return true;
            }
            const id = state.selectedItemId;
            if (!id || !removeItemById(id)) {
                if (typeof showToast === 'function') showToast('Сначала выберите объект на сетке');
                return false;
            }
            renderGrid(); calculate(); saveDraft(); setTimeout(microFill, 0);
            if (typeof showToast === 'function') showToast('Выделенный объект удалён');
            return true;
        }
        function rotateSelected(){
            syncStateFromInputs();
            const action = trussModuleApi('rotateSelectedAction');
            if (action) {
                const res = action({
                    items: state.items,
                    selectedItemId: state.selectedItemId,
                    specs: SPECS,
                    canPlace: (item, nextO) => inBounds(item.type, item.x, item.y, nextO)
                });
                if (!res.ok) {
                    if (typeof showToast === 'function') showToast(res.reason === 'out-of-bounds' ? 'Не хватает места для поворота' : 'Сначала выберите ферму или угол на сетке');
                    return;
                }
            } else {
                const rotateFn = trussModuleApi('rotateSelectedItem');
                if (rotateFn) {
                    const res = rotateFn(state.items, state.selectedItemId, SPECS, (item, nextO) => inBounds(item.type, item.x, item.y, nextO));
                    if (!res.ok) {
                        if (typeof showToast === 'function') showToast(res.reason === 'out-of-bounds' ? 'Не хватает места для поворота' : 'Сначала выберите ферму или угол на сетке');
                        return;
                    }
                } else {
                    const item = state.items.find(entry => entry.id === state.selectedItemId);
                    if (!item) { if (typeof showToast === 'function') showToast('Сначала выберите ферму или угол на сетке'); return; }
                    const spec = SPECS[item.type]; if (!spec) return;
                    if (spec.kind === 'straight') {
                        const nextO = item.o === 'v' ? 'h' : 'v';
                        if (!inBounds(item.type, item.x, item.y, nextO)) { if (typeof showToast === 'function') showToast('Не хватает места для поворота'); return; }
                        item.o = nextO;
                    } else {
                        item.r = (Number(item.r || 0) + 90) % 360;
                    }
                }
            }
            renderGrid(); calculate(); saveDraft();
            if (typeof showToast === 'function') showToast('Выбранный элемент повернут на 90°');
        }
        function handleCellClick(x, y){
            syncStateFromInputs();
            const action = trussModuleApi('handleCellClickAction');
            if (action) {
                const res = action({
                    mode: 'add',
                    items: state.items,
                    selectedItemId: state.selectedItemId,
                    type: state.selected,
                    x, y,
                    orientation: state.orientation,
                    specs: SPECS,
                    cellMeters: state.cellMeters,
                    makeId,
                    getSnappedPlacement,
                    inBounds
                });
                state.items = res.items || state.items;
                state.selectedItemId = res.selectedItemId || state.selectedItemId || null;
                if (!res.ok && res.reason === 'out-of-bounds' && typeof showToast === 'function') showToast('Блок не помещается в сетку');
            } else {
                addItem(state.selected, x, y, state.orientation);
            }
            renderGrid(); calculate(); saveDraft();
            setTimeout(microFill, 0);
        }

        function roundToHalf(meters){
            const n = Number(meters || 0);
            return Math.max(HALF_STEP, Math.round(n * 2) / 2);
        }
        function templateStraightLength(outerMeters, connectedNodeCount){
            const raw = Number(outerMeters || 0) - Number(connectedNodeCount || 0) * NODE_EXTENSION_M;
            return roundToHalf(raw);
        }
        function axisEndpointInfo(){
            const endpoints = new Map();
            state.items.forEach(item => {
                const spec = SPECS[item.type];
                if (!spec || spec.kind !== 'straight') return;
                const points = straightPortPoints(item, spec);
                points.forEach(pt => {
                    const key = pointKey(pt.x, pt.y);
                    const entry = endpoints.get(key) || { h:false, v:false };
                    if (item.o === 'v') entry.v = true; else entry.h = true;
                    endpoints.set(key, entry);
                });
            });
            return endpoints;
        }
        function buildRunDataWithNodeExtensions(){
            const cellM = Number(state.cellMeters || 0.5);
            const h = new Map();
            const v = new Map();
            const endpoints = axisEndpointInfo();
            state.items.forEach(item => {
                const spec = SPECS[item.type];
                if (!spec || spec.kind !== 'straight') return;
                const start = item.o === 'v' ? item.y : item.x;
                const end = start + cellCount(spec.length);
                const key = item.o === 'v' ? String(item.x) : String(item.y);
                const map = item.o === 'v' ? v : h;
                const list = map.get(key) || [];
                list.push({ start, end, meters:Number(spec.length || 0), item });
                map.set(key, list);
            });
            function nodeAxisContrib(axis, lineKey, start, end){
                const ids = new Set();
                state.items.forEach(item => {
                    const spec = SPECS[item.type];
                    if (!spec || spec.kind !== 'node') return;
                    const points = itemPoints(item);
                    const hasAxisConnection = points.some(pt => {
                        const onLine = axis === 'h' ? String(pt.y) === String(lineKey) : String(pt.x) === String(lineKey);
                        if (!onLine) return false;
                        const pos = axis === 'h' ? pt.x : pt.y;
                        if (pos < start - 1e-9 || pos > end + 1e-9) return false;
                        const ep = endpoints.get(pointKey(pt.x, pt.y));
                        return !!(ep && ep[axis]);
                    });
                    if (hasAxisConnection) ids.add(item.id);
                });
                return ids;
            }
            function runsForAxis(map, axis){
                const out = [];
                map.forEach((list, lineKey) => {
                    const intervals = list.slice().sort((a,b) => a.start - b.start);
                    let current = null;
                    intervals.forEach(it => {
                        if (!current || it.start > current.end + 1e-9) {
                            if (current) out.push(current);
                            current = { axis, lineKey, start:it.start, end:it.end, straightMeters:it.meters, items:[it.item] };
                        } else {
                            current.end = Math.max(current.end, it.end);
                            current.straightMeters += it.meters;
                            current.items.push(it.item);
                        }
                    });
                    if (current) out.push(current);
                });
                out.forEach(run => {
                    const nodes = nodeAxisContrib(run.axis, run.lineKey, run.start, run.end);
                    run.nodeCount = nodes.size;
                    run.nodeExtensionMeters = run.nodeCount * NODE_EXTENSION_M;
                    run.gridMeters = Math.max(0, (run.end - run.start) * cellM);
                    run.effectiveMeters = run.straightMeters + run.nodeExtensionMeters;
                });
                return out;
            }
            return runsForAxis(h, 'h').concat(runsForAxis(v, 'v'));
        }
        function effectiveSpanInfo(){
            const runs = buildRunDataWithNodeExtensions();
            let maxStraight = 0, maxGrid = 0, maxEffective = 0, maxNodeCount = 0, best = null;
            runs.forEach(run => {
                if (run.effectiveMeters > maxEffective) {
                    maxEffective = run.effectiveMeters;
                    maxStraight = run.straightMeters;
                    maxGrid = run.gridMeters;
                    maxNodeCount = run.nodeCount;
                    best = run;
                }
            });
            return { runs, maxStraight, maxGrid, maxEffective, maxNodeCount, best, nodeExtensionMeters:maxNodeCount * NODE_EXTENSION_M };
        }

        function splitLength(meters){
            let remaining = Math.round(Number(meters || 0) * 2) / 2;
            const out = [];
            STRAIGHT_ORDER.forEach(len => {
                while (remaining + 1e-9 >= len) { out.push(len); remaining = Math.round((remaining - len) * 2) / 2; }
            });
            if (remaining > 0) out.push(0.5);
            return out;
        }
        function pieceTypeForLength(len){
            return len === 3 ? 'truss3' : len === 2.5 ? 'truss25' : len === 2 ? 'truss2' : len === 1.5 ? 'truss15' : len === 1 ? 'truss1' : 'truss05';
        }
        function addRun(startX, startY, meters, o){
            let x = startX, y = startY;
            splitLength(meters).forEach(len => {
                const type = pieceTypeForLength(len);
                addItem(type, x, y, o);
                const cells = cellCount(len);
                if (o === 'v') y += cells; else x += cells;
            });
        }
        function rotateItem(item, deg){ if (item) item.r = ((Number(deg || 0) % 360) + 360) % 360; }
        function applyTemplate(kind){
            syncStateFromInputs();
            const widthM = Math.max(1, Number(state.templateWidthM || readNumber('blockTemplateWidthM', 6) || 6));
            const heightM = Math.max(1, Number(state.templateHeightM || readNumber('blockTemplateHeightM', 3) || 3));
            // В шаблонах ширина/высота трактуются как внешний расчётный габарит.
            // U003 добавляет по 0.5 м на подключённый торец, поэтому прямые участки делаем короче.
            const runWidthM = templateStraightLength(widthM, 2);
            const portalLegM = templateStraightLength(heightM, 1);
            const frameHeightRunM = templateStraightLength(heightM, 2);
            const wCells = cellCount(runWidthM);
            const portalHCells = cellCount(portalLegM);
            const frameHCells = cellCount(frameHeightRunM);
            const hCells = kind === 'portal' ? portalHCells : frameHCells;
            state.cols = Math.max(state.cols, wCells + 8);
            state.rows = Math.max(state.rows, hCells + 8);
            state.items = [];
            const x0 = 2, y0 = 2;

            if (kind === 'portal') {
                // Реальная логика: U003 стоит между прямыми участками. Фермы подходят к разным торцам угла через CQ2, не пересекаются внутри узла.
                const rightCornerX = x0 + 1 + wCells;
                rotateItem(addItem('cornerU003', x0, y0, 'n'), 0);                // порты: вправо + вниз
                rotateItem(addItem('cornerU003', rightCornerX, y0, 'n'), 90);     // порты: влево + вниз
                addRun(x0 + 1, y0, runWidthM, 'h');
                addRun(x0, y0 + 1, portalLegM, 'v');
                addRun(rightCornerX, y0 + 1, portalLegM, 'v');
                addItem('base', x0, y0 + 1 + portalHCells, 'n');
                addItem('base', rightCornerX, y0 + 1 + portalHCells, 'n');
            } else {
                // Рама: каждый U003 занимает свой внешний угол 0.5×0.5 м; прямые стороны подключаются к портам углов.
                const rightCornerX = x0 + 1 + wCells;
                const bottomCornerY = y0 + 1 + frameHCells;
                rotateItem(addItem('cornerU003', x0, y0, 'n'), 0);                     // верхний левый: вправо + вниз
                rotateItem(addItem('cornerU003', rightCornerX, y0, 'n'), 90);          // верхний правый: влево + вниз
                rotateItem(addItem('cornerU003', x0, bottomCornerY, 'n'), 270);        // нижний левый: вправо + вверх
                rotateItem(addItem('cornerU003', rightCornerX, bottomCornerY, 'n'), 180); // нижний правый: влево + вверх
                addRun(x0 + 1, y0, runWidthM, 'h');
                addRun(x0 + 1, bottomCornerY + 1, runWidthM, 'h');
                addRun(x0, y0 + 1, frameHeightRunM, 'v');
                addRun(rightCornerX, y0 + 1, frameHeightRunM, 'v');
            }
            syncInputsFromState();
            renderGrid(); calculate(); saveDraft();
            if (typeof showToast === 'function') showToast(kind === 'portal' ? 'Блочный портал CQ построен' : 'Блочная рама CQ построена');
        }


        function mergeIntervals(intervals){
            if (!intervals.length) return [];
            const sorted = intervals.slice().sort((a,b) => a[0] - b[0]);
            const merged = [];
            sorted.forEach(([start, end]) => {
                if (!merged.length || start > merged[merged.length - 1][1] + 1e-6) merged.push([start, end]);
                else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
            });
            return merged;
        }
        function autoStraightSpan(){
            return effectiveSpanInfo().maxEffective;
        }
        function pickMainLoadRow(seriesId, span){
            if (LoadCheckerModule && typeof LoadCheckerModule.pickMainLoadRow === 'function') return LoadCheckerModule.pickMainLoadRow(seriesId, span);
            const table = TRUSS_LOAD_TABLES[seriesId] || TRUSS_LOAD_TABLES.T29Q;
            const rows = table.main;
            const n = Number(span || 0);
            if (!n) return { table, row:null, status:'empty', usedSpan:0, note:'Пролёт не задан и не найден по схеме.' };
            if (n > rows[rows.length - 1].span + 1e-9) return { table, row:null, status:'over', usedSpan:n, note:`Пролёт ${metric(n)} м больше максимума таблицы ${rows[rows.length - 1].span} м.` };
            const row = rows.find(r => n <= r.span + 1e-9) || rows[rows.length - 1];
            const minSpan = rows[0].span;
            const note = n < minSpan ? `Пролёт меньше 4 м — для запаса применена строка ${minSpan} м.` : (Math.abs(row.span - n) > 1e-9 ? `Длины между строками считаются по ближайшему большему пролёту: ${row.span} м.` : 'Длина совпадает со строкой таблицы.');
            return { table, row, status:'ok', usedSpan:row.span, note };
        }
        function pickCantileverRow(seriesId, lk){
            if (LoadCheckerModule && typeof LoadCheckerModule.pickCantileverRow === 'function') return LoadCheckerModule.pickCantileverRow(seriesId, lk);
            const table = TRUSS_LOAD_TABLES[seriesId] || TRUSS_LOAD_TABLES.T29Q;
            const rows = table.cantilever;
            const n = Number(lk || 0);
            if (!n) return { table, row:null, status:'empty', usedLk:0, note:'' };
            if (n > rows[rows.length - 1].lk + 1e-9) return { table, row:null, status:'over', usedLk:n, note:`Консоль ${metric(n)} м больше максимума таблицы ${rows[rows.length - 1].lk} м.` };
            const row = rows.find(r => n <= r.lk + 1e-9) || rows[rows.length - 1];
            const note = Math.abs(row.lk - n) > 1e-9 ? `Консоль между строками считается по ближайшей большей Lк: ${row.lk} м.` : 'Консоль совпадает со строкой таблицы.';
            return { table, row, status:'ok', usedLk:row.lk, note };
        }
        function loadMarginClass(value, limit){
            if (LoadCheckerModule && typeof LoadCheckerModule.loadMarginClass === 'function') return LoadCheckerModule.loadMarginClass(value, limit);
            if (!limit || !Number.isFinite(limit) || value <= 0) return 'na';
            if (value > limit + 1e-9) return 'bad';
            const margin = (limit - value) / limit;
            return margin < 0.1 ? 'risk' : 'ok';
        }
        function formatMargin(value, limit, unit = 'кг'){
            if (LoadCheckerModule && typeof LoadCheckerModule.formatMargin === 'function') return LoadCheckerModule.formatMargin(value, limit, unit);
            if (!limit || !Number.isFinite(limit) || value <= 0) return 'не задано';
            const diff = limit - value;
            const pct = Math.round((diff / limit) * 100);
            return diff >= 0 ? `запас ${metric(diff,0)} ${unit} / ${pct}%` : `превышение ${metric(Math.abs(diff),0)} ${unit} / ${Math.abs(pct)}%`;
        }
        function calculateLoadCheck(){
            const spanInfo = effectiveSpanInfo();
            if (LoadCheckerModule && typeof LoadCheckerModule.calculateLoadCheck === 'function') return LoadCheckerModule.calculateLoadCheck(state, spanInfo);
            const autoSpan = spanInfo.maxEffective;
            const span = Number(state.spanManual || 0) > 0 ? Number(state.spanManual) : autoSpan;
            const main = pickMainLoadRow(state.trussSeries, span);
            const factDist = Number(state.factDistributedKgM || 0);
            const factPoint = Number(state.factPointKg || 0);
            const scheme = state.pointScheme || 'p1';
            const result = { autoSpan, span, main, factDist, factPoint, scheme, overall:'na', spanInfo };
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
            const cant = pickCantileverRow(state.trussSeries, state.cantileverLength);
            result.cantilever = { pick:cant, view:state.cantileverView || 'Q' };
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

        function priceAndWeightFor(spec, count, meters){
            const delegated = trussModuleApi('priceAndWeightFor');
            if (delegated) return delegated(spec, count, meters, state);
            if (!spec) return { price:0, weight:0 };
            if (spec.kind === 'straight') return { price: meters * state.pricePerMeter, weight: meters * state.weightPerMeter };
            if (spec.kind === 'node') return { price: count * state.nodePrice, weight: count * mdmtNodeWeight(spec) };
            if (spec.kind === 'base') return { price: count * state.basePrice, weight: count * state.baseWeight };
            if (spec.kind === 'pin') return { price: count * state.pinPrice, weight: count * state.pinWeight };
            return { price:0, weight:0 };
        }

        function calculate(){
            const counted = trussModuleApi('calculateItemCounts')
                ? TrussBlockModule.calculateItemCounts(state.items, SPECS)
                : null;
            const counts = counted ? counted.counts : {};
            const metersByType = counted ? counted.metersByType : {};
            if (!counted) {
                Object.keys(SPECS).forEach(k => { counts[k] = 0; metersByType[k] = 0; });
                state.items.forEach(item => {
                    const spec = SPECS[item.type]; if (!spec) return;
                    counts[item.type] = (counts[item.type] || 0) + 1;
                    if (spec.kind === 'straight') metersByType[item.type] = (metersByType[item.type] || 0) + Number(spec.length || 0);
                });
            }
            let connectionCount = 0;
            connectionMap().forEach(entry => { if (entry.count >= 2) connectionCount += Math.max(0, entry.count - 1); });
            const loadCheck = calculateLoadCheck();
            let result;
            if (trussModuleApi('summarizeBom')) {
                result = TrussBlockModule.summarizeBom(state.items, SPECS, state, { counts, metersByType, connectionCount, transport: transportCost() });
            } else {
                const totalMeters = Object.values(metersByType).reduce((a,b) => a + Number(b || 0), 0);
                const angles = counts.cornerU003 || 0;
                const cubes = counts.cornerU022 || 0;
                const tNodes = counts.cornerU017 || 0;
                const crosses = counts.cornerU016 || 0;
                const angledNodes = (counts.cornerU001 || 0) + (counts.cornerU002 || 0) + (counts.cornerU004 || 0) + (counts.cornerU005 || 0);
                const multiNodes = (counts.cornerU012 || 0) + (counts.cornerU020 || 0) + (counts.cornerU024 || 0);
                const nodePieces = Object.entries(SPECS).reduce((sum, [id, spec]) => sum + (spec.kind === 'node' ? (counts[id] || 0) : 0), 0);
                const connectorKits = connectionCount;
                const cq2Cones = connectionCount * 4;
                const cq2Pins = connectionCount * 8;
                const cq2Cotters = connectionCount * 8;
                const autoPins = cq2Cones;
                const placedPins = 0;
                const manualPins = 0;
                const totalPins = autoPins;
                let rental = 0, weight = 0;
                Object.entries(SPECS).forEach(([id, spec]) => {
                    if (id === 'pin') return;
                    const c = counts[id] || 0; if (!c) return;
                    const m = metersByType[id] || 0;
                    const pw = priceAndWeightFor(spec, c, m);
                    rental += pw.price; weight += pw.weight;
                });
                const pinPW = priceAndWeightFor(SPECS.pin, totalPins, 0);
                const halfConnectorWeight = baseHalfConnectors * Number(state.halfConnectorWeight || C3_83_WEIGHT_KG);
                const halfConnectorPriceTotal = baseHalfConnectors * Number(state.halfConnectorPrice || 0);
                const cq2C2PinWeight = cq2Pins * Number(state.c2PinWeight || C2_67_WEIGHT_KG);
                const baseC2PinWeight = baseC2Pins * Number(state.c2PinWeight || C2_67_WEIGHT_KG);
                const c2PinWeight = cq2C2PinWeight + baseC2PinWeight;
                const cq2CotterWeight = cq2Cotters * Number(state.cotterWeight || C2_COTTER_WEIGHT_KG);
                const baseCotterWeight = baseCotters * Number(state.cotterWeight || C2_COTTER_WEIGHT_KG);
                const c2CotterWeight = cq2CotterWeight + baseCotterWeight;
                rental += pinPW.price + halfConnectorPriceTotal; weight += pinPW.weight + halfConnectorWeight + c2PinWeight + c2CotterWeight;
                const install = Math.max(0, Number(state.install || 0));
                const transport = transportCost();
                const total = rental + install + transport;
                result = { counts, metersByType, totalMeters, angles, cubes, tNodes, crosses, angledNodes, multiNodes, nodePieces, connectionCount, connectorKits, baseCount, cq2Cones, cq2Pins, cq2Cotters, baseHalfConnectors, baseC2Pins, baseCotters, totalC2Pins, totalCotters, autoPins, placedPins, manualPins, totalPins, halfConnectorWeight, halfConnectorPriceTotal, cq2C2PinWeight, baseC2PinWeight, c2PinWeight, cq2CotterWeight, baseCotterWeight, c2CotterWeight, rental, install, transport, total, weight };
            }
            result.loadCheck = loadCheck;
            renderSummary(result);
            renderBom(result);
            renderLoadSummary(loadCheck);
            const label = q('blockCountLabel');
            if (label) {
                label.textContent = trussModuleApi('renderCountLabelText')
                    ? TrussBlockModule.renderCountLabelText(result, state.items, loadCheck, { metric })
                    : `Блоков: ${state.items.length} · Прямые: ${metric(result.totalMeters)} м · габарит с U: ${metric(loadCheck.spanInfo.maxEffective)} м · CQ2: ${result.connectorKits} компл.`;
            }
            return result;
        }

        function renderSummary(res){
            const box = q('blockSummary'); if (!box) return;
            if (trussModuleApi('renderSummaryHtml')) {
                box.innerHTML = TrussBlockModule.renderSummaryHtml(res, state, { money, metric, escapeHtml: esc });
                return;
            }
            const effective = res.loadCheck && res.loadCheck.spanInfo ? metric(res.loadCheck.spanInfo.maxEffective) + ' м' : '—';
            const rows = [
                ['Прямые фермы', `${metric(res.totalMeters)} м`, 'метраж'],
                ['Макс. габарит с U-блоками', effective, 'расчётный'],
                ['U003 угол 90°', `${res.angles} шт`, 'узлы'],
                ['U022 куб 6 направл.', `${res.cubes} шт`, 'узлы'],
                ['U017 / U016 Т+крест', `${res.tNodes + res.crosses} шт`, 'узлы'],
                ['Прочие угловые U-блоки', `${res.angledNodes + res.multiNodes} шт`, 'узлы'],
                ['Всего узлов МДМТ', `${res.nodePieces} шт`, 'узлы'],
                ['Базы / блины', `${res.counts.base || 0} шт · ${metric((res.counts.base || 0) * Number(state.baseWeight || 0))} кг`, 'опоры'],
                ['Крепление баз C3-83 / пальцы / шплинты', `${res.baseHalfConnectors || 0} / ${res.baseC2Pins || 0} / ${res.baseCotters || 0} шт`, 'крепёж'],
                ['Торцевые соединения CQ2', `${res.connectorKits || 0} компл.`, 'крепёж'],
                ['CQ2: C2-88 / пальцы / шплинты', `${res.cq2Cones || 0} / ${res.cq2Pins || 0} / ${res.cq2Cotters || 0} шт`, 'крепёж'],
                ['Крепёж всего: C2-88 / C3-83 / пальцы / шплинты', `${res.cq2Cones || 0} / ${res.baseHalfConnectors || 0} / ${res.totalC2Pins || 0} / ${res.totalCotters || 0} шт`, 'крепёж'],
                ['Вес комплекта', `${metric(res.weight)} кг`, 'масса'],
                ['Прокат блоков', money(res.rental), 'стоимость'],
                ['Монтаж', money(res.install), 'стоимость'],
                ['Транспорт', money(res.transport), 'стоимость']
            ];
            box.innerHTML = `<table class="block-calc-table block-calc-summary" aria-label="Итог расчёта блочной комплектации">
                <caption>Итог комплектации</caption>
                <thead><tr><th>Позиция</th><th>Значение</th><th>Группа</th></tr></thead>
                <tbody>${rows.map(row => `<tr><td>${esc(row[0])}</td><td>${row[1]}</td><td class="block-muted-cell">${esc(row[2])}</td></tr>`).join('')}
                <tr class="block-total-row"><td>ИТОГО</td><td>${money(res.total)}</td><td>к оплате</td></tr></tbody>
            </table>`;
        }

        function renderLoadSummary(load){
            const box = q('blockLoadSummary');
            if (!load) {
                if (box) box.innerHTML = '';
                return;
            }
            if (LoadCheckerModule && typeof LoadCheckerModule.renderLoadSummaryHtml === 'function') {
                const status = typeof LoadCheckerModule.getLoadStatus === 'function'
                    ? LoadCheckerModule.getLoadStatus(load)
                    : null;
                if (status) {
                    const launcherStatus = q('blockLoadLauncherStatus');
                    if (launcherStatus) {
                        launcherStatus.className = `block-load-launcher-status ${status.statusClass}`;
                        launcherStatus.textContent = status.launcherText;
                    }
                    const launcherSub = q('blockLoadLauncherSub');
                    if (launcherSub) launcherSub.textContent = status.launcherSub;
                    const modalStatus = q('blockLoadModalStatus');
                    if (modalStatus) {
                        modalStatus.className = `block-load-status block-load-modal-status ${status.statusClass}`;
                        modalStatus.textContent = status.statusText;
                    }
                }
                if (box) box.innerHTML = LoadCheckerModule.renderLoadSummaryHtml(load, { state, escapeHtml: esc });
                return;
            }
            const table = load.main && load.main.table ? load.main.table : TRUSS_LOAD_TABLES.T29Q;
            const row = load.main ? load.main.row : null;
            const spanLabel = load.span > 0 ? `${metric(load.span)} м` : 'не найден';
            const appliedSpan = row ? `${row.span} м` : '—';
            const statusText = load.overall === 'bad' ? 'Есть превышение / вне таблицы' : load.overall === 'risk' ? 'Нагрузка проходит, но запас меньше 10%' : load.overall === 'ok' ? 'Нагрузка проходит по выбранной таблице' : 'Введите фактическую нагрузку для проверки';
            const statusClass = load.overall === 'bad' ? 'bad' : load.overall === 'risk' ? 'risk' : load.overall === 'ok' ? 'ok' : '';
            const launcherStatus = q('blockLoadLauncherStatus');
            if (launcherStatus) {
                launcherStatus.className = `block-load-launcher-status ${statusClass}`;
                launcherStatus.textContent = load.overall === 'bad' ? 'превышение' : load.overall === 'risk' ? 'малый запас' : load.overall === 'ok' ? 'OK' : 'не задано';
            }
            const launcherSub = q('blockLoadLauncherSub');
            if (launcherSub) launcherSub.textContent = `${table.label} · пролёт ${spanLabel} · строка ${appliedSpan}`;
            const modalStatus = q('blockLoadModalStatus');
            if (modalStatus) {
                modalStatus.className = `block-load-status block-load-modal-status ${statusClass}`;
                modalStatus.textContent = statusText;
            }
            if (!box) return;
            const rowLine = (label, value) => `<div>${label}</div><div>${value}</div>`;
            let baseRows = '';
            baseRows += rowLine('Таблица', esc(table.label));
            baseRows += rowLine('Авто-пролёт с U-блоками', load.autoSpan > 0 ? metric(load.autoSpan) + ' м' : '—');
            if (load.spanInfo) baseRows += rowLine('Прямые / выросты U', `${metric(load.spanInfo.maxStraight)} м + ${metric(load.spanInfo.nodeExtensionMeters)} м (${load.spanInfo.maxNodeCount || 0} × 0.5)`);
            baseRows += rowLine('Расчётный пролёт L', spanLabel);
            baseRows += rowLine('Строка таблицы', appliedSpan);
            if (row) baseRows += rowLine('Прогиб / вес по паспорту', `${row.deflectionMm} мм · ${row.weightKg} кг`);
            if (load.main && load.main.note) baseRows += rowLine('Примечание', esc(load.main.note));

            let distRows = '';
            if (row) {
                distRows += rowLine('Допустимо', `${row.udlKgM} кг/м · макс. ${row.udlMaxKg} кг`);
                distRows += rowLine('Фактически', load.factDist ? `${metric(load.factDist,0)} кг/м · ${metric(load.distributed.total,0)} кг всего` : 'не задано');
                distRows += rowLine('Запас', load.factDist ? formatMargin(load.factDist, row.udlKgM, 'кг/м') : '—');
            } else {
                distRows += rowLine('Статус', load.main && load.main.note ? esc(load.main.note) : 'нет строки таблицы');
            }

            let pointRows = '';
            if (row) {
                pointRows += rowLine(`Допустимо ${String(load.scheme || 'p1').toUpperCase()}`, `${load.point.limit} кг`);
                pointRows += rowLine('Фактически', load.factPoint ? `${metric(load.factPoint,0)} кг` : 'не задано');
                pointRows += rowLine('Запас', load.factPoint ? formatMargin(load.factPoint, load.point.limit) : '—');
            } else {
                pointRows += rowLine('Статус', load.main && load.main.note ? esc(load.main.note) : 'нет строки таблицы');
            }

            let cantRows = '';
            const cant = load.cantilever;
            if (cant && cant.pick && cant.pick.status !== 'empty') {
                if (cant.pick.row) {
                    cantRows += rowLine('Lк', `${metric(state.cantileverLength)} м → строка ${cant.pick.row.lk} м`);
                    cantRows += rowLine('Вид', cant.view);
                    cantRows += rowLine('P1 / P2 допустимо', `${cant.p1Limit} кг · ${cant.p2Limit} кг/м`);
                    cantRows += rowLine('Уравновешивание A', `${cant.balancePointA ? metric(cant.balancePointA,0) + ' кг по P1' : '—'}${cant.balanceDistributedA ? ' · ' + metric(cant.balanceDistributedA,0) + ' кг по P2' : ''}`);
                    if (cant.pick.note) cantRows += rowLine('Примечание', esc(cant.pick.note));
                } else {
                    cantRows += rowLine('Статус', esc(cant.pick.note));
                }
            } else {
                cantRows += rowLine('Статус', 'консоль не задана');
            }

            box.innerHTML = `
                <div class="block-load-sections">
                    <div class="block-load-section"><h5>Ферма / пролёт</h5><div class="block-load-grid">${baseRows}</div></div>
                    <div class="block-load-section"><h5>Распределённая нагрузка</h5><div class="block-load-grid">${distRows}</div></div>
                    <div class="block-load-section"><h5>Точечная нагрузка</h5><div class="block-load-grid">${pointRows}</div></div>
                    <div class="block-load-section"><h5>Консоль</h5><div class="block-load-grid">${cantRows}</div></div>
                </div>
                <div class="block-load-note">Расчёт использует паспортные таблицы MDM T29/T39 вида Q. Длины между строками считаются по ближайшему большему пролёту без интерполяции. Авто-пролёт учитывает подключённые U-блоки как отдельные торцевые порты: +0.5 м на каждый реально подключённый узел в линии пролёта. Это контроль по таблице, а не замена инженерному расчёту подвеса, ветра, балласта и креплений. Масса угловых блоков в ведомости берётся по выбранной серии T29/T39; закупочные цены МДМТ в приложение не внесены. Торцевые стыки считаются отдельными позициями: 4 C2-88, 8 C2-67 и 8 шплинтов на один стык. Масса пальца C2-67 в базе: 0.04 кг/шт.</div>`;
        }

        function renderBom(res){
            const body = q('blockBomBody'); if (!body) return;
            if (trussModuleApi('renderBomRowsHtml')) {
                body.innerHTML = TrussBlockModule.renderBomRowsHtml(res, SPECS, state, { money, metric, escapeHtml: esc, codeFn: mdmtCode });
                return;
            }
            const rows = [];
            const moduleRows = trussModuleApi('buildBomRows')
                ? TrussBlockModule.buildBomRows(res, SPECS, state, mdmtCode)
                : null;
            if (moduleRows) {
                moduleRows.forEach(row => {
                    if (row.id === 'c288') {
                        rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">торцевые стыки: ${esc(row.note || '')}</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${metric(row.weight)} кг</td><td>${money(row.price)}</td></tr>`);
                    } else if (row.id === 'c267') {
                        rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">по торцевым стыкам: ${esc(row.note || '')} · 0.04 кг/шт</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${metric(row.weight)} кг</td><td>—</td></tr>`);
                    } else if (row.id === 'c383') {
                        rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">крепление баз / блинов: ${esc(row.note || '')}</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${metric(row.weight)} кг</td><td>${money(row.price)}</td></tr>`);
                    } else if (row.id === 'cotter') {
                        rows.push(`<tr><td><b>${esc(row.name)}</b><br><span style="color:var(--muted)">крепёж: ${esc(row.note || '')}</span></td><td>${metric(row.qty,0)} ${esc(row.unit)}</td><td>—</td><td>${row.weight ? metric(row.weight) + ' кг' : '—'}</td><td>—</td></tr>`);
                    } else {
                        const label = row.code ? `<b>${esc(row.code)}</b><br><span style="color:var(--muted)">${esc(row.name)}</span>` : esc(row.name);
                        rows.push(`<tr><td>${label}</td><td>${metric(row.count,0)} шт</td><td>${row.meters ? metric(row.meters) + ' м' : '—'}</td><td>${metric(row.weight)} кг</td><td>${money(row.price)}</td></tr>`);
                    }
                });
            } else {
                Object.values(SPECS).forEach(spec => {
                    if (spec.hidden && spec.id !== 'pin') return;
                    if (spec.id === 'pin') {
                        if (!res.connectorKits) return;
                        const pw = priceAndWeightFor(spec, res.cq2Cones || 0, 0);
                        const kitWeight = Number(pw.weight || 0) + Number(res.c2PinWeight || 0) + Number(res.c2CotterWeight || 0);
                        rows.push(`<tr><td><b>Конусный коннектор C2-88</b><br><span style="color:var(--muted)">торцевые стыки: ${res.connectorKits || 0} × 4 шт</span></td><td>${res.cq2Cones || 0} шт</td><td>—</td><td>${metric(pw.weight)} кг</td><td>${money(pw.price)}</td></tr>`);
                        if (res.baseHalfConnectors) rows.push(`<tr><td><b>Полуконнектор конусный C3-83</b><br><span style="color:var(--muted)">крепление баз / блинов: ${res.counts.base || 0} баз × 4 шт</span></td><td>${res.baseHalfConnectors || 0} шт</td><td>—</td><td>${metric(res.halfConnectorWeight || 0)} кг</td><td>${money(res.halfConnectorPriceTotal || 0)}</td></tr>`);
                        const pinNote = `${res.connectorKits || 0} соед. × 8 шт${res.counts.base ? ' + ' + res.counts.base + ' баз × 4 шт' : ''}`;
                        rows.push(`<tr><td><b>Палец C2-67</b><br><span style="color:var(--muted)">крепёж: ${pinNote} · 0.04 кг/шт</span></td><td>${res.totalC2Pins || 0} шт</td><td>—</td><td>${metric(res.c2PinWeight || 0)} кг</td><td>—</td></tr>`);
                        rows.push(`<tr><td><b>Шплинт игольчатый C2-2-48</b><br><span style="color:var(--muted)">крепёж: ${pinNote}</span></td><td>${res.totalCotters || 0} шт</td><td>—</td><td>${res.c2CotterWeight ? metric(res.c2CotterWeight || 0) + ' кг' : '—'}</td><td>—</td></tr>`);
                        return;
                    }
                    const count = res.counts[spec.id] || 0;
                    const meters = res.metersByType[spec.id] || 0;
                    if (!count && !meters) return;
                    const pw = priceAndWeightFor(spec, count, meters);
                    const code = mdmtCode(spec);
                    const label = code ? `<b>${esc(code)}</b><br><span style="color:var(--muted)">${esc(spec.label)}</span>` : esc(spec.label);
                    rows.push(`<tr><td>${label}</td><td>${count} шт</td><td>${meters ? metric(meters) + ' м' : '—'}</td><td>${metric(pw.weight)} кг</td><td>${money(pw.price)}</td></tr>`);
                });
            }
            if (!rows.length) rows.push('<tr><td colspan="5" style="text-align:center;color:var(--muted);">Пока нет блоков. Выберите элемент и поставьте его на сетку.</td></tr>');
            body.innerHTML = rows.join('');
        }

        function clear(confirmFirst){
            if (confirmFirst && !confirm('Очистить блочный конструктор ферм?')) return;
            state.items = [];
            state.selectedItemId = null;
            renderGrid(); calculate(); saveDraft();
        }
        function exportJson(){
            const result = calculate();
            const payloadFn = trussModuleApi('createExportPayload');
            const sanitizeFn = trussModuleApi('sanitizeFilePart');
            const data = payloadFn ? payloadFn({ version:VERSION, state, result }) : { type:'feg-stage-pro-block-truss-export', version:VERSION, exportedAt:new Date().toISOString(), state, result };
            const rawName = q('trussProjectName') && q('trussProjectName').value ? q('trussProjectName').value : 'block_truss';
            const name = sanitizeFn ? sanitizeFn(rawName, 'block_truss') : rawName.replace(/[\\/:*?"<>|]/g, '_');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = `${name}_blocks_v36.json`; a.click(); URL.revokeObjectURL(a.href);
        }
        function select(id){ if (SPECS[id] && !SPECS[id].hidden) state.selected = id; renderLibrary(); saveDraft(); }
        function rotate(){
            state.orientation = state.orientation === 'h' ? 'v' : 'h';
            writeValue('blockOrientation', state.orientation);
            saveDraft();
            if (typeof showToast === 'function') showToast(state.orientation === 'v' ? 'Блоки: вертикально' : 'Блоки: горизонтально');
        }
        function setMode(){
            state.mode = 'place';
            saveDraft();
        }

        window.FEG35BlockConstructor = {
            version: VERSION,
            init: installUI,
            select,
            rotate,
            rotateSelected,
            deleteSelected,
            openPricingModal,
            closePricingModal,
            openLoadModal,
            closeLoadModal,
            setMode,
            template: applyTemplate,
            clear,
            calculate,
            exportJson,
            exportSvgCalibration: microDownloadCalibrationFile,
            getState: () => JSON.parse(JSON.stringify(state)),
            getSpecs: () => JSON.parse(JSON.stringify(SPECS)),
            hasScheme: () => state.items && state.items.length > 0,
            getResult: () => calculate()
        };

        window.addEventListener('load', () => setTimeout(installUI, 350));
    })();

    /* --- FEG Stage PRO 3.6.18: truss UI summary module --- */
    (function(){
        const PDF_VERSION = APP_VERSION;
        const escPdf = (value) => {
            if (typeof escapeHtml === 'function') return escapeHtml(String(value ?? ''));
            return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
        };
        const moneyPdf = (value) => `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
        const metricPdf = (value, digits = 2) => {
            const n = Math.round((Number(value || 0)) * Math.pow(10, digits)) / Math.pow(10, digits);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: digits });
        };
        const kgPdf = (value) => `${metricPdf(value, 1)} кг`;
        const safeFileName = (value) => String(value || 'feg').replace(/[\\/:*?"<>|]/g, '_').trim() || 'feg';
        const trussApi = () => window.FEG35BlockConstructor || null;
        const getSpecs = () => {
            const api = trussApi();
            try { return api && api.getSpecs ? api.getSpecs() : {}; } catch(e) { return {}; }
        };
        const getBlockState = () => {
            const api = trussApi();
            try { return api && api.getState ? api.getState() : { items: [] }; } catch(e) { return { items: [] }; }
        };
        const getBlockResult = () => {
            const api = trussApi();
            try { return api && api.getResult ? api.getResult() : null; } catch(e) { console.error(e); return null; }
        };
        const hasBlockScheme = () => {
            const st = getBlockState();
            return !!(st.items && st.items.length);
        };
        function blockProjectName(){
            const el = document.getElementById('trussProjectName');
            return (el && el.value.trim()) || (getBlockState().projectName || '').trim() || 'Ферменная конструкция';
        }
        function blockClientName(){
            const el = document.getElementById('trussClientName');
            return (el && el.value.trim()) || (getBlockState().clientName || '').trim() || 'Клиент не выбран';
        }
        function specCode(spec){
            if (!spec) return '';
            if (spec.id && spec.id.startsWith('truss')) return `MDM ${String(getBlockState().trussSeries || 'T29Q').replace('Q','')} · ${spec.short || spec.label || spec.id}`;
            if (spec.u) return `MDM U${spec.u}`;
            if (spec.id === 'base') return 'База / блин';
            if (spec.id === 'pin') return 'CQ2';
            return spec.id || '';
        }
        function nodeWeight(spec, state){
            if (!spec) return 0;
            const series = state.trussSeries || 'T29Q';
            return spec.weights && Number.isFinite(Number(spec.weights[series])) ? Number(spec.weights[series]) : Number(state.nodeWeight || 0);
        }
        function blockBomRows(){
            const st = getBlockState();
            const res = getBlockResult();
            const specs = getSpecs();
            if (!res) return [];
            const rows = [];
            Object.keys(specs).forEach(id => {
                const spec = specs[id];
                if (!spec || spec.hidden || id === 'pin') return;
                const count = Number(res.counts && res.counts[id] || 0);
                const meters = Number(res.metersByType && res.metersByType[id] || 0);
                if (!count && !meters) return;
                let price = 0, weight = 0, unit = 'шт', qty = count;
                if (spec.kind === 'straight') { price = meters * Number(st.pricePerMeter || 0); weight = meters * Number(st.weightPerMeter || 0); unit = 'м'; qty = meters; }
                else if (spec.kind === 'node') { price = count * Number(st.nodePrice || 0); weight = count * nodeWeight(spec, st); }
                else if (spec.kind === 'base') { price = count * Number(st.basePrice || 0); weight = count * Number(st.baseWeight || 0); }
                rows.push({ id, code: specCode(spec), name: spec.label || spec.short || id, qty, unit, count, meters, weight, price, note: spec.kind === 'straight' ? 'прямые фермы' : spec.kind === 'node' ? 'угол / узел' : 'опора' });
            });
            if (Number(res.connectorKits || 0) > 0) {
                rows.push({ id:'c288', code:'C2-88', name:'Конусный коннектор C2-88', qty:Number(res.cq2Cones || 0), unit:'шт', count:Number(res.cq2Cones || 0), meters:0, weight:Number(res.cq2Cones || 0) * Number(st.pinWeight || 0), price:Number(res.cq2Cones || 0) * Number(st.pinPrice || 0), note:'4 шт на один торцевой стык' });
            }
            if (Number(res.baseHalfConnectors || 0) > 0) {
                rows.push({ id:'c383', code:'C3-83', name:'Полуконнектор конусный C3-83', qty:Number(res.baseHalfConnectors || 0), unit:'шт', count:Number(res.baseHalfConnectors || 0), meters:0, weight:Number(res.halfConnectorWeight || 0), price:Number(res.halfConnectorPriceTotal || 0), note:'4 шт на одну базу / блин' });
            }
            if (Number(res.totalC2Pins || 0) > 0) {
                const note = `${Number(res.connectorKits || 0)} CQ2 × 8 шт${Number(res.counts && res.counts.base || 0) ? ' + ' + Number(res.counts.base || 0) + ' баз × 4 шт' : ''}`;
                rows.push({ id:'c267', code:'C2-67', name:'Палец C2-67', qty:Number(res.totalC2Pins || 0), unit:'шт', count:Number(res.totalC2Pins || 0), meters:0, weight:Number(res.c2PinWeight || 0), price:0, note });
                rows.push({ id:'cotter', code:'C2-2-48', name:'Шплинт игольчатый', qty:Number(res.totalCotters || 0), unit:'шт', count:Number(res.totalCotters || 0), meters:0, weight:Number(res.c2CotterWeight || 0), price:0, note });
            }
            return rows;
        }
        function createBlockSchemeSvg(){
            const st = getBlockState();
            const specs = getSpecs();
            const pdfModule = window.FEGModules && window.FEGModules.PdfGenerator;
            if (pdfModule && typeof pdfModule.renderTrussBlockSchemeSvg === 'function') {
                return pdfModule.renderTrussBlockSchemeSvg({
                    state: st,
                    specs,
                    items: (st.items || []).slice(),
                    metric: metricPdf,
                    escapeSvg: escPdf
                });
            }
            const items = (st.items || []).slice();
            const cellMeters = Number(st.cellMeters || 0.5);
            if (!items.length) {
                return '<div style="font-size:12px;color:#69727d;padding:16px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Схема ферм не выбрана</div>';
            }
            function cellCount(length){ return Math.max(1, Math.round(Number(length || cellMeters) / cellMeters)); }
            function itemBounds(item){
                const spec = specs[item.type] || {};
                const x = Number(item.x || 0);
                const y = Number(item.y || 0);
                if (spec.kind === 'straight') {
                    const len = cellCount(spec.length || cellMeters);
                    return { minX:x, minY:y, maxX:x + (item.o === 'v' ? 1 : len), maxY:y + (item.o === 'v' ? len : 1) };
                }
                return { minX:x, minY:y, maxX:x + 1, maxY:y + 1 };
            }
            const bounds = items.map(itemBounds);
            const minX = Math.min(...bounds.map(b => b.minX));
            const minY = Math.min(...bounds.map(b => b.minY));
            const maxX = Math.max(...bounds.map(b => b.maxX));
            const maxY = Math.max(...bounds.map(b => b.maxY));
            const cropCols = Math.max(1, maxX - minX);
            const cropRows = Math.max(1, maxY - minY);
            const W = 680, H = 390, pad = 24, titleH = 32, bottomPad = 18;
            const drawW = W - pad * 2;
            const drawH = H - titleH - bottomPad;
            const scale = Math.max(8, Math.min(drawW / cropCols, drawH / cropRows));
            const ox = (W - cropCols * scale) / 2;
            const oy = titleH + (drawH - cropRows * scale) / 2;
            const realW = cropCols * cellMeters;
            const realH = cropRows * cellMeters;
            const line = [];
            line.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Схема блочной ферменной конструкции">`);
            line.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="#fbf7ef" stroke="#d8cab7"/>`);
            line.push(`<text x="24" y="22" font-family="Arial" font-size="13" font-weight="700" fill="#5b432d">Схема блочной конструкции · обрезка по конструкции · ${metricPdf(realW,1)}×${metricPdf(realH,1)} м</text>`);
            line.push(`<rect x="${ox}" y="${oy}" width="${cropCols*scale}" height="${cropRows*scale}" fill="#fffdf8" stroke="#e0d2bf" stroke-width="1"/>`);
            for (let x=0; x<=cropCols; x++) line.push(`<line x1="${ox+x*scale}" y1="${oy}" x2="${ox+x*scale}" y2="${oy+cropRows*scale}" stroke="rgba(70,53,34,.13)" stroke-width="1"/>`);
            for (let y=0; y<=cropRows; y++) line.push(`<line x1="${ox}" y1="${oy+y*scale}" x2="${ox+cropCols*scale}" y2="${oy+y*scale}" stroke="rgba(70,53,34,.13)" stroke-width="1"/>`);
            items.forEach(item => {
                const spec = specs[item.type] || {};
                const x = ox + (Number(item.x || 0) - minX) * scale;
                const y = oy + (Number(item.y || 0) - minY) * scale;
                const rot = Number(item.r ?? item.rotation ?? 0);
                if (spec.kind === 'straight') {
                    const lenCells = cellCount(spec.length || cellMeters);
                    const w = (item.o === 'v' ? 1 : lenCells) * scale;
                    const h = (item.o === 'v' ? lenCells : 1) * scale;
                    line.push(`<rect x="${x+1}" y="${y+1}" width="${Math.max(2,w-2)}" height="${Math.max(2,h-2)}" rx="${Math.max(3, scale*.18)}" fill="#87919d" stroke="#4f5965" stroke-width="1.2"/>`);
                    line.push(`<text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle" font-family="Arial" font-size="${Math.max(8, Math.min(12, scale*.34))}" font-weight="800" fill="#fff">${escPdf(spec.short || '')}</text>`);
                } else if (spec.kind === 'node') {
                    const cx = x + scale/2, cy = y + scale/2;
                    line.push(`<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${x+2}" y="${y+2}" width="${Math.max(4,scale-4)}" height="${Math.max(4,scale-4)}" rx="${Math.max(4, scale*.22)}" fill="#c9a36e" stroke="#7b5a30" stroke-width="1.2"/></g>`);
                    line.push(`<text x="${cx}" y="${cy+4}" text-anchor="middle" font-family="Arial" font-size="${Math.max(8, Math.min(11, scale*.32))}" font-weight="900" fill="#302112">${escPdf(spec.icon || spec.short || 'U')}</text>`);
                } else if (spec.kind === 'base') {
                    const cx = x + scale/2, cy = y + scale/2, r = Math.max(4, scale*.34);
                    line.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#66717d" stroke="#313943" stroke-width="1.2"/>`);
                    line.push(`<circle cx="${cx}" cy="${cy}" r="${Math.max(2,r*.35)}" fill="#f7f3eb"/>`);
                }
            });
            line.push(`</svg>`);
            return `<div style="width:100%; overflow:hidden;">${line.join('')}</div>`;
        }
        function ensureBlockPdfReady(){
            const api = trussApi();
            if (!api || !api.getResult) {
                alert('Блочный конструктор ещё не загружен. Откройте страницу ферм и повторите попытку.');
                return false;
            }
            if (!hasBlockScheme()) {
                alert('Нет схемы ферменной конструкции. Поставьте блоки на поле или выберите шаблон портала/рамы.');
                return false;
            }
            return true;
        }
        function setPdfChrome(title, footer){
            if (typeof pdfTitleEl !== 'undefined' && pdfTitleEl) pdfTitleEl.textContent = title;
            if (typeof pdfFooterEl !== 'undefined' && pdfFooterEl) pdfFooterEl.textContent = footer;
        }
        function updateBlockTrussTechPdfContent(){
            const pdfModule = window.FEGModules && window.FEGModules.PdfGenerator;
            if (!pdfModule || typeof pdfModule.renderTrussTechPdf !== 'function') {
                if (pdfDataDiv) pdfDataDiv.innerHTML = '<p>Модуль PDF ферм не загружен.</p>';
                return false;
            }
            return pdfModule.renderTrussTechPdf({
                pdfDataDiv,
                setChrome: setPdfChrome,
                ensureReady: ensureBlockPdfReady,
                getState: getBlockState,
                getResult: getBlockResult,
                getRows: blockBomRows,
                createScheme: createBlockSchemeSvg,
                getProjectName: blockProjectName,
                getClientName: blockClientName,
                escapeHtml: escPdf,
                metric: metricPdf,
                kg: kgPdf,
                version: PDF_VERSION,
                now: () => new Date()
            }) !== false;
        }
        function updateBlockTrussClientPdfContent(){
            const pdfModule = window.FEGModules && window.FEGModules.PdfGenerator;
            if (!pdfModule || typeof pdfModule.renderTrussClientPdf !== 'function') {
                if (pdfDataDiv) pdfDataDiv.innerHTML = '<p>Модуль клиентского PDF ферм не загружен.</p>';
                return false;
            }
            return pdfModule.renderTrussClientPdf({
                pdfDataDiv,
                setChrome: setPdfChrome,
                ensureReady: ensureBlockPdfReady,
                getState: getBlockState,
                getResult: getBlockResult,
                createScheme: createBlockSchemeSvg,
                getProjectName: blockProjectName,
                getClientName: blockClientName,
                escapeHtml: escPdf,
                metric: metricPdf,
                kg: kgPdf,
                money: moneyPdf,
                version: PDF_VERSION,
                now: () => new Date()
            }) !== false;
        }
        function stageSummaryForCombined(){
            try { if (!lastResult && selectedModules && selectedModules.size && typeof calc === 'function') calc(false); } catch(e) {}
            return lastResult || null;
        }
        function updateBlockCombinedClientPdfContent(){
            const pdfModule = window.FEGModules && window.FEGModules.PdfGenerator;
            if (!pdfModule || typeof pdfModule.renderCombinedClientPdf !== 'function') {
                if (pdfDataDiv) pdfDataDiv.innerHTML = '<p>Модуль общего КП не загружен.</p>';
                return false;
            }
            return pdfModule.renderCombinedClientPdf({
                pdfDataDiv,
                setChrome: setPdfChrome,
                alert: alert,
                getStage: stageSummaryForCombined,
                hasTrussScheme: hasBlockScheme,
                getTruss: getBlockResult,
                getStageProjectName: () => (projectNameInput && projectNameInput.value.trim()) || 'Сцена',
                getTrussProjectName: blockProjectName,
                getClientName: () => (clientSelect && clientSelect.value) || blockClientName(),
                createStageScheme: () => (typeof createClientSchemeGrid === 'function' ? createClientSchemeGrid() : createPdfMiniGrid()),
                createTrussScheme: createBlockSchemeSvg,
                getTransportSettings: () => transportSettings,
                normalizeTransportSettings: typeof normalizeTransportSettings === 'function' ? normalizeTransportSettings : undefined,
                calculateTransportCost: typeof calculateTransportCost === 'function' ? calculateTransportCost : undefined,
                getTransportLabel: typeof getTransportLabel === 'function' ? getTransportLabel : undefined,
                escapeHtml: escPdf,
                metric: metricPdf,
                kg: kgPdf,
                money: moneyPdf,
                version: PDF_VERSION,
                now: () => new Date()
            }) !== false;
        }
        function renderBlockPdfContent(kind){
            if (kind === 'trussTech') return updateBlockTrussTechPdfContent();
            if (kind === 'trussClient') return updateBlockTrussClientPdfContent();
            if (kind === 'combinedClient') return updateBlockCombinedClientPdfContent();
            return false;
        }
        function blockPdfNameBase(kind){
            return kind === 'combinedClient'
                ? `${(projectNameInput && projectNameInput.value.trim()) || 'stage'}_${blockProjectName()}`
                : blockProjectName();
        }
        function blockPdfFileName(kind, baseName){
            const safe = safeFileName(baseName);
            const stamp = Date.now();
            if (kind === 'trussTech') return `tech_block_truss_${safe}_${stamp}.pdf`;
            if (kind === 'trussClient') return `kp_block_truss_${safe}_${stamp}.pdf`;
            return `kp_stage_truss_${safe}_${stamp}.pdf`;
        }
        async function createBlockPdfBlob(kind){
            const pdfModule = window.FEGModules && window.FEGModules.PdfGenerator;
            if (!pdfModule || typeof pdfModule.createPdfBlob !== 'function') {
                alert('PDF-модуль не загружен. Обновите страницу и попробуйте снова.');
                return null;
            }
            return pdfModule.createPdfBlob({
                kind,
                renderContent: renderBlockPdfContent,
                pdfContainer: document.getElementById('pdfContent'),
                html2canvas: window.html2canvas,
                jspdf: window.jspdf,
                alert: alert,
                logError: console.error,
                getBaseName: blockPdfNameBase,
                getFileName: blockPdfFileName,
                onPrepared: ({ kind: preparedKind, name }) => {
                    preparedPdfKind = preparedKind;
                    preparedPdfName = name;
                }
            });
        }
        async function openBlockPdf(kind, title){
            if (typeof confirmPdfWarnings === 'function' && !confirmPdfWarnings(kind)) return;
            const pdfModule = window.FEGModules && window.FEGModules.PdfGenerator;
            if (!pdfModule || typeof pdfModule.openPreview !== 'function') {
                const blob = await createBlockPdfBlob(kind);
                if (!blob) return;
                preparedPdfBlob = blob;
                if (preparedPdfUrl) URL.revokeObjectURL(preparedPdfUrl);
                preparedPdfUrl = URL.createObjectURL(blob);
                if (pdfModalTitle) pdfModalTitle.textContent = title;
                pdfPreviewFrame.src = preparedPdfUrl;
                pdfModal.classList.add('open');
                pdfModal.setAttribute('aria-hidden', 'false');
                return;
            }
            const state = { blob: preparedPdfBlob, url: preparedPdfUrl, kind, name: preparedPdfName };
            const blob = await pdfModule.openPreview({
                kind,
                title,
                state,
                createPdfBlob: createBlockPdfBlob,
                elements: { modal: pdfModal, modalTitle: pdfModalTitle, previewFrame: pdfPreviewFrame },
                onState: (nextState) => {
                    preparedPdfBlob = nextState.blob || null;
                    preparedPdfUrl = nextState.url || null;
                    preparedPdfKind = nextState.kind || kind;
                }
            });
            return blob;
        }
        window.updateTrussTechPdfContent = updateBlockTrussTechPdfContent;
        window.updateTrussClientPdfContent = updateBlockTrussClientPdfContent;
        window.updateCombinedClientPdfContent = updateBlockCombinedClientPdfContent;
        window.openTrussTechPdfPreview = () => openBlockPdf('trussTech', 'Предпросмотр технического PDF ферм');
        window.openTrussClientPdfPreview = () => openBlockPdf('trussClient', 'Предпросмотр сметы по фермам');
        window.openCombinedClientPdfPreview = () => openBlockPdf('combinedClient', 'Предпросмотр общего КП: сцена + фермы');
        window.FEG359_BLOCK_ONLY_PDF_SUITE = true;
    })();


/* --- FEG Stage PRO v3.8.9: stage + block-truss snapshot bridge for Quote Wizard --- */
(function(){
  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (e) { return value; }
  }
  function hasStageSnapshot() {
    try { return !!(typeof lastResult !== 'undefined' && lastResult); }
    catch (e) { return false; }
  }
  function getStageSnapshot() {
    try {
      if (!lastResult && typeof selectedModules !== 'undefined' && selectedModules && selectedModules.size && typeof calc === 'function') calc(false);
      if (!lastResult) return null;
      return {
        mode: 'stage-grid',
        appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '',
        projectName: projectNameInput && projectNameInput.value ? projectNameInput.value.trim() : '',
        clientName: clientSelect && clientSelect.value ? clientSelect.value : '',
        lastResult: safeClone(lastResult),
        capturedAt: new Date().toISOString()
      };
    } catch (e) {
      console.warn('Quote legacy stage snapshot failed', e);
      return null;
    }
  }
  function getBlockTrussSnapshot() {
    try {
      if (window.FEG35BlockConstructor && typeof window.FEG35BlockConstructor.hasScheme === 'function' && window.FEG35BlockConstructor.hasScheme()) {
        return {
          mode: 'block',
          appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '',
          state: typeof window.FEG35BlockConstructor.getState === 'function' ? safeClone(window.FEG35BlockConstructor.getState()) : null,
          specs: typeof window.FEG35BlockConstructor.getSpecs === 'function' ? safeClone(window.FEG35BlockConstructor.getSpecs()) : null,
          result: typeof window.FEG35BlockConstructor.getResult === 'function' ? safeClone(window.FEG35BlockConstructor.getResult()) : null,
          capturedAt: new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('Quote block truss snapshot failed', e);
    }
    return null;
  }
  function hasBlockTrussSnapshot() {
    try {
      return !!(window.FEG35BlockConstructor && typeof window.FEG35BlockConstructor.hasScheme === 'function' && window.FEG35BlockConstructor.hasScheme());
    } catch (e) {}
    return false;
  }
  window.FEGQuoteLegacyBridge = {
    version: '3.8.9',
    hasStage: hasStageSnapshot,
    hasBlockTruss: hasBlockTrussSnapshot,
    getStageSnapshot,
    getBlockTrussSnapshot
  };
})();
