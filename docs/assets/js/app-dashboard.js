App.dashboardStatusFilter = 'all';
App._dashboardCollapsedProjects = App._dashboardCollapsedProjects || {};

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

function getDashboardCounts() {
  let totalLics = 0, expCount = 0, warnCount = 0;
  App.projects.forEach(p => {
    const c = Utils.licenseCounts(p.licenses);
    totalLics += c.total;
    expCount += c.expired;
    warnCount += c.warning;
  });
  return { totalLics, expCount, warnCount };
}

function updateDashboardStats() {
  const grid = document.getElementById('dashboard-stats-grid');
  if (!grid) return;
  const { totalLics, expCount, warnCount } = getDashboardCounts();
  const vals = grid.querySelectorAll('.stat-card__value');
  if (vals.length >= 4) {
    vals[0].textContent = String(App.projects.length);
    vals[1].textContent = String(totalLics);
    vals[2].textContent = String(warnCount);
    vals[3].textContent = String(expCount);
  }
}

function updateDashboardFilterChips() {
  document.querySelectorAll('.status-filter-chip').forEach(chip => {
    const id = chip.dataset.filter;
    chip.classList.toggle('active', id === App.dashboardStatusFilter);
  });
}

function patchDashboard() {
  const shell = document.getElementById('dashboard-shell');
  if (!shell) {
    showDashboard({ skipSidebar: true });
    return;
  }
  updateDashboardStats();
  updateDashboardFilterChips();
  const mount = document.getElementById('dashboard-list-mount');
  if (mount) mount.replaceChildren(renderProjectsStatusList());
}

function showDashboard(opts) {
  opts = opts || {};
  App.currentView = 'dashboard';
  App.currentProjectId = null;
  if (typeof updateSidebarNav === 'function') updateSidebarNav('dashboard');
  if (!opts.skipSidebar) renderSidebar(true);

  const title = document.getElementById('page-title');
  if (title) {
    title.innerHTML = '<i class="fa-solid fa-chart-pie text-indigo-500"></i> ภาพรวมระบบ';
  }

  const content = document.getElementById('main-content');
  if (!content) return;
  content.replaceChildren();
  content.classList.add('page-enter');

  const shell = document.createElement('div');
  shell.id = 'dashboard-shell';
  shell.className = 'dashboard-shell';

  const hint = document.createElement('div');
  hint.className = 'page-hint';
  hint.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>คลิกชื่อโครงการในแถบซ้ายเพื่อเปิดรายละเอียดและติดตามความคืบหน้า</span>';
  shell.appendChild(hint);

  const { totalLics, expCount, warnCount } = getDashboardCounts();
  const grid = document.createElement('div');
  grid.id = 'dashboard-stats-grid';
  grid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 stat-grid-stagger';
  grid.append(
    makeStatCard(App.projects.length, 'โครงการ', 'fa-building', 'indigo'),
    makeStatCard(totalLics, 'ใบอนุญาต', 'fa-file-contract', 'slate'),
    makeStatCard(warnCount, 'ใกล้หมดอายุ', 'fa-clock', 'amber'),
    makeStatCard(expCount, 'หมดอายุ', 'fa-triangle-exclamation', 'rose')
  );
  shell.appendChild(grid);

  const toolbarMount = document.createElement('div');
  toolbarMount.id = 'dashboard-toolbar-mount';
  toolbarMount.appendChild(buildDashboardToolbar());
  shell.appendChild(toolbarMount);

  const listMount = document.createElement('div');
  listMount.id = 'dashboard-list-mount';
  listMount.appendChild(renderProjectsStatusList());
  shell.appendChild(listMount);

  content.appendChild(shell);
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
    patchDashboard();
  }, 120));
  searchWrap.appendChild(search);

  const filters = document.createElement('div');
  filters.className = 'status-filter-chips';
  DASHBOARD_STATUS_FILTERS.forEach(f => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.dataset.filter = f.id;
    chip.className = 'status-filter-chip' + (App.dashboardStatusFilter === f.id ? ' active' : '');
    chip.textContent = f.label;
    chip.onclick = () => {
      App.dashboardStatusFilter = f.id;
      patchDashboard();
    };
    filters.appendChild(chip);
  });

  bar.append(searchWrap, filters);
  return bar;
}

function getFilteredDashboardProjects() {
  const term = (App._dashboardSearch || '').trim().toLowerCase();
  let list = Utils.sortProjectsByPriority([...App.projects]);
  const filterStatus = App.dashboardStatusFilter;

  if (filterStatus !== 'all') {
    list = list.filter(p => Utils.getProjectStatus(p).status === filterStatus);
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
  summary.textContent = 'พบ ' + projects.length + ' โครงการ — คลิกแถวเพื่อพับ/ขยายรายละเอียด';
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
    const byStatus = {};
    projects.forEach(p => {
      const st = Utils.getProjectStatus(p).status;
      if (!byStatus[st]) byStatus[st] = [];
      byStatus[st].push(p);
    });
    DASHBOARD_PRIORITY_GROUPS.forEach(group => {
      const inGroup = byStatus[group.status] || [];
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
  const collapsed = !!App._dashboardCollapsedProjects[project.id];
  const tr = document.createElement('tr');
  tr.className = 'status-list-row row-' + st.status;
  tr.title = collapsed ? 'คลิกเพื่อแสดงรายละเอียด' : 'คลิกเพื่อซ่อนรายละเอียด';
  tr.onclick = () => {
    App._dashboardCollapsedProjects[project.id] = !App._dashboardCollapsedProjects[project.id];
    patchDashboard();
  };

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
    '<td class="col-rank" data-label="#">' + rank + ' <i class="fa-solid ' + (collapsed ? 'fa-chevron-right' : 'fa-chevron-down') + ' text-slate-400 ml-1"></i></td>' +
    '<td class="col-name" data-label="โครงการ"><span class="font-bold text-slate-800">' +
      Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo) + '</span></td>' +
    '<td class="col-dept" data-label="แผนก">' + Utils.escapeHtml(project.department || '—') + '</td>' +
    '<td class="col-status" data-label="สถานะ"><span class="status-pill ' + st.pill + '">' + st.text + '</span></td>' +
    '<td class="col-lic" data-label="ใบอนุญาต"><span class="lic-summary">' + licSummary + '</span></td>' +
    '<td class="col-urgent" data-label="กำหนด">' + urgentText + '</td>' +
    '<td class="col-drive" data-label="Drive">' +
      (hasDrive ? '<i class="fa-brands fa-google-drive text-blue-600" title="มีลิงก์"></i>' : '—') +
    '</td>';

  const frag = document.createDocumentFragment();
  frag.appendChild(tr);
  if (!collapsed) frag.appendChild(buildProjectDetailInlineRow(project));
  return frag;
}

function buildProjectDetailInlineRow(project) {
  const detailTr = document.createElement('tr');
  detailTr.className = 'status-list-detail-row';
  const td = document.createElement('td');
  td.colSpan = 7;
  td.className = 'bg-slate-50/70 p-3';

  const licenses = project.licenses || [];
  if (!licenses.length) {
    td.innerHTML = '<p class="text-xs text-slate-500">ยังไม่มีใบอนุญาตในโครงการนี้</p>';
    detailTr.appendChild(td);
    return detailTr;
  }

  const list = document.createElement('div');
  list.className = 'grid grid-cols-1 xl:grid-cols-2 gap-2';
  licenses.forEach(l => {
    const st = Utils.calculateStatus(l.expiryDate, Utils.getEffectiveAlertMonths(l.alertMonths));
    const item = document.createElement('div');
    item.className = 'rounded-xl border bg-white px-3 py-2 flex items-center justify-between gap-3';
    item.innerHTML =
      '<div class="min-w-0">' +
        '<p class="text-xs font-bold text-slate-800 truncate">' + Utils.escapeHtml(l.name) + '</p>' +
        '<p class="text-[11px] text-slate-500 mt-0.5">หมดอายุ: ' + Utils.formatDate(l.expiryDate) + ' · ขั้นตอน: ' + Utils.escapeHtml(l.status || 'ยังไม่เริ่ม') + '</p>' +
      '</div>' +
      '<div class="flex items-center gap-2 shrink-0">' +
        '<span class="status-pill ' + st.status + '">' + st.text + '</span>' +
        '<button type="button" class="text-[11px] font-bold text-indigo-600 border border-indigo-200 bg-indigo-50 px-2.5 py-1 rounded-lg">ขั้นตอน</button>' +
      '</div>';
    item.querySelector('button').onclick = () => renderTimeline(project.id, l.id);
    list.appendChild(item);
  });

  const foot = document.createElement('div');
  foot.className = 'mt-2 text-right';
  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'text-[11px] font-bold text-slate-600 hover:text-slate-900 underline';
  openBtn.textContent = 'เปิดหน้าโครงการเต็ม';
  openBtn.onclick = () => renderProjectView(project.id);
  foot.appendChild(openBtn);

  td.append(list, foot);
  detailTr.appendChild(td);
  return detailTr;
}

function makeStatCard(num, label, icon, tone) {
  const el = document.createElement('div');
  el.className = 'stat-card stat-card--' + (tone || 'slate');
  const top = document.createElement('div');
  top.className = 'stat-card__top';
  top.innerHTML = '<span class="stat-card__icon"><i class="fa-solid ' + icon + '"></i></span>';
  const numEl = document.createElement('p');
  numEl.className = 'stat-card__value';
  numEl.textContent = String(num);
  const lbl = document.createElement('p');
  lbl.className = 'stat-card__label';
  lbl.textContent = label;
  el.append(top, numEl, lbl);
  return el;
}

window.showDashboard = showDashboard;
window.patchDashboard = patchDashboard;
