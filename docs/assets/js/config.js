/**
 * Google Apps Script Web App URL (/exec)
 * Script Project ID: 1zgHFhb67AAWEFKPAadw0UjYJVclLxi5KfqV2imWL2bX8-JuLalTS1ojW
 */
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwHQDLwLQASVx3SUssZAyaN4zjoWuJt4wIlaw51qhrBVUHpAO7FdW30nR-Bs7SNX499/exec',
  APP_TITLE: 'License Monitor - ระบบแจ้งเตือนต่ออายุใบอนุญาต'
};

(function applyQueryApiUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('apiUrl');
  if (fromQuery) CONFIG.API_URL = decodeURIComponent(fromQuery);
})();
