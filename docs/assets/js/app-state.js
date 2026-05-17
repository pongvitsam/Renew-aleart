const App = {
  projects: [],
  departments: [],
  expiryEvents: [],
  currentView: 'dashboard',
  currentProjectId: null,
  activeTestProjectId: null,
  tempEmails: [],
  currentUser: null,
  _syncing: false
};

function applyServerData(res) {
  Api.applyPayload(res);
}

function onProjectsLoaded(res) {
  applyServerData(res);
  hideSetupBanner();
  hideSyncIndicator();
  if (!App.projects.length && !res._syncing) {
    showSetupBanner('ยังไม่มีโครงการ — กด "สร้างโครงการใหม่"');
  } else if (res._empty && App._syncing) {
    showSetupBanner('กำลังซิงค์ข้อมูลจากเซิร์ฟเวอร์ครั้งแรก — อาจใช้เวลาสักครู่');
  }
  refreshCurrentView();
}

function onProjectsLoadError(err) {
  hideSyncIndicator();
  if (!DataCache.get() && !DataCache.getStale()) {
    showSetupBanner(err.message || 'โหลดข้อมูลไม่สำเร็จ');
    refreshCurrentView();
  }
}

function showSyncIndicator() {
  let el = document.getElementById('sync-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sync-indicator';
    el.className = 'sync-indicator';
    el.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> กำลังอัปเดต...';
    const header = document.querySelector('main header');
    if (header) header.appendChild(el);
  }
  el.style.display = '';
}

function hideSyncIndicator() {
  const el = document.getElementById('sync-indicator');
  if (el) el.style.display = 'none';
}

function hasUsableProjectData() {
  return Array.isArray(App.projects) && App.projects.length > 0;
}

async function loadProjects() {
  if (App._loadInFlight) return;
  App._loadInFlight = true;

  try {
    const fresh = DataCache.get();
    const stalePack = !fresh && DataCache.getStale();
    const cached = fresh || stalePack?.data;

    if (window.__BOOT_CACHE__) {
      const boot = window.__BOOT_CACHE__;
      delete window.__BOOT_CACHE__;
      applyServerData({ success: true, ...boot });
    }

    if (cached) {
      applyServerData({ success: true, ...cached });
      refreshCurrentView();
      hideSetupBanner();
      if (stalePack?.stale) showSyncIndicator();
      App._syncing = true;
      Api.syncFromApiInBackground()
        .then(onProjectsLoaded)
        .catch(onProjectsLoadError)
        .finally(() => { App._syncing = false; });
      return;
    }

    if (!hasUsableProjectData()) {
      showDashboardSkeleton();
    }

    App._syncing = true;
    const res = await Api.loadInitialPayload();
    onProjectsLoaded(res);
    if (!res._fromApi) {
      showSyncIndicator();
      Api.syncFromApiInBackground()
        .then(onProjectsLoaded)
        .catch(onProjectsLoadError)
        .finally(() => { App._syncing = false; });
    } else {
      App._syncing = false;
    }
  } catch (err) {
    App._syncing = false;
    if (!hasUsableProjectData() && !DataCache.getStale()) {
      showDashboardSkeleton();
    }
    onProjectsLoadError(err);
  } finally {
    App._loadInFlight = false;
  }
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
  msg.className = 'skeleton-msg';
  msg.textContent = 'กำลังโหลด...';
  wrap.append(grid, msg);
  main.replaceChildren(wrap);
}

function showSetupBanner(msg) {
  let el = document.getElementById('setup-banner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'setup-banner';
    el.className = 'setup-banner';
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
  return '<span class="demo-badge">ทดลอง</span>';
}

window.toggleSidebar = toggleSidebar;
window.loadProjects = loadProjects;
window.demoBadgeHtml = demoBadgeHtml;
