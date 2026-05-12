(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  const ROLES = Object.freeze({
    ADMIN: 'admin',
    MANAGER: 'manager',
    TECHNICIAN: 'technician',
    WAREHOUSE: 'warehouse',
    VIEWER: 'viewer'
  });

  const ROLE_LABELS = Object.freeze({
    admin: 'Администратор',
    manager: 'Менеджер',
    technician: 'Техник',
    warehouse: 'Склад',
    viewer: 'Просмотр'
  });

  const PERMISSIONS = Object.freeze({
    admin: ['*'],
    manager: [
      'dashboard:view', 'quotes:create', 'quotes:view', 'quotes:edit', 'clients:view', 'clients:edit',
      'prices:view', 'projects:view', 'projects:edit', 'pdf:client', 'calendar:write', 'documents:view', 'command_center:view', 'reports:view', 'data_quality:view', 'equipment:view', 'equipment:edit', 'availability:view', 'stock:view', 'picklists:view'
    ],
    technician: [
      'dashboard:view', 'quick_calculators:view', 'stage:quick', 'truss:quick', 'led:quick',
      'bom:view', 'weights:view', 'power:view', 'equipment:view', 'documents:view', 'command_center:view', 'availability:view', 'prices:hidden', 'clients:hidden'
    ],
    warehouse: [
      'dashboard:view', 'stock:view', 'picklists:view', 'documents:view', 'bom:view', 'availability:view',
      'weights:view', 'equipment:view', 'documents:view', 'command_center:view', 'reports:view', 'data_quality:view', 'availability:view', 'prices:hidden', 'clients:hidden'
    ],
    viewer: ['dashboard:view', 'projects:view', 'documents:view', 'command_center:view', 'prices:hidden', 'clients:hidden']
  });

  const SECTION_PERMISSIONS = Object.freeze({
    quick: 'quick_calculators:view',
    quote: 'quotes:create',
    equipment: 'equipment:view',
    projects: 'projects:view',
    documents: 'documents:view',
    command: 'command_center:view',
    reports: 'reports:view',
    quality: 'data_quality:view',
    clients: 'clients:view',
    settings: 'dashboard:view',
    admin: 'admin:access',
    sync: 'admin:access',
    warehouse: 'stock:view',
    stock: 'stock:view'
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

  function canSeeSection(role, sectionId) {
    const required = SECTION_PERMISSIONS[sectionId];
    if (!required) return hasPermission(role, 'dashboard:view');
    if (sectionId === 'admin') return normalizeRole(role) === ROLES.ADMIN;
    return hasPermission(role, required);
  }

  function filterSectionsForRole(sections, role) {
    return (Array.isArray(sections) ? sections : []).filter(section => canSeeSection(role, section.id));
  }

  function getRoleLabel(role) {
    return ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS.viewer;
  }

  ROOT.RolePermissions = {
    ROLES,
    ROLE_LABELS,
    PERMISSIONS,
    SECTION_PERMISSIONS,
    normalizeRole,
    getRolePermissions,
    hasPermission,
    canSeeSection,
    filterSectionsForRole,
    getRoleLabel
  };
})();
