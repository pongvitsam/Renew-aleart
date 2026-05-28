/** Lazy Supabase client (ต้องโหลด @supabase/supabase-js ก่อน) */
const SupabaseClient = {
  _client: null,

  isConfigured() {
    return !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
  },

  get() {
    if (!this.isConfigured()) {
      throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ใน config.js');
    }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('ไม่พบ Supabase SDK — รีเฟรชหน้าหรือรัน build-index ใหม่');
    }
    if (!this._client) {
      this._client = window.supabase.createClient(
        CONFIG.SUPABASE_URL.trim(),
        CONFIG.SUPABASE_ANON_KEY.trim()
      );
    }
    return this._client;
  }
};
