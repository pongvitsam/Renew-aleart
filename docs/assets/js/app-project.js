function renderProjectView(projectId) {
  App.currentView = 'project';
  App.currentProjectId = projectId;
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  }
  renderSidebar(true);

  const project = App.projects.find(p => p.id === projectId);
  if (!project) return;

  const pst = Utils.getProjectStatus(project);
  document.getElementById('page-title').innerHTML =
    '<span class="flex items-center gap-3 w-full truncate"><i class="fa-regular fa-building text-indigo-500"></i>' +
    Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo) +
    '<span class="status-pill ' + pst.pill + ' ml-1">' + pst.text + '</span>' +
    '<button type="button" onclick="openProjectModal(' + project.id + ')" class="ml-auto text-xs bg-slate-100 px-2 py-1 rounded border shrink-0">แก้ไข</button></span>';

  const content = document.getElementById('main-content');
  content.replaceChildren();

  const driveSection = document.createElement('section');
  driveSection.className = 'drive-box mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3';
  if (project.driveUrl) {
    const info = document.createElement('div');
    info.innerHTML =
      '<p class="text-xs font-bold text-blue-800 uppercase mb-1"><i class="fa-brands fa-google-drive mr-1"></i> Google Drive โครงการ</p>' +
      '<p class="text-sm text-slate-600 truncate max-w-md">' + Utils.escapeHtml(project.driveUrl) + '</p>';
    const open = document.createElement('a');
    open.href = project.driveUrl;
    open.target = '_blank';
    open.rel = 'noopener';
    open.className = 'btn-primary text-sm px-4 py-2 inline-flex items-center gap-2 shrink-0';
    open.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i> เปิดโฟลเดอร์';
    driveSection.append(info, open);
  } else {
    driveSection.innerHTML =
      '<div><p class="text-sm font-bold text-slate-700"><i class="fa-brands fa-google-drive mr-2 text-blue-500"></i>ยังไม่มีลิงก์ Google Drive</p>' +
      '<p class="text-xs text-slate-500 mt-1">กดแก้ไขโครงการเพื่อวาง URL โฟลเดอร์ Drive</p></div>';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'text-sm font-bold text-indigo-600 border border-indigo-200 bg-white px-4 py-2 rounded-xl';
    edit.textContent = '+ เพิ่มลิงก์ Drive';
    edit.onclick = () => openProjectModal(project.id);
    driveSection.appendChild(edit);
  }
  content.appendChild(driveSection);

  const header = document.createElement('section');
  header.className = 'bg-white p-5 rounded-2xl shadow-sm border mb-6 flex flex-col md:flex-row gap-4 justify-between';
  const emailWrap = document.createElement('div');
  emailWrap.innerHTML = '<p class="text-xs font-bold text-slate-400 uppercase mb-2">อีเมลรับแจ้งเตือน (ไม่บังคับ)</p>';
  const emailTags = document.createElement('p');
  emailTags.className = 'flex flex-wrap gap-2 text-[11px]';
  const emails = project.emails || [];
  if (!emails.length) {
    const none = document.createElement('span');
    none.className = 'text-xs text-slate-400 italic';
    none.textContent = 'ยังไม่ได้ตั้งอีเมลแจ้งเตือน';
    emailTags.append(none);
  }
  emails.forEach(e => {
    const s = document.createElement('span');
    s.className = 'bg-slate-100 px-2 py-1 rounded border';
    s.textContent = e;
    emailTags.append(s);
  });
  emailWrap.append(emailTags);
  const testBtn = document.createElement('button');
  testBtn.type = 'button';
  testBtn.className = 'text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-lg border mt-2';
  testBtn.textContent = 'ทดสอบส่งแจ้งเตือน';
  testBtn.onclick = () => openTestEmailModal(project.id);
  emailWrap.append(testBtn);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl self-start';
  addBtn.textContent = '+ เพิ่มใบอนุญาต';
  addBtn.onclick = () => openLicenseModal();
  header.append(emailWrap, addBtn);
  content.append(header);

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold mb-4 flex items-center gap-2';
  title.innerHTML = '<i class="fa-solid fa-file-contract text-emerald-500"></i> ใบอนุญาตในโครงการ';
  content.append(title);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-5';
  const licenses = project.licenses || [];
  if (!licenses.length) {
    const empty = document.createElement('p');
    empty.className = 'col-span-full text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed';
    empty.textContent = 'ยังไม่มีใบอนุญาตในโครงการนี้';
    grid.append(empty);
  } else {
    licenses.forEach(l => grid.append(buildLicenseCard(project, l)));
  }
  content.append(grid);
}

function buildLicenseCard(project, l) {
  const st = Utils.calculateStatus(l.expiryDate, l.alertMonths);
  const card = document.createElement('article');
  card.className = 'bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden hover:shadow-md transition-shadow';

  const top = document.createElement('header');
  top.className = 'p-5 border-b relative';
  top.innerHTML =
    '<h4 class="text-lg font-bold pr-24">' + Utils.escapeHtml(l.name) + '</h4>' +
    '<p class="text-xs text-slate-500 mt-1">ขั้นตอน: <b class="text-purple-600">' + Utils.escapeHtml(l.status || 'ยังไม่เริ่ม') + '</b></p>' +
    '<span class="absolute top-4 right-4 status-pill ' + st.status + '">' + st.text + '</span>';
  card.append(top);

  const mid = document.createElement('div');
  mid.className = 'p-4 text-sm grid grid-cols-2 gap-4 bg-slate-50/50';
  mid.innerHTML =
    '<div><p class="text-[10px] text-slate-400 uppercase">ออก</p><p class="font-semibold">' + Utils.formatDate(l.issueDate) + '</p></div>' +
    '<div><p class="text-[10px] text-slate-400 uppercase">หมดอายุ</p><p class="font-semibold">' + Utils.formatDate(l.expiryDate) + '</p></div>';
  mid.innerHTML = mid.innerHTML.replace(/<\/?motion[^>]*>/gi, m => m.startsWith('</') ? '</div>' : '<div>');
  card.append(mid);

  const actions = document.createElement('footer');
  actions.className = 'p-4 border-t flex gap-2 flex-wrap';
  if (l.driveUrl) {
    const a = document.createElement('a');
    a.href = l.driveUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg border font-bold inline-flex items-center gap-1';
    a.innerHTML = '<i class="fa-brands fa-google-drive"></i> Drive';
    actions.append(a);
  }
  const timelineBtn = document.createElement('button');
  timelineBtn.type = 'button';
  timelineBtn.className = 'flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm';
  timelineBtn.innerHTML = '<i class="fa-solid fa-list-check mr-1"></i> ขั้นตอน / ประวัติ';
  timelineBtn.onclick = () => renderTimeline(project.id, l.id);
  actions.append(timelineBtn);
  card.append(actions);
  return card;
}

window.renderProjectView = renderProjectView;
