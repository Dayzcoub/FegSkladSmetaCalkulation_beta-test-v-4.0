(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const CALENDAR_INTEGRATION_VERSION = '1.0.0';

  function model() { return ROOT.QuoteModel || null; }
  function summaryBuilder() { return ROOT.QuoteSummaryBuilder || null; }
  function workspaceSettings() { return ROOT.WorkspaceSettings || null; }

  function toText(value) { return String(value == null ? '' : value).trim(); }
  function nowIso() { return new Date().toISOString(); }
  function pad(value) { return String(value).padStart(2, '0'); }

  function normalizeQuote(input) {
    return model() && model().createQuoteDraft ? model().createQuoteDraft(input || {}) : (input || {});
  }

  function getFinalSummary(quote) {
    const q = normalizeQuote(quote);
    if (summaryBuilder() && summaryBuilder().buildFinalSummary) return summaryBuilder().buildFinalSummary(q);
    return { quote: q, totals: q.totals || {}, sectionRows: [] };
  }

  function dateOnly(value) {
    const text = toText(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
  }

  function addDays(dateText, days) {
    const safe = dateOnly(dateText);
    if (!safe) return '';
    const [y, m, d] = safe.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + Number(days || 0)));
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  }

  function icsDate(dateText) {
    const safe = dateOnly(dateText);
    return safe ? safe.replace(/-/g, '') : '';
  }

  function icsTimestamp(date) {
    const d = date instanceof Date ? date : new Date();
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  }

  function escapeIcs(value) {
    return toText(value)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function slug(value) {
    return toText(value).toLowerCase().replace(/[^a-z0-9а-я]+/gi, '-').replace(/^-+|-+$/g, '') || 'feg-project';
  }

  function buildCalendarEvent(quote, options) {
    const q = normalizeQuote(quote);
    const opts = options || {};
    const summary = getFinalSummary(q);
    const sectionRows = Array.isArray(summary.sectionRows) ? summary.sectionRows : [];
    const sections = sectionRows.filter(row => row.configured).map(row => row.title).join(', ') || 'состав уточняется';
    const eventDate = dateOnly(opts.date || (q.venue && q.venue.date));
    const template = workspaceSettings() && workspaceSettings().applyCalendarTemplate ? workspaceSettings().applyCalendarTemplate(q, summary, opts.workspaceSettings) : null;
    const title = toText(opts.title) || toText(template && template.title) || `FEG - ${q.project && q.project.name || 'Новый проект'}`;
    const location = toText(opts.location) || toText(q.venue && (q.venue.address || q.venue.name));
    const descriptionLines = template && template.description ? [template.description] : [
      `Клиент: ${q.client && q.client.name || '—'}`,
      `Площадка: ${q.venue && q.venue.name || '—'}`,
      `Адрес: ${q.venue && q.venue.address || '—'}`,
      `Контакт: ${q.venue && q.venue.contactName || q.client && q.client.contactName || '—'} ${q.venue && q.venue.contactPhone || q.client && q.client.phone || ''}`.trim(),
      `Состав: ${sections}`,
      `Вес: ${Number(summary.totals && summary.totals.weightKg || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`,
      `Мощность: ${(Number(summary.totals && summary.totals.powerW || 0) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кВт`,
      `Пусковая мощность: ${(Number(summary.totals && summary.totals.startupPowerW || 0) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кВт`,
      `Статус: ${q.status || 'draft'}`,
      `Quote ID: ${q.id || '—'}`
    ];
    const uidSeed = `${q.id || slug(title)}-${eventDate || 'no-date'}`;
    return {
      type: 'calendar-event',
      version: CALENDAR_INTEGRATION_VERSION,
      uid: `${slug(uidSeed)}@feg-stage-pro.local`,
      title,
      summary: title,
      date: eventDate,
      dtStart: eventDate,
      dtEnd: eventDate ? addDays(eventDate, 1) : '',
      allDay: true,
      location,
      description: descriptionLines.join('\n'),
      calendarName: template && template.settings ? template.settings.defaultCalendarName : '',
      projectName: q.project && q.project.name || '',
      clientName: q.client && q.client.name || '',
      venueName: q.venue && q.venue.name || '',
      status: q.status || 'draft',
      generatedAt: nowIso(),
      fileName: `${slug(title)}${eventDate ? '-' + eventDate : ''}.ics`
    };
  }

  function buildIcs(eventOrQuote, options) {
    const event = eventOrQuote && eventOrQuote.type === 'calendar-event' ? eventOrQuote : buildCalendarEvent(eventOrQuote, options);
    const dtStart = icsDate(event.dtStart || event.date);
    const dtEnd = icsDate(event.dtEnd || addDays(event.date, 1));
    const stamp = icsTimestamp(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FEG Stage PRO//Calendar Draft//RU',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${escapeIcs(event.uid || `${slug(event.title)}@feg-stage-pro.local`)}`,
      `DTSTAMP:${stamp}`,
      dtStart ? `DTSTART;VALUE=DATE:${dtStart}` : '',
      dtEnd ? `DTEND;VALUE=DATE:${dtEnd}` : '',
      `SUMMARY:${escapeIcs(event.summary || event.title)}`,
      event.location ? `LOCATION:${escapeIcs(event.location)}` : '',
      `DESCRIPTION:${escapeIcs(event.description || '')}`,
      'STATUS:TENTATIVE',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean);
    return lines.join('\r\n') + '\r\n';
  }

  function buildCalendarDraft(quote, options) {
    const event = buildCalendarEvent(quote, options);
    return Object.assign({}, event, {
      type: 'calendar-draft',
      title: event.title,
      icsContent: buildIcs(event),
      notes: ['ICS-файл можно импортировать в Google Calendar, Apple Calendar, Outlook или добавить вручную после подключения OAuth.']
    });
  }

  function exportIcs(quote, options) {
    return buildIcs(buildCalendarEvent(quote, options));
  }

  ROOT.CalendarIntegration = {
    CALENDAR_INTEGRATION_VERSION,
    buildCalendarEvent,
    buildCalendarDraft,
    buildIcs,
    exportIcs,
    escapeIcs
  };
})();
