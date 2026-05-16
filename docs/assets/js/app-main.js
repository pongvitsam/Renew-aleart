window.addEventListener('DOMContentLoaded', async () => {
  document.title = CONFIG.APP_TITLE;
  await loadProjects();
  showDashboard();
});
