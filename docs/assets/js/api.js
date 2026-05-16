const Api = {
  TIMEOUT_MS: 45000,

  async fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('API ใช้เวลานานเกินไป — ลอง Deploy Web App เวอร์ชันใหม่ใน Apps Script');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  },

  async call(action, data = {}) {
    if (typeof CONFIG === 'undefined') {
      throw new Error('โหลด config.js ไม่สำเร็จ — ลอง Ctrl+F5');
    }
    const apiUrl = (CONFIG.API_URL || '').trim();
    if (!apiUrl) {
      throw new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js');
    }

    const response = await this.fetchWithTimeout(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data })
    });

    const text = await response.text();
    if (text.indexOf('<!DOCTYPE') === 0 || text.indexOf('<html') >= 0) {
      throw new Error('API ยังไม่พร้อม — Deploy Web App (New version) หลัง clasp push');
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('ตอบกลับจาก API ไม่ถูกต้อง: ' + text.substring(0, 80));
    }

    if (json.success === false) {
      throw new Error(json.error || 'API ตอบกลับไม่สำเร็จ');
    }
    return json;
  },

  applyPayload(res) {
    if (res.projects) App.projects = res.projects;
    if (res.departments) App.departments = res.departments;
    return res;
  },

  getProjects() { return this.call('getProjects'); },
  saveProject(data) { return this.call('saveProject', data); },
  saveLicense(data) { return this.call('saveLicense', data); },
  saveTimelineUpdate(data) { return this.call('saveTimelineUpdate', data); },
  sendTestEmail(data) { return this.call('sendTestEmail', data); },
  saveDepartment(data) { return this.call('saveDepartment', data); },
  deleteDepartment(data) { return this.call('deleteDepartment', data); },
  seedMockData(data) { return this.call('seedMockData', data || {}); }
};
