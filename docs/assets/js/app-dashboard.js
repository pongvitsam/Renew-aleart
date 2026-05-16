App.dashboardTab = 'overview';

function showDashboard() {
  App.currentView = 'dashboard';
  App.currentProjectId = null;
  App.dashboardTab = App.dashboardTab || 'overview';
  renderSidebar(true);

  document.getElementById('page-title').innerHTML =
    '<i class="fa-solid fa-chart-pie text-indigo-500"></i> ภาพรวมระบบ';

  const content = document.getElementById('main-content');
  content.replaceChildren();

  const tabs = document.createElement('div');
  tabs.className = 'flex gap-2 mb-6';
  ['overview', 'calendar'].forEach(tab => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.tab = tab;
    btn.className = 'tab-btn' + (App.dashboardTab === tab ? ' active' : '');
    btn.innerHTML = tab === 'overview'
      ? '<i class="fa-solid fa-grid-2 mr-1"></i> โครงการ'
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
  grid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8';
  grid.append(
    makeStatCard(App.projects.length, 'โครงการ', 'fa-building', 'indigo'),
    makeStatCard(totalLics, 'ใบอนุญาต', 'fa-file-contract', 'slate'),
    makeStatCard(warnCount, 'ใกล้หมดอายุ', 'fa-clock', 'amber'),
    makeStatCard(expCount, 'หมดอายุ', 'fa-triangle-exclamation', 'rose')
  );
  content.appendChild(grid);

  const sortedProjects = Utils.sortProjectsByPriority(App.projects);

  const hProjects = document.createElement('h3');
  hProjects.className = 'text-lg font-bold text-slate-800 mb-1 flex items-center gap-2';
  hProjects.innerHTML = '<i class="fa-solid fa-layer-group text-indigo-500"></i> สถานะทุกโครงการ';
  content.appendChild(hProjects);

  const hint = document.createElement('p');
  hint.className = 'text-xs text-slate-500 mb-4';
  hint.textContent = 'เรียงตามความสำคัญ: หมดอายุ → ใกล้หมดอายุ → ปกติ → ไม่มีใบอนุญาต (#1 = เร่งด่วนที่สุด)';
  content.appendChild(hint);

  if (!sortedProjects.length) {
    const empty = document.createElement('p');
    empty.className = 'text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed mb-8';
    empty.textContent = 'ยังไม่มีโครงการ — กดโหลดข้อมูลทดลองหรือสร้างโครงการใหม่';
    content.appendChild(empty);
  } else {
    content.appendChild(renderProjectsByPriority(sortedProjects));
  }

  const hAlert = document.createElement('h3');
  hAlert.className = 'text-lg font-bold text-slate-800 mb-4 flex items-center gap-2';
  hAlert.innerHTML = '<i class="fa-solid fa-bell text-rose-500"></i> แจ้งเตือนด่วน';
  content.appendChild(hAlert);

  const alerts = [];
  App.projects.forEach(project => {
    (project.licenses || []).forEach(license => {
      const st = Utils.calculateStatus(license.expiryDate, license.alertMonths);
      if (st.status !== 'safe') alerts.push({ project, license, st });
    });
  });

  const list = document.createElement('div');
  list.className = 'space-y-3';
  if (!alerts.length) {
    const ok = document.createElement('p');
    ok.className = 'text-center py-8 text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-100';
    ok.innerHTML = '<i class="fa-solid fa-circle-check mr-2"></i>ไม่มีใบอนุญาตที่ต้องแจ้งเตือน';
    list.appendChild(ok);
  } else {
    alerts.sort(Utils.compareAlertsByPriority.bind(Utils));
    alerts.forEach(a => list.appendChild(buildAlertRow(a.project, a.license, a.st)));
  }
  content.appendChild(list);
}

const DASHBOARD_PRIORITY_GROUPS = [
  { status: 'expired', label: 'เร่งด่วน — มีใบอนุญาตหมดอายุ', icon: 'fa-triangle-exclamation', headerClass: 'text-rose-700 bg-rose-50 border-rose-200' },
  { status: 'warning', label: 'ต้องติดตาม — ใกล้หมดอายุ', icon: 'fa-clock', headerClass: 'text-amber-800 bg-amber-50 border-amber-200' },
  { status: 'safe', label: 'ปกติ', icon: 'fa-circle-check', headerClass: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  { status: 'empty', label: 'ยังไม่มีใบอนุญาต', icon: 'fa-inbox', headerClass: 'text-slate-600 bg-slate-100 border-slate-200' }
];

function renderProjectsByPriority(sortedProjects) {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6 mb-8';

  let globalRank = 0;
  DASHBOARD_PRIORITY_GROUPS.forEach(group => {
    const inGroup = sortedProjects.filter(p => Utils.getProjectStatus(p).status === group.status);
    if (!inGroup.length) return;

    const section = document.createElement('section');
    const head = document.createElement('div');
    head.className = 'flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border mb-3 ' + group.headerClass;
    head.innerHTML = '<i class="fa-solid ' + group.icon + '"></i> ' + group.label +
      ' <span class="ml-auto text-xs font-black opacity-70">' + inGroup.length + ' โครงการ</span>';
    section.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';

    inGroup.forEach(p => {
      globalRank += 1;
      grid.appendChild(buildProjectDashboardCard(p, globalRank));
    });

    section.appendChild(grid);
    wrap.appendChild(section);
  });

  return wrap;
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

function buildProjectDashboardCard(project, rank) {
  const st = Utils.getProjectStatus(project);
  const card = document.createElement('article');
  card.className = 'project-card ' + st.border;
  card.onclick = () => renderProjectView(project.id);
  const urgentDays = Utils.nearestUrgentExpiryDays(project);

  const head = document.createElement('div');
  head.className = 'flex justify-between items-start gap-2 mb-2';
  const rankBadge = rank
    ? '<span class="text-[10px] font-black text-slate-400 bg-slate-100 border rounded px-1.5 py-0.5 shrink-0" title="ลำดับความสำคัญ">#' + rank + '</span>'
    : '';
  head.innerHTML =
    '<div class="flex items-start gap-2 min-w-0 flex-1">' + rankBadge +
    '<h4 class="font-bold text-slate-800 leading-snug">' + Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo) + '</h4></div>' +
    '<span class="status-pill ' + st.pill + ' shrink-0">' + st.text + '</span>';

  const dept = document.createElement('p');
  dept.className = 'text-xs text-slate-500 mb-2';
  dept.innerHTML = '<i class="fa-solid fa-tag mr-1"></i>' + Utils.escapeHtml(project.department || '-');

  const counts = document.createElement('div');
  counts.className = 'flex gap-3 text-[11px] text-slate-600';
  counts.innerHTML =
    '<span class="text-emerald-600"><i class="fa-solid fa-circle text-[6px]"></i> ' + st.counts.safe + '</span>' +
    '<span class="text-amber-600"><i class="fa-solid fa-circle text-[6px]"></i> ' + st.counts.warning + '</span>' +
    '<span class="text-rose-600"><i class="fa-solid fa-circle text-[6px]"></i> ' + st.counts.expired + '</span>';

  const drive = document.createElement('p');
  const hasDrive = !!Utils.getProjectDriveUrl(project);
  drive.className = hasDrive ? 'text-[11px] text-blue-600 mt-2 truncate' : 'text-[11px] text-slate-400 mt-2';
  drive.innerHTML = hasDrive
    ? '<i class="fa-brands fa-google-drive mr-1"></i>มีลิงก์ Drive — เปิดได้จากหน้าโครงการ'
    : '<i class="fa-brands fa-google-drive mr-1"></i>ยังไม่มีลิงก์ — ต้องใส่ URL ก่อนเปิดไฟล์';

  card.append(head, dept, counts, drive);

  if (urgentDays < 99999 && st.status !== 'safe' && st.status !== 'empty') {
    const urgent = document.createElement('p');
    urgent.className = 'text-[11px] font-bold mt-2 ' + (urgentDays < 0 ? 'text-rose-600' : 'text-amber-600');
    urgent.innerHTML = urgentDays < 0
      ? '<i class="fa-solid fa-calendar-xmark mr-1"></i>หมดอายุแล้ว ' + Math.abs(urgentDays) + ' วัน'
      : '<i class="fa-solid fa-calendar-day mr-1"></i>หมดอายุในอีก ' + urgentDays + ' วัน';
    card.appendChild(urgent);
  }

  return card;
}

function buildAlertRow(project, license, st) {
  const row = document.createElement('article');
  row.className = 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow';
  const info = document.createElement('div');
  info.innerHTML =
    '<p class="font-bold text-sm">' + Utils.escapeHtml(license.name) + ' <span class="status-pill ' + st.status + ' ml-1">' + st.text + '</span></p>' +
    '<p class="text-xs text-slate-500 mt-1">' + Utils.escapeHtml(project.name) + ' · หมดอายุ ' + Utils.formatDate(license.expiryDate) + '</p>';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-primary text-sm px-4 py-2 shrink-0';
  btn.textContent = 'จัดการ';
  btn.onclick = () => renderProjectView(project.id);
  row.append(info, btn);
  return row;
}

window.showDashboard = showDashboard;
