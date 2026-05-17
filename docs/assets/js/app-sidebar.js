let _sidebarSearchBound = false;

function renderSidebar(light) {
  const container = document.getElementById('project-list-container');
  const searchInput = document.getElementById('project-search');
  if (!container) return;

  if (!_sidebarSearchBound && searchInput) {
    _sidebarSearchBound = true;
    searchInput.addEventListener('input', Utils.debounce(() => renderSidebar(true), 180));
    searchInput.removeAttribute('onkeyup');
  }

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  container.replaceChildren();

  const filtered = App.projects.filter(p => p.name.toLowerCase().includes(searchTerm));
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'sidebar-empty';
    empty.innerHTML = searchTerm
      ? '<i class="fa-solid fa-magnifying-glass"></i><span>ไม่พบโครงการที่ค้นหา</span>'
      : '<i class="fa-solid fa-seedling"></i><span>ยังไม่มีโครงการ — กด「สร้างโครงการใหม่」</span>';
    container.appendChild(empty);
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
    const heading = document.createElement('p');
    heading.className = 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-3 flex items-center gap-1.5';
    heading.innerHTML = '<i class="fa-solid ' + deptIcon + '"></i> ' + Utils.escapeHtml(dept);
    section.appendChild(heading);

    const ul = document.createElement('ul');
    ul.className = 'space-y-1';

    projs.sort((a, b) => Utils.compareProjectsByPriority(a, b));
    projs.forEach(project => {
      const st = Utils.getProjectStatus(project);
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = App.currentProjectId === project.id;
      btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 group ' +
        (active ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent');
      btn.onclick = () => renderProjectView(project.id);

      const dot = document.createElement('span');
      dot.className = 'sidebar-dot ' + st.pill;
      dot.title = st.text;

      const label = document.createElement('span');
      label.className = 'truncate flex-1';
      label.innerHTML = Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo);

      const badge = document.createElement('span');
      badge.className = 'bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-md shrink-0';
      badge.textContent = String(project.licenses?.length || 0);

      btn.append(dot, label, badge);
      li.appendChild(btn);
      ul.appendChild(li);
    });

    section.appendChild(ul);
    container.appendChild(section);
  }
}

window.renderSidebar = renderSidebar;
