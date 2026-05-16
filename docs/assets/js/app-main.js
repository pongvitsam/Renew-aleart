window.addEventListener('DOMContentLoaded', async () => {
  document.title = CONFIG.APP_TITLE || CONFIG.APP_NAME || 'Renew Aleart';

  const cached = DataCache.get();
  if (cached) {
    Api.applyPayload({ success: true, ...cached });
  }

  showDashboard();
  await loadProjects();

  if (App.currentView === 'dashboard') showDashboard();
  else if (App.currentProjectId) renderProjectView(App.currentProjectId);
});
