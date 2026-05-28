/**
 * Google Apps Script Web App URL (/exec)
 */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwHQDLwLQASVx3SUssZAyaN4zjoWuJt4wIlaw51qhrBVUHpAO7FdW30nR-Bs7SNX499/exec',
  APP_TITLE: 'Renew Aleart — ระบบแจ้งเตือนต่ออายุใบอนุญาต',
  APP_NAME: 'Renew Aleart',
  BASE_PATH: '/Renew-aleart',
  SNAPSHOT_URL: '/Renew-aleart/data/payload.json',
  /** งบเวลาโหลด snapshot ก่อนแสดงผล (ms) */
  LOAD_BUDGET_MS: 900,
  /** ไม่เรียก GAS ซ้ำถ้า cache ยังใหม่อยู่ (ms) */
  SYNC_MIN_AGE_MS: 300000
};

(function applyQueryOverrides() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('apiUrl');
  if (fromQuery && fromQuery.trim()) {
    CONFIG.API_URL = decodeURIComponent(fromQuery.trim());
  }
})();
