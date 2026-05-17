function openUserAdminModal() {
  if (!App.currentUser || App.currentUser.role !== 'admin') {
    return showToast('เฉพาะผู้ดูแลระบบเท่านั้น', 'error');
  }
  resetUserForm();
  renderUserList();
  openModal('userAdminModal');
}

function resetUserForm() {
  document.getElementById('user-form-id').value = '';
  document.getElementById('user-form-username').value = '';
  document.getElementById('user-form-display').value = '';
  document.getElementById('user-form-password').value = '';
  document.getElementById('user-form-password').placeholder = 'รหัสผ่าน (บังคับเมื่อเพิ่มใหม่)';
  document.getElementById('user-form-role').value = 'user';
  document.getElementById('user-form-active').checked = true;
  document.getElementById('user-form-title').textContent = 'เพิ่มผู้ใช้';
}

function fillUserForm(user) {
  document.getElementById('user-form-id').value = user.id;
  document.getElementById('user-form-username').value = user.username;
  document.getElementById('user-form-display').value = user.displayName || '';
  document.getElementById('user-form-password').value = '';
  document.getElementById('user-form-password').placeholder = 'เว้นว่าง = ไม่เปลี่ยนรหัสผ่าน';
  document.getElementById('user-form-role').value = user.role === 'admin' ? 'admin' : 'user';
  document.getElementById('user-form-active').checked = user.active !== false;
  document.getElementById('user-form-title').textContent = 'แก้ไขผู้ใช้';
}

async function renderUserList() {
  const list = document.getElementById('user-admin-list');
  if (!list) return;
  list.innerHTML = '<p class="text-sm text-slate-500 text-center py-4"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...</p>';

  try {
    const res = await Api.listUsers();
    const users = res.users || [];
    list.replaceChildren();

    if (!users.length) {
      const p = document.createElement('p');
      p.className = 'text-sm text-slate-500 text-center py-4';
      p.textContent = 'ยังไม่มีผู้ใช้';
      list.append(p);
      return;
    }

    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-2 bg-slate-50 border rounded-xl px-3 py-2';

      const info = document.createElement('div');
      info.className = 'min-w-0 flex-1';
      const title = document.createElement('p');
      title.className = 'font-bold text-sm truncate';
      title.textContent = (u.displayName || u.username) + ' (@' + u.username + ')';
      const sub = document.createElement('p');
      sub.className = 'text-[11px] text-slate-500';
      const roleTxt = u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน';
      const activeTxt = u.active !== false ? 'ใช้งาน' : 'ปิดใช้งาน';
      sub.textContent = roleTxt + ' · ' + activeTxt;
      info.append(title, sub);

      const actions = document.createElement('div');
      actions.className = 'flex gap-1 shrink-0';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'text-xs px-2 py-1 rounded border text-indigo-600 border-indigo-200 hover:bg-indigo-50';
      editBtn.textContent = 'แก้ไข';
      editBtn.onclick = () => fillUserForm(u);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'text-xs px-2 py-1 rounded border text-rose-600 border-rose-200 hover:bg-rose-50';
      delBtn.textContent = 'ลบ';
      const isSelf = Number(App.currentUser?.id) === Number(u.id);
      delBtn.disabled = isSelf;
      delBtn.title = isSelf ? 'ไม่สามารถลบบัญชีตัวเอง' : 'ลบผู้ใช้';
      delBtn.onclick = () => deleteAppUser(u.id);

      actions.append(editBtn, delBtn);
      row.append(info, actions);
      list.append(row);
    });
  } catch (err) {
    list.innerHTML = '<p class="text-sm text-rose-600 text-center py-4">' + Utils.escapeHtml(err.message) + '</p>';
  }
}

async function saveAppUser() {
  const id = document.getElementById('user-form-id').value;
  const username = document.getElementById('user-form-username').value.trim();
  const displayName = document.getElementById('user-form-display').value.trim();
  const password = document.getElementById('user-form-password').value;
  const role = document.getElementById('user-form-role').value;
  const active = document.getElementById('user-form-active').checked;

  if (!username) return showToast('กรุณาระบุชื่อผู้ใช้', 'error');
  if (!id && !password) return showToast('กรุณาตั้งรหัสผ่าน', 'error');

  const payload = { username, displayName, role, active };
  if (id) payload.id = Number(id);
  if (password) payload.password = password;

  try {
    await Api.saveUser(payload);
    showToast(id ? 'บันทึกผู้ใช้แล้ว' : 'เพิ่มผู้ใช้แล้ว');
    resetUserForm();
    renderUserList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteAppUser(id) {
  if (!confirm('ลบผู้ใช้นี้?')) return;
  try {
    await Api.deleteUser({ id: Number(id) });
    showToast('ลบผู้ใช้แล้ว');
    renderUserList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

Object.assign(window, {
  openUserAdminModal, saveAppUser, deleteAppUser, resetUserForm
});
