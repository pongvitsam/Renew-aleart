function bootstrapApp() {
  document.title = CONFIG.APP_TITLE || CONFIG.APP_NAME || 'Renew Aleart';
  const boot = window.__BOOT_CACHE__;
  const stale = DataCache.getStale();
  const cached = boot || DataCache.get() || stale?.data;
  if (cached) {
    Api.applyPayload({ success: true, ...cached });
    showDashboard();
    if (boot) delete window.__BOOT_CACHE__;
  }
  loadProjects();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
