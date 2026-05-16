const Api = {
  TIMEOUT_MS: 35000,

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
    } else if (action !== 'getProjects' && action !== 'ping') {
      DataCache.clear();
    }

    return json;
  },

  applyPayload(res) {
    if (res.projects) App.projects = res.projects;
    if (res.departments) App.departments = res.departments;
    if (typeof rebuildAppIndex === 'function') rebuildAppIndex();
    return res;
  },

  getProjects() { return this.call('getProjects'); },
  saveProject(data) { DataCache.clear(); return this.call('saveProject', data, { skipCache: true }); },
  saveLicense(data) { DataCache.clear(); return this.call('saveLicense', data, { skipCache: true }); },
  saveTimelineUpdate(data) { DataCache.clear(); return this.call('saveTimelineUpdate', data, { skipCache: true }); },
  sendTestEmail(data) { DataCache.clear(); return this.call('sendTestEmail', data, { skipCache: true }); },
  saveDepartment(data) { DataCache.clear(); return this.call('saveDepartment', data, { skipCache: true }); },
  deleteDepartment(data) { DataCache.clear(); return this.call('deleteDepartment', data, { skipCache: true }); },
  seedMockData(data) { DataCache.clear(); return this.call('seedMockData', data || {}, { skipCache: true }); }
};
