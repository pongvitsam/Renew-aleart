const Api = {
  async call(action, data = {}) {
    if (!CONFIG.API_URL) {
      throw new Error('ยังไม่ได้ตั้งค่า API_URL ใน config.js — Deploy Apps Script แล้วใส่ URL /exec');
    }

    const response = await fetch(CONFIG.API_URL, {
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
      throw new Error('ตอบกลับจาก API ไม่ถูกต้อง — ตรวจสอบการ Deploy Web App');
    }

    if (!json.success && json.error) {
      throw new Error(json.error);
    }
    return json;
  },

  ping() {
    return this.call('ping');
  },

  getProjects() {
    return this.call('getProjects');
  },

  saveProject(data) {
    return this.call('saveProject', data);
  },

  saveLicense(data) {
    return this.call('saveLicense', data);
  },

  saveTimelineUpdate(data) {
    return this.call('saveTimelineUpdate', data);
  },

  sendTestEmail(data) {
    return this.call('sendTestEmail', data);
  }
};
