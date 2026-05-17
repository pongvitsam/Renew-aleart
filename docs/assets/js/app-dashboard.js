App.dashboardTab = 'overview';
App.dashboardStatusFilter = 'all';

const DASHBOARD_STATUS_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'expired', label: 'หมดอายุ' },
  { id: 'warning', label: 'ใกล้หมดอายุ' },
  { id: 'safe', label: 'ปกติ' },
  { id: 'empty', label: 'ไม่มีใบอนุญาต' }
];

const DASHBOARD_PRIORITY_GROUPS = [
  { status: 'expired', label: 'หมดอายุ', icon: 'fa-triangle-exclamation', headerClass: 'text-rose-700 bg-rose-50 border-rose-200', defaultOpen: true },
  { status: 'warning', label: 'ใกล้หมดอายุ', icon: 'fa-clock', headerClass: 'text-amber-800 bg-amber-50 border-amber-200', defaultOpen: true },
  { status: 'safe', label: 'ปกติ', icon: 'fa-circle-check', headerClass: 'text-emerald-800 bg-emerald-50 border-emerald-200', defaultOpen: false },
  { status: 'empty', label: 'ไม่มีใบอนุญาต', icon: 'fa-inbox', headerClass: 'text-slate-600 bg-slate-100 border-slate-200', defaultOpen: false }
];

function showDashboard() {
  App.currentView = 'dashboard';
  App.currentProjectId = null;
  App.dashboardTab = App.dashboardTab || 'overview';
  if (typeof updateSidebarNav === 'function') updateSidebarNav('dashboard');
  renderSidebar(true);

  document.getElementById('page-title').innerHTML =
    '<i class="fa-solid fa-chart-pie text-indigo-500"></i> ภาพรวมระบบ';

  const content = document.getElementById('main-content');
  content.replaceChildren();

  const hint = document.createElement('div');
  hint.className = 'page-hint';
  hint.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>เลือกแท็บด้านล่างเพื่อดูรายการหรือปฏิทิน — คลิกชื่อโครงการในแถบซ้ายเพื่อเปิดรายละเอียด</span>';
  content.appendChild(hint);

  const tabs = document.createElement('div');
  tabs.className = 'page-tabs';
  ['overview', 'calendar'].forEach(tab => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.tab = tab;
    btn.className = 'tab-btn' + (App.dashboardTab === tab ? ' active' : '');
    btn.innerHTML = tab === 'overview'
      ? '<i class="fa-solid fa-list mr-1"></i> รายการสถานะ'
      : '<i class="fa-solid fa-calendar-days mr-1"></i> ปฏิทิน';
    btn.onclick = () => { App.dashboardTab = tab; showDashboard(); };
    tabs.appendChild(btn);
  });
  content.appendChild(tabs);

  if (App.dashboardTab === 'calendar') {
    renderCalendarPanel(content);
    return;
  }

  let totalLics = 0, expCount = 0, warnCount = 0;
  App.projects.forEach(p => {
    const c = Utils.licenseCounts(p.licenses);
    totalLics += c.total;
    expCount += c.expired;
    warnCount += c.warning;
  });

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6';
  grid.append(
    makeStatCard(App.projects.length, 'โครงการ', 'fa-building', 'indigo'),
    makeStatCard(totalLics, 'ใบอนุญาต', 'fa-file-contract', 'slate'),
    makeStatCard(warnCount, 'ใกล้หมดอายุ', 'fa-clock', 'amber'),
    makeStatCard(expCount, 'หมดอายุ', 'fa-triangle-exclamation', 'rose')
  );
  content.appendChild(grid);

  content.appendChild(buildDashboardToolbar());
  content.appendChild(renderProjectsStatusList());
}

function buildDashboardToolbar() {
  const bar = document.createElement('div');
  bar.className = 'dashboard-toolbar';

  const searchWrap = document.createElement('div');
  searchWrap.className = 'dashboard-search-wrap';
  searchWrap.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
  const search = document.createElement('input');
  search.type = 'search';
  search.id = 'dashboard-project-search';
  search.className = 'dashboard-search';
  search.placeholder = 'ค้นหาโครงการ / แผนก...';
  search.value = App._dashboardSearch || '';
  search.addEventListener('input', Utils.debounce(e => {
    App._dashboardSearch = e.target.value;
    showDashboard();
  }, 200));
  searchWrap.appendChild(search);

  const filters = document.createElement('div');
  filters.className = 'status-filter-chips';
  DASHBOARD_STATUS_FILTERS.forEach(f => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'status-filter-chip' + (App.dashboardStatusFilter === f.id ? ' active' : '');
    chip.textContent = f.label;
    chip.onclick = () => {
      App.dashboardStatusFilter = f.id;
      showDashboard();
    };
    filters.appendChild(chip);
  });

  bar.append(searchWrap, filters);
  return bar;
}

function getFilteredDashboardProjects() {
  const term = (App._dashboardSearch || '').trim().toLowerCase();
  let list = Utils.sortProjectsByPriority([...App.projects]);

  if (App.dashboardStatusFilter !== 'all') {
    list = list.filter(p => Utils.getProjectStatus(p).status === App.dashboardStatusFilter);
  }

  if (term) {
    list = list.filter(p => {
      const dept = (p.department || '').toLowerCase();
      return (p.name || '').toLowerCase().includes(term) || dept.includes(term);
    });
  }

  return list;
}

function renderProjectsStatusList() {
  const wrap = document.createElement('div');
  wrap.className = 'status-list-wrap';

  const projects = getFilteredDashboardProjects();
  const summary = document.createElement('p');
  summary.className = 'text-xs text-slate-500 mb-3';
  summary.textContent = 'พบ ' + projects.length + ' โครงการ — คลิกแถวเพื่อเปิดรายละเอียด';
  wrap.appendChild(summary);

  if (!projects.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    if (App.projects.length) {
      empty.innerHTML =
        '<div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>' +
        '<p class="empty-state-title">ไม่พบโครงการตามตัวกรอง</p>' +
        '<p class="empty-state-desc">ลองเปลี่ยนคำค้นหาหรือเลือกสถานะอื่น</p>';
    } else {
      empty.innerHTML =
        '<div class="empty-state-icon"><i class="fa-solid fa-folder-plus"></i></div>' +
        '<p class="empty-state-title">เริ่มต้นด้วยโครงการแรก</p>' +
        '<p class="empty-state-desc">เพิ่มโครงการแล้วใส่ใบอนุญาต — ระบบจะช่วยเตือนก่อนหมดอายุ</p>' +
        '<button type="button" class="btn-primary empty-state-cta" onclick="openProjectModal()"><i class="fa-solid fa-plus mr-1"></i> สร้างโครงการใหม่</button>';
    }
    wrap.appendChild(empty);
    return wrap;
  }

  if (App.dashboardStatusFilter === 'all') {
    let globalRank = 0;
    DASHBOARD_PRIORITY_GROUPS.forEach(group => {
      const inGroup = projects.filter(p => Utils.getProjectStatus(p).status === group.status);
      if (!inGroup.length) return;
      globalRank = appendStatusListSection(wrap, group, inGroup, globalRank);
    });
  } else {
    const group = DASHBOARD_PRIORITY_GROUPS.find(g => g.status === App.dashboardStatusFilter) || {
      status: App.dashboardStatusFilter,
      label: DASHBOARD_STATUS_FILTERS.find(f => f.id === App.dashboardStatusFilter)?.label || '',
      icon: 'fa-list',
      headerClass: 'text-slate-700 bg-slate-50 border-slate-200',
      defaultOpen: true
    };
    appendStatusListSection(wrap, group, projects, 0);
  }

  return wrap;
}

function appendStatusListSection(wrap, group, projects, startRank) {
  const details = document.createElement('details');
  details.className = 'status-list-section';
  const autoCollapse = projects.length > 25 && !group.defaultOpen;
  details.open = group.defaultOpen && !autoCollapse;

  const summary = document.createElement('summary');
  summary.className = 'status-list-section-head ' + group.headerClass;
  summary.innerHTML =
    '<span><i class="fa-solid ' + group.icon + ' mr-2"></i>' + group.label + '</span>' +
    '<span class="status-list-count">' + projects.length + ' โครงการ</span>';
  details.appendChild(summary);

  const scroll = document.createElement('div');
  scroll.className = 'status-list-scroll';

  const table = document.createElement('table');
  table.className = 'status-list-table';
  table.innerHTML =
    '<thead><tr>' +
    '<th class="col-rank">#</th>' +
    '<th class="col-name">โครงการ</th>' +
    '<th class="col-dept">แผนก</th>' +
    '<th class="col-status">สถานะ</th>' +
    '<th class="col-lic">ใบอนุญาต</th>' +
    '<th class="col-urgent">กำหนด</th>' +
    '<th class="col-drive">Drive</th>' +
  '</tr></thead>';

  const tbody = document.createElement('tbody');
  let rank = startRank;
  projects.forEach(p => {
    rank += 1;
    tbody.appendChild(buildProjectListRow(p, rank));
  });
  table.appendChild(tbody);
  scroll.appendChild(table);
  details.appendChild(scroll);
  wrap.appendChild(details);

  return rank;
}

function buildProjectListRow(project, rank) {
  const st = Utils.getProjectStatus(project);
  const tr = document.createElement('tr');
  tr.className = 'status-list-row row-' + st.status;
  tr.title = 'เปิดโครงการ';
  tr.onclick = () => renderProjectView(project.id);

  const urgentDays = Utils.nearestUrgentExpiryDays(project);
  let urgentText = '—';
  if (urgentDays < 99999 && (st.status === 'expired' || st.status === 'warning')) {
    urgentText = urgentDays < 0
      ? 'หมด ' + Math.abs(urgentDays) + ' วัน'
      : 'อีก ' + urgentDays + ' วัน';
  }

  const hasDrive = !!Utils.getProjectDriveUrl(project);
  const licSummary = st.counts.total
    ? '<span class="lic-dot safe">' + st.counts.safe + '</span>' +
      '<span class="lic-dot warn">' + st.counts.warning + '</span>' +
      '<span class="lic-dot exp">' + st.counts.expired + '</span>'
    : '0';

  tr.innerHTML =
    '<td class="col-rank" data-label="#">' + rank + '</td>' +
    '<td class="col-name" data-label="โครงการ"><span class="font-bold text-slate-800">' +
      Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo) + '</span></td>' +
    '<td class="col-dept" data-label="แผนก">' + Utils.escapeHtml(project.department || '—') + '</td>' +
    '<td class="col-status" data-label="สถานะ"><span class="status-pill ' + st.pill + '">' + st.text + '</span></td>' +
    '<td class="col-lic" data-label="ใบอนุญาต"><span class="lic-summary">' + licSummary + '</span></td>' +
    '<td class="col-urgent" data-label="กำหนด">' + urgentText + '</td>' +
    '<td class="col-drive" data-label="Drive">' +
      (hasDrive ? '<i class="fa-brands fa-google-drive text-blue-600" title="มีลิงก์"></i>' : '—') +
    '</td>';

  return tr;
}

function makeStatCard(num, label, icon, tone) {
  const el = document.createElement('div');
  el.className = 'stat-card';
  const colors = { indigo: 'text-indigo-600', amber: 'text-amber-600', rose: 'text-rose-600', slate: 'text-slate-800' };
  const top = document.createElement('div');
  top.className = 'flex items-center justify-between mb-2';
  top.innerHTML = '<i class="fa-solid ' + icon + ' text-2xl opacity-40"></i>';
  const numEl = document.createElement('p');
  numEl.className = 'text-3xl font-black ' + (colors[tone] || '');
  numEl.textContent = String(num);
  const lbl = document.createElement('p');
  lbl.className = 'text-xs font-bold text-slate-500 uppercase mt-1';
  lbl.textContent = label;
  el.append(top, numEl, lbl);
  return el;
}

window.showDashboard = showDashboard;
