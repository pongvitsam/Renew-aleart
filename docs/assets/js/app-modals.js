function handleEmailInput(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const email = e.target.value.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (!App.tempEmails.includes(email)) {
      App.tempEmails.push(email);
      renderEmailTags();
      e.target.value = '';
    } else showToast('อีเมลนี้ถูกเพิ่มไปแล้ว', 'error');
  } else if (email) showToast('รูปแบบอีเมลไม่ถูกต้อง', 'error');
}

function removeEmailTag(index) {
  App.tempEmails.splice(index, 1);
  renderEmailTags();
}

function renderEmailTags() {
  const container = document.getElementById('email-tags');
  const counter = document.getElementById('email-counter');
  if (!container || !counter) return;
  container.replaceChildren();
  App.tempEmails.forEach((email, i) => {
    const span = document.createElement('span');
    span.className = 'inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded border';
    span.textContent = email + ' ';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '×';
    btn.onclick = () => removeEmailTag(i);
    span.append(btn);
    container.append(span);
  });
  counter.textContent = App.tempEmails.length + '/5';
  counter.className = App.tempEmails.length >= 5 ? 'font-bold text-emerald-500' : 'font-bold text-rose-500';
}

function openProjectModal(projectId = null) {
  document.getElementById('project-id').value = '';
  document.getElementById('project-name').value = '';
  document.getElementById('project-department').value = '';
  document.getElementById('email-input').value = '';
  App.tempEmails = [];
  const title = document.getElementById('projectModalTitle');

  if (projectId) {
    const project = App.projects.find(p => p.id === projectId);
    if (project) {
      title.textContent = 'แก้ไขโครงการ';
      document.getElementById('project-id').value = project.id;
      document.getElementById('project-name').value = project.name;
      document.getElementById('project-department').value = project.department || '';
      App.tempEmails = [...(project.emails || [])];
    }
  } else {
    title.textContent = 'เพิ่มโครงการใหม่';
  }
  renderEmailTags();
  openModal('projectModal');
}

async function saveProject() {
  const id = document.getElementById('project-id').value;
  const name = document.getElementById('project-name').value.trim();
  const department = document.getElementById('project-department').value;
  if (!name || !department) return showToast('กรุณากรอกชื่อและแผนก', 'error');
  if (App.tempEmails.length < 5) return showToast('ต้องระบุอีเมลอย่างน้อย 5 อีเมล', 'error');

  Utils.setLoading(true);
  try {
    const res = await Api.saveProject({ id: id || undefined, name, department, emails: App.tempEmails });
    App.projects = res.projects || [];
    closeModal('projectModal');
    showToast('บันทึกโครงการสำเร็จ');
    renderSidebar();
    if (App.currentView === 'dashboard') showDashboard();
    else renderProjectView(id ? Number(id) : App.projects[App.projects.length - 1]?.id);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

function openLicenseModal() {
  document.getElementById('license-name').value = '';
  document.getElementById('license-issue-date').value = '';
  document.getElementById('license-expiry-date').value = '';
  document.getElementById('license-alert-months').value = '3';
  document.getElementById('license-drive-url').value = '';
  document.getElementById('license-steps').value =
    '1. แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง\n2. ขอเอกสารสนับสนุนจากลูกค้า\n3. ได้รับเอกสารครบถ้วน\n4. ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ\n5. แจ้งผลให้ลูกค้าทราบ\n6. เสร็จสิ้นสมบูรณ์';
  openModal('licenseModal');
}

async function saveLicense() {
  const name = document.getElementById('license-name').value.trim();
  const issueDate = document.getElementById('license-issue-date').value;
  const expiryDate = document.getElementById('license-expiry-date').value;
  const alertMonths = parseInt(document.getElementById('license-alert-months').value, 10) || 3;
  const driveUrl = document.getElementById('license-drive-url').value;
  const stepsTxt = document.getElementById('license-steps').value;
  if (!name || !issueDate || !expiryDate) return showToast('กรุณากรอกข้อมูลสำคัญให้ครบ', 'error');

  const steps = stepsTxt.split('\n').map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(Boolean);

  Utils.setLoading(true);
  try {
    const res = await Api.saveLicense({
      projectId: App.currentProjectId,
      name, issueDate, expiryDate, alertMonths, driveUrl, steps
    });
    App.projects = res.projects || [];
    closeModal('licenseModal');
    showToast('บันทึกใบอนุญาตสำเร็จ');
    renderProjectView(App.currentProjectId);
    renderSidebar();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

function renderTimeline(projectId, licenseId) {
  const project = App.projects.find(p => p.id === projectId);
  const license = project?.licenses?.find(l => l.id === licenseId);
  if (!license) return;

  document.getElementById('timelineModalTitle').textContent = license.name;
  document.getElementById('update-license-id').value = license.id;

  const container = document.getElementById('timeline-container');
  container.replaceChildren();
  (license.steps || []).forEach(step => {
    const done = (license.history || []).some(h => h.action === step);
    const current = license.status === step;
    const row = document.createElement('p');
    row.className = 'text-sm mb-3 pl-4 border-l-2 ' + (done ? 'border-emerald-500' : current ? 'border-purple-500 font-bold' : 'border-slate-200');
    row.textContent = (done ? '✓ ' : current ? '● ' : '○ ') + step;
    container.append(row);
  });

  const select = document.getElementById('update-step');
  select.replaceChildren();
  select.append(new Option('-- ระบุสถานะ/ขั้นตอน --', ''));
  (license.steps || []).forEach(s => select.append(new Option(s, s, false, license.status === s)));

  document.getElementById('log-count').textContent = (license.history?.length || 0) + ' ครั้ง';
  const logBox = document.getElementById('history-log-container');
  logBox.replaceChildren();
  [...(license.history || [])].reverse().forEach(h => {
    const item = document.createElement('article');
    item.className = 'bg-white border p-3 rounded-xl text-sm mb-2';
    item.innerHTML = '<b>' + Utils.escapeHtml(h.action) + '</b> — ' + Utils.formatDate(h.date) +
      '<br>' + Utils.escapeHtml(h.note || 'ไม่มีหมายเหตุ');
    logBox.append(item);
  });

  openModal('timelineModal');
}

async function saveTimelineUpdate() {
  const licenseId = document.getElementById('update-license-id').value;
  const step = document.getElementById('update-step').value;
  const note = document.getElementById('update-note').value.trim();
  if (!step && !note) return showToast('กรุณาระบุขั้นตอนหรือหมายเหตุ', 'error');

  Utils.setLoading(true);
  try {
    const res = await Api.saveTimelineUpdate({ licenseId, step, note });
    App.projects = res.projects || [];
    showToast('บันทึกประวัติสำเร็จ');
    document.getElementById('update-note').value = '';
    renderTimeline(App.currentProjectId, Number(licenseId));
    renderProjectView(App.currentProjectId);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

function openTestEmailModal(projectId) {
  const project = App.projects.find(p => p.id === projectId);
  if (!project) return;
  App.activeTestProjectId = projectId;
  const select = document.getElementById('test-email-license-select');
  select.replaceChildren();
  if (!(project.licenses || []).length) {
    select.append(new Option('ยังไม่มีใบอนุญาต', ''));
    document.getElementById('mock-email-preview').textContent = 'กรุณาเพิ่มใบอนุญาตก่อน';
  } else {
    project.licenses.forEach(l => select.append(new Option(l.name, l.id)));
    updateMockEmailPreview();
  }
  openModal('testEmailModal');
}

function updateMockEmailPreview() {
  const project = App.projects.find(p => p.id === App.activeTestProjectId);
  const select = document.getElementById('test-email-license-select');
  const preview = document.getElementById('mock-email-preview');
  if (!select.value || !project) return;
  const l = project.licenses.find(x => String(x.id) === String(select.value));
  const exp = new Date(l.expiryDate);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const expStr = exp.getDate() + ' ' + months[exp.getMonth()] + ' ' + (exp.getFullYear() + 543);
  preview.innerHTML = '<p><b>To:</b> ' + Utils.escapeHtml(project.emails.join(', ')) + '</p>' +
    '<p><b>Subj:</b> [แจ้งเตือน] ' + Utils.escapeHtml(l.name) + '</p>' +
    '<p>โครงการ: ' + Utils.escapeHtml(project.name) + '<br>หมดอายุ: ' + expStr + '</p>';
}

async function sendTestEmail() {
  const select = document.getElementById('test-email-license-select');
  if (!select.value) return showToast('กรุณาเลือกใบอนุญาต', 'error');
  const saveLog = document.getElementById('test-email-save-log').checked;

  Utils.setLoading(true);
  try {
    const res = await Api.sendTestEmail({
      projectId: App.activeTestProjectId,
      licenseId: select.value,
      saveLog
    });
    if (res.projects) App.projects = res.projects;
    else await loadProjects();
    closeModal('testEmailModal');
    showToast('ส่งอีเมลทดสอบสำเร็จ');
    if (App.currentView === 'project') renderProjectView(App.activeTestProjectId);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

Object.assign(window, {
  handleEmailInput, openProjectModal, saveProject, openLicenseModal, saveLicense,
  renderTimeline, saveTimelineUpdate, openTestEmailModal, updateMockEmailPreview, sendTestEmail
});
