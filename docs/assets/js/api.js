const Api = {
  async call(action, data = {}) {
    if (typeof CONFIG === 'undefined') {
      throw new Error('โหลด config.js ไม่สำเร็จ — ลอง Ctrl+F5');
    }
    const apiUrl = (CONFIG.API_URL || '').trim();
    if (!apiUrl) {
      throw new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data })
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('ตอบกลับจาก API ไม่ถูกต้อง — Deploy Web App ใหม่หลัง clasp push');
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
