/**
 * Google Apps Script Web App URL (/exec)
 */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwHQDLwLQASVx3SUssZAyaN4zjoWuJt4wIlaw51qhrBVUHpAO7FdW30nR-Bs7SNX499/exec',
  APP_TITLE: 'Renew Aleart — ระบบแจ้งเตือนต่ออายุใบอนุญาต',
  APP_NAME: 'Renew Aleart',
  BASE_PATH: '/Renew-aleart',
  /** ไฟล์ snapshot บน GitHub Pages — โหลดครั้งแรก < 3 วินาที */
  SNAPSHOT_URL: '/Renew-aleart/data/payload.json',
  /** งบเวลาแสดงหน้าแรก (ไม่รอ GAS) */
  LOAD_BUDGET_MS: 2800
};

(function applyQueryApiUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('apiUrl');
  if (fromQuery && fromQuery.trim()) {
    CONFIG.API_URL = decodeURIComponent(fromQuery.trim());
  }
})();
