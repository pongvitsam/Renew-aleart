/**
 * หลัง Deploy Google Apps Script เป็น Web App (Execute as: Me, Anyone)
 * นำ URL ที่ลงท้ายด้วย /exec มาใส่ API_URL
 * Script Project ID: 1zgHFhb67AAWEFKPAadw0UjYJVclLxi5KfqV2imWL2bX8-JuLalTS1ojW
 */
const CONFIG = {
  API_URL: '', // เช่น 'https://script.google.com/macros/s/AKfycb.../exec'
  APP_TITLE: 'License Monitor - ระบบแจ้งเตือนต่ออายุใบอนุญาต'
};

(function applyQueryApiUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('apiUrl');
  if (fromQuery) CONFIG.API_URL = decodeURIComponent(fromQuery);
})();
