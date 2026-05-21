(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const ROLES = Object.freeze({
    ADMIN: 'admin',
    MANAGER: 'manager',
    TECHNICIAN: 'technician',
    WAREHOUSE: 'warehouse',
    VIEWER: 'viewer',
    DIRECTOR: 'director',
    TECH_DIRECTOR: 'tech_director',
    SOUND: 'sound',
    LIGHT: 'light',
    SCREENS: 'screens',
    TRUSS_STAGE: 'truss_stage',
    INVITED_SPECIALIST: 'invited_specialist'
  });

  const ROLE_LABELS = Object.freeze({
    admin: 'Администратор',
    manager: 'Менеджер',
    technician: 'Техник',
    warehouse: 'Склад',
    viewer: 'Просмотр',
    director: 'Директор',
    tech_director: 'ТехДиректор',
    sound: 'Звук',
    light: 'Свет',
    screens: 'Экраны',
    truss_stage: 'Фермы и сцены',
    invited_specialist: 'Приглашённый спец'
  });

  const COMMON_WORK_PERMISSIONS = Object.freeze(['dashboard:view', 'projects:view', 'documents:view', 'communication:view', 'communication:write', 'notifications:view']);
  const SPECIALIST_BASE = Object.freeze(COMMON_WORK_PERMISSIONS.concat(['quick_calculators:view', 'equipment:view', 'equipment:edit', 'equipment:edit:scoped', 'availability:view']));
  const FULL_ACCESS_ROLES = Object.freeze(['admin', 'director', 'tech_director']);

  const PERMISSIONS = Object.freeze({
    admin: ['*'],
    director: ['*'],
    tech_director: ['*', 'site_checklist:view', 'site_checklist:edit'],
    manager: [
      'dashboard:view', 'quotes:create', 'quotes:view', 'quotes:edit', 'clients:view', 'clients:edit',
      'prices:view', 'projects:view', 'projects:edit', 'pdf:client', 'calendar:write', 'documents:view',
      'command_center:view', 'communication:view', 'communication:write', 'notifications:view', 'push:manage',
      'reports:view', 'equipment:view', 'availability:view', 'stock:view', 'picklists:view'
    ],
    technician: [
      'dashboard:view', 'quick_calculators:view', 'stage:quick', 'truss:quick', 'led:quick',
      'bom:view', 'weights:view', 'power:view', 'equipment:view', 'documents:view', 'projects:view',
      'communication:view', 'communication:write', 'notifications:view', 'availability:view', 'prices:hidden', 'clients:hidden'
    ],
    warehouse: [
      'dashboard:view', 'stock:view', 'picklists:view', 'documents:view', 'bom:view', 'availability:view',
      'weights:view', 'equipment:view', 'projects:view', 'communication:view', 'communication:write',
      'notifications:view', 'prices:hidden', 'clients:hidden'
    ],
    viewer: ['dashboard:view', 'projects:view', 'documents:view', 'communication:view', 'notifications:view', 'prices:hidden', 'clients:hidden'],
    sound: SPECIALIST_BASE.concat(['equipment:domain:sound', 'stage:quick', 'truss:quick', 'led:quick']),
    light: SPECIALIST_BASE.concat(['equipment:domain:light', 'stage:quick', 'truss:quick', 'led:quick']),
    screens: SPECIALIST_BASE.concat(['equipment:domain:screens', 'stage:quick', 'truss:quick', 'led:quick']),
    truss_stage: SPECIALIST_BASE.concat(['equipment:domain:truss_stage', 'stage:quick', 'truss:quick', 'led:quick']),
    invited_specialist: ['dashboard:view', 'documents:view', 'communication:view', 'communication:write', 'notifications:view', 'invited:project', 'prices:hidden', 'clients:hidden']
  });

  const SECTION_PERMISSIONS = Object.freeze({
    quick: 'quick_calculators:view',
    quote: 'quotes:create',
    equipment: 'equipment:view',
    subrentors: 'admin:access',
    site_checklist: 'site_checklist:view',
    projects: 'projects:view',
    documents: 'documents:view',
    command: 'command_center:view',
    communication: 'communication:view',
    reports: 'reports:view',
    quality: 'admin:access',
    clients: 'clients:view',
    settings: 'admin:access',
    admin: 'admin:access',
    sync: 'admin:access',
    warehouse: 'stock:view',
    stock: 'stock:view'
  });

  const ALL_PERMISSIONS = Object.freeze(Array.from(new Set(Object.values(PERMISSIONS).flat().concat(Object.values(SECTION_PERMISSIONS)).filter(Boolean).filter(permission => permission !== '*'))).sort());

  const EQUIPMENT_DOMAIN_CATEGORIES = Object.freeze({
    sound: ['sound_pa', 'consoles', 'monitoring', 'backline', 'commutation'],
    light: ['light', 'commutation'],
    screens: ['led', 'commutation'],
    truss_stage: ['stage', 'truss', 'commutation']
  });

  const EQUIPMENT_DOMAIN_TYPES = Object.freeze({
    sound: ['sound', 'audio_console', 'monitoring', 'backline', 'cable'],
    light: ['light_fixture', 'cable'],
    screens: ['led_cabinet', 'led_accessory', 'cable'],
    truss_stage: ['stage_deck', 'stage_support', 'stage_part', 'truss_segment', 'truss_node', 'truss_base', 'truss_connector', 'cable']
  });

  function normalizeRole(role) {
    return Object.values(ROLES).includes(role) ? role : ROLES.VIEWER;
  }

  function getRolePermissions(role) {
    return PERMISSIONS[normalizeRole(role)] || PERMISSIONS.viewer;
  }

  function hasPermission(role, permission) {
    const perms = getRolePermissions(role);
    return perms.includes('*') || perms.includes(permission);
  }

  function isFullAccessRole(role) {
    return FULL_ACCESS_ROLES.includes(normalizeRole(role));
  }

  function canSeeSection(role, sectionId) {
    const normalized = normalizeRole(role);
    const required = SECTION_PERMISSIONS[sectionId];
    if (!required) return hasPermission(normalized, 'dashboard:view');
    if (sectionId === 'admin' || sectionId === 'sync' || sectionId === 'quality' || sectionId === 'settings' || sectionId === 'subrentors') return isFullAccessRole(normalized);
    return hasPermission(normalized, required);
  }

  function filterSectionsForRole(sections, role) {
    return (Array.isArray(sections) ? sections : []).filter(section => canSeeSection(role, section.id));
  }

  function getRoleLabel(role) {
    return ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS.viewer;
  }

  function getRoleAllowedEquipmentCategories(role) {
    const normalized = normalizeRole(role);
    if (isFullAccessRole(normalized) || normalized === ROLES.MANAGER || normalized === ROLES.WAREHOUSE) return null;
    return EQUIPMENT_DOMAIN_CATEGORIES[normalized] || [];
  }

  function getRoleAllowedEquipmentTypes(role) {
    const normalized = normalizeRole(role);
    if (isFullAccessRole(normalized) || normalized === ROLES.MANAGER || normalized === ROLES.WAREHOUSE) return null;
    return EQUIPMENT_DOMAIN_TYPES[normalized] || [];
  }

  function canViewEquipmentItem(role, item) {
    if (hasPermission(role, '*') || !hasPermission(role, 'equipment:view')) return hasPermission(role, '*');
    const categories = getRoleAllowedEquipmentCategories(role);
    const types = getRoleAllowedEquipmentTypes(role);
    if (categories === null && types === null) return true;
    const category = String(item && item.category || '').trim();
    const type = String(item && item.type || '').trim();
    return (Array.isArray(categories) && categories.includes(category)) || (Array.isArray(types) && types.includes(type));
  }

  function canEditEquipmentItem(role, item) {
    if (hasPermission(role, '*')) return true;
    if (!hasPermission(role, 'equipment:edit')) return false;
    if (!hasPermission(role, 'equipment:edit:scoped')) return true;
    return canViewEquipmentItem(role, item || {});
  }

  function filterEquipmentItemsForRole(items, role) {
    return (Array.isArray(items) ? items : []).filter(item => canViewEquipmentItem(role, item));
  }

  function normalizePermissionList(value) {
    const raw = Array.isArray(value) ? value : String(value || '').split(/[\n,;]+/g);
    return Array.from(new Set(raw.map(item => String(item || '').trim()).filter(Boolean)));
  }

  function getAllPermissions() {
    return ALL_PERMISSIONS.slice();
  }

  function getProfilePermissions(profile) {
    const data = profile || {};
    const role = normalizeRole(data.role || 'viewer');
    if (isFullAccessRole(role) && !Array.isArray(data.permissionsRemove)) return ['*'];
    let perms = getRolePermissions(role).slice();
    const add = normalizePermissionList(data.permissionsAdd || data.addedPermissions || data.permissions_add);
    const remove = normalizePermissionList(data.permissionsRemove || data.removedPermissions || data.permissions_remove);
    if (perms.includes('*') && remove.length) perms = ALL_PERMISSIONS.slice();
    add.forEach(permission => {
      if (!perms.includes(permission)) perms.push(permission);
    });
    return perms.filter(permission => !remove.includes(permission)).sort();
  }

  function hasUserPermission(userOrProfile, permission) {
    const data = userOrProfile || {};
    const perms = getProfilePermissions(data);
    return perms.includes('*') || perms.includes(permission);
  }

  function canSeeSectionForUser(userOrProfile, sectionId) {
    const data = userOrProfile || {};
    const role = normalizeRole(data.role || 'viewer');
    if (isFullAccessRole(role) && !(Array.isArray(data.permissionsRemove) && data.permissionsRemove.length)) return true;
    const required = SECTION_PERMISSIONS[sectionId];
    if (!required) return hasUserPermission(data, 'dashboard:view');
    return hasUserPermission(data, required);
  }

  function canViewEquipmentItemForUser(userOrProfile, item) {
    const data = userOrProfile || {};
    if (hasUserPermission(data, '*')) return true;
    if (!hasUserPermission(data, 'equipment:view')) return false;
    return canViewEquipmentItem(data.role || 'viewer', item || {});
  }

  function canEditEquipmentItemForUser(userOrProfile, item) {
    const data = userOrProfile || {};
    if (hasUserPermission(data, '*')) return true;
    if (!hasUserPermission(data, 'equipment:edit')) return false;
    if (!hasUserPermission(data, 'equipment:edit:scoped')) return true;
    return canViewEquipmentItemForUser(data, item || {});
  }

  ROOT.RolePermissions = {
    ROLES,
    ROLE_LABELS,
    PERMISSIONS,
    SECTION_PERMISSIONS,
    FULL_ACCESS_ROLES,
    ALL_PERMISSIONS,
    EQUIPMENT_DOMAIN_CATEGORIES,
    EQUIPMENT_DOMAIN_TYPES,
    normalizeRole,
    getRolePermissions,
    getAllPermissions,
    normalizePermissionList,
    getProfilePermissions,
    hasPermission,
    hasUserPermission,
    isFullAccessRole,
    canSeeSection,
    canSeeSectionForUser,
    filterSectionsForRole,
    getRoleLabel,
    getRoleAllowedEquipmentCategories,
    getRoleAllowedEquipmentTypes,
    canViewEquipmentItem,
    canViewEquipmentItemForUser,
    canEditEquipmentItem,
    canEditEquipmentItemForUser,
    filterEquipmentItemsForRole
  };
})();
