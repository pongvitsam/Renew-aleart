const Api = {
  TIMEOUT_MS: 40000,
  MAX_RETRIES: 2,

  async fetchWithTimeout(url, options) {
    let lastErr;
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return res;
      } catch (err) {
        clearTimeout(timer);
        lastErr = err;
        const retryable = err.name === 'AbortError' ||
          (err.message && /failed to fetch|network/i.test(err.message));
        if (attempt < this.MAX_RETRIES && retryable) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        if (err.name === 'AbortError') {
          throw new Error(
            'API ช้าเกินไป — ครั้งแรกอาจใช้เวลา 30–60 วินาที ลองรีเฟรช หรือ Deploy Web App เวอร์ชันใหม่ใน Apps Script'
          );
        }
        throw err;
      }
    }
    throw lastErr;
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
      throw new Error('API ยังไม่พร้อม — Deploy Web App (New version) แล้วอัปเดต URL ใน config.js');
    }

    let json;
    try { json = JSON.parse(text); } catch {
      throw new Error('ตอบกลับ API ไม่ถูกต้อง — ตรวจ Deploy Web App และ API_URL');
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

  warmApi() {
    const url = (CONFIG.API_URL || '').trim();
    if (!url) return;
    this.fetchWithTimeout(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ping', data: {} })
    }).catch(() => {});
  },

  getProjects(opts = {}) {
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
    return this.call('seedMockData', data || {}, { skipCache: true }).then(res => {
      if (res.projects) this.applyPayload(res);
      return res;
    });
  }
};
