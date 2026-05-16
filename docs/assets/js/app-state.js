const App = {
  projects: [],
  departments: [],
  expiryEvents: [],
  currentView: 'dashboard',
  currentProjectId: null,
  activeTestProjectId: null,
  tempEmails: []
};

function applyServerData(res) {
  Api.applyPayload(res);
}

async function loadProjects() {
  const hadCache = !!DataCache.get();
  if (!hadCache) Utils.setLoading(true);
  const safety = setTimeout(() => Utils.setLoading(false), Api.TIMEOUT_MS + 2000);
  try {
    const res = await Api.getProjects();
    applyServerData(res);
    hideSetupBanner();
    if (!App.projects.length) {
      showSetupBanner('ยังไม่มีโครงการ — กด "โหลดข้อมูลทดลอง" หรือสร้างโครงการใหม่');
    }
  } catch (err) {
    App.projects = [];
    App.departments = [];
    showSetupBanner(err.message);
    showDashboard();
  } finally {
    clearTimeout(safety);
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
  el.innerHTML = '<b>แจ้งเตือน:</b> ' + Utils.escapeHtml(msg);
}

function hideSetupBanner() {
  const el = document.getElementById('setup-banner');
  if (el) el.remove();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('-translate-x-full');
  document.getElementById('sidebar-overlay').classList.toggle('hidden');
}

function demoBadgeHtml(isDemo) {
  if (!isDemo) return '';
  return '<span class="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded ml-1 shrink-0">ทดลอง</span>';
}

window.toggleSidebar = toggleSidebar;
window.loadProjects = loadProjects;
window.demoBadgeHtml = demoBadgeHtml;
