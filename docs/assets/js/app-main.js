window.addEventListener('DOMContentLoaded', async () => {
  document.title = CONFIG.APP_TITLE || CONFIG.APP_NAME || 'Renew Aleart';
  showDashboard();
  await loadProjects();
  if (App.currentView === 'dashboard') showDashboard();
});
