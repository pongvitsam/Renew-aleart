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
