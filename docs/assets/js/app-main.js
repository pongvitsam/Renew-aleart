function bootstrapApp() {
  document.title = CONFIG.APP_TITLE || CONFIG.APP_NAME || 'Renew Aleart';
  const cached = DataCache.get();
  if (cached) {
    Api.applyPayload({ success: true, ...cached });
  }
  showDashboard();
  loadProjects();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
