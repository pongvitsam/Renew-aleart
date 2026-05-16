function renderSidebar() {
  const container = document.getElementById('project-list-container');
  const searchInput = document.getElementById('project-search');
  if (!container) return;

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  container.innerHTML = '';

  const filtered = App.projects.filter(p => p.name.toLowerCase().includes(searchTerm));
  if (filtered.length === 0) {
    container.innerHTML =
      '<p class="text-slate-500 text-xs text-center mt-6 py-6 bg-slate-900/30 rounded-xl border border-slate-800/50">' +
      (searchTerm ? 'ไม่พบโครงการที่ค้นหา' : 'ยังไม่มีโครงการ') + '</p>';
    return;
  }

  const grouped = {};
  filtered.forEach(p => {
    const dept = p.department || 'ไม่ระบุแผนก';
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(p);
  });

  for (const [dept, projs] of Object.entries(grouped)) {
    let deptIcon = 'fa-folder';
    if (dept.includes('ก่อสร้าง')) deptIcon = 'fa-helmet-safety';
    else if (dept.includes('นิติบุคคล')) deptIcon = 'fa-building-user';
    else if (dept.includes('ส่วนกลาง')) deptIcon = 'fa-building';

    const section = document.createElement('section');
    section.className = 'mb-4';
    section.innerHTML =
      '<p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 flex items-center gap-1.5">' +
      '<i class="fa-solid ' + deptIcon + '"></i> ' + Utils.escapeHtml(dept) + '</p>';

    const ul = document.createElement('ul');
    ul.className = 'space-y-1';

    projs.forEach(project => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = App.currentProjectId === project.id;
      btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group ' +
        (active ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent');
      btn.onclick = () => renderProjectView(project.id);
      btn.innerHTML =
        '<span class="truncate pr-2">' + Utils.escapeHtml(project.name) + '</span>' +
        '<span class="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-md shrink-0">' + (project.licenses?.length || 0) + '</span>';
      li.appendChild(btn);
      ul.appendChild(li);
    });

    section.appendChild(ul);
    container.appendChild(section);
  }
}

window.renderSidebar = renderSidebar;
