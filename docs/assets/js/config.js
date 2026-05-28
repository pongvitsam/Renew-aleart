/**
 * Google Apps Script Web App URL (/exec)
 */
const CONFIG = {
  /** 'gas' = Google Apps Script + Sheets | 'supabase' = Supabase Postgres */
  DATA_PROVIDER: 'gas',
  API_URL: 'https://script.google.com/macros/s/AKfycbwHQDLwLQASVx3SUssZAyaN4zjoWuJt4wIlaw51qhrBVUHpAO7FdW30nR-Bs7SNX499/exec',
  /** จาก Supabase → Project Settings → API */
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  APP_TITLE: 'Renew Aleart — ระบบแจ้งเตือนต่ออายุใบอนุญาต',
  APP_NAME: 'Renew Aleart',
  BASE_PATH: '/Renew-aleart',
  /** ไฟล์ snapshot บน GitHub Pages — โหลดครั้งแรก < 3 วินาที */
  SNAPSHOT_URL: '/Renew-aleart/data/payload.json',
  /** งบเวลาโหลด snapshot ก่อนแสดงผล (ms) */
  LOAD_BUDGET_MS: 1200,
  /** ไม่เรียก GAS ซ้ำถ้า cache ยังใหม่อยู่ (ms) */
  SYNC_MIN_AGE_MS: 300000
};

(function applyQueryOverrides() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('apiUrl');
  if (fromQuery && fromQuery.trim()) {
    CONFIG.API_URL = decodeURIComponent(fromQuery.trim());
  }
  const provider = params.get('provider');
  if (provider === 'supabase' || provider === 'gas') {
    CONFIG.DATA_PROVIDER = provider;
  }
  const sbUrl = params.get('supabaseUrl');
  const sbKey = params.get('supabaseKey');
  if (sbUrl && sbUrl.trim()) CONFIG.SUPABASE_URL = decodeURIComponent(sbUrl.trim());
  if (sbKey && sbKey.trim()) CONFIG.SUPABASE_ANON_KEY = decodeURIComponent(sbKey.trim());
})();

