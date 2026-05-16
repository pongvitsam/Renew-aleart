function populateDepartmentSelect(selected) {
  const sel = document.getElementById('project-department');
  if (!sel) return;
  sel.replaceChildren();
  sel.append(new Option('-- เลือกแผนก --', ''));
  (App.departments || []).forEach(d => {
    sel.append(new Option(d.name, d.name, false, d.name === selected));
  });
}

function openDepartmentModal() {
  renderDepartmentList();
  openModal('departmentModal');
}

function renderDepartmentList() {
  const list = document.getElementById('department-list');
  if (!list) return;
  list.replaceChildren();

  if (!(App.departments || []).length) {
    const p = document.createElement('p');
    p.className = 'text-sm text-slate-500 text-center py-4';
    p.textContent = 'ยังไม่มีแผนก';
    list.append(p);
    return;
  }

  App.departments.forEach(d => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-2 bg-slate-50 border rounded-xl px-3 py-2';

    const info = document.createElement('div');
    info.className = 'min-w-0 flex-1';
    const title = document.createElement('p');
    title.className = 'font-bold text-sm truncate';
    title.textContent = d.name;
    const sub = document.createElement('p');
    sub.className = 'text-[11px] text-slate-500';
    sub.textContent = 'โครงการ ' + d.projectCount + ' รายการ';
    info.append(title, sub);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'text-xs px-2 py-1 rounded border shrink-0 ' +
      (d.canDelete ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-slate-400 border-slate-200 cursor-not-allowed');
    btn.textContent = 'ลบ';
    btn.disabled = !d.canDelete;
    btn.title = d.canDelete ? 'ลบแผนก' : 'มีโครงการใช้งาน — ลบไม่ได้';
    btn.onclick = () => deleteDepartment(d.id);

    row.append(info, btn);
    list.append(row);
  });
}

async function addDepartment() {
  const input = document.getElementById('new-department-name');
  const name = input.value.trim();
  if (!name) return showToast('กรุณาระบุชื่อแผนก', 'error');

  Utils.setLoading(true);
  try {
    const res = await Api.saveDepartment({ name });
    applyServerData(res);
    input.value = '';
    renderDepartmentList();
    populateDepartmentSelect();
    showToast('เพิ่มแผนกสำเร็จ');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

async function deleteDepartment(id) {
  if (!confirm('ลบแผนกนี้?')) return;
  Utils.setLoading(true);
  try {
    const res = await Api.deleteDepartment({ id });
    applyServerData(res);
    renderDepartmentList();
    populateDepartmentSelect();
    showToast('ลบแผนกสำเร็จ');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

async function loadDemoData() {
  Utils.setLoading(true);
  try {
    const res = await Api.seedMockData({ force: false });
    applyServerData(res);
    renderSidebar();
    showDashboard();
    showToast(res.message || 'โหลดข้อมูลทดลองแล้ว');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

Object.assign(window, {
  openDepartmentModal, addDepartment, deleteDepartment, loadDemoData, populateDepartmentSelect
});
