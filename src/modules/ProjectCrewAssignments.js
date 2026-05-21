(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const VERSION = '1.0.0-project-crew-keys';

  const PROJECT_CREW_ROLES = Object.freeze([
    { id: 'project_tech_director', name: 'ТехДир проекта', group: 'Управление' },
    { id: 'production_manager', name: 'Продакшн-менеджер', group: 'Управление' },
    { id: 'site_tech_director', name: 'ТехДир площадки', group: 'Управление' },
    { id: 'stage_manager', name: 'Stage manager / координатор сцены', group: 'Управление' },
    { id: 'sound_engineer', name: 'Звукорежиссёр', group: 'Звук' },
    { id: 'sound_technician', name: 'Звуковой техник / A2', group: 'Звук' },
    { id: 'monitor_engineer', name: 'Мониторный инженер', group: 'Звук' },
    { id: 'rf_engineer', name: 'RF / радиосистемы', group: 'Звук' },
    { id: 'backline_technician', name: 'Бэклайн-техник', group: 'Звук' },
    { id: 'light_operator', name: 'Светорежиссёр', group: 'Свет' },
    { id: 'light_technician', name: 'Световой техник', group: 'Свет' },
    { id: 'dimmer_electrician', name: 'Диммерщик / электрик света', group: 'Свет' },
    { id: 'led_engineer', name: 'Инженер LED-экранов', group: 'Видео / LED' },
    { id: 'video_engineer', name: 'Видеоинженер / VJ', group: 'Видео / LED' },
    { id: 'media_server_operator', name: 'Оператор медиасервера', group: 'Видео / LED' },
    { id: 'camera_operator', name: 'Оператор камеры', group: 'Видео / LED' },
    { id: 'stage_technician', name: 'Техник сцены', group: 'Сцена / фермы' },
    { id: 'truss_rigger', name: 'Риггер / фермы', group: 'Сцена / фермы' },
    { id: 'hoist_operator', name: 'Оператор лебёдок / моторист', group: 'Сцена / фермы' },
    { id: 'stagehand', name: 'Стейджхенд / монтажник', group: 'Монтаж' },
    { id: 'loader', name: 'Грузчик', group: 'Монтаж' },
    { id: 'driver', name: 'Водитель', group: 'Логистика' },
    { id: 'logistics_coordinator', name: 'Координатор логистики', group: 'Логистика' },
    { id: 'electrician', name: 'Электрик', group: 'Электрика' },
    { id: 'generator_operator', name: 'Генераторщик', group: 'Электрика' },
    { id: 'venue_liaison', name: 'Связь с площадкой / администратор', group: 'Площадка' },
    { id: 'decorator', name: 'Декоратор / оформление', group: 'Площадка' },
    { id: 'security', name: 'Охрана / пропускной режим', group: 'Площадка' },
    { id: 'photo_doc', name: 'Фотофиксация / документация', group: 'Документы' },
    { id: 'guest_specialist', name: 'Приглашённый спец', group: 'Внешний специалист' }
  ]);

  const KEY_TYPES = Object.freeze([
    { id: 'temporary', name: 'Временный ключ' },
    { id: 'permanent', name: 'Постоянный ключ' }
  ]);

  function normalizeText(value) { return String(value == null ? '' : value).trim(); }
  function normalizeEmail(value) { return normalizeText(value).toLowerCase(); }
  function normalizeNumber(value) { const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : 0; }
  function money(value) { return Math.round(normalizeNumber(value)); }
  function makeId(prefix) { return `${prefix || 'crew'}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }

  function getCrewRoles() { return PROJECT_CREW_ROLES.slice(); }
  function getKeyTypes() { return KEY_TYPES.slice(); }
  function getCrewRoleLabel(roleId) {
    const row = PROJECT_CREW_ROLES.find(role => role.id === roleId);
    return row ? row.name : normalizeText(roleId || 'Роль не указана');
  }

  function normalizePayment(input) {
    const src = input || {};
    const mode = src.payMode === 'hourly' || src.mode === 'hourly' ? 'hourly' : 'fixed';
    const fixedCost = money(src.fixedCost == null ? src.totalCost : src.fixedCost);
    const hourlyRate = money(src.hourlyRate || src.ratePerHour);
    const hours = normalizeNumber(src.hours);
    const totalCost = mode === 'hourly' ? money(hourlyRate * hours) : fixedCost;
    return { payMode: mode, fixedCost, hourlyRate, hours, totalCost };
  }

  function normalizeAssignment(input) {
    const src = input || {};
    const payment = normalizePayment(src);
    const isGuest = src.isGuest === true || src.isGuest === 'true' || src.guest === true || src.projectRole === 'guest_specialist';
    const keyType = src.keyType === 'permanent' || src.inviteKeyType === 'permanent' ? 'permanent' : 'temporary';
    return {
      id: normalizeText(src.id) || makeId('crew'),
      userId: normalizeText(src.userId || src.profileId || src.user_id),
      userEmail: normalizeEmail(src.userEmail || src.email),
      displayName: normalizeText(src.displayName || src.name || src.userName),
      projectRole: normalizeText(src.projectRole || src.role) || 'stagehand',
      projectRoleLabel: getCrewRoleLabel(normalizeText(src.projectRole || src.role) || 'stagehand'),
      isGuest,
      keyType,
      accessFrom: normalizeText(src.accessFrom || src.validFrom || src.startsAt).slice(0, 10),
      accessTo: normalizeText(src.accessTo || src.validUntil || src.expiresAt || src.endsAt).slice(0, 10),
      inviteKey: normalizeText(src.inviteKey || src.key).toUpperCase(),
      inviteId: normalizeText(src.inviteId || src.invite_id),
      inviteStatus: normalizeText(src.inviteStatus || src.status),
      note: normalizeText(src.note || src.comment),
      payMode: payment.payMode,
      fixedCost: payment.fixedCost,
      hourlyRate: payment.hourlyRate,
      hours: payment.hours,
      totalCost: payment.totalCost,
      createdAt: normalizeText(src.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeAssignments(list) {
    return (Array.isArray(list) ? list : []).map(normalizeAssignment).filter(row => row.userEmail || row.displayName || row.userId || row.isGuest);
  }

  function calculateCrewCost(list) {
    return normalizeAssignments(list).reduce((sum, row) => sum + money(row.totalCost), 0);
  }

  function buildInvitePayload(assignment, quote) {
    const row = normalizeAssignment(assignment || {});
    const q = quote || {};
    const projectId = normalizeText(q.id || q.projectId || q.project_id);
    const projectName = normalizeText(q.project && q.project.name || q.projectName || q.name || 'Проект');
    const keyType = row.keyType || 'temporary';
    return {
      keyType,
      role: 'invited_specialist',
      workspace: q.workspaceId || 'MAIN',
      maxUses: keyType === 'permanent' ? 999 : 1,
      projectId,
      projectName,
      validFrom: row.accessFrom || (q.venue && q.venue.date) || new Date().toISOString().slice(0, 10),
      expiresAt: keyType === 'permanent' ? '' : (row.accessTo || row.accessFrom || (q.venue && q.venue.date) || new Date().toISOString().slice(0, 10)),
      assignedEmail: row.userEmail,
      note: `project_crew_assignment:${row.projectRole}`
    };
  }

  function createOrExtendInvite(assignment, quote, storage) {
    const admin = ROOT.AdminShell || {};
    const row = normalizeAssignment(assignment || {});
    if (!admin.saveInviteDraft) return { ok: false, reason: 'admin_shell_missing', assignment: row };
    const payload = buildInvitePayload(row, quote || {});
    let invite = null;
    if (row.inviteId || row.inviteKey) {
      invite = admin.extendInviteAccess ? admin.extendInviteAccess(row.inviteId || row.inviteKey, payload, storage) : null;
    }
    if (!invite) invite = admin.saveInviteDraft(payload, storage);
    let profile = null;
    if (row.userId || row.userEmail) {
      const target = row.userId || row.userEmail;
      if (admin.extendProfileProjectAccess) {
        profile = admin.extendProfileProjectAccess(target, {
          projectId: payload.projectId,
          projectName: payload.projectName,
          validFrom: payload.validFrom,
          validUntil: payload.expiresAt,
          inviteKey: invite && invite.key,
          keyType: payload.keyType,
          status: 'active'
        }, storage);
      }
    }
    return {
      ok: Boolean(invite),
      reason: invite ? (profile ? 'extended_profile_and_invite' : 'invite_created') : 'invite_failed',
      invite,
      profile,
      assignment: normalizeAssignment({ ...row, inviteKey: invite && invite.key, inviteId: invite && invite.id, inviteStatus: invite && invite.status })
    };
  }

  ROOT.ProjectCrewAssignments = {
    VERSION,
    PROJECT_CREW_ROLES,
    KEY_TYPES,
    getCrewRoles,
    getKeyTypes,
    getCrewRoleLabel,
    normalizePayment,
    normalizeAssignment,
    normalizeAssignments,
    calculateCrewCost,
    buildInvitePayload,
    createOrExtendInvite
  };
})();
