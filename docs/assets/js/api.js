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

  withSession(data) {
    const token = typeof AuthStore !== 'undefined' ? AuthStore.getToken() : null;
    if (!token) return data;
    return { ...data, sessionToken: token };
  },

  async call(action, data = {}, opts = {}) {
    if (typeof CONFIG === 'undefined') throw new Error('โหลด config.js ไม่สำเร็จ');
    const apiUrl = (CONFIG.API_URL || '').trim();
    if (!apiUrl) throw new Error('ยังไม่ได้ตั้งค่า API_URL');

    const publicActions = { login: true, ping: true };
    const payload = publicActions[action] ? data : this.withSession(data);

    if (action === 'getProjects' && !opts.skipCache) {
      const cached = DataCache.get();
      if (cached) return { success: true, ...cached };
    }

    const timeout = opts.timeoutMs || this.TIMEOUT_MS;
    const response = await this.fetchWithTimeout(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data: payload })
    }, timeout);

    const text = await response.text();
    let json;
    try {
      json = this.parseResponseText(text, action);
    } catch (err) {
      if (/เข้าสู่ระบบ|เซสชัน|Unauthorized/i.test(err.message) && typeof Auth !== 'undefined') {
        Auth.forceLogout(err.message);
      }
      throw err;
    }
    if (action === 'getProjects') json._fromApi = true;
    return json;
  },

  applyPayload(res) {
    if (res.projects) App.projects = res.projects;
    if (res.departments) App.departments = res.departments;
    if (res.projects) {
      DataCache.set({ projects: App.projects, departments: App.departments });
    }
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

  async deleteProject(data) {
    const res = await this.call('deleteProject', data, { skipCache: true });
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

  login(data) {
    return this.call('login', data, { skipCache: true, timeoutMs: 30000 });
  },

  logout(data) {
    return this.call('logout', data || {}, { skipCache: true, timeoutMs: 15000 });
  },

  validateSession() {
    return this.call('validateSession', {}, { skipCache: true, timeoutMs: 15000 });
  },

  listUsers() {
    return this.call('listUsers', {}, { skipCache: true });
  },

  saveUser(data) {
    return this.call('saveUser', data, { skipCache: true });
  },

  deleteUser(data) {
    return this.call('deleteUser', data, { skipCache: true });
  },

};
