(function () {
  'use strict';

  const GLOBAL = typeof window !== 'undefined' ? window : globalThis;
  const ROOT = (GLOBAL.FEGModules = GLOBAL.FEGModules || {});

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalize(value) {
    return toText(value).toLowerCase();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (_) { return value; }
  }

  function getProjectClientSnapshot(project) {
    const record = project || {};
    const quote = record.quote || record;
    const client = quote && quote.client ? quote.client : {};
    return {
      id: toText(client.id || client.clientId || record.clientId),
      cloudId: toText(client.cloudId || client.cloud_id || record.clientCloudId),
      name: toText(client.name || client.company || record.clientName),
      company: toText(client.company || client.name || record.clientName),
      contact: toText(client.contact || client.contactName || record.clientContact),
      phone: toText(client.phone || client.contactPhone || record.clientPhone),
      email: toText(client.email || record.clientEmail),
      address: toText(client.address || record.clientAddress),
      note: toText(client.note || client.notes || record.clientNote)
    };
  }

  function getClientKey(client) {
    const c = client || {};
    return {
      id: toText(c.id || c.clientId),
      cloudId: toText(c.cloudId || c.cloud_id),
      name: normalize(c.name || c.company || c.client),
      email: normalize(c.email),
      phone: normalize(c.phone)
    };
  }

  function projectMatchesClient(project, client) {
    const p = getProjectClientSnapshot(project);
    const c = getClientKey(client);
    if (c.id && p.id && c.id === p.id) return true;
    if (c.cloudId && p.cloudId && c.cloudId === p.cloudId) return true;
    if (c.email && normalize(p.email) && c.email === normalize(p.email)) return true;
    if (c.phone && normalize(p.phone) && c.phone === normalize(p.phone)) return true;
    if (c.name && normalize(p.name || p.company) && c.name === normalize(p.name || p.company)) return true;
    return false;
  }

  function getProjects(projects) {
    if (Array.isArray(projects)) return projects.slice();
    return ROOT.QuoteProjectStorage && ROOT.QuoteProjectStorage.listProjects ? ROOT.QuoteProjectStorage.listProjects() : [];
  }

  function listProjectsForClient(client, projects) {
    return getProjects(projects)
      .filter(project => projectMatchesClient(project, client))
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }

  function getClientProjectStats(client, projects) {
    const matched = listProjectsForClient(client, projects);
    const last = matched[0] || null;
    const statuses = matched.reduce((acc, project) => {
      const status = project.status || project.quote && project.quote.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return {
      total: matched.length,
      projects: matched,
      statuses,
      last,
      lastProjectId: last ? toText(last.projectId || last.quoteId) : '',
      lastProjectName: last ? toText(last.projectName || last.quote && last.quote.project && last.quote.project.name) : '',
      lastProjectDate: last ? toText(last.eventDate || last.quote && last.quote.venue && last.quote.venue.date) : '',
      lastUpdatedAt: last ? toText(last.updatedAt || last.savedAt) : ''
    };
  }

  function findClientForProject(project, clients) {
    const rows = Array.isArray(clients)
      ? clients
      : (ROOT.ClientsStorage && ROOT.ClientsStorage.getClients ? ROOT.ClientsStorage.getClients() : []);
    return rows.find(client => projectMatchesClient(project, client)) || null;
  }

  function linkClientToQuote(quote, client) {
    const q = clone(quote || {}) || {};
    const c = client || {};
    q.client = Object.assign({}, q.client || {}, {
      id: toText(c.id || c.clientId || q.client && q.client.id),
      name: toText(c.name || c.company || q.client && q.client.name),
      company: toText(c.company || c.name || q.client && q.client.company),
      contactName: toText(c.contact || c.contactName || q.client && q.client.contactName),
      contactPhone: toText(c.phone || c.contactPhone || q.client && q.client.contactPhone),
      phone: toText(c.phone || q.client && q.client.phone),
      email: toText(c.email || q.client && q.client.email),
      address: toText(c.address || q.client && q.client.address),
      notes: toText(c.note || c.notes || q.client && q.client.notes)
    });
    q.updatedAt = new Date().toISOString();
    return ROOT.QuoteModel && ROOT.QuoteModel.createQuoteDraft ? ROOT.QuoteModel.createQuoteDraft(q) : q;
  }

  function exportClientProjectPack(client, projects) {
    const matched = listProjectsForClient(client, projects);
    return JSON.stringify({
      type: 'feg-stage-pro-client-project-links',
      version: '3.8.36',
      exportedAt: new Date().toISOString(),
      client: clone(client || {}),
      projectCount: matched.length,
      projects: matched.map(project => ({
        projectId: project.projectId,
        quoteId: project.quoteId,
        status: project.status,
        clientName: project.clientName,
        projectName: project.projectName,
        venueName: project.venueName,
        venueAddress: project.venueAddress,
        eventDate: project.eventDate,
        totals: clone(project.totals || {}),
        updatedAt: project.updatedAt,
        savedAt: project.savedAt
      }))
    }, null, 2);
  }

  ROOT.ClientProjectLinks = {
    getProjectClientSnapshot,
    getClientKey,
    projectMatchesClient,
    listProjectsForClient,
    getClientProjectStats,
    findClientForProject,
    linkClientToQuote,
    exportClientProjectPack
  };
})();
