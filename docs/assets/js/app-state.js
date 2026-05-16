const App = {
  projects: [],
  currentView: 'dashboard',
  currentProjectId: null,
  activeTestProjectId: null,
  tempEmails: []
};

async function loadProjects() {
  Utils.setLoading(true);
  try {
    const res = await Api.getProjects();
    App.projects = res.projects || [];
    hideSetupBanner();
  } catch (err) {
    App.projects = [];
    showSetupBanner(err.message);
  } finally {
    Utils.setLoading(false);
  }
}

function showSetupBanner(msg) {
  let el = document.getElementById('setup-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'setup-banner';
    el.className = 'bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 text-sm';
    document.body.prepend(el);
  }
  el.innerHTML = '<b>ตั้งค่า API:</b> ' + Utils.escapeHtml(msg) +
    ' — ดูคู่มือใน README.md';
}

function hideSetupBanner() {
  const el = document.getElementById('setup-banner');
  if (el) el.remove();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
  document.getElementById('sidebar-overlay').classList.toggle('hidden');
}
window.toggleSidebar = toggleSidebar;
window.loadProjects = loadProjects;
