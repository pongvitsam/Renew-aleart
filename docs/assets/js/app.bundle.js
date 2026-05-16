/* app-cache.js */
const DataCache = {
  KEY: 'renew_payload_v3',
  TTL: 86400000,
  STALE_TTL: 604800000,

  _read() {
    try {
      const raw = localStorage.getItem(this.KEY) || sessionStorage.getItem(this.KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  get() {
    const o = this._read();
    if (!o) return null;
    if (Date.now() - o.t > this.TTL) return null;
    return o.data;
  },

  /** ข้อมูลเก่าเกิน TTL แต่ยังใช้แสดงผลได้ (stale-while-revalidate) */
  getStale() {
    const o = this._read();
    if (!o) return null;
    if (Date.now() - o.t > this.STALE_TTL) {
      this.clear();
      return null;
    }
    return { data: o.data, stale: Date.now() - o.t > this.TTL };
  },

  set(data) {
    const blob = JSON.stringify({ t: Date.now(), data });
    try { localStorage.setItem(this.KEY, blob); } catch { /* quota */ }
    try { sessionStorage.setItem(this.KEY, blob); } catch { /* ignore */ }
  },

  clear() {
    localStorage.removeItem(this.KEY);
    sessionStorage.removeItem(this.KEY);
  }
};

/* utils.js */
﻿const Utils = {
  TH_MONTHS_SHORT: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  TH_MONTHS_FULL: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  TH_DOW: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],

  toBE(year) { return year + 543; },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getDate()} ${this.TH_MONTHS_SHORT[date.getMonth()]} ${this.toBE(date.getFullYear())}`;
  },

  formatMonthYear(year, month) {
    return `${this.TH_MONTHS_FULL[month]} พ.ศ. ${this.toBE(year)}`;
  },

  calculateStatus(expiryDate, alertMonths) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate + 'T12:00:00');
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { status: 'expired', text: 'หมดอายุแล้ว', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    }
    if (diffDays <= (alertMonths || 3) * 30) {
      return { status: 'warning', text: 'ใกล้หมดอายุ', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
    return { status: 'safe', text: 'ปกติ', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  },

  licenseCounts(licenses) {
    let safe = 0, warning = 0, expired = 0;
    (licenses || []).forEach(l => {
      const s = this.calculateStatus(l.expiryDate, l.alertMonths).status;
      if (s === 'expired') expired++;
      else if (s === 'warning') warning++;
      else safe++;
    });
    return { safe, warning, expired, total: (licenses || []).length };
  },

  getProjectStatus(project) {
    const licenses = project.licenses || [];
    const counts = this.licenseCounts(licenses);
    if (!counts.total) {
      return { status: 'empty', text: 'ไม่มีใบอนุญาต', pill: 'empty', border: 'status-empty', counts };
    }
    if (counts.expired > 0) {
      return { status: 'expired', text: 'หมดอายุ ' + counts.expired, pill: 'expired', border: 'status-expired', counts };
    }
    if (counts.warning > 0) {
      return { status: 'warning', text: 'ใกล้หมดอายุ ' + counts.warning, pill: 'warning', border: 'status-warning', counts };
    }
    return { status: 'safe', text: 'ปกติ', pill: 'safe', border: 'status-safe', counts };
  },

  /** ลำดับความสำคัญ: หมดอายุ(0) → ใกล้หมดอายุ(1) → ปกติ(2) → ไม่มีใบอนุญาต(3) */
  projectPriorityRank(status) {
    return { expired: 0, warning: 1, safe: 2, empty: 3 }[status] ?? 9;
  },

  /** วันจนถึงวันหมดอายุที่เร่งด่วนที่สุด (ติดลบ = หมดอายุแล้ว) */
  nearestUrgentExpiryDays(project) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nearest = Infinity;
    (project.licenses || []).forEach(l => {
      const s = this.calculateStatus(l.expiryDate, l.alertMonths);
      if (s.status === 'expired' || s.status === 'warning') {
        const exp = new Date(l.expiryDate + 'T12:00:00');
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        if (days < nearest) nearest = days;
      }
    });
    return nearest === Infinity ? 99999 : nearest;
  },

  compareProjectsByPriority(a, b) {
    const sa = this.getProjectStatus(a);
    const sb = this.getProjectStatus(b);
    const ra = this.projectPriorityRank(sa.status);
    const rb = this.projectPriorityRank(sb.status);
    if (ra !== rb) return ra - rb;

    const da = this.nearestUrgentExpiryDays(a);
    const db = this.nearestUrgentExpiryDays(b);
    if (da !== db) return da - db;

    if (sa.counts.expired !== sb.counts.expired) return sb.counts.expired - sa.counts.expired;
    if (sa.counts.warning !== sb.counts.warning) return sb.counts.warning - sa.counts.warning;

    return (a.name || '').localeCompare(b.name || '', 'th');
  },

  sortProjectsByPriority(projects) {
    return [...(projects || [])].sort((a, b) => this.compareProjectsByPriority(a, b));
  },

  compareAlertsByPriority(a, b) {
    const order = { expired: 0, warning: 1 };
    const oa = order[a.st.status] ?? 9;
    const ob = order[b.st.status] ?? 9;
    if (oa !== ob) return oa - ob;
    const da = new Date(a.license.expiryDate + 'T12:00:00').getTime();
    const db = new Date(b.license.expiryDate + 'T12:00:00').getTime();
    if (da !== db) return da - db;
    return (a.project.name || '').localeCompare(b.project.name || '', 'th');
  },

  debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icon = type === 'success'
      ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>'
      : '<i class="fa-solid fa-circle-exclamation text-rose-500"></i>';
    toast.className = (type === 'success'
      ? 'bg-white border-l-4 border-emerald-500'
      : 'bg-white border-l-4 border-rose-500 text-rose-700') +
      ' p-4 rounded-r-xl shadow-lg flex items-center gap-3 min-w-[250px] pointer-events-auto';
    toast.innerHTML = '<span class="text-xl">' + icon + '</span><span class="text-sm font-bold">' + this.escapeHtml(message) + '</span>';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  },

  setLoading(isLoading) {
    const el = document.getElementById('loading-overlay');
    if (!el) return;
    el.classList.toggle('hidden', !isLoading);
    el.classList.toggle('flex', isLoading);
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      if (id === 'timelineModal') {
        const s = document.getElementById('update-step');
        const n = document.getElementById('update-note');
        if (s) s.value = '';
        if (n) n.value = '';
      }
    }
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  isDriveUrl(url) {
    const u = String(url || '').trim();
    return /^https?:\/\//i.test(u) && /drive\.google|docs\.google/i.test(u);
  },

  getProjectDriveUrl(project) {
    return this.isDriveUrl(project?.driveUrl) ? String(project.driveUrl).trim() : '';
  },

  parseStepsText(text) {
    return String(text || '')
      .split('\n')
      .map(s => s.trim().replace(/^\d+\.\s*/, ''))
      .filter(Boolean);
  },

  formatStepsText(steps) {
    return (steps || [])
      .map((s, i) => (i + 1) + '. ' + s)
      .join('\n');
  },

  resolveStatusAfterStepsChange(steps, currentStatus, history) {
    if (!steps.length) return currentStatus || '';
    if (currentStatus && steps.includes(currentStatus)) return currentStatus;
    const done = new Set((history || []).map(h => h.action));
    const next = steps.find(s => !done.has(s));
    return next || steps[steps.length - 1];
  },

  isRenewalStepsComplete(license) {
    const steps = license?.steps || [];
    if (!steps.length) return false;
    const last = steps[steps.length - 1];
    if (license.status === last) return true;
    const hist = license.history || [];
    return steps.every(s => hist.some(h => h.action === s));
  },

  renewalRoundCount(license) {
    return (license?.renewalCycles || []).length;
  },

  buildDriveOpenControl(project, opts) {
    opts = opts || {};
    const url = this.getProjectDriveUrl(project);
    const onEdit = opts.onEdit;

    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = opts.className || 'btn-primary text-sm px-4 py-2 inline-flex items-center gap-2 shrink-0';
      a.innerHTML = '<i class="fa-brands fa-google-drive"></i> ' + (opts.label || 'เปิดโฟลเดอร์ Drive');
      return a;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = true;
    btn.className = opts.disabledClassName ||
      'text-sm px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center gap-2 shrink-0';
    btn.title = 'ต้องวาง URL Google Drive ของโครงการก่อนจึงจะเปิดได้';
    btn.innerHTML = '<i class="fa-brands fa-google-drive"></i> ' + (opts.disabledLabel || 'เปิด Drive (ยังไม่มีลิงก์)');
    return btn;
  }
};

function openModal(id) { Utils.openModal(id); }
function closeModal(id) { Utils.closeModal(id); }
function showToast(msg, type) { Utils.showToast(msg, type); }

/* app-mutations.js */
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
        if (!l.history) l.history = [];
        l.history.push({
          id: Date.now(),
          date: new Date().toISOString().slice(0, 10),
          action: 'เริ่มรอบติดตามใหม่',
          note: 'รอบที่ ' + (l.renewalCycles.length + 1) + ' · ' + issueDate + ' ถึง ' + expiryDate
        });
      });
    });
    if (license) this.persist();
    return license;
  }
};

function refreshCurrentView() {
  renderSidebar(true);
  if (App.currentView === 'dashboard') showDashboard();
  else if (App.currentProjectId) renderProjectView(App.currentProjectId);
}

/* api.js */
const Api = {
  TIMEOUT_MS: 40000,
  MAX_RETRIES: 2,
  LOAD_BUDGET_MS: 2800,

  getSnapshotUrl() {
    const base = (CONFIG.BASE_PATH || '/Renew-aleart').replace(/\/$/, '');
    return (CONFIG.SNAPSHOT_URL || base + '/data/payload.json').split('?')[0];
  },

  normalizeSnapshot(data) {
    if (!data || !Array.isArray(data.projects)) return null;
    return {
      success: true,
      projects: data.projects,
      departments: data.departments || [],
      _fromSnapshot: true
    };
  },

  async fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(timer);
      return null;
    }
  },

  async consumeSnapshotPrefetch() {
    if (!window.__SNAPSHOT_PREFETCH__) return null;
    const pref = window.__SNAPSHOT_PREFETCH__;
    delete window.__SNAPSHOT_PREFETCH__;
    try {
      const data = await pref;
      return this.normalizeSnapshot(data);
    } catch {
      return null;
    }
  },

  async fetchSnapshot(timeoutMs) {
    const url = this.getSnapshotUrl() + '?t=' + Math.floor(Date.now() / 600000);
    const data = await this.fetchJsonWithTimeout(url, timeoutMs);
    return this.normalizeSnapshot(data);
  },

  /** โหลดครั้งแรก: snapshot เท่านั้น ไม่รอ GAS (งบเวลา LOAD_BUDGET_MS) */
  async loadInitialPayload() {
    const budget = CONFIG.LOAD_BUDGET_MS || this.LOAD_BUDGET_MS;

    if (window.__BOOT_CACHE__) {
      const boot = window.__BOOT_CACHE__;
      delete window.__BOOT_CACHE__;
      return { success: true, ...boot, _fromCache: true };
    }

    const pref = await this.consumeSnapshotPrefetch();
    if (pref) {
      DataCache.set({ projects: pref.projects, departments: pref.departments });
      return pref;
    }

    const snap = await this.fetchSnapshot(budget);
    if (snap) {
      DataCache.set({ projects: snap.projects, departments: snap.departments });
      return snap;
    }

    return { success: true, projects: [], departments: [], _empty: true };
  },

  async fetchWithTimeout(url, options, timeoutMs) {
    const ms = timeoutMs || this.TIMEOUT_MS;
    let lastErr;
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return res;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        const retryable = err.name === 'AbortError' ||
          (err.message && /failed to fetch|network/i.test(err.message));
        if (attempt < this.MAX_RETRIES && retryable && ms >= 10000) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (err.name === 'AbortError') {
          throw new Error('API ช้าเกินไป — กำลังซิงค์ในพื้นหลัง ลองรีเฟรชอีกครั้ง');
        }
        throw err;
      }
    }
    throw lastErr;
  },

  parseResponseText(text, action) {
    if (text.indexOf('<!DOCTYPE') === 0 || text.indexOf('<html') >= 0) {
      throw new Error('API ยังไม่พร้อม — Deploy Web App (New version)');
    }
    let json;
    try { json = JSON.parse(text); } catch {
      throw new Error('ตอบกลับ API ไม่ถูกต้อง');
    }
    if (json.success === false) throw new Error(json.error || 'API ล้มเหลว');
    if (action === 'getProjects' && json.projects) {
      DataCache.set({ projects: json.projects, departments: json.departments });
    }
    return json;
  },

  async call(action, data = {}, opts = {}) {
    if (typeof CONFIG === 'undefined') throw new Error('โหลด config.js ไม่สำเร็จ');
    const apiUrl = (CONFIG.API_URL || '').trim();
    if (!apiUrl) throw new Error('ยังไม่ได้ตั้งค่า API_URL');

    if (action === 'getProjects' && !opts.skipCache) {
      const cached = DataCache.get();
      if (cached) return { success: true, ...cached };
    }

    const timeout = opts.timeoutMs || this.TIMEOUT_MS;
    const response = await this.fetchWithTimeout(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data })
    }, timeout);

    const text = await response.text();
    const json = this.parseResponseText(text, action);
    if (action === 'getProjects') json._fromApi = true;
    return json;
  },

  applyPayload(res) {
    if (res.projects) App.projects = res.projects;
    if (res.departments) App.departments = res.departments;
    if (typeof rebuildAppIndex === 'function') rebuildAppIndex();
    return res;
  },

  scheduleBackgroundRefresh() {
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => this.syncFromApiInBackground(), 400);
  },

  syncFromApiInBackground() {
    return this.call('getProjects', {}, { skipCache: true, timeoutMs: 120000 })
      .then(res => {
        this.applyPayload(res);
        DataCache.set({ projects: res.projects, departments: res.departments });
        hideSyncIndicator();
        refreshCurrentView();
        return res;
      })
      .catch(() => {});
  },

  refreshInBackground() {
    return this.syncFromApiInBackground();
  },

  getProjects(opts = {}) {
    if (opts.background) {
      return this.syncFromApiInBackground();
    }
    return this.call('getProjects', {}, opts);
  },

  getLicenseDetail(licenseId) {
    return this.call('getLicenseDetail', { licenseId }, { skipCache: true });
  },

  mergeLicenseDetail(licenseId, detail) {
    App.projects.forEach(p => {
      (p.licenses || []).forEach(l => {
        if (Number(l.id) === Number(licenseId)) {
          l.history = detail.history || [];
          l.steps = detail.steps || l.steps;
          l.renewalCycles = detail.renewalCycles || l.renewalCycles;
          l.status = detail.status || l.status;
        }
      });
    });
    DataCache.set({ projects: App.projects, departments: App.departments });
  },

  async saveProject(data) {
    const res = await this.call('saveProject', data, { skipCache: true });
    this.scheduleBackgroundRefresh();
    return res;
  },

  async saveLicense(data) {
    const res = await this.call('saveLicense', data, { skipCache: true });
    this.scheduleBackgroundRefresh();
    return res;
  },

  async saveLicenseSteps(data) {
    const res = await this.call('saveLicenseSteps', data, { skipCache: true });
    this.scheduleBackgroundRefresh();
    return res;
  },

  async saveTimelineUpdate(data) {
    const res = await this.call('saveTimelineUpdate', data, { skipCache: true });
    this.scheduleBackgroundRefresh();
    return res;
  },

  async completeRenewal(data) {
    const res = await this.call('completeRenewal', data, { skipCache: true });
    this.scheduleBackgroundRefresh();
    return res;
  },

  async sendTestEmail(data) {
    const res = await this.call('sendTestEmail', data, { skipCache: true });
    this.scheduleBackgroundRefresh();
    return res;
  },

  saveDepartment(data) {
    return this.call('saveDepartment', data, { skipCache: true }).then(res => {
      this.scheduleBackgroundRefresh();
      return res;
    });
  },

  deleteDepartment(data) {
    return this.call('deleteDepartment', data, { skipCache: true }).then(res => {
      this.scheduleBackgroundRefresh();
      return res;
    });
  },

  seedMockData(data) {
    return this.call('seedMockData', data || {}, { skipCache: true, timeoutMs: 120000 }).then(res => {
      if (res.projects) this.applyPayload(res);
      return res;
    });
  }
};

/* app-index.js */
function rebuildAppIndex() {
  App.expiryEvents = [];
  App.projects.forEach(project => {
    (project.licenses || []).forEach(license => {
      if (!license.expiryDate) return;
      App.expiryEvents.push({
        date: license.expiryDate,
        project,
        license,
        status: Utils.calculateStatus(license.expiryDate, license.alertMonths).status
      });
    });
  });
}

/* app-state.js */
const App = {
  projects: [],
  departments: [],
  expiryEvents: [],
  currentView: 'dashboard',
  currentProjectId: null,
  activeTestProjectId: null,
  tempEmails: [],
  _syncing: false
};

function applyServerData(res) {
  Api.applyPayload(res);
}

function onProjectsLoaded(res) {
  applyServerData(res);
  hideSetupBanner();
  hideSyncIndicator();
  if (!App.projects.length && !res._syncing) {
    showSetupBanner('ยังไม่มีโครงการ — กด "โหลดข้อมูลทดลอง" หรือสร้างโครงการใหม่');
  } else if (res._empty && App._syncing) {
    showSetupBanner('กำลังซิงค์ข้อมูลจากเซิร์ฟเวอร์ครั้งแรก — อาจใช้เวลาสักครู่');
  }
  refreshCurrentView();
}

function onProjectsLoadError(err) {
  hideSyncIndicator();
  if (!DataCache.get() && !DataCache.getStale()) {
    showSetupBanner(err.message || 'โหลดข้อมูลไม่สำเร็จ');
    refreshCurrentView();
  }
}

function showSyncIndicator() {
  let el = document.getElementById('sync-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-indicator';
    el.className = 'sync-indicator';
    el.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> กำลังอัปเดต...';
    const header = document.querySelector('main header');
    if (header) header.appendChild(el);
  }
  el.style.display = '';
}

function hideSyncIndicator() {
  const el = document.getElementById('sync-indicator');
  if (el) el.style.display = 'none';
}

async function loadProjects() {
  const fresh = DataCache.get();
  const stalePack = !fresh && DataCache.getStale();
  const cached = fresh || stalePack?.data;

  if (cached) {
    applyServerData({ success: true, ...cached });
    refreshCurrentView();
    hideSetupBanner();
    if (stalePack?.stale) showSyncIndicator();
    App._syncing = true;
    Api.syncFromApiInBackground()
      .then(onProjectsLoaded)
      .catch(onProjectsLoadError)
      .finally(() => { App._syncing = false; });
    return;
  }

  showDashboardSkeleton();
  App._syncing = true;
  try {
    const res = await Api.loadInitialPayload();
    onProjectsLoaded(res);
    if (!res._fromApi) {
      showSyncIndicator();
      Api.syncFromApiInBackground()
        .then(onProjectsLoaded)
        .catch(onProjectsLoadError)
        .finally(() => { App._syncing = false; });
    } else {
      App._syncing = false;
    }
  } catch (err) {
    App._syncing = false;
    onProjectsLoadError(err);
  }
}

function showDashboardSkeleton() {
  const main = document.getElementById('main-content');
  if (!main) return;
  const wrap = document.createElement('div');
  wrap.className = 'page-skeleton';
  const grid = document.createElement('div');
  grid.className = 'skeleton-grid';
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('div');
    b.className = 'skeleton-block';
    grid.appendChild(b);
  }
  const msg = document.createElement('p');
  msg.className = 'skeleton-msg';
  msg.textContent = 'กำลังโหลด...';
  wrap.append(grid, msg);
  main.replaceChildren(wrap);
}

function showSetupBanner(msg) {
  let el = document.getElementById('setup-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'setup-banner';
    el.className = 'setup-banner';
    document.body.prepend(el);
  }
  el.innerHTML = '<b>แจ้งเตือน:</b> ' + Utils.escapeHtml(msg);
}

function hideSetupBanner() {
  const el = document.getElementById('setup-banner');
  if (el) el.remove();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
  document.getElementById('sidebar-overlay').classList.toggle('hidden');
}

function demoBadgeHtml(isDemo) {
  if (!isDemo) return '';
  return '<span class="demo-badge">ทดลอง</span>';
}

window.toggleSidebar = toggleSidebar;
window.loadProjects = loadProjects;
window.demoBadgeHtml = demoBadgeHtml;

/* app-departments.js */
function populateDepartmentSelect(selected) {
  const sel = document.getElementById('project-department');
  if (!sel) return;
  sel.replaceChildren();
  sel.append(new Option('-- เลือกแผนก --', ''));
  (App.departments || []).forEach(d => {
    sel.append(new Option(d.name, d.name, false, d.name === selected));
  });
}

function openDepartmentModal() {
  renderDepartmentList();
  openModal('departmentModal');
}

function renderDepartmentList() {
  const list = document.getElementById('department-list');
  if (!list) return;
  list.replaceChildren();

  if (!(App.departments || []).length) {
    const p = document.createElement('p');
    p.className = 'text-sm text-slate-500 text-center py-4';
    p.textContent = 'ยังไม่มีแผนก';
    list.append(p);
    return;
  }

  App.departments.forEach(d => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-2 bg-slate-50 border rounded-xl px-3 py-2';

    const info = document.createElement('div');
    info.className = 'min-w-0 flex-1';
    const title = document.createElement('p');
    title.className = 'font-bold text-sm truncate';
    title.textContent = d.name;
    const sub = document.createElement('p');
    sub.className = 'text-[11px] text-slate-500';
    sub.textContent = 'โครงการ ' + d.projectCount + ' รายการ';
    info.append(title, sub);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'text-xs px-2 py-1 rounded border shrink-0 ' +
      (d.canDelete ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-slate-400 border-slate-200 cursor-not-allowed');
    btn.textContent = 'ลบ';
    btn.disabled = !d.canDelete;
    btn.title = d.canDelete ? 'ลบแผนก' : 'มีโครงการใช้งาน — ลบไม่ได้';
    btn.onclick = () => deleteDepartment(d.id);

    row.append(info, btn);
    list.append(row);
  });
}

async function addDepartment() {
  const input = document.getElementById('new-department-name');
  const name = input.value.trim();
  if (!name) return showToast('กรุณาระบุชื่อแผนก', 'error');

  try {
    await Api.saveDepartment({ name });
    input.value = '';
    showToast('เพิ่มแผนกแล้ว');
    await Api.refreshInBackground();
    renderDepartmentList();
    populateDepartmentSelect();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteDepartment(id) {
  if (!confirm('ลบแผนกนี้?')) return;
  try {
    await Api.deleteDepartment({ id });
    showToast('ลบแผนกแล้ว');
    await Api.refreshInBackground();
    renderDepartmentList();
    populateDepartmentSelect();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadDemoData() {
  Utils.setLoading(true);
  try {
    const res = await Api.seedMockData({ force: false });
    applyServerData(res);
    renderSidebar();
    showDashboard();
    showToast(res.message || 'โหลดข้อมูลทดลองแล้ว');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

Object.assign(window, {
  openDepartmentModal, addDepartment, deleteDepartment, loadDemoData, populateDepartmentSelect
});

/* app-sidebar.js */
let _sidebarSearchBound = false;

function renderSidebar(light) {
  const container = document.getElementById('project-list-container');
  const searchInput = document.getElementById('project-search');
  if (!container) return;

  if (!_sidebarSearchBound && searchInput) {
    _sidebarSearchBound = true;
    searchInput.addEventListener('input', Utils.debounce(() => renderSidebar(true), 180));
    searchInput.removeAttribute('onkeyup');
  }

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  container.replaceChildren();

  const filtered = App.projects.filter(p => p.name.toLowerCase().includes(searchTerm));
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'text-slate-500 text-xs text-center mt-6 py-6 bg-slate-900/30 rounded-xl border border-slate-800/50';
    empty.textContent = searchTerm ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการ';
    container.appendChild(empty);
    return;
  }

  const grouped = {};
  filtered.forEach(p => {
    const dept = p.department || 'ไม่ระบุแผนก';
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(p);
  });

  for (const [dept, projs] of Object.entries(grouped)) {
    let deptIcon = 'fa-folder';
    if (dept.includes('ก่อสร้าง')) deptIcon = 'fa-helmet-safety';
    else if (dept.includes('นิติบุคคล')) deptIcon = 'fa-building-user';
    else if (dept.includes('ส่วนกลาง')) deptIcon = 'fa-building';

    const section = document.createElement('section');
    section.className = 'mb-4';
    const heading = document.createElement('p');
    heading.className = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 flex items-center gap-1.5';
    heading.innerHTML = '<i class="fa-solid ' + deptIcon + '"></i> ' + Utils.escapeHtml(dept);
    section.appendChild(heading);

    const ul = document.createElement('ul');
    ul.className = 'space-y-1';

    projs.forEach(project => {
      const st = Utils.getProjectStatus(project);
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = App.currentProjectId === project.id;
      btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 group ' +
        (active ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent');
      btn.onclick = () => renderProjectView(project.id);

      const dot = document.createElement('span');
      dot.className = 'sidebar-dot ' + st.pill;
      dot.title = st.text;

      const label = document.createElement('span');
      label.className = 'truncate flex-1';
      label.innerHTML = Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo);

      const badge = document.createElement('span');
      badge.className = 'bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-md shrink-0';
      badge.textContent = String(project.licenses?.length || 0);

      btn.append(dot, label, badge);
      li.appendChild(btn);
      ul.appendChild(li);
    });

    section.appendChild(ul);
    container.appendChild(section);
  }
}

window.renderSidebar = renderSidebar;

/* app-calendar.js */
﻿App.calYear = new Date().getFullYear();
App.calMonth = new Date().getMonth();

function renderCalendarPanel(container) {
  const wrap = document.createElement('section');
  wrap.className = 'cal-wrap mb-8';
  wrap.id = 'calendar-panel';

  const header = document.createElement('div');
  header.className = 'cal-header';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30';
  prev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';

  const center = document.createElement('div');
  center.className = 'text-center';
  const titleEl = document.createElement('p');
  titleEl.id = 'cal-title';
  titleEl.className = 'text-lg font-bold';
  const sub = document.createElement('p');
  sub.className = 'text-xs opacity-80';
  sub.textContent = 'ปฏิทินหมดอายุใบอนุญาต (พ.ศ.)';
  center.append(titleEl, sub);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30';
  next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';

  header.append(prev, center, next);

  const dow = document.createElement('div');
  dow.className = 'cal-grid border-b border-slate-100';
  Utils.TH_DOW.forEach(d => {
    const c = document.createElement('div');
    c.className = 'cal-dow';
    c.textContent = d;
    dow.appendChild(c);
  });

  const grid = document.createElement('div');
  grid.className = 'cal-grid';
  grid.id = 'cal-days-grid';

  wrap.append(header, dow, grid);
  container.appendChild(wrap);

  prev.onclick = () => {
    App.calMonth--;
    if (App.calMonth < 0) { App.calMonth = 11; App.calYear--; }
    paintCalendarDays();
  };
  next.onclick = () => {
    App.calMonth++;
    if (App.calMonth > 11) { App.calMonth = 0; App.calYear++; }
    paintCalendarDays();
  };
  paintCalendarDays();
}

function paintCalendarDays() {
  const title = document.getElementById('cal-title');
  const grid = document.getElementById('cal-days-grid');
  if (!title || !grid) return;

  title.textContent = Utils.formatMonthYear(App.calYear, App.calMonth);

  const first = new Date(App.calYear, App.calMonth, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(App.calYear, App.calMonth + 1, 0).getDate();
  const prevDays = new Date(App.calYear, App.calMonth, 0).getDate();

  const eventsByDay = {};
  (App.expiryEvents || []).forEach(ev => {
    const d = new Date(ev.date + 'T12:00:00');
    if (d.getFullYear() === App.calYear && d.getMonth() === App.calMonth) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const today = new Date();
  grid.replaceChildren();

  for (let i = 0; i < startDow; i++) {
    grid.appendChild(makeCalCell(prevDays - startDow + i + 1, true, [], false));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d && today.getMonth() === App.calMonth && today.getFullYear() === App.calYear;
    grid.appendChild(makeCalCell(d, false, eventsByDay[d] || [], isToday));
  }
  const total = startDow + daysInMonth;
  const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= rem; i++) {
    grid.appendChild(makeCalCell(i, true, [], false));
  }
}

function makeCalCell(dayNum, otherMonth, events, isToday) {
  const cell = document.createElement('div');
  cell.className = 'cal-day' + (otherMonth ? ' other-month' : '') + (isToday ? ' today' : '');

  const num = document.createElement('div');
  num.className = 'cal-day-num';
  num.innerHTML = String(dayNum) + (isToday ? ' <span>(วันนี้)</span>' : '');
  cell.appendChild(num);

  events.slice(0, 3).forEach(ev => {
    const el = document.createElement('div');
    const st = ev.status === 'expired' ? 'expired' : ev.status === 'warning' ? 'warn' : 'safe';
    el.className = 'cal-event ' + st;
    el.textContent = ev.license.name;
    el.title = ev.project.name + ' — ' + Utils.formatDate(ev.date);
    el.onclick = (e) => { e.stopPropagation(); renderProjectView(ev.project.id); };
    cell.appendChild(el);
  });
  if (events.length > 3) {
    const more = document.createElement('div');
    more.className = 'text-[10px] text-slate-400 mt-0.5';
    more.textContent = '+' + (events.length - 3) + ' รายการ';
    cell.appendChild(more);
  }
  return cell;
}

window.renderCalendarPanel = renderCalendarPanel;

/* app-timeline.js */
const TimelineUI = {
  render(license) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.replaceChildren();

    const steps = license.steps || [];
    if (!steps.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500 text-center py-4';
      empty.textContent = 'ยังไม่มีขั้นตอน — กรอกด้านบนแล้วกดบันทึก';
      container.appendChild(empty);
      return;
    }

    steps.forEach((step, idx) => {
      const done = (license.history || []).some(h => h.action === step);
      const current = license.status === step;
      const hist = (license.history || []).filter(h => h.action === step);
      const lastNote = hist.length ? hist[hist.length - 1] : null;

      const row = document.createElement('div');
      row.className = 'timeline-step' + (done ? ' done' : '') + (current ? ' current' : '');

      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      dot.innerHTML = done ? '<i class="fa-solid fa-check"></i>' : current ? '<i class="fa-solid fa-play"></i>' : '<span>' + (idx + 1) + '</span>';

      const body = document.createElement('div');
      body.className = 'timeline-body';
      const title = document.createElement('p');
      title.className = 'font-bold text-sm text-slate-800';
      title.textContent = step;
      body.appendChild(title);

      if (lastNote && lastNote.note) {
        const note = document.createElement('p');
        note.className = 'text-xs text-slate-600 mt-1';
        note.innerHTML = '<i class="fa-regular fa-comment mr-1"></i>' + Utils.escapeHtml(lastNote.note);
        body.appendChild(note);
      }
      if (lastNote) {
        const dt = document.createElement('p');
        dt.className = 'text-[10px] text-slate-400 mt-1';
        dt.textContent = Utils.formatDate(lastNote.date);
        body.appendChild(dt);
      }

      if (!done && !current) {
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'text-[11px] text-indigo-600 font-bold mt-2';
        pin.textContent = 'บันทึกขั้นตอนนี้';
        pin.onclick = () => {
          document.getElementById('update-step').value = step;
          document.getElementById('update-note').focus();
        };
        body.appendChild(pin);
      }

      row.append(dot, body);
      container.appendChild(row);
    });
  },

  renderLogs(license) {
    document.getElementById('log-count').textContent = (license.history?.length || 0) + ' ครั้ง';
    const logBox = document.getElementById('history-log-container');
    logBox.replaceChildren();
    if (license._historyLoading) {
      const loading = document.createElement('p');
      loading.className = 'text-center text-slate-400 text-sm py-6';
      loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> กำลังโหลดประวัติ...';
      logBox.appendChild(loading);
      return;
    }
    const list = [...(license.history || [])].reverse();
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'text-center text-slate-400 text-sm py-6';
      empty.textContent = 'ยังไม่มีประวัติ';
      logBox.appendChild(empty);
      return;
    }
    list.forEach(h => {
      const item = document.createElement('article');
      item.className = 'log-item';
      item.innerHTML =
        '<div class="flex justify-between gap-2 mb-1">' +
        '<span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">' + Utils.escapeHtml(h.action) + '</span>' +
        '<span class="text-[10px] text-slate-400">' + Utils.formatDate(h.date) + '</span></div>' +
        '<p class="text-sm text-slate-600">' + Utils.escapeHtml(h.note || '—') + '</p>';
      logBox.appendChild(item);
    });
  }
};

async function renderTimeline(projectId, licenseId) {
  const project = App.projects.find(p => p.id === projectId);
  let license = project?.licenses?.find(l => l.id === licenseId);
  if (!license) return;

  App.currentProjectId = projectId;
  document.getElementById('timelineModalTitle').textContent = license.name;
  document.getElementById('update-license-id').value = license.id;
  openModal('timelineModal');
  paintTimelineModal(license);

  const needsDetail = !license.steps?.length || !Array.isArray(license.history);
  if (!needsDetail) return;

  license._historyLoading = true;
  TimelineUI.renderLogs(license);
  try {
    const res = await Api.getLicenseDetail(licenseId);
    if (res.license) {
      Api.mergeLicenseDetail(licenseId, res.license);
      license = App.projects.find(p => p.id === projectId)?.licenses?.find(l => l.id === licenseId);
      if (license) {
        license._historyLoading = false;
        paintTimelineModal(license);
      }
    }
  } catch {
    if (license) {
      license._historyLoading = false;
      TimelineUI.renderLogs(license);
    }
  }
}

function paintTimelineModal(license) {
  const stepsEdit = document.getElementById('timeline-steps-edit');
  if (stepsEdit) {
    const defaultSteps = [
      'แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง',
      'ขอเอกสารสนับสนุนจากลูกค้า',
      'ได้รับเอกสารครบถ้วน',
      'ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ',
      'แจ้งผลให้ลูกค้าทราบ',
      'เสร็จสิ้นสมบูรณ์'
    ];
    stepsEdit.value = Utils.formatStepsText(license.steps?.length ? license.steps : defaultSteps);
  }
  TimelineUI.render(license);
  RenewalUI.renderPanel(license);
  TimelineUI.renderLogs(license);
  const select = document.getElementById('update-step');
  select.replaceChildren();
  select.append(new Option('-- เลือกขั้นตอน --', ''));
  (license.steps || []).forEach(s => select.append(new Option(s, s, false, license.status === s)));
}

async function saveLicenseSteps() {
  const licenseId = Number(document.getElementById('update-license-id').value);
  const projectId = App.currentProjectId;
  const license = Mutations.findLicense(projectId, licenseId);
  if (!license) return showToast('ไม่พบใบอนุญาต', 'error');

  const steps = Utils.parseStepsText(document.getElementById('timeline-steps-edit').value);
  if (!steps.length) return showToast('ต้องมีอย่างน้อย 1 ขั้นตอน', 'error');

  const status = Utils.resolveStatusAfterStepsChange(steps, license.status, license.history);

  Mutations.updateLicenseStepsLocal(projectId, licenseId, steps, status);
  paintTimelineModal(Mutations.findLicense(projectId, licenseId));
  showToast('บันทึกรายการขั้นตอนแล้ว');
  refreshCurrentView();

  try {
    await Api.saveLicenseSteps({ licenseId, steps });
    const res = await Api.getLicenseDetail(licenseId);
    if (res.license) {
      Api.mergeLicenseDetail(licenseId, res.license);
      paintTimelineModal(Mutations.findLicense(projectId, licenseId));
    }
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

window.renderTimeline = renderTimeline;
window.saveLicenseSteps = saveLicenseSteps;

/* app-renewal.js */
const RenewalUI = {
  renderPanel(license) {
    const panel = document.getElementById('renewal-panel');
    if (!panel) return;
    panel.replaceChildren();

    const current = document.createElement('div');
    current.className = 'renewal-current mb-4 p-3 rounded-xl border border-indigo-200 bg-indigo-50/50';
    const roundNum = Utils.renewalRoundCount(license) + 1;
    current.innerHTML =
      '<p class="text-xs font-bold text-indigo-800 uppercase mb-2"><i class="fa-solid fa-calendar-check mr-1"></i> รอบติดตามปัจจุบัน (รอบที่ ' + roundNum + ')</p>' +
      '<p class="text-sm"><span class="text-slate-500">วันเริ่ม:</span> <b>' + Utils.formatDate(license.issueDate) + '</b></p>' +
      '<p class="text-sm mt-1"><span class="text-slate-500">วันหมดอายุ:</span> <b>' + Utils.formatDate(license.expiryDate) + '</b></p>';
    panel.appendChild(current);

    const ready = Utils.isRenewalStepsComplete(license);
    const formWrap = document.createElement('div');
    formWrap.className = 'renewal-form-wrap mb-4 p-3 rounded-xl border ' +
      (ready ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-slate-50');

    if (ready) {
      const title = document.createElement('p');
      title.className = 'text-sm font-bold text-emerald-800 mb-3';
      title.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> ขั้นตอนครบแล้ว — กรอกวันสำหรับรอบติดตามถัดไป';
      formWrap.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-2 gap-3 mb-3';
      grid.innerHTML =
        '<label class="text-xs font-bold">วันเริ่มรอบใหม่ *<input type="date" id="renewal-issue-date" class="w-full border rounded-lg p-2 text-sm mt-1"></label>' +
        '<label class="text-xs font-bold">วันหมดอายุรอบใหม่ *<input type="date" id="renewal-expiry-date" class="w-full border rounded-lg p-2 text-sm mt-1"></label>';
      formWrap.appendChild(grid);

      const noteLbl = document.createElement('label');
      noteLbl.className = 'text-xs font-bold block mb-3';
      noteLbl.innerHTML = 'หมายเหตุ (ไม่บังคับ)<textarea id="renewal-note" rows="2" class="w-full border rounded-lg p-2 text-sm mt-1" placeholder="เช่น ต่อใบอนุญาตครั้งที่ 2"></textarea>';
      formWrap.appendChild(noteLbl);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full btn-primary py-2.5 text-sm';
      btn.innerHTML = '<i class="fa-solid fa-rotate mr-1"></i> บันทึกและเริ่มรอบติดตามใหม่';
      btn.onclick = () => saveCompleteRenewal(license.id);
      formWrap.appendChild(btn);
    } else {
      formWrap.innerHTML =
        '<p class="text-sm text-slate-600"><i class="fa-solid fa-info-circle mr-1"></i> เมื่อบันทึกขั้นตอน <b>เสร็จสิ้นสมบูรณ์</b> ครบแล้ว จึงจะกรอกวันเริ่ม/หมดอายุรอบถัดไปได้</p>';
    }
    panel.appendChild(formWrap);

    const histTitle = document.createElement('p');
    histTitle.className = 'text-xs font-bold text-slate-600 uppercase mb-2 mt-2';
    histTitle.innerHTML = '<i class="fa-solid fa-clock-rotate-left mr-1"></i> ประวัติรอบต่ออายุย้อนหลัง (' + Utils.renewalRoundCount(license) + ' รอบ)';
    panel.appendChild(histTitle);

    const cycles = [...(license.renewalCycles || [])].reverse();
    if (!cycles.length) {
      const empty = document.createElement('p');
      empty.className = 'text-xs text-slate-400 text-center py-4 bg-white rounded-lg border border-dashed';
      empty.textContent = 'ยังไม่มีรอบย้อนหลัง — หลังบันทึกรอบใหม่จะแสดงที่นี่';
      panel.appendChild(empty);
      return;
    }

    cycles.forEach(c => {
      const card = document.createElement('article');
      card.className = 'renewal-round-card';
      card.innerHTML =
        '<div class="flex justify-between items-start gap-2 mb-1">' +
        '<span class="text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">รอบที่ ' + c.round + '</span>' +
        '<span class="text-[10px] text-slate-400">บันทึก ' + Utils.formatDate(c.archivedAt) + '</span></div>' +
        '<p class="text-sm text-slate-700">' + Utils.formatDate(c.issueDate) + ' → ' + Utils.formatDate(c.expiryDate) + '</p>' +
        (c.note ? '<p class="text-xs text-slate-500 mt-1">' + Utils.escapeHtml(c.note) + '</p>' : '');
      panel.appendChild(card);
    });
  }
};

async function saveCompleteRenewal(licenseId) {
  const issueDate = document.getElementById('renewal-issue-date')?.value;
  const expiryDate = document.getElementById('renewal-expiry-date')?.value;
  const note = document.getElementById('renewal-note')?.value?.trim() || '';
  if (!issueDate || !expiryDate) return showToast('กรุณากรอกวันเริ่มและวันหมดอายุรอบใหม่', 'error');
  if (new Date(expiryDate + 'T12:00:00') <= new Date(issueDate + 'T12:00:00')) {
    return showToast('วันหมดอายุต้องหลังวันเริ่ม', 'error');
  }

  Mutations.completeRenewalLocal(licenseId, issueDate, expiryDate, note);
  showToast('บันทึกรอบต่ออายุและเริ่มติดตามรอบใหม่แล้ว');
  renderTimeline(App.currentProjectId, licenseId);
  renderProjectView(App.currentProjectId);

  try {
    await Api.completeRenewal({ licenseId, issueDate, expiryDate, note });
  } catch (err) {
    showToast('ซิงค์ไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

window.saveCompleteRenewal = saveCompleteRenewal;

/* app-dashboard.js */
App.dashboardTab = 'overview';

function showDashboard() {
  App.currentView = 'dashboard';
  App.currentProjectId = null;
  App.dashboardTab = App.dashboardTab || 'overview';
  renderSidebar(true);

  document.getElementById('page-title').innerHTML =
    '<i class="fa-solid fa-chart-pie text-indigo-500"></i> ภาพรวมระบบ';

  const content = document.getElementById('main-content');
  content.replaceChildren();

  const tabs = document.createElement('div');
  tabs.className = 'flex gap-2 mb-6';
  ['overview', 'calendar'].forEach(tab => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.tab = tab;
    btn.className = 'tab-btn' + (App.dashboardTab === tab ? ' active' : '');
    btn.innerHTML = tab === 'overview'
      ? '<i class="fa-solid fa-grid-2 mr-1"></i> โครงการ'
      : '<i class="fa-solid fa-calendar-days mr-1"></i> ปฏิทิน';
    btn.onclick = () => { App.dashboardTab = tab; showDashboard(); };
    tabs.appendChild(btn);
  });
  content.appendChild(tabs);

  if (App.dashboardTab === 'calendar') {
    renderCalendarPanel(content);
    return;
  }

  let totalLics = 0, expCount = 0, warnCount = 0;
  App.projects.forEach(p => {
    const c = Utils.licenseCounts(p.licenses);
    totalLics += c.total;
    expCount += c.expired;
    warnCount += c.warning;
  });

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8';
  grid.append(
    makeStatCard(App.projects.length, 'โครงการ', 'fa-building', 'indigo'),
    makeStatCard(totalLics, 'ใบอนุญาต', 'fa-file-contract', 'slate'),
    makeStatCard(warnCount, 'ใกล้หมดอายุ', 'fa-clock', 'amber'),
    makeStatCard(expCount, 'หมดอายุ', 'fa-triangle-exclamation', 'rose')
  );
  content.appendChild(grid);

  const sortedProjects = Utils.sortProjectsByPriority(App.projects);

  const hProjects = document.createElement('h3');
  hProjects.className = 'text-lg font-bold text-slate-800 mb-1 flex items-center gap-2';
  hProjects.innerHTML = '<i class="fa-solid fa-layer-group text-indigo-500"></i> สถานะทุกโครงการ';
  content.appendChild(hProjects);

  const hint = document.createElement('p');
  hint.className = 'text-xs text-slate-500 mb-4';
  hint.textContent = 'เรียงตามความสำคัญ: หมดอายุ → ใกล้หมดอายุ → ปกติ → ไม่มีใบอนุญาต (#1 = เร่งด่วนที่สุด)';
  content.appendChild(hint);

  if (!sortedProjects.length) {
    const empty = document.createElement('p');
    empty.className = 'text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed mb-8';
    empty.textContent = 'ยังไม่มีโครงการ — กดโหลดข้อมูลทดลองหรือสร้างโครงการใหม่';
    content.appendChild(empty);
  } else {
    content.appendChild(renderProjectsByPriority(sortedProjects));
  }

  const hAlert = document.createElement('h3');
  hAlert.className = 'text-lg font-bold text-slate-800 mb-4 flex items-center gap-2';
  hAlert.innerHTML = '<i class="fa-solid fa-bell text-rose-500"></i> แจ้งเตือนด่วน';
  content.appendChild(hAlert);

  const alerts = [];
  App.projects.forEach(project => {
    (project.licenses || []).forEach(license => {
      const st = Utils.calculateStatus(license.expiryDate, license.alertMonths);
      if (st.status !== 'safe') alerts.push({ project, license, st });
    });
  });

  const list = document.createElement('div');
  list.className = 'space-y-3';
  if (!alerts.length) {
    const ok = document.createElement('p');
    ok.className = 'text-center py-8 text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-100';
    ok.innerHTML = '<i class="fa-solid fa-circle-check mr-2"></i>ไม่มีใบอนุญาตที่ต้องแจ้งเตือน';
    list.appendChild(ok);
  } else {
    alerts.sort(Utils.compareAlertsByPriority.bind(Utils));
    alerts.forEach(a => list.appendChild(buildAlertRow(a.project, a.license, a.st)));
  }
  content.appendChild(list);
}

const DASHBOARD_PRIORITY_GROUPS = [
  { status: 'expired', label: 'เร่งด่วน — มีใบอนุญาตหมดอายุ', icon: 'fa-triangle-exclamation', headerClass: 'text-rose-700 bg-rose-50 border-rose-200' },
  { status: 'warning', label: 'ต้องติดตาม — ใกล้หมดอายุ', icon: 'fa-clock', headerClass: 'text-amber-800 bg-amber-50 border-amber-200' },
  { status: 'safe', label: 'ปกติ', icon: 'fa-circle-check', headerClass: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  { status: 'empty', label: 'ยังไม่มีใบอนุญาต', icon: 'fa-inbox', headerClass: 'text-slate-600 bg-slate-100 border-slate-200' }
];

function renderProjectsByPriority(sortedProjects) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6 mb-8';

  let globalRank = 0;
  DASHBOARD_PRIORITY_GROUPS.forEach(group => {
    const inGroup = sortedProjects.filter(p => Utils.getProjectStatus(p).status === group.status);
    if (!inGroup.length) return;

    const section = document.createElement('section');
    const head = document.createElement('div');
    head.className = 'flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border mb-3 ' + group.headerClass;
    head.innerHTML = '<i class="fa-solid ' + group.icon + '"></i> ' + group.label +
      ' <span class="ml-auto text-xs font-black opacity-70">' + inGroup.length + ' โครงการ</span>';
    section.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';

    inGroup.forEach(p => {
      globalRank += 1;
      grid.appendChild(buildProjectDashboardCard(p, globalRank));
    });

    section.appendChild(grid);
    wrap.appendChild(section);
  });

  return wrap;
}

function makeStatCard(num, label, icon, tone) {
  const el = document.createElement('div');
  el.className = 'stat-card';
  const colors = { indigo: 'text-indigo-600', amber: 'text-amber-600', rose: 'text-rose-600', slate: 'text-slate-800' };
  const top = document.createElement('div');
  top.className = 'flex items-center justify-between mb-2';
  top.innerHTML = '<i class="fa-solid ' + icon + ' text-2xl opacity-40"></i>';
  const numEl = document.createElement('p');
  numEl.className = 'text-3xl font-black ' + (colors[tone] || '');
  numEl.textContent = String(num);
  const lbl = document.createElement('p');
  lbl.className = 'text-xs font-bold text-slate-500 uppercase mt-1';
  lbl.textContent = label;
  el.append(top, numEl, lbl);
  return el;
}

function buildProjectDashboardCard(project, rank) {
  const st = Utils.getProjectStatus(project);
  const card = document.createElement('article');
  card.className = 'project-card ' + st.border;
  card.onclick = () => renderProjectView(project.id);
  const urgentDays = Utils.nearestUrgentExpiryDays(project);

  const head = document.createElement('div');
  head.className = 'flex justify-between items-start gap-2 mb-2';
  const rankBadge = rank
    ? '<span class="text-[10px] font-black text-slate-400 bg-slate-100 border rounded px-1.5 py-0.5 shrink-0" title="ลำดับความสำคัญ">#' + rank + '</span>'
    : '';
  head.innerHTML =
    '<div class="flex items-start gap-2 min-w-0 flex-1">' + rankBadge +
    '<h4 class="font-bold text-slate-800 leading-snug">' + Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo) + '</h4></div>' +
    '<span class="status-pill ' + st.pill + ' shrink-0">' + st.text + '</span>';

  const dept = document.createElement('p');
  dept.className = 'text-xs text-slate-500 mb-2';
  dept.innerHTML = '<i class="fa-solid fa-tag mr-1"></i>' + Utils.escapeHtml(project.department || '-');

  const counts = document.createElement('div');
  counts.className = 'flex gap-3 text-[11px] text-slate-600';
  counts.innerHTML =
    '<span class="text-emerald-600"><i class="fa-solid fa-circle text-[6px]"></i> ' + st.counts.safe + '</span>' +
    '<span class="text-amber-600"><i class="fa-solid fa-circle text-[6px]"></i> ' + st.counts.warning + '</span>' +
    '<span class="text-rose-600"><i class="fa-solid fa-circle text-[6px]"></i> ' + st.counts.expired + '</span>';

  const drive = document.createElement('p');
  const hasDrive = !!Utils.getProjectDriveUrl(project);
  drive.className = hasDrive ? 'text-[11px] text-blue-600 mt-2 truncate' : 'text-[11px] text-slate-400 mt-2';
  drive.innerHTML = hasDrive
    ? '<i class="fa-brands fa-google-drive mr-1"></i>มีลิงก์ Drive — เปิดได้จากหน้าโครงการ'
    : '<i class="fa-brands fa-google-drive mr-1"></i>ยังไม่มีลิงก์ — ต้องใส่ URL ก่อนเปิดไฟล์';

  card.append(head, dept, counts, drive);

  if (urgentDays < 99999 && st.status !== 'safe' && st.status !== 'empty') {
    const urgent = document.createElement('p');
    urgent.className = 'text-[11px] font-bold mt-2 ' + (urgentDays < 0 ? 'text-rose-600' : 'text-amber-600');
    urgent.innerHTML = urgentDays < 0
      ? '<i class="fa-solid fa-calendar-xmark mr-1"></i>หมดอายุแล้ว ' + Math.abs(urgentDays) + ' วัน'
      : '<i class="fa-solid fa-calendar-day mr-1"></i>หมดอายุในอีก ' + urgentDays + ' วัน';
    card.appendChild(urgent);
  }

  return card;
}

function buildAlertRow(project, license, st) {
  const row = document.createElement('article');
  row.className = 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow';
  const info = document.createElement('div');
  info.innerHTML =
    '<p class="font-bold text-sm">' + Utils.escapeHtml(license.name) + ' <span class="status-pill ' + st.status + ' ml-1">' + st.text + '</span></p>' +
    '<p class="text-xs text-slate-500 mt-1">' + Utils.escapeHtml(project.name) + ' · หมดอายุ ' + Utils.formatDate(license.expiryDate) + '</p>';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-primary text-sm px-4 py-2 shrink-0';
  btn.textContent = 'จัดการ';
  btn.onclick = () => renderProjectView(project.id);
  row.append(info, btn);
  return row;
}

window.showDashboard = showDashboard;

/* app-project.js */
function renderProjectView(projectId) {
  App.currentView = 'project';
  App.currentProjectId = projectId;
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  }
  renderSidebar(true);

  const project = App.projects.find(p => p.id === projectId);
  if (!project) return;

  const pst = Utils.getProjectStatus(project);
  const hasDrive = !!Utils.getProjectDriveUrl(project);

  document.getElementById('page-title').innerHTML =
    '<span class="flex items-center gap-3 w-full truncate"><i class="fa-regular fa-building text-indigo-500"></i>' +
    Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo) +
    '<span class="status-pill ' + pst.pill + ' ml-1">' + pst.text + '</span>' +
    '<button type="button" onclick="openProjectModal(' + project.id + ')" class="ml-auto text-xs bg-slate-100 px-2 py-1 rounded border shrink-0">แก้ไข</button></span>';

  const content = document.getElementById('main-content');
  content.replaceChildren();

  const driveSection = document.createElement('section');
  driveSection.className = 'drive-box mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3';

  const info = document.createElement('div');
  info.className = 'flex-1 min-w-0';
  if (hasDrive) {
    info.innerHTML =
      '<p class="text-xs font-bold text-blue-800 uppercase mb-1"><i class="fa-brands fa-google-drive mr-1"></i> Google Drive โครงการ</p>' +
      '<p class="text-sm text-slate-600 truncate">' + Utils.escapeHtml(project.driveUrl) + '</p>' +
      '<p class="text-[11px] text-slate-500 mt-1">โฟลเดอร์นี้ใช้เปิดเอกสารของทุกใบอนุญาตในโครงการนี้</p>';
  } else {
    info.innerHTML =
      '<p class="text-sm font-bold text-slate-700"><i class="fa-brands fa-google-drive mr-2 text-blue-500"></i>ยังไม่มีลิงก์ Google Drive</p>' +
      '<p class="text-xs text-slate-500 mt-1">โครงการละ 1 ลิงก์ — วาง URL ก่อนจึงจะกดเปิดไฟล์ได้</p>';
  }

  const driveActions = document.createElement('div');
  driveActions.className = 'flex flex-wrap gap-2 shrink-0';
  driveActions.appendChild(Utils.buildDriveOpenControl(project, {
    label: 'เปิดโฟลเดอร์ Drive',
    disabledLabel: 'เปิด Drive (ต้องใส่ลิงก์ก่อน)'
  }));
  if (!hasDrive) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'text-sm font-bold text-indigo-600 border border-indigo-200 bg-white px-4 py-2 rounded-xl';
    edit.textContent = 'ใส่ลิงก์ Drive';
    edit.onclick = () => openProjectModal(project.id);
    driveActions.appendChild(edit);
  }
  driveSection.append(info, driveActions);
  content.appendChild(driveSection);

  const header = document.createElement('section');
  header.className = 'bg-white p-5 rounded-2xl shadow-sm border mb-6 flex flex-col md:flex-row gap-4 justify-between';

  const emailWrap = document.createElement('div');
  emailWrap.innerHTML = '<p class="text-xs font-bold text-slate-400 uppercase mb-2">อีเมลรับแจ้งเตือน (ไม่บังคับ)</p>';
  const emailTags = document.createElement('p');
  emailTags.className = 'flex flex-wrap gap-2 text-[11px]';
  (project.emails || []).forEach(e => {
    const s = document.createElement('span');
    s.className = 'bg-slate-100 px-2 py-1 rounded border';
    s.textContent = e;
    emailTags.append(s);
  });
  if (!(project.emails || []).length) {
    const none = document.createElement('span');
    none.className = 'text-xs text-slate-400 italic';
    none.textContent = 'ยังไม่ได้ตั้งอีเมลแจ้งเตือน';
    emailTags.append(none);
  }
  emailWrap.append(emailTags);
  const testBtn = document.createElement('button');
  testBtn.type = 'button';
  testBtn.className = 'text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-lg border mt-2';
  testBtn.textContent = 'ทดสอบส่งแจ้งเตือน';
  testBtn.onclick = () => openTestEmailModal(project.id);
  emailWrap.append(testBtn);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl self-start';
  addBtn.textContent = '+ เพิ่มใบอนุญาต';
  addBtn.onclick = () => openLicenseModal();
  header.append(emailWrap, addBtn);
  content.appendChild(header);

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold mb-4 flex items-center gap-2';
  title.innerHTML = '<i class="fa-solid fa-file-contract text-emerald-500"></i> ใบอนุญาตในโครงการ';
  content.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-5';
  const licenses = project.licenses || [];
  if (!licenses.length) {
    const empty = document.createElement('p');
    empty.className = 'col-span-full text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed';
    empty.textContent = 'ยังไม่มีใบอนุญาตในโครงการนี้';
    grid.append(empty);
  } else {
    licenses.forEach(l => grid.append(buildLicenseCard(project, l)));
  }
  content.appendChild(grid);
}

function buildLicenseCard(project, l) {
  const st = Utils.calculateStatus(l.expiryDate, l.alertMonths);
  const card = document.createElement('article');
  card.className = 'bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden hover:shadow-md transition-shadow';

  const top = document.createElement('header');
  top.className = 'p-5 border-b relative';
  const rounds = Utils.renewalRoundCount(l);
  top.innerHTML =
    '<h4 class="text-lg font-bold pr-24">' + Utils.escapeHtml(l.name) + '</h4>' +
    '<p class="text-xs text-slate-500 mt-1">ขั้นตอน: <b class="text-purple-600">' + Utils.escapeHtml(l.status || 'ยังไม่เริ่ม') + '</b>' +
    (rounds ? ' · <span class="text-indigo-600">ต่อแล้ว ' + rounds + ' รอบ</span>' : '') + '</p>' +
    '<span class="absolute top-4 right-4 status-pill ' + st.status + '">' + st.text + '</span>';
  card.append(top);

  const mid = document.createElement('div');
  mid.className = 'p-4 text-sm grid grid-cols-2 gap-4 bg-slate-50/50';
  mid.innerHTML =
    '<div><p class="text-[10px] text-slate-400 uppercase">ออก</p><p class="font-semibold">' + Utils.formatDate(l.issueDate) + '</p></div>' +
    '<div><p class="text-[10px] text-slate-400 uppercase">หมดอายุ</p><p class="font-semibold">' + Utils.formatDate(l.expiryDate) + '</p></div>';
  card.append(mid);

  const actions = document.createElement('footer');
  actions.className = 'p-4 border-t flex gap-2 flex-wrap';
  actions.appendChild(Utils.buildDriveOpenControl(project, {
    className: 'text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg border font-bold inline-flex items-center gap-1',
    disabledClassName: 'text-xs bg-slate-100 text-slate-400 px-3 py-2 rounded-lg border font-bold inline-flex items-center gap-1 cursor-not-allowed',
    label: 'เปิดไฟล์ Drive',
    disabledLabel: 'Drive (ใส่ลิงก์โครงการก่อน)'
  }));
  const timelineBtn = document.createElement('button');
  timelineBtn.type = 'button';
  timelineBtn.className = 'flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm';
  timelineBtn.innerHTML = '<i class="fa-solid fa-list-check mr-1"></i> ขั้นตอน / ประวัติ';
  timelineBtn.onclick = () => renderTimeline(project.id, l.id);
  actions.append(timelineBtn);
  card.append(actions);
  return card;
}

window.renderProjectView = renderProjectView;

/* app-modals.js */
function handleEmailInput(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const email = e.target.value.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (!App.tempEmails.includes(email)) {
      App.tempEmails.push(email);
      renderEmailTags();
      e.target.value = '';
    } else showToast('อีเมลนี้ถูกเพิ่มไปแล้ว', 'error');
  } else if (email) showToast('รูปแบบอีเมลไม่ถูกต้อง', 'error');
}

function removeEmailTag(index) {
  App.tempEmails.splice(index, 1);
  renderEmailTags();
}

function renderEmailTags() {
  const container = document.getElementById('email-tags');
  const counter = document.getElementById('email-counter');
  if (!container || !counter) return;
  container.replaceChildren();
  App.tempEmails.forEach((email, i) => {
    const span = document.createElement('span');
    span.className = 'inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded border';
    span.textContent = email + ' ';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.onclick = () => removeEmailTag(i);
    span.append(btn);
    container.append(span);
  });
  counter.textContent = App.tempEmails.length ? App.tempEmails.length + ' อีเมล' : 'ไม่บังคับ';
  counter.className = 'text-xs font-bold text-slate-500';
}

function openProjectModal(projectId = null) {
  document.getElementById('project-id').value = '';
  document.getElementById('project-name').value = '';
  document.getElementById('email-input').value = '';
  const driveEl = document.getElementById('project-drive-url');
  if (driveEl) driveEl.value = '';
  App.tempEmails = [];
  const title = document.getElementById('projectModalTitle');
  let dept = '';

  if (projectId) {
    const project = App.projects.find(p => p.id === projectId);
    if (project) {
      title.textContent = 'แก้ไขโครงการ';
      document.getElementById('project-id').value = project.id;
      document.getElementById('project-name').value = project.name;
      dept = project.department || '';
      if (driveEl) driveEl.value = project.driveUrl || '';
      App.tempEmails = [...(project.emails || [])];
    }
  } else {
    title.textContent = 'เพิ่มโครงการใหม่';
  }
  populateDepartmentSelect(dept);
  renderEmailTags();
  openModal('projectModal');
}

async function saveProject() {
  const id = document.getElementById('project-id').value;
  const name = document.getElementById('project-name').value.trim();
  const department = document.getElementById('project-department').value;
  const driveUrl = (document.getElementById('project-drive-url') || {}).value?.trim() || '';
  if (!name || !department) return showToast('กรุณากรอกชื่อและแผนก', 'error');

  const payload = { id: id || undefined, name, department, emails: App.tempEmails, driveUrl };
  const localId = Mutations.upsertProjectLocal(payload);
  closeModal('projectModal');
  showToast('บันทึกโครงการแล้ว');
  refreshCurrentView();

  try {
    await Api.saveProject(payload);
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

function openLicenseModal() {
  document.getElementById('license-name').value = '';
  document.getElementById('license-issue-date').value = '';
  document.getElementById('license-expiry-date').value = '';
  document.getElementById('license-alert-months').value = '3';
  document.getElementById('license-steps').value =
    '1. แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง\n2. ขอเอกสารสนับสนุนจากลูกค้า\n3. ได้รับเอกสารครบถ้วน\n4. ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ\n5. แจ้งผลให้ลูกค้าทราบ\n6. เสร็จสิ้นสมบูรณ์';
  openModal('licenseModal');
}

async function saveLicense() {
  const name = document.getElementById('license-name').value.trim();
  const issueDate = document.getElementById('license-issue-date').value;
  const expiryDate = document.getElementById('license-expiry-date').value;
  const alertMonths = parseInt(document.getElementById('license-alert-months').value, 10) || 3;
  const stepsTxt = document.getElementById('license-steps').value;
  if (!name || !issueDate || !expiryDate) return showToast('กรุณากรอกข้อมูลสำคัญให้ครบ', 'error');

  const steps = Utils.parseStepsText(stepsTxt);
  const payload = {
    projectId: App.currentProjectId,
    name, issueDate, expiryDate, alertMonths, driveUrl: '', steps,
    status: 'รอเริ่มดำเนินการ'
  };

  Mutations.addLicenseLocal(App.currentProjectId, payload);
  closeModal('licenseModal');
  showToast('บันทึกใบอนุญาตแล้ว');
  refreshCurrentView();

  try {
    await Api.saveLicense(payload);
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

async function saveTimelineUpdate() {
  const licenseId = document.getElementById('update-license-id').value;
  const step = document.getElementById('update-step').value;
  const note = document.getElementById('update-note').value.trim();
  if (!step && !note) return showToast('กรุณาระบุขั้นตอนหรือหมายเหตุ', 'error');

  Mutations.timelineUpdateLocal(licenseId, step, note);
  document.getElementById('update-note').value = '';
  renderTimeline(App.currentProjectId, Number(licenseId));
  renderProjectView(App.currentProjectId);
  showToast('บันทึกขั้นตอนแล้ว');

  try {
    await Api.saveTimelineUpdate({ licenseId, step, note });
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

function openTestEmailModal(projectId) {
  const project = App.projects.find(p => p.id === projectId);
  if (!project) return;
  App.activeTestProjectId = projectId;
  const select = document.getElementById('test-email-license-select');
  select.replaceChildren();
  if (!(project.licenses || []).length) {
    select.append(new Option('ยังไม่มีใบอนุญาต', ''));
    document.getElementById('mock-email-preview').textContent = 'กรุณาเพิ่มใบอนุญาตก่อน';
  } else {
    project.licenses.forEach(l => select.append(new Option(l.name, l.id)));
    updateMockEmailPreview();
  }
  openModal('testEmailModal');
}

function updateMockEmailPreview() {
  const project = App.projects.find(p => p.id === App.activeTestProjectId);
  const select = document.getElementById('test-email-license-select');
  const preview = document.getElementById('mock-email-preview');
  if (!select.value || !project) return;
  const l = project.licenses.find(x => String(x.id) === String(select.value));
  const exp = new Date(l.expiryDate);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const expStr = exp.getDate() + ' ' + months[exp.getMonth()] + ' ' + (exp.getFullYear() + 543);
  const to = (project.emails && project.emails.length) ? project.emails.join(', ') : '(ยังไม่มีอีเมล — ไม่สามารถส่งจริงได้)';
  preview.innerHTML = '<p><b>To:</b> ' + Utils.escapeHtml(to) + '</p>' +
    '<p><b>Subj:</b> [แจ้งเตือน] ' + Utils.escapeHtml(l.name) + '</p>' +
    '<p>โครงการ: ' + Utils.escapeHtml(project.name) + '<br>หมดอายุ: ' + expStr + '</p>';
}

async function sendTestEmail() {
  const select = document.getElementById('test-email-license-select');
  if (!select.value) return showToast('กรุณาเลือกใบอนุญาต', 'error');
  const saveLog = document.getElementById('test-email-save-log').checked;

  Utils.setLoading(true);
  try {
    await Api.sendTestEmail({
      projectId: App.activeTestProjectId,
      licenseId: select.value,
      saveLog
    });
    closeModal('testEmailModal');
    showToast('ส่งอีเมลทดสอบสำเร็จ');
    refreshCurrentView();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

Object.assign(window, {
  handleEmailInput, openProjectModal, saveProject, openLicenseModal, saveLicense,
  saveTimelineUpdate, openTestEmailModal, updateMockEmailPreview, sendTestEmail
});

/* app-main.js */
function bootstrapApp() {
  document.title = CONFIG.APP_TITLE || CONFIG.APP_NAME || 'Renew Aleart';
  const boot = window.__BOOT_CACHE__;
  const stale = DataCache.getStale();
  const cached = boot || DataCache.get() || stale?.data;
  if (cached) {
    Api.applyPayload({ success: true, ...cached });
    showDashboard();
    if (boot) delete window.__BOOT_CACHE__;
  }
  loadProjects();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
