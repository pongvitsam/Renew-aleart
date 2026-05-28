let _sidebarSearchBound = false;
let _sidebarCacheKey = '';

function sidebarCacheKey() {
  const search = document.getElementById('project-search');
  const term = search ? search.value.trim().toLowerCase() : '';
  return (App._projectsRev || 0) + '|' + App.projects.length + '|' + App.currentProjectId + '|' + term;
}

function renderSidebar(light) {
  const container = document.getElementById('project-list-container');
  const searchInput = document.getElementById('project-search');
  if (!container) return;

  const cacheKey = sidebarCacheKey();
  if (light && cacheKey === _sidebarCacheKey) return;
  _sidebarCacheKey = cacheKey;

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
    heading.className = 'sidebar-dept-heading';
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
      btn.className = 'sidebar-project w-full text-left px-3 py-2 text-sm transition-all flex items-center gap-2 group' +
        (active ? ' sidebar-project--active font-bold' : '');
      btn.onclick = () => renderProjectView(project.id);

      const dot = document.createElement('span');
      dot.className = 'sidebar-dot ' + st.pill;
      dot.title = st.text;

      const label = document.createElement('span');
      label.className = 'truncate flex-1';
      label.innerHTML = Utils.escapeHtml(project.name) + demoBadgeHtml(project.isDemo);

      const badge = document.createElement('span');
      badge.className = 'sidebar-project-badge shrink-0';
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
