const Mutations = {
  persist() {
    DataCache.set({ projects: App.projects, departments: App.departments });
    if (typeof rebuildAppIndex === 'function') rebuildAppIndex();
  },

  findProject(id) {
    return App.projects.find(p => Number(p.id) === Number(id));
  },

  findLicense(projectId, licenseId) {
    const p = this.findProject(projectId);
    return p?.licenses?.find(l => Number(l.id) === Number(licenseId));
  },

  deleteProjectLocal(projectId) {
    const id = Number(projectId);
    App.projects = App.projects.filter(p => Number(p.id) !== id);
    if (Number(App.currentProjectId) === id) App.currentProjectId = null;
    this.persist();
    return true;
  },

  upsertProjectLocal(data, serverId) {
    const id = Number(serverId || data.id || Date.now());
    const existing = this.findProject(id);
    const project = {
      id,
      name: data.name,
      department: data.department,
      emails: data.emails || [],
      driveUrl: (data.driveUrl || '').trim(),
      isDemo: existing?.isDemo || false,
      licenses: existing?.licenses || []
    };
    const idx = App.projects.findIndex(p => Number(p.id) === id);
    if (idx >= 0) App.projects[idx] = project;
    else App.projects.push(project);
    this.persist();
    return id;
  },

  addLicenseLocal(projectId, data, serverId) {
    const p = this.findProject(projectId);
    if (!p) return null;
    const id = Number(serverId || Date.now());
    const license = {
      id,
      name: data.name,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      alertMonths: data.alertMonths || 3,
      driveUrl: '',
      status: data.status || 'รอเริ่มดำเนินการ',
      steps: data.steps || [],
      renewalCycles: [],
      history: []
    };
    if (!p.licenses) p.licenses = [];
    p.licenses.push(license);
    this.persist();
    return id;
  },

  updateLicenseStepsLocal(projectId, licenseId, steps, status) {
    const l = this.findLicense(projectId, licenseId);
    if (!l) return null;
    l.steps = steps;
    if (status) l.status = status;
    this.persist();
    return l;
  },

  timelineUpdateLocal(licenseId, step, note) {
    let found = null;
    App.projects.forEach(p => {
      (p.licenses || []).forEach(l => {
        if (Number(l.id) !== Number(licenseId)) return;
        found = { project: p, license: l };
        if (step) l.status = step;
        if (!l.history) l.history = [];
        l.history.push({
          id: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          action: step || 'บันทึกทั่วไป',
          note: note || ''
        });
      });
    });
    if (found) this.persist();
    return found;
  },

  completeRenewalLocal(licenseId, issueDate, expiryDate, note) {
    let license = null;
    App.projects.forEach(p => {
      (p.licenses || []).forEach(l => {
        if (Number(l.id) !== Number(licenseId)) return;
        license = l;
        const oldIssue = l.issueDate;
        const oldExpiry = l.expiryDate;
        if (oldIssue && oldExpiry) {
          if (!l.renewalCycles) l.renewalCycles = [];
          l.renewalCycles.push({
            round: l.renewalCycles.length + 1,
            issueDate: oldIssue,
            expiryDate: oldExpiry,
            archivedAt: new Date().toISOString().slice(0, 10),
            note: note || 'บันทึกรอบต่ออายุ'
          });
        }
        l.issueDate = issueDate;
        l.expiryDate = expiryDate;
        const first = (l.steps && l.steps[0]) || 'รอเริ่มดำเนินการ';
        l.status = first;
        l.history = [{
          id: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          action: 'เริ่มรอบติดตามใหม่',
          note: 'รอบที่ ' + (l.renewalCycles.length + 1) + ' · ' + issueDate + ' ถึง ' + expiryDate +
            (note ? ' · ' + note : '')
        }];
      });
    });
    if (license) this.persist();
    return license;
  }
};

function refreshCurrentView(opts) {
  opts = opts || {};
  if (App.currentView === 'dashboard' && !opts.forceFull) {
    const shell = document.getElementById('dashboard-shell');
    if (shell && typeof patchDashboard === 'function') {
      patchDashboard();
      if (!opts.skipSidebar) renderSidebar(true);
      return;
    }
  }
  if (!opts.skipSidebar) renderSidebar(true);
  if (App.currentView === 'dashboard') showDashboard({ skipSidebar: true });
  else if (App.currentProjectId) renderProjectView(App.currentProjectId);
}
