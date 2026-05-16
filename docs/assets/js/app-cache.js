const DataCache = {
  KEY: 'renew_payload_v2',
  TTL: 120000,

  get() {
    try {
      const raw = sessionStorage.getItem(this.KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (Date.now() - o.t > this.TTL) {
        sessionStorage.removeItem(this.KEY);
        return null;
      }
      return o.data;
    } catch { return null; }
  },

  set(data) {
    sessionStorage.setItem(this.KEY, JSON.stringify({ t: Date.now(), data }));
  },

  clear() {
    sessionStorage.removeItem(this.KEY);
  }
};
