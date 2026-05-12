// FEG Stage PRO v3.6.32 — PdfGenerator bridge cleanup module
// Responsibility: shared PDF rendering, preview modal wiring, download/share/email helpers.
// Classic-compatible module: attaches API to window.FEGModules.PdfGenerator.
(function (global) {
    'use strict';

    const COMMERCIAL_KINDS = ['client', 'trussClient', 'combinedClient'];

    function safeFileName(value, fallback) {
        const base = String(value || fallback || 'stage').trim() || String(fallback || 'stage');
        return base.replace(/[\\/:*?"<>|]/g, '_');
    }

    function makePdfName(kind, baseName, now) {
        const stamp = typeof now === 'function' ? now() : Date.now();
        const safeName = safeFileName(baseName, 'stage');
        if (kind === 'client') return `kp_stage_${safeName}_${stamp}.pdf`;
        if (kind === 'trussTech') return `tech_truss_${safeName}_${stamp}.pdf`;
        if (kind === 'trussClient') return `kp_truss_${safeName}_${stamp}.pdf`;
        if (kind === 'combinedClient') return `kp_full_${safeName}_${stamp}.pdf`;
        return `tech_stage_${safeName}_${stamp}.pdf`;
    }

    function getPreviewTitle(kind, title) {
        if (title) return title;
        if (kind === 'client') return 'Предпросмотр клиентской сметы';
        if (kind === 'trussTech') return 'Предпросмотр технического листа ферм';
        if (kind === 'trussClient') return 'Предпросмотр КП по ферменной конструкции';
        if (kind === 'combinedClient') return 'Предпросмотр общего КП: сцена + фермы';
        return 'Предпросмотр технического листа (1 стр., альбом)';
    }

    function isCommercialKind(kind) {
        return COMMERCIAL_KINDS.includes(kind);
    }

    function prepareContainer(pdfContainer) {
        if (!pdfContainer) return null;
        const previous = {
            display: pdfContainer.style.display,
            position: pdfContainer.style.position,
            top: pdfContainer.style.top,
            left: pdfContainer.style.left,
            width: pdfContainer.style.width,
            background: pdfContainer.style.background
        };
        pdfContainer.style.display = 'block';
        pdfContainer.style.position = 'absolute';
        pdfContainer.style.top = '-9999px';
        pdfContainer.style.left = '0';
        pdfContainer.style.width = '1120px';
        pdfContainer.style.background = 'white';
        return previous;
    }

    function restoreContainer(pdfContainer, previous) {
        if (!pdfContainer) return;
        if (!previous) {
            pdfContainer.style.display = 'none';
            pdfContainer.style.position = '';
            return;
        }
        Object.keys(previous).forEach((key) => { pdfContainer.style[key] = previous[key]; });
    }

    async function createPdfBlob(options) {
        const ctx = options || {};
        const kind = ctx.kind || 'tech';
        const alertFn = ctx.alert || ((message) => global.alert && global.alert(message));
        const logError = ctx.logError || ((err) => global.console && global.console.error(err));

        try {
            if (ctx.validate && ctx.validate(kind) === false) return null;
            if (ctx.renderContent) ctx.renderContent(kind);
        } catch (err) {
            logError(err);
            if (ctx.validationErrorMessage) alertFn(ctx.validationErrorMessage);
            return null;
        }

        const pdfContainer = ctx.pdfContainer || (global.document && global.document.getElementById('pdfContent'));
        if (!pdfContainer) return null;

        const html2canvasRef = ctx.html2canvas || global.html2canvas;
        const jsPdfHost = ctx.jspdf || global.jspdf;
        const JsPdfCtor = ctx.jsPDF || (jsPdfHost && jsPdfHost.jsPDF);
        if (!html2canvasRef || !JsPdfCtor) {
            alertFn('PDF-библиотеки ещё не загружены. Обновите страницу и попробуйте снова.');
            return null;
        }

        const previousStyles = prepareContainer(pdfContainer);
        try {
            const canvas = await html2canvasRef(pdfContainer, {
                scale: ctx.scale || 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: false
            });
            const imgData = canvas.toDataURL('image/png');
            const doc = new JsPdfCtor('l', 'mm', 'a4');
            const pageWidth = 297;
            const pageHeight = 210;
            const margin = 6;
            const maxWidth = pageWidth - margin * 2;
            const maxHeight = pageHeight - margin * 2;
            let renderWidth = maxWidth;
            let renderHeight = (canvas.height * renderWidth) / canvas.width;
            if (renderHeight > maxHeight) {
                renderHeight = maxHeight;
                renderWidth = (canvas.width * renderHeight) / canvas.height;
            }
            const x = (pageWidth - renderWidth) / 2;
            const y = (pageHeight - renderHeight) / 2;
            doc.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

            const baseName = ctx.getBaseName ? ctx.getBaseName(kind) : 'stage';
            const name = ctx.getFileName ? ctx.getFileName(kind, baseName) : makePdfName(kind, baseName, ctx.now);
            if (ctx.onPrepared) ctx.onPrepared({ kind, name });
            return doc.output('blob');
        } catch (err) {
            logError(err);
            alertFn('Ошибка при создании PDF: ' + err);
            return null;
        } finally {
            restoreContainer(pdfContainer, previousStyles);
        }
    }

    async function openPreview(options) {
        const ctx = options || {};
        const kind = ctx.kind || 'tech';
        const blob = await (ctx.createPdfBlob ? ctx.createPdfBlob(kind) : createPdfBlob(ctx));
        if (!blob) return null;

        const state = ctx.state || {};
        if (state.url) URL.revokeObjectURL(state.url);
        const url = URL.createObjectURL(blob);
        state.blob = blob;
        state.url = url;
        state.kind = kind;
        if (ctx.onState) ctx.onState(state);

        const elements = ctx.elements || {};
        const modalTitle = elements.modalTitle;
        const previewFrame = elements.previewFrame;
        const modal = elements.modal;
        if (modalTitle) modalTitle.textContent = getPreviewTitle(kind, ctx.title);
        if (previewFrame) previewFrame.src = url;
        if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
        }
        return blob;
    }

    function closePreview(elements) {
        const modal = elements && elements.modal;
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    function downloadPreparedPdf(state) {
        const source = state || {};
        if (!source.blob || !source.url) return false;
        const link = global.document.createElement('a');
        link.href = source.url;
        link.download = source.name || makePdfName(source.kind || 'tech', 'stage');
        global.document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    }

    async function sharePreparedPdf(options) {
        const ctx = options || {};
        const state = ctx.state || {};
        if (!state.blob) return false;
        const file = new File([state.blob], state.name || makePdfName(state.kind || 'tech', 'stage'), { type: 'application/pdf' });
        const commercial = isCommercialKind(state.kind);
        const shareData = {
            title: commercial ? 'FEG Stage PRO — коммерческое предложение' : 'FEG Stage PRO — технический лист',
            text: commercial ? 'Коммерческое предложение FEG Stage PRO' : 'Технический лист сборки FEG Stage PRO',
            files: [file]
        };
        const showToast = ctx.showToast || function () {};
        try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share(shareData);
            } else if (navigator.share) {
                await navigator.share({ title: shareData.title, text: shareData.text });
                showToast('Файл можно скачать из предпросмотра и отправить вручную');
            } else {
                downloadPreparedPdf(state);
                showToast('PDF скачан. Его можно отправить через почту или мессенджер');
            }
            return true;
        } catch (err) {
            if (err && err.name !== 'AbortError') {
                if (global.console) global.console.error(err);
                showToast('Не удалось открыть отправку. Скачайте PDF вручную');
            }
            return false;
        }
    }

    function emailPreparedPdf(options) {
        const ctx = options || {};
        const state = ctx.state || {};
        const commercial = isCommercialKind(state.kind);
        const subject = encodeURIComponent(commercial ? 'Коммерческое предложение FEG Stage PRO' : 'Технический лист FEG Stage PRO');
        const body = encodeURIComponent(commercial
            ? 'Здравствуйте!\n\nВо вложении коммерческое предложение. Если файл не прикрепился автоматически, я отправлю PDF отдельным сообщением.\n\n'
            : 'Здравствуйте!\n\nВо вложении технический лист. Если файл не прикрепился автоматически, я отправлю PDF отдельным сообщением.\n\n');
        global.location.href = `mailto:?subject=${subject}&body=${body}`;
        if (ctx.showToast) ctx.showToast('Почта открыта. PDF можно приложить из загрузок');
        return true;
    }



    function renderStageClientPdf(options) {
        const ctx = options || {};
        const lastResult = ctx.lastResult;
        const elements = ctx.elements || {};
        const pdfTitleEl = elements.titleEl || null;
        const pdfFooterEl = elements.footerEl || null;
        const pdfDataDiv = elements.dataDiv || null;
        const escapeHtml = ctx.escapeHtml || ((value) => String(value || '').replace(/[&<>"']/g, function (m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m] || m;
        }));
        const money = ctx.money || ((value) => Number(value || 0).toLocaleString('ru-RU'));
        const metric = ctx.metric || ((value) => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }));
        const createClientSchemeGrid = ctx.createClientSchemeGrid || (() => '<div class="client-note">Схема недоступна</div>');
        const getClientName = ctx.getClientName || (() => 'Клиент не выбран');
        const getProjectName = ctx.getProjectName || (() => 'Без названия');

        if (pdfTitleEl) pdfTitleEl.textContent = 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ';
        if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — коммерческое предложение для клиента';
        if (!pdfDataDiv) return '';
        if (!lastResult) {
            pdfDataDiv.innerHTML = '<p>Нет расчёта. Выберите модули на сетке.</p>';
            return pdfDataDiv.innerHTML;
        }

        const clientName = getClientName() || 'Клиент не выбран';
        const project = String(getProjectName() || '').trim() || 'Без названия';
        const now = ctx.now ? ctx.now() : new Date();
        const dateText = now.toLocaleDateString('ru-RU');
        const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
        const {
            sheets, widthMeters, depthMeters, areaMeters, stageHeightM,
            modulesCost, installCost, transportCost = 0,
            transportLabel = 'По городу · фиксированная стоимость', total
        } = lastResult;

        const html = `
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
        pdfDataDiv.innerHTML = html;
        return html;
    }


    function createPdfFlow(options) {
        const ctx = options || {};
        const getState = ctx.getState || function () { return {}; };
        const setState = ctx.setState || function () {};
        const createContext = ctx.createContext || function (kind) { return { kind }; };

        async function create(kind) {
            const nextCtx = createContext(kind || 'tech') || {};
            const blob = await createPdfBlob(nextCtx);
            if (!blob) return null;
            const current = getState() || {};
            const prepared = {
                blob,
                url: current.url,
                name: nextCtx.preparedName || current.name,
                kind: nextCtx.preparedKind || nextCtx.kind || kind || current.kind || 'tech'
            };
            setState(prepared);
            return blob;
        }

        async function open(kind, title) {
            return openPreview({
                kind: kind || 'tech',
                title,
                createPdfBlob: create,
                state: getState() || {},
                onState: setState,
                elements: ctx.elements || {}
            });
        }

        function close() {
            return closePreview(ctx.elements || {});
        }

        function download() {
            return downloadPreparedPdf(getState() || {});
        }

        async function share() {
            return sharePreparedPdf({ state: getState() || {}, showToast: ctx.showToast });
        }

        function email() {
            return emailPreparedPdf({ state: getState() || {}, showToast: ctx.showToast });
        }

        return { getState, setState, create, open, close, download, share, email };
    }

    function renderStageTechPdf(options) {
        const ctx = options || {};
        const lastResult = ctx.lastResult;
        const elements = ctx.elements || {};
        const pdfTitleEl = elements.titleEl || null;
        const pdfFooterEl = elements.footerEl || null;
        const pdfDataDiv = elements.dataDiv || null;
        const escapeHtml = ctx.escapeHtml || ((value) => String(value || '').replace(/[&<>"']/g, function (m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m] || m;
        }));
        const money = ctx.money || ((value) => Number(value || 0).toLocaleString('ru-RU'));
        const metric = ctx.metric || ((value) => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }));
        const kg = ctx.kg || ((value) => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 }));
        const createScheme = ctx.createPdfMiniGrid || (() => '<div class="notes">Схема недоступна</div>');
        const getClientName = ctx.getClientName || (() => 'Клиент не выбран');
        const getProjectName = ctx.getProjectName || (() => 'Без названия');
        const moduleSize = ctx.moduleSize || '1.2×1.2 м';

        if (pdfTitleEl) pdfTitleEl.textContent = 'ТЕХНИЧЕСКИЙ ЛИСТ СБОРКИ СЦЕНЫ';
        if (pdfFooterEl) pdfFooterEl.textContent = 'FEG Stage PRO — технический лист для склада и площадки';
        if (!pdfDataDiv) return '';
        if (!lastResult) {
            pdfDataDiv.innerHTML = '<p>Нет расчёта. Выберите модули на сетке.</p>';
            return pdfDataDiv.innerHTML;
        }

        const clientName = getClientName() || 'Клиент не выбран';
        const project = String(getProjectName() || '').trim() || 'Без названия';
        const {
            w, d, sheets, columns, frames, columnTypeLabel, frameTypeLabel,
            studs, feet, components, widthMeters, depthMeters, areaMeters, weight,
            stageHeightM, transportCost = 0, transportLabel = 'По городу · фиксированная стоимость'
        } = lastResult;
        const now = ctx.now ? ctx.now() : new Date();
        const dateText = now.toLocaleDateString('ru-RU');
        const timeText = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const html = `
            <div class="tech-pdf">
                <div class="tech-top">
                    <div class="tech-box">
                        <div><strong>Проект:</strong> ${escapeHtml(project)}</div>
                        <div><strong>Клиент:</strong> ${escapeHtml(clientName)}</div>
                        <div><strong>Дата/время:</strong> ${dateText} ${timeText}</div>
                    </div>
                    <div class="tech-box">
                        <div><strong>Документ:</strong> технический лист для склада и площадки</div>
                        <div><strong>Размер модуля:</strong> ${moduleSize}</div>
                        <div><strong>Габариты сцены:</strong> ${metric(widthMeters)} × ${metric(depthMeters)} м</div>
                        <div><strong>Высота сцены:</strong> ${metric(stageHeightM * 100)} см</div>
                        <div><strong>Транспорт:</strong> ${escapeHtml(transportLabel)} · ${money(transportCost)} ₽</div>
                        <div><strong>Габаритная зона по сетке:</strong> ${w} × ${d} мод.</div>
                    </div>
                </div>

                <div class="section-title">1. Схема конфигурации сцены</div>
                <div class="scheme-row">
                    <div>
                        <div style="font-size:12px; margin-bottom:6px;"><strong>Схема обрезана по фактической конструкции.</strong> Передний ряд — нижняя часть схемы.</div>
                        ${createScheme()}
                    </div>
                    <div class="notes">
                        <table>
                            <tr><th>Параметр</th><th class="qty">Значение</th></tr>
                            <tr><td>Листы настила / модули</td><td class="qty">${sheets}</td></tr>
                            <tr><td>Столбы / опоры</td><td class="qty">${columns}</td></tr>
                            <tr><td>Тип столбов</td><td class="qty">${escapeHtml(columnTypeLabel || '')}</td></tr>
                            <tr><td>Перекладины / рамки</td><td class="qty">${frames}</td></tr>
                            <tr><td>Тип перекладин</td><td class="qty">${escapeHtml(frameTypeLabel || '')}</td></tr>
                            <tr><td>Шпильки регулировочные</td><td class="qty">${studs}</td></tr>
                            <tr><td>Пятки опорные</td><td class="qty">${feet}</td></tr>
                            <tr><td>Отдельные конструкции</td><td class="qty">${components}</td></tr>
                            <tr><td>Размер листа / модуля</td><td class="qty">${moduleSize}</td></tr>
                            <tr><td>Габариты сцены</td><td class="qty">${metric(widthMeters)}×${metric(depthMeters)} м</td></tr>
                            <tr><td>Высота сцены</td><td class="qty">${metric(stageHeightM * 100)} см</td></tr>
                            <tr><td>Габаритная зона</td><td class="qty">${w}×${d} мод.</td></tr>
                            <tr><td>Площадь настила</td><td class="qty">${metric(areaMeters)} м²</td></tr>
                            <tr><td>Вес комплекта</td><td class="qty">${kg(weight.total)} кг</td></tr>
                        </table>
                        <p style="margin-top:10px;"><strong>Важно:</strong> отдельные группы модулей считать отдельными конструкциями при погрузке и сборке.</p>
                    </div>
                </div>

                <div class="section-title">2. Комплектация для погрузки</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:38px; text-align:center;">№</th>
                            <th>Наименование</th>
                            <th style="width:110px;">Примечание</th>
                            <th class="qty">Кол-во</th>
                            <th style="width:60px; text-align:center;">Ед.</th>
                            <th style="width:70px; text-align:center;">кг/шт</th>
                            <th style="width:82px; text-align:center;">Вес, кг</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="text-align:center;">1</td>
                            <td>Лист настила / сценический модуль, ламинированное шершавое ДСП</td>
                            <td>${moduleSize}</td>
                            <td class="qty">${sheets}</td>
                            <td style="text-align:center;">шт</td>
                            <td style="text-align:center;">${kg(weight.sheetUnit)}</td>
                            <td style="text-align:center; font-weight:800;">${kg(weight.sheetTotal)}</td>
                        </tr>
                        <tr>
                            <td style="text-align:center;">2</td>
                            <td>${escapeHtml(columnTypeLabel || 'Столб / опора сцены')}</td>
                            <td>по уникальным узлам</td>
                            <td class="qty">${columns}</td>
                            <td style="text-align:center;">шт</td>
                            <td style="text-align:center;">${kg(weight.columnUnit)}</td>
                            <td style="text-align:center; font-weight:800;">${kg(weight.columnTotal)}</td>
                        </tr>
                        <tr>
                            <td style="text-align:center;">3</td>
                            <td>${escapeHtml(frameTypeLabel || 'Перекладина / рамка из квадратного профиля')}</td>
                            <td>по уникальным сторонам</td>
                            <td class="qty">${frames}</td>
                            <td style="text-align:center;">шт</td>
                            <td style="text-align:center;">${kg(weight.frameUnit)}</td>
                            <td style="text-align:center; font-weight:800;">${kg(weight.frameTotal)}</td>
                        </tr>
                        <tr>
                            <td style="text-align:center;">4</td>
                            <td>Шпилька регулировочная в столб</td>
                            <td>для нивелировки покрытия</td>
                            <td class="qty">${studs}</td>
                            <td style="text-align:center;">шт</td>
                            <td style="text-align:center;">${kg(weight.studUnit)}</td>
                            <td style="text-align:center; font-weight:800;">${kg(weight.studTotal)}</td>
                        </tr>
                        <tr>
                            <td style="text-align:center;">5</td>
                            <td>Пятка опорная под столб</td>
                            <td>защита покрытия</td>
                            <td class="qty">${feet}</td>
                            <td style="text-align:center;">шт</td>
                            <td style="text-align:center;">—</td>
                            <td style="text-align:center;">—</td>
                        </tr>
                        <tr>
                            <td colspan="5" style="text-align:right; font-weight:800;">ИТОГО ВЕС КОМПЛЕКТА</td>
                            <td colspan="2" style="text-align:center; font-weight:900;">${kg(weight.total)} кг</td>
                        </tr>
                    </tbody>
                </table>

                <div class="section-title">3. Инструкции для сборки</div>
                <div class="notes">
                    <p>1. Разложить модули по схеме. Нижняя часть схемы соответствует переднему краю сцены. Расчётная высота сцены: <strong>${metric(stageHeightM * 100)} см</strong>.</p>
                    <p>2. Столбы устанавливать в каждом уникальном углу модуля. Если модули соприкасаются углом, используется общий столб.</p>
                    <p>3. Перекладины / рамки ставить по уникальным сторонам модулей. Общая сторона соседних модулей считается один раз.</p>
                    <p>4. В каждый столб установить регулировочную шпильку и опорную пятку: <strong>${studs} шпилек</strong> и <strong>${feet} пяток</strong>.</p>
                    <p>5. Если в схеме есть отдельно стоящие группы модулей, собирать и маркировать их как отдельные конструкции: <strong>${components} шт</strong>.</p>
                </div>

                <div class="signature-row">
                    <div class="sign-line">Комплектацию выдал / склад</div>
                    <div class="sign-line">Принял / старший техник</div>
                </div>
            </div>
        `;
        pdfDataDiv.innerHTML = html;
        return html;
    }


    function renderTrussTechPdf(ctx) {
        ctx = ctx || {};
        const pdfDataDiv = ctx.pdfDataDiv;
        const setChrome = ctx.setChrome || function () {};
        const escapeHtml = ctx.escapeHtml || function (value) { return String(value == null ? '' : value); };
        const metric = ctx.metric || function (value, digits) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: digits == null ? 2 : digits });
        };
        const kg = ctx.kg || function (value) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' кг';
        };
        const ensureReady = ctx.ensureReady || function () { return false; };
        const getState = ctx.getState || function () { return {}; };
        const getResult = ctx.getResult || function () { return {}; };
        const getRows = ctx.getRows || function () { return []; };
        const createScheme = ctx.createScheme || function () { return ''; };
        const getProjectName = ctx.getProjectName || function () { return 'Без названия'; };
        const getClientName = ctx.getClientName || function () { return 'Клиент не выбран'; };
        const now = ctx.now ? ctx.now() : new Date();
        const version = ctx.version || '';

        setChrome(
            'ТЕХНИЧЕСКИЙ ЛИСТ БЛОЧНОЙ ФЕРМЕННОЙ КОНСТРУКЦИИ',
            'FEG Stage PRO — технический лист ферм для склада, погрузки и сборки'
        );

        if (!pdfDataDiv) return false;
        if (!ensureReady()) {
            pdfDataDiv.innerHTML = '<p>Нет схемы ферм.</p>';
            return false;
        }

        const st = getState() || {};
        const res = getResult() || {};
        const rows = getRows() || [];
        const load = res.loadCheck || {};
        const loadText = load.overall === 'bad'
            ? 'есть превышение / вне таблицы'
            : load.overall === 'risk'
                ? 'проходит, но запас меньше 10%'
                : load.overall === 'ok'
                    ? 'проходит по выбранной таблице'
                    : 'не задано';
        const spanInfo = res.loadCheck && res.loadCheck.spanInfo ? res.loadCheck.spanInfo : {};
        const counts = res.counts || {};
        const dateText = now.toLocaleDateString('ru-RU');
        const timeText = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const bomRowsHtml = rows.map((r, i) => {
            const qtyText = metric(r.qty, r.unit === 'м' ? 1 : 0);
            const metersText = r.meters ? metric(r.meters, 1) + ' м' : '—';
            const weightText = r.weight ? kg(r.weight) : '—';
            return `<tr><td style="text-align:center;">${i + 1}</td><td><strong>${escapeHtml(r.code)}</strong><br>${escapeHtml(r.name)}</td><td class="qty">${qtyText}</td><td style="text-align:center;">${escapeHtml(r.unit)}</td><td class="qty">${metersText}</td><td class="qty">${weightText}</td><td>${escapeHtml(r.note || '')}</td></tr>`;
        }).join('');

        const html = `
            <div class="tech-pdf">
                <div class="tech-top">
                    <div class="tech-box">
                        <div><strong>Проект:</strong> ${escapeHtml(getProjectName())}</div>
                        <div><strong>Клиент:</strong> ${escapeHtml(getClientName())}</div>
                        <div><strong>Дата/время:</strong> ${dateText} ${timeText}</div>
                        <div><strong>Документ:</strong> складской лист комплектации и сборки</div>
                    </div>
                    <div class="tech-box">
                        <div><strong>Тип фермы:</strong> ${escapeHtml(String(st.trussSeries || 'T29Q').replace('Q', ''))} вид Q</div>
                        <div><strong>Блоков на схеме:</strong> ${(st.items || []).length} шт</div>
                        <div><strong>Прямые фермы:</strong> ${metric(res.totalMeters)} м</div>
                        <div><strong>Габарит с U-блоками:</strong> ${metric(spanInfo.maxEffective || 0)} м</div>
                        <div><strong>Вес комплекта:</strong> ${kg(res.weight)}</div>
                        <div><strong>Проверка нагрузки:</strong> ${escapeHtml(loadText)}</div>
                    </div>
                </div>
                <div class="section-title">1. Схема для сборки</div>
                <div class="scheme-row">
                    <div>${createScheme()}</div>
                    <div class="notes">
                        <table>
                            <tr><th>Параметр</th><th class="qty">Значение</th></tr>
                            <tr><td>Прямые фермы</td><td class="qty">${metric(res.totalMeters)} м</td></tr>
                            <tr><td>Узлы МДМТ</td><td class="qty">${res.nodePieces || 0} шт</td></tr>
                            <tr><td>Базы / блины</td><td class="qty">${counts.base || 0} шт</td></tr>
                            <tr><td>C3-83 на базы</td><td class="qty">${res.baseHalfConnectors || 0} шт</td></tr>
                            <tr><td>CQ2 соединения</td><td class="qty">${res.connectorKits || 0} компл.</td></tr>
                            <tr><td>C2-88</td><td class="qty">${res.cq2Cones || 0} шт</td></tr>
                            <tr><td>C2-67 всего</td><td class="qty">${res.totalC2Pins || res.cq2Pins || 0} шт</td></tr>
                            <tr><td>Шплинты всего</td><td class="qty">${res.totalCotters || res.cq2Cotters || 0} шт</td></tr>
                            <tr><td>Вес комплекта</td><td class="qty">${kg(res.weight)}</td></tr>
                        </table>
                    </div>
                </div>
                <div class="section-title">2. Комплектация для склада / погрузки</div>
                <table>
                    <thead><tr><th style="width:34px;text-align:center;">№</th><th>Код / позиция</th><th class="qty">Кол-во</th><th style="text-align:center;">Ед.</th><th class="qty">Метраж</th><th class="qty">Вес</th><th>Примечание</th></tr></thead>
                    <tbody>${bomRowsHtml}</tbody>
                </table>
                <div class="section-title">3. Инструкции</div>
                <div class="notes">
                    <p><strong>Для склада:</strong> собрать позиции по таблице, проверить количество C2-88 по комплектам CQ2, а также C3-83, C2-67 и шплинтов для крепления баз / блинов. Отдельно промаркировать U-блоки.</p>
                    <p><strong>Для площадки:</strong> схема показывает ориентацию блоков. Допустимые нагрузки, подвес, балласт, ветровые нагрузки и безопасность проверяются по паспортам производителя и ответственным инженером.</p>
                </div>
                <div class="signature-row"><div class="sign-line">Склад / комплектовщик</div><div class="sign-line">Ответственный за сборку</div><div class="sign-line">Проверил</div></div>
                ${version ? `<div class="client-footer-line">FEG Stage PRO · технический PDF ферм · ${escapeHtml(version)}</div>` : ''}
            </div>`;
        pdfDataDiv.innerHTML = html;
        return html;
    }


    function renderTrussClientPdf(ctx) {
        ctx = ctx || {};
        const pdfDataDiv = ctx.pdfDataDiv;
        const setChrome = ctx.setChrome || function () {};
        const escapeHtml = ctx.escapeHtml || function (value) { return String(value == null ? '' : value); };
        const metric = ctx.metric || function (value, digits) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: digits == null ? 2 : digits });
        };
        const kg = ctx.kg || function (value) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' кг';
        };
        const money = ctx.money || function (value) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU') + ' ₽';
        };
        const ensureReady = ctx.ensureReady || function () { return false; };
        const getState = ctx.getState || function () { return {}; };
        const getResult = ctx.getResult || function () { return {}; };
        const createScheme = ctx.createScheme || function () { return ''; };
        const getProjectName = ctx.getProjectName || function () { return 'Без названия'; };
        const getClientName = ctx.getClientName || function () { return 'Клиент не выбран'; };
        const now = ctx.now ? ctx.now() : new Date();
        const version = ctx.version || '';

        setChrome(
            'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ: ФЕРМЕННАЯ КОНСТРУКЦИЯ',
            'FEG Stage PRO — клиентская смета по блочной ферменной конструкции'
        );

        if (!pdfDataDiv) return false;
        if (!ensureReady()) {
            pdfDataDiv.innerHTML = '<p>Нет схемы ферм.</p>';
            return false;
        }

        const st = getState() || {};
        const res = getResult() || {};
        const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
        const trussType = String(st.trussSeries || 'T29Q').replace('Q', '');

        const html = `<div class="client-pdf"><div class="client-hero"><div><div class="brand-title"><span>FEG</span> Stage PRO</div><div class="brand-subtitle">Аренда и монтаж ферменной конструкции. Смета подготовлена по блочной схеме и расчётной комплектации.</div></div><div class="client-meta"><div><strong>Проект:</strong> ${escapeHtml(getProjectName())}</div><div><strong>Клиент:</strong> ${escapeHtml(getClientName())}</div><div><strong>Дата:</strong> ${now.toLocaleDateString('ru-RU')}</div><div><strong>Действительно до:</strong> ${validUntil}</div></div></div><div class="client-main-grid"><div class="client-card"><div class="client-section-title">Схема конструкции</div><div class="client-scheme-wrap">${createScheme()}</div><div class="client-note">Схема является компоновочной. Нагрузки и безопасность конструкции уточняются отдельно по паспортам и условиям площадки.</div></div><div><div class="client-card" style="margin-bottom:14px;"><div class="client-section-title">Основные параметры</div><div class="client-params"><div class="client-param"><span>Тип фермы</span><strong>${escapeHtml(trussType)}</strong></div><div class="client-param"><span>Метраж прямых ферм</span><strong>${metric(res.totalMeters)} м</strong></div><div class="client-param"><span>Узлы / U-блоки</span><strong>${res.nodePieces || 0} шт</strong></div><div class="client-param"><span>Вес комплекта</span><strong>${kg(res.weight)}</strong></div></div></div><div class="client-card"><div class="client-section-title">Стоимость</div><table class="client-price-table"><thead><tr><th>Позиция</th><th>Стоимость</th></tr></thead><tbody><tr><td>Прокат ферменной конструкции</td><td>${money(res.rental)}</td></tr><tr><td>Монтаж / демонтаж</td><td>${money(res.install)}</td></tr><tr><td>Транспорт</td><td>${money(res.transport)}</td></tr><tr class="client-total-row"><td>Итого к оплате</td><td>${money(res.total)}</td></tr></tbody></table><div class="client-note">Состав комплекта: прямые фермы, U-блоки, базы/блины, полуконнекторы C3-83 и CQ2-соединения согласно техническому листу.</div></div></div></div><div class="client-footer-line">FEG Stage PRO · клиентская смета по ферменной конструкции${version ? ' · ' + escapeHtml(version) : ''}</div></div>`;
        pdfDataDiv.innerHTML = html;
        return html;
    }


    function renderCombinedClientPdf(ctx) {
        ctx = ctx || {};
        const pdfDataDiv = ctx.pdfDataDiv;
        const setChrome = ctx.setChrome || function () {};
        const alertFn = ctx.alert || function () {};
        const escapeHtml = ctx.escapeHtml || function (value) { return String(value == null ? '' : value); };
        const metric = ctx.metric || function (value, digits) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: digits == null ? 2 : digits });
        };
        const kg = ctx.kg || function (value) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' кг';
        };
        const money = ctx.money || function (value) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU') + ' ₽';
        };
        const getStage = ctx.getStage || function () { return null; };
        const hasTrussScheme = ctx.hasTrussScheme || function () { return false; };
        const getTruss = ctx.getTruss || function () { return null; };
        const getStageProjectName = ctx.getStageProjectName || function () { return 'Сцена'; };
        const getTrussProjectName = ctx.getTrussProjectName || function () { return 'Фермы'; };
        const getClientName = ctx.getClientName || function () { return 'Клиент не выбран'; };
        const createStageScheme = ctx.createStageScheme || function () { return ''; };
        const createTrussScheme = ctx.createTrussScheme || function () { return ''; };
        const normalizeTransportSettings = ctx.normalizeTransportSettings || function (value) { return value || {}; };
        const calculateTransportCost = ctx.calculateTransportCost || function () { return 0; };
        const getTransportLabel = ctx.getTransportLabel || function () { return 'Общий транспорт'; };
        const getTransportSettings = ctx.getTransportSettings || function () { return {}; };
        const now = ctx.now ? ctx.now() : new Date();
        const version = ctx.version || '';

        setChrome(
            'ОБЩЕЕ КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ',
            'FEG Stage PRO — общее КП: сцена + блочная ферменная конструкция'
        );

        if (!pdfDataDiv) return false;

        const stage = getStage();
        const truss = hasTrussScheme() ? getTruss() : null;
        if (!stage && !truss) {
            alertFn('Нет активного расчёта сцены или ферменной конструкции.');
            pdfDataDiv.innerHTML = '<p>Нет данных для общего КП.</p>';
            return false;
        }

        const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU');
        const stageProject = getStageProjectName() || 'Сцена';
        const trussProject = getTrussProjectName() || 'Фермы';
        const client = getClientName() || 'Клиент не выбран';
        const transportSettings = normalizeTransportSettings(getTransportSettings());
        const combinedTransport = Number(calculateTransportCost(transportSettings) || 0);
        const combinedTransportLabel = getTransportLabel(transportSettings) || 'Общий транспорт';

        const stageTransportInOwnTotal = stage ? Number(stage.transportCost || 0) : 0;
        const trussTransportInOwnTotal = truss ? Number(truss.transport || 0) : 0;
        const stageCostWithoutTransport = stage ? Math.max(0, Number(stage.total || 0) - stageTransportInOwnTotal) : 0;
        const trussCostWithoutTransport = truss ? Math.max(0, Number(truss.total || 0) - trussTransportInOwnTotal) : 0;
        const total = stageCostWithoutTransport + trussCostWithoutTransport + combinedTransport;

        const stageDesc = stage
            ? `${metric(stage.widthMeters)} × ${metric(stage.depthMeters)} м · ${metric(stage.areaMeters)} м² · ${stage.sheets} мод.`
            : 'Не включена';
        const trussDesc = truss
            ? `${metric(truss.totalMeters)} м ферм · ${truss.nodePieces || 0} узлов · ${kg(truss.weight)}`
            : 'Не включены';
        const stageScheme = stage ? createStageScheme(stage) : '';
        const trussScheme = truss ? createTrussScheme(truss) : '';

        const html = `
            <div class="client-pdf">
                <div class="client-hero">
                    <div><div class="brand-title"><span>FEG</span> Stage PRO</div><div class="brand-subtitle">Общее коммерческое предложение: сцена и ферменная конструкция в одном документе.</div></div>
                    <div class="client-meta"><div><strong>Проект сцены:</strong> ${escapeHtml(stageProject)}</div><div><strong>Проект ферм:</strong> ${escapeHtml(trussProject)}</div><div><strong>Клиент:</strong> ${escapeHtml(client)}</div><div><strong>Дата:</strong> ${now.toLocaleDateString('ru-RU')}</div><div><strong>Действительно до:</strong> ${validUntil}</div></div>
                </div>
                <div class="client-main-grid">
                    <div class="client-card">
                        <div class="client-section-title">Схемы проекта</div>
                        ${stage ? `<div style="font-weight:800;margin-bottom:6px;">Сцена: ${escapeHtml(stageProject)}</div><div class="client-scheme-wrap" style="margin-bottom:10px;">${stageScheme}</div>` : '<div class="client-note" style="margin-bottom:10px;">Сценическая конструкция не включена.</div>'}
                        ${truss ? `<div style="font-weight:800;margin-bottom:6px;">Фермы: ${escapeHtml(trussProject)}</div><div class="client-scheme-wrap">${trussScheme}</div>` : '<div class="client-note">Ферменная конструкция не включена.</div>'}
                        <div class="client-note">Схемы обрезаны по фактической конструкции без пустых полей. Техническая комплектация для склада формируется отдельными техническими PDF.</div>
                    </div>
                    <div>
                        <div class="client-card" style="margin-bottom:14px;"><div class="client-section-title">Состав проекта</div><div class="client-params"><div class="client-param"><span>Сцена</span><strong>${escapeHtml(stageDesc)}</strong></div><div class="client-param"><span>Фермы</span><strong>${escapeHtml(trussDesc)}</strong></div><div class="client-param"><span>Общий транспорт</span><strong>${escapeHtml(combinedTransportLabel)}</strong></div></div></div>
                        <div class="client-card"><div class="client-section-title">Сводная стоимость</div><table class="client-price-table"><thead><tr><th>Позиция</th><th>Стоимость</th></tr></thead><tbody>${stage ? `<tr><td>Сцена: прокат и монтаж</td><td>${money(stageCostWithoutTransport)}</td></tr>` : ''}${truss ? `<tr><td>Фермы: прокат и монтаж</td><td>${money(trussCostWithoutTransport)}</td></tr>` : ''}<tr><td>Транспорт общий <span style="font-size:10px;color:#69727d;">(${escapeHtml(combinedTransportLabel)})</span></td><td>${money(combinedTransport)}</td></tr><tr class="client-total-row"><td>Итого сцена + фермы</td><td>${money(total)}</td></tr></tbody></table><div class="client-note">Транспорт в общем КП считается одной общей строкой и не дублируется отдельно в сцене и фермах.</div></div>
                    </div>
                </div>
                <div class="client-footer-line">FEG Stage PRO · объединённое КП${version ? ' · ' + escapeHtml(version) : ''}</div>
            </div>`;
        pdfDataDiv.innerHTML = html;
        return html;
    }



    function htmlEscape(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m] || m;
        });
    }

    function renderStageSchemeGrid(options) {
        const ctx = options || {};
        const modules = Array.isArray(ctx.modules) ? ctx.modules : [];
        const emptyText = ctx.emptyText || 'Схема не выбрана';
        const cellClass = ctx.cellClass || 'pdf-mini-cell';
        const activeClass = ctx.activeClass || 'active';
        const wrapClass = ctx.wrapClass || 'pdf-mini-grid';
        const maxCellSize = Number(ctx.maxCellSize || 18);
        const minCellSize = Number(ctx.minCellSize || 6);
        const widthBudget = Number(ctx.widthBudget || 245);
        const keyFn = ctx.keyFn || function (x, y) { return `${x},${y}`; };
        if (!modules.length) return `<div style="font-size:12px;color:#69727d;">${htmlEscape(emptyText)}</div>`;
        const xs = modules.map(function (m) { return Number(m.x || 0); });
        const ys = modules.map(function (m) { return Number(m.y || 0); });
        const minX = Math.min.apply(null, xs);
        const maxX = Math.max.apply(null, xs);
        const minY = Math.min.apply(null, ys);
        const maxY = Math.max.apply(null, ys);
        const cols = Math.max(1, maxX - minX + 1);
        const rows = Math.max(1, maxY - minY + 1);
        const keys = new Set(modules.map(function (m) { return keyFn(Number(m.x || 0), Number(m.y || 0)); }));
        const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(widthBudget / Math.max(cols, rows, 1))));
        // Keep both variable families because technical PDF uses
        // --pdf-grid-cols/--pdf-cell-size, while client/combined offers use
        // --client-grid-cols/--client-cell-size. Without the client variables,
        // CSS falls back to one column and all stage modules appear as a vertical row.
        let html = `<div class="${wrapClass}" style="--pdf-grid-cols:${cols}; --pdf-cell-size:${cellSize}px; --client-grid-cols:${cols}; --client-cell-size:${cellSize}px;">`;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                html += `<div class="${cellClass} ${keys.has(keyFn(x, y)) ? activeClass : ''}"></div>`;
            }
        }
        html += '</div>';
        return html;
    }

    function renderClientStageSchemeGrid(options) {
        return renderStageSchemeGrid(Object.assign({
            wrapClass: 'client-scheme-grid',
            cellClass: 'client-scheme-cell',
            activeClass: 'active',
            minCellSize: 9,
            maxCellSize: 30,
            widthBudget: 300,
            emptyText: 'Схема не выбрана'
        }, options || {}));
    }

    function renderTrussBlockSchemeSvg(options) {
        const ctx = options || {};
        const st = ctx.state || {};
        const specs = ctx.specs || {};
        const items = Array.isArray(ctx.items) ? ctx.items.slice() : (Array.isArray(st.items) ? st.items.slice() : []);
        const metric = ctx.metric || function (value, digits) {
            const n = Number(value || 0);
            return n.toLocaleString('ru-RU', { maximumFractionDigits: Number.isFinite(digits) ? digits : 1 });
        };
        const escapeSvg = ctx.escapeSvg || htmlEscape;
        const cellMeters = Number(st.cellMeters || ctx.cellMeters || 0.5) || 0.5;
        if (!items.length) {
            return '<div style="font-size:12px;color:#69727d;padding:16px;border:1px dashed #cbd5e1;border-radius:14px;text-align:center;">Схема ферм не выбрана</div>';
        }
        const W = Number(ctx.width || 680);
        const H = Number(ctx.height || 390);
        const pad = Number(ctx.pad || 24);
        const titleH = Number(ctx.titleH || 32);
        const bottomPad = Number(ctx.bottomPad || 18);
        const bg = ctx.background || '#fbf7ef';
        const stroke = ctx.stroke || '#d8cab7';

        function cellCount(length) {
            return Math.max(1, Math.round(Number(length || cellMeters) / cellMeters));
        }
        function itemBounds(item) {
            const spec = specs[item.type] || {};
            const x = Number(item.x || 0);
            const y = Number(item.y || 0);
            if (spec.kind === 'straight') {
                const len = cellCount(spec.length || cellMeters);
                return { minX: x, minY: y, maxX: x + (item.o === 'v' ? 1 : len), maxY: y + (item.o === 'v' ? len : 1) };
            }
            return { minX: x, minY: y, maxX: x + 1, maxY: y + 1 };
        }
        const bounds = items.map(itemBounds);
        const minX = Math.min.apply(null, bounds.map(function (b) { return b.minX; }));
        const minY = Math.min.apply(null, bounds.map(function (b) { return b.minY; }));
        const maxX = Math.max.apply(null, bounds.map(function (b) { return b.maxX; }));
        const maxY = Math.max.apply(null, bounds.map(function (b) { return b.maxY; }));
        const cropCols = Math.max(1, maxX - minX);
        const cropRows = Math.max(1, maxY - minY);
        const drawW = W - pad * 2;
        const drawH = H - titleH - bottomPad;
        const scale = Math.max(8, Math.min(drawW / cropCols, drawH / cropRows));
        const ox = (W - cropCols * scale) / 2;
        const oy = titleH + (drawH - cropRows * scale) / 2;
        const realW = cropCols * cellMeters;
        const realH = cropRows * cellMeters;
        const line = [];
        line.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Схема блочной ферменной конструкции">`);
        line.push(`<rect x="0" y="0" width="${W}" height="${H}" rx="18" fill="${bg}" stroke="${stroke}"/>`);
        line.push(`<text x="24" y="22" font-family="Arial" font-size="13" font-weight="700" fill="#5b432d">Схема блочной конструкции · обрезка по конструкции · ${metric(realW, 1)}×${metric(realH, 1)} м</text>`);
        line.push(`<rect x="${ox}" y="${oy}" width="${cropCols * scale}" height="${cropRows * scale}" fill="#fffdf8" stroke="#e0d2bf" stroke-width="1"/>`);
        for (let x = 0; x <= cropCols; x++) line.push(`<line x1="${ox + x * scale}" y1="${oy}" x2="${ox + x * scale}" y2="${oy + cropRows * scale}" stroke="rgba(70,53,34,.13)" stroke-width="1"/>`);
        for (let y = 0; y <= cropRows; y++) line.push(`<line x1="${ox}" y1="${oy + y * scale}" x2="${ox + cropCols * scale}" y2="${oy + y * scale}" stroke="rgba(70,53,34,.13)" stroke-width="1"/>`);
        items.forEach(function (item) {
            const spec = specs[item.type] || {};
            const x = ox + (Number(item.x || 0) - minX) * scale;
            const y = oy + (Number(item.y || 0) - minY) * scale;
            const rot = Number(item.r ?? item.rotation ?? 0);
            if (spec.kind === 'straight') {
                const lenCells = cellCount(spec.length || cellMeters);
                const w = (item.o === 'v' ? 1 : lenCells) * scale;
                const h = (item.o === 'v' ? lenCells : 1) * scale;
                line.push(`<rect x="${x + 1}" y="${y + 1}" width="${Math.max(2, w - 2)}" height="${Math.max(2, h - 2)}" rx="${Math.max(3, scale * .18)}" fill="#87919d" stroke="#4f5965" stroke-width="1.2"/>`);
                line.push(`<text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-family="Arial" font-size="${Math.max(8, Math.min(12, scale * .34))}" font-weight="800" fill="#fff">${escapeSvg(spec.short || '')}</text>`);
            } else if (spec.kind === 'node') {
                const cx = x + scale / 2, cy = y + scale / 2;
                line.push(`<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${x + 2}" y="${y + 2}" width="${Math.max(4, scale - 4)}" height="${Math.max(4, scale - 4)}" rx="${Math.max(4, scale * .22)}" fill="#c9a36e" stroke="#7b5a30" stroke-width="1.2"/></g>`);
                line.push(`<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="Arial" font-size="${Math.max(8, Math.min(11, scale * .32))}" font-weight="900" fill="#302112">${escapeSvg(spec.icon || spec.short || 'U')}</text>`);
            } else if (spec.kind === 'base') {
                const cx = x + scale / 2, cy = y + scale / 2, r = Math.max(4, scale * .34);
                line.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#66717d" stroke="#313943" stroke-width="1.2"/>`);
                line.push(`<circle cx="${cx}" cy="${cy}" r="${Math.max(2, r * .35)}" fill="#f7f3eb"/>`);
            }
        });
        line.push('</svg>');
        return `<div style="width:100%; overflow:hidden;">${line.join('')}</div>`;
    }

    const api = {
        COMMERCIAL_KINDS,
        safeFileName,
        makePdfName,
        getPreviewTitle,
        isCommercialKind,
        createPdfBlob,
        openPreview,
        closePreview,
        downloadPreparedPdf,
        sharePreparedPdf,
        emailPreparedPdf,
        createPdfFlow,
        renderStageTechPdf,
        renderStageClientPdf,
        renderTrussTechPdf,
        renderTrussClientPdf,
        renderCombinedClientPdf,
        renderStageSchemeGrid,
        renderClientStageSchemeGrid,
        renderTrussBlockSchemeSvg
    };

    global.FEGModules = global.FEGModules || {};
    global.FEGModules.PdfGenerator = api;
})(typeof window !== 'undefined' ? window : globalThis);
