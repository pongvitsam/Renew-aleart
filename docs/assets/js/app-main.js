window.addEventListener('DOMContentLoaded', async () => {
  document.title = CONFIG.APP_TITLE || CONFIG.APP_NAME || 'Renew Aleart';
  await loadProjects();
  showDashboard();
});
