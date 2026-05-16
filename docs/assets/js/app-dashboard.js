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

  const hProjects = document.createElement('h3');
  hProjects.className = 'text-lg font-bold text-slate-800 mb-4 flex items-center gap-2';
  hProjects.innerHTML = '<i class="fa-solid fa-layer-group text-indigo-500"></i> สถานะแต่ละโครงการ';
  content.appendChild(hProjects);

  const pgrid = document.createElement('div');
  pgrid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8';
  if (!App.projects.length) {
    const empty = document.createElement('p');
    empty.className = 'col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed';
    empty.textContent = 'ยังไม่มีโครงการ — กดโหลดข้อมูลทดลองหรือสร้างโครงการใหม่';
    pgrid.appendChild(empty);
  } else {
    App.projects.forEach(p => pgrid.appendChild(buildProjectDashboardCard(p)));
  }
  content.appendChild(pgrid);

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
    alerts.forEach(a => list.appendChild(buildAlertRow(a.project, a.license, a.st)));
  }
  content.appendChild(list);
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

function buildProjectDashboardCard(project) {
  const st = Utils.getProjectStatus(project);
  const card = document.createElement('article');
  card.className = 'project-card ' + st.border;
  card.onclick = () => renderProjectView(project.id);

  const head = document.createElement('div');
  head.className = 'flex justify-between items-start gap-2 mb-2';
  head.innerHTML =
    '<h4 class="font-bold text-slate-800 leading-snug">' + Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo) + '</h4>' +
    '<span class="status-pill ' + st.pill + '">' + st.text + '</span>';

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
  drive.className = project.driveUrl ? 'text-[11px] text-blue-600 mt-2 truncate' : 'text-[11px] text-slate-400 mt-2';
  drive.innerHTML = project.driveUrl
    ? '<i class="fa-brands fa-google-drive mr-1"></i>มีโฟลเดอร์ Drive'
    : '<i class="fa-brands fa-google-drive mr-1"></i>ยังไม่มีลิงก์ Drive';

  card.append(head, dept, counts, drive);
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
