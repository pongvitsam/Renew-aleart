function showDashboard() {
  App.currentView = 'dashboard';
  App.currentProjectId = null;
  renderSidebar();

  document.getElementById('page-title').innerHTML =
    '<i class="fa-solid fa-chart-pie text-indigo-500"></i> ภาพรวมระบบ (Dashboard)';

  const content = document.getElementById('main-content');
  content.replaceChildren();

  let totalLics = 0, expCount = 0, warnCount = 0;
  const alerts = [];

  App.projects.forEach(project => {
    (project.licenses || []).forEach(license => {
      totalLics++;
      const st = Utils.calculateStatus(license.expiryDate, license.alertMonths);
      if (st.status === 'expired') expCount++;
      else if (st.status === 'warning') warnCount++;
      if (st.status !== 'safe') alerts.push({ project, license, st });
    });
  });

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-6';
  grid.append(makeStat(App.projects.length, 'โครงการทั้งหมด'));
  grid.append(makeStat(totalLics, 'ใบอนุญาตทั้งหมด'));
  grid.append(makeStat(warnCount, 'ใกล้หมดอายุ', 'amber'));
  grid.append(makeStat(expCount, 'หมดอายุแล้ว', 'rose'));
  content.append(grid);

  const h3 = document.createElement('h3');
  h3.className = 'text-lg font-bold text-slate-800 mb-4';
  h3.textContent = 'แจ้งเตือนด่วน';
  content.append(h3);

  const list = document.createElement('div');
  list.className = 'space-y-3';
  if (alerts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed';
    empty.textContent = 'ไม่มีใบอนุญาตที่ต้องแจ้งเตือน';
    list.append(empty);
  } else {
    alerts.forEach(({ project, license, st }) => {
      const card = document.createElement('article');
      card.className = 'bg-white p-4 rounded-xl border flex justify-between gap-3 items-center';
      const info = document.createElement('p');
      info.className = 'text-sm font-bold';
      info.textContent = license.name + ' — ' + project.name + ' (' + st.text + ')';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'text-sm text-indigo-600 border px-3 py-1 rounded-lg';
      btn.textContent = 'จัดการ';
      btn.onclick = () => renderProjectView(project.id);
      card.append(info, btn);
      list.append(card);
    });
  }
  content.append(list);
}

function makeStat(num, label, tone) {
  const el = document.createElement('div');
  if (tone === 'amber') el.className = 'bg-amber-50 border border-amber-100 p-5 rounded-2xl text-center';
  else if (tone === 'rose') el.className = 'bg-rose-50 border border-rose-100 p-5 rounded-2xl text-center';
  else el.className = 'bg-white border border-slate-100 p-5 rounded-2xl text-center';
  const n = document.createElement('p');
  n.className = 'text-3xl font-black';
  n.textContent = String(num);
  const l = document.createElement('p');
  l.className = 'text-xs font-bold text-slate-500 uppercase mt-1';
  l.textContent = label;
  el.append(n, l);
  return el;
}

window.showDashboard = showDashboard;
