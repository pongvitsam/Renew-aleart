function bootstrapApp() {
  try {
    document.title = CONFIG.APP_TITLE || CONFIG.APP_NAME || 'Renew Aleart';
    document.documentElement.classList.add('app-ready');
    loadProjects().catch(err => {
      console.error('loadProjects failed', err);
      onProjectsLoadError(err);
    });
  } catch (err) {
    console.error('bootstrap failed', err);
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = '<p class="setup-banner" style="margin:1rem">โหลดแอปไม่สำเร็จ — ลองรีเฟรช (Ctrl+F5)</p>';
    }
  }
}

window.addEventListener('error', event => {
  if (event.message && /ResizeObserver|tailwind/.test(event.message)) return;
  console.error('App error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection:', event.reason);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
