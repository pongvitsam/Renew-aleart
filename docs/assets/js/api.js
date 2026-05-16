const Api = {
  TIMEOUT_MS: 25000,
  _refreshTimer: null,

  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('API ช้าเกินไป — ลอง Deploy Web App เวอร์ชันใหม่');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  async call(action, data = {}, opts = {}) {
    if (typeof CONFIG === 'undefined') throw new Error('โหลด config.js ไม่สำเร็จ');
    const apiUrl = (CONFIG.API_URL || '').trim();
    if (!apiUrl) throw new Error('ยังไม่ได้ตั้งค่า API_URL');

    if (action === 'getProjects' && !opts.skipCache) {
      const cached = DataCache.get();
      if (cached) return { success: true, ...cached };
    }

    const response = await this.fetchWithTimeout(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data })
    });

    const text = await response.text();
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

  applyPayload(res) {
    if (res.projects) App.projects = res.projects;
    if (res.departments) App.departments = res.departments;
    if (typeof rebuildAppIndex === 'function') rebuildAppIndex();
    return res;
  },

  scheduleBackgroundRefresh() {
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => this.refreshInBackground(), 400);
  },

  refreshInBackground() {
    return this.call('getProjects', {}, { skipCache: true })
      .then(res => {
        this.applyPayload(res);
        DataCache.set({ projects: res.projects, departments: res.departments });
        refreshCurrentView();
      })
      .catch(() => {});
  },

  getProjects(opts) {
    return this.call('getProjects', {}, opts);
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

  async saveTimelineUpdate(data) {
    const res = await this.call('saveTimelineUpdate', data, { skipCache: true });
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
    return this.call('seedMockData', data || {}, { skipCache: true }).then(res => {
      if (res.projects) this.applyPayload(res);
      return res;
    });
  }
};
