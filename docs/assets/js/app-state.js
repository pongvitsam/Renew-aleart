const App = {
  projects: [],
  departments: [],
  expiryEvents: [],
  currentView: 'dashboard',
  currentProjectId: null,
  activeTestProjectId: null,
  tempEmails: [],
  _syncing: false
};

function applyServerData(res) {
  Api.applyPayload(res);
}

function onProjectsLoaded(res) {
  applyServerData(res);
  hideSetupBanner();
  if (!App.projects.length) {
    showSetupBanner('ยังไม่มีโครงการ — กด "โหลดข้อมูลทดลอง" หรือสร้างโครงการใหม่');
  }
  refreshCurrentView();
}

function onProjectsLoadError(err) {
  if (!DataCache.get()) {
    App.projects = [];
    App.departments = [];
    showSetupBanner(err.message || 'โหลดข้อมูลไม่สำเร็จ');
    refreshCurrentView();
  }
}

function loadProjects() {
  const cached = DataCache.get();
  if (cached) {
    applyServerData({ success: true, ...cached });
    refreshCurrentView();
    hideSetupBanner();
    App._syncing = true;
    Api.getProjects({ skipCache: true, background: true })
      .then(onProjectsLoaded)
      .catch(onProjectsLoadError)
      .finally(() => { App._syncing = false; });
    return;
  }

  showDashboardSkeleton();
  if (typeof Api.warmApi === 'function') Api.warmApi();
  App._syncing = true;
  Api.getProjects({ skipCache: true })
    .then(onProjectsLoaded)
    .catch(onProjectsLoadError)
    .finally(() => { App._syncing = false; });
}

function showDashboardSkeleton() {
  const main = document.getElementById('main-content');
  if (!main) return;
  const wrap = document.createElement('div');
  wrap.className = 'page-skeleton';
  const grid = document.createElement('div');
  grid.className = 'skeleton-grid';
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('div');
    b.className = 'skeleton-block';
    grid.appendChild(b);
  }
  const msg = document.createElement('p');
  msg.className = 'text-center text-slate-500 text-sm py-8';
  msg.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลดข้อมูล...';
  wrap.append(grid, msg);
  main.replaceChildren(wrap);
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
