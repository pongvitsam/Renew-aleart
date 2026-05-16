const DataCache = {
  KEY: 'renew_payload_v3',
  TTL: 86400000,

  get() {
    try {
      const raw = localStorage.getItem(this.KEY) || sessionStorage.getItem(this.KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (Date.now() - o.t > this.TTL) {
        localStorage.removeItem(this.KEY);
        sessionStorage.removeItem(this.KEY);
        return null;
      }
      return o.data;
    } catch { return null; }
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
