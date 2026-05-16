function renderProjectView(projectId) {
  App.currentView = 'project';
  App.currentProjectId = projectId;
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  }
  renderSidebar();

  const project = App.projects.find(p => p.id === projectId);
  if (!project) return;

  document.getElementById('page-title').innerHTML =
    '<span class="flex items-center gap-3 w-full truncate"><i class="fa-regular fa-building text-indigo-500"></i>' +
    Utils.escapeHtml(project.name) +
    '<button type="button" onclick="openProjectModal(' + project.id + ')" class="ml-2 text-xs bg-slate-100 px-2 py-1 rounded border">แก้ไข</button></span>';

  const content = document.getElementById('main-content');
  content.replaceChildren();

  const header = document.createElement('section');
  header.className = 'bg-white p-5 rounded-2xl shadow-sm border mb-6 flex flex-col md:flex-row gap-4 justify-between';
  const emailWrap = document.createElement('div');
  emailWrap.innerHTML = '<p class="text-xs font-bold text-slate-400 uppercase mb-2">อีเมลรับแจ้งเตือน</p>';
  const emailTags = document.createElement('p');
  emailTags.className = 'flex flex-wrap gap-2 text-[11px]';
  (project.emails || []).forEach(e => {
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
  addBtn.className = 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl';
  addBtn.textContent = '+ เพิ่มใบอนุญาต';
  addBtn.onclick = () => openLicenseModal();
  header.append(emailWrap, addBtn);
  content.append(header);

  const title = document.createElement('h3');
  title.className = 'text-xl font-bold mb-4';
  title.textContent = 'ใบอนุญาตในโครงการ';
  content.append(title);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-5';
  const licenses = project.licenses || [];
  if (licenses.length === 0) {
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
  card.className = 'bg-white rounded-2xl shadow-sm border flex flex-col';

  const top = document.createElement('header');
  top.className = 'p-5 border-b';
  top.innerHTML = '<h4 class="text-lg font-bold pr-20">' + Utils.escapeHtml(l.name) + '</h4>' +
    '<p class="text-xs text-slate-500">สถานะ: <b class="text-purple-600">' + Utils.escapeHtml(l.status || '-') + '</b></p>' +
    '<span class="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded border ' + st.color + '">' + st.text + '</span>';
  top.style.position = 'relative';
  card.append(top);

  const mid = document.createElement('p');
  mid.className = 'p-4 text-sm grid grid-cols-2 gap-4';
  mid.innerHTML = '<span>ออก: ' + Utils.formatDate(l.issueDate) + '</span><span>หมดอายุ: ' + Utils.formatDate(l.expiryDate) + '</span>';
  card.append(mid);

  const actions = document.createElement('footer');
  actions.className = 'p-4 border-t flex gap-2';
  if (l.driveUrl) {
    const a = document.createElement('a');
    a.href = l.driveUrl;
    a.target = '_blank';
    a.className = 'text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg border';
    a.textContent = 'Google Drive';
    actions.append(a);
  }
  const timelineBtn = document.createElement('button');
  timelineBtn.type = 'button';
  timelineBtn.className = 'flex-1 bg-slate-800 text-white font-bold py-2 rounded-lg text-sm';
  timelineBtn.textContent = 'อัปเดตสถานะ/ประวัติ';
  timelineBtn.onclick = () => renderTimeline(project.id, l.id);
  actions.append(timelineBtn);
  card.append(actions);
  return card;
}

window.renderProjectView = renderProjectView;
