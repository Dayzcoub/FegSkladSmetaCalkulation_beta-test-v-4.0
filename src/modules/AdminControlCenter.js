(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});
  const ROLES = Object.freeze(['admin', 'manager', 'technician', 'warehouse', 'viewer']);

  function getAdminShell() { return ROOT.AdminShell || {}; }
  function getSettings() { return ROOT.WorkspaceSettings || {}; }

  function normalizeRole(role) {
    return ROOT.RolePermissions && ROOT.RolePermissions.normalizeRole ? ROOT.RolePermissions.normalizeRole(role) : (role || 'viewer');
  }

  function roleLabel(role) {
    return ROOT.RolePermissions && ROOT.RolePermissions.getRoleLabel ? ROOT.RolePermissions.getRoleLabel(role) : normalizeRole(role);
  }

  function inferInviteStatus(invite) {
    const data = invite || {};
    if (data.status === 'disabled' || data.status === 'revoked') return data.status;
    if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) return 'expired';
    if (Number(data.usedCount || 0) >= Number(data.maxUses || 1)) return 'used';
    return data.status || 'active';
  }

  function getAccessState(storage) {
    const admin = getAdminShell();
    const profiles = admin.loadProfiles ? admin.loadProfiles(storage) : [];
    const inviteKeys = admin.loadInviteDrafts ? admin.loadInviteDrafts(storage) : [];
    const settings = getSettings().loadSettings ? getSettings().loadSettings(storage) : null;
    return {
      type: 'feg-stage-pro-admin-control-state',
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: settings ? {
        workspaceId: settings.workspaceId,
        workspaceName: settings.workspaceName,
        companyName: settings.companyName
      } : { workspaceId: 'MAIN', workspaceName: 'MAIN', companyName: '' },
      profiles,
      invite_keys: inviteKeys
    };
  }

  function buildRoleMatrix(profiles) {
    const list = Array.isArray(profiles) ? profiles : [];
    const matrix = ROLES.map(role => {
      const users = list.filter(profile => normalizeRole(profile.role) === role);
      const active = users.filter(profile => profile.status !== 'disabled' && profile.status !== 'blocked');
      return {
        role,
        label: roleLabel(role),
        total: users.length,
        active: active.length,
        disabled: users.length - active.length,
        emails: users.map(profile => profile.email).filter(Boolean)
      };
    });
    return matrix;
  }

  function buildInviteSummary(invites) {
    const list = Array.isArray(invites) ? invites : [];
    const byStatus = {};
    const byRole = {};
    list.forEach(invite => {
      const status = inferInviteStatus(invite);
      const role = normalizeRole(invite.role);
      byStatus[status] = (byStatus[status] || 0) + 1;
      byRole[role] = (byRole[role] || 0) + 1;
    });
    return {
      total: list.length,
      active: byStatus.active || 0,
      used: byStatus.used || 0,
      expired: byStatus.expired || 0,
      disabled: (byStatus.disabled || 0) + (byStatus.revoked || 0),
      byStatus,
      byRole
    };
  }

  function buildAccessHealth(state) {
    const data = state || getAccessState();
    const profiles = Array.isArray(data.profiles) ? data.profiles : [];
    const invites = Array.isArray(data.invite_keys) ? data.invite_keys : [];
    const activeAdmins = profiles.filter(profile => normalizeRole(profile.role) === 'admin' && profile.status === 'active');
    const activeUsers = profiles.filter(profile => profile.status === 'active');
    const activeInvites = invites.filter(invite => inferInviteStatus(invite) === 'active');
    const issues = [];
    const warnings = [];

    if (!activeAdmins.length) issues.push('Нет активного администратора');
    if (!activeUsers.length) warnings.push('Нет активных пользователей');
    if (!activeInvites.length) warnings.push('Нет активных invite-ключей для регистрации');
    if (invites.some(invite => inferInviteStatus(invite) === 'expired')) warnings.push('Есть просроченные invite-ключи');
    if (profiles.some(profile => !profile.email)) warnings.push('Есть профили без email');

    return {
      type: 'feg-stage-pro-admin-access-health',
      ok: issues.length === 0,
      score: Math.max(0, 100 - issues.length * 40 - warnings.length * 10),
      activeAdmins: activeAdmins.length,
      activeUsers: activeUsers.length,
      activeInvites: activeInvites.length,
      totalProfiles: profiles.length,
      totalInviteKeys: invites.length,
      issues,
      warnings,
      roleMatrix: buildRoleMatrix(profiles),
      inviteSummary: buildInviteSummary(invites)
    };
  }

  function exportAdminControlState(storage) {
    const state = getAccessState(storage);
    return JSON.stringify({
      ...state,
      health: buildAccessHealth(state),
      role_matrix: buildRoleMatrix(state.profiles),
      invite_summary: buildInviteSummary(state.invite_keys)
    }, null, 2);
  }

  function renderAdminControlCenter(target, options) {
    const root = typeof target === 'string' ? GLOBAL.document && document.getElementById(target) : target;
    if (!root) return null;
    const cb = options || {};
    const admin = getAdminShell();
    const state = getAccessState();
    const health = buildAccessHealth(state);
    root.innerHTML = `
      <div class="v4-admin-control-center">
        <div class="v4-card">
          <div class="v4-card-head">
            <div>
              <div class="v4-kicker">Admin Control Center</div>
              <h3>Админ-центр доступа и workspace</h3>
              <p class="v4-muted">Единый экран для пользователей, ролей, invite-ключей, bootstrap первого админа и экспорта состояния доступа.</p>
            </div>
            <div class="v4-auth-actions">
              <button type="button" class="btn-secondary" data-admin-control="seed-demo">Demo seed</button>
              <button type="button" class="btn-secondary" data-admin-control="export">Export access pack</button>
            </div>
          </div>
          ${renderHealth(health)}
          ${renderRoleMatrix(health.roleMatrix)}
          ${renderInviteSummary(health.inviteSummary)}
          <pre class="v4-json-preview" data-admin-control-export hidden></pre>
        </div>
        <div class="v4-admin-control-grid">
          <div id="v4AdminShellEmbedded"></div>
          <div class="v4-card v4-admin-control-side">
            <div class="v4-kicker">Workspace</div>
            <h4>${escapeHtml(state.workspace.workspaceName || 'MAIN')}</h4>
            <p class="v4-muted">${escapeHtml(state.workspace.companyName || 'Компания не указана')}</p>
            <div class="v4-mini-list">
              <span>workspace_id: <b>${escapeHtml(state.workspace.workspaceId || 'MAIN')}</b></span>
              <span>profiles: <b>${health.totalProfiles}</b></span>
              <span>invite_keys: <b>${health.totalInviteKeys}</b></span>
              <span>health: <b>${health.score}%</b></span>
            </div>
          </div>
        </div>
      </div>`;

    const embedded = root.querySelector('#v4AdminShellEmbedded');
    if (embedded && admin.renderAdminDashboard) {
      admin.renderAdminDashboard(embedded, {
        onGenerate: invite => {
          if (cb.onGenerate) cb.onGenerate(invite);
          renderAdminControlCenter(root, cb);
        },
        onSeed: seeded => {
          if (cb.onSeed) cb.onSeed(seeded);
          renderAdminControlCenter(root, cb);
        },
        onDisableInvite: invite => {
          if (cb.onDisableInvite) cb.onDisableInvite(invite);
          renderAdminControlCenter(root, cb);
        },
        onBootstrap: result => {
          if (cb.onBootstrap) cb.onBootstrap(result);
          renderAdminControlCenter(root, cb);
        }
      });
    }

    root.querySelectorAll('[data-admin-control]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-admin-control');
        if (action === 'seed-demo' && admin.seedDemoAccess) {
          admin.seedDemoAccess();
          renderAdminControlCenter(root, cb);
          if (cb.onSeed) cb.onSeed();
        }
        if (action === 'export') {
          const pre = root.querySelector('[data-admin-control-export]');
          if (pre) {
            pre.hidden = false;
            pre.textContent = exportAdminControlState();
          }
          if (cb.onExport) cb.onExport(exportAdminControlState());
        }
      });
    });
    return root;
  }

  function renderHealth(health) {
    const status = health.ok ? 'OK' : 'Нужно внимание';
    return `
      <div class="v4-admin-health ${health.ok ? 'ok' : 'risk'}">
        <div><b>${escapeHtml(status)}</b><span>health ${escapeHtml(health.score)}%</span></div>
        <div><b>${escapeHtml(health.activeAdmins)}</b><span>active admins</span></div>
        <div><b>${escapeHtml(health.activeUsers)}</b><span>active users</span></div>
        <div><b>${escapeHtml(health.activeInvites)}</b><span>active invites</span></div>
      </div>
      ${(health.issues.length || health.warnings.length) ? `<div class="v4-admin-health-notes">${health.issues.concat(health.warnings).map(note => `<span>${escapeHtml(note)}</span>`).join('')}</div>` : ''}`;
  }

  function renderRoleMatrix(matrix) {
    return `
      <div class="v4-table-wrap v4-table-wrap--admin-roles">
        <h4>Роли и пользователи</h4>
        <table class="v4-table v4-table--admin-roles"><thead><tr><th>Роль</th><th>Всего</th><th>Активных</th><th>Email</th></tr></thead><tbody>
          ${matrix.map(row => `<tr><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.total)}</td><td>${escapeHtml(row.active)}</td><td>${escapeHtml(row.emails.join(', ') || '—')}</td></tr>`).join('')}
        </tbody></table>
      </div>`;
  }

  function renderInviteSummary(summary) {
    return `
      <div class="v4-admin-invite-summary">
        <span>Всего ключей: <b>${escapeHtml(summary.total)}</b></span>
        <span>Активные: <b>${escapeHtml(summary.active)}</b></span>
        <span>Использованы: <b>${escapeHtml(summary.used)}</b></span>
        <span>Просрочены: <b>${escapeHtml(summary.expired)}</b></span>
        <span>Отключены: <b>${escapeHtml(summary.disabled)}</b></span>
      </div>`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  ROOT.AdminControlCenter = {
    ROLES,
    getAccessState,
    buildRoleMatrix,
    buildInviteSummary,
    buildAccessHealth,
    exportAdminControlState,
    renderAdminControlCenter
  };
})();
