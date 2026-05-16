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
  counter.textContent = App.tempEmails.length ? App.tempEmails.length + ' อีเมล' : 'ไม่บังคับ';
  counter.className = 'text-xs font-bold text-slate-500';
}

function openProjectModal(projectId = null) {
  document.getElementById('project-id').value = '';
  document.getElementById('project-name').value = '';
  document.getElementById('email-input').value = '';
  const driveEl = document.getElementById('project-drive-url');
  if (driveEl) driveEl.value = '';
  App.tempEmails = [];
  const title = document.getElementById('projectModalTitle');
  let dept = '';

  if (projectId) {
    const project = App.projects.find(p => p.id === projectId);
    if (project) {
      title.textContent = 'แก้ไขโครงการ';
      document.getElementById('project-id').value = project.id;
      document.getElementById('project-name').value = project.name;
      dept = project.department || '';
      if (driveEl) driveEl.value = project.driveUrl || '';
      App.tempEmails = [...(project.emails || [])];
    }
  } else {
    title.textContent = 'เพิ่มโครงการใหม่';
  }
  populateDepartmentSelect(dept);
  renderEmailTags();
  openModal('projectModal');
}

async function saveProject() {
  const id = document.getElementById('project-id').value;
  const name = document.getElementById('project-name').value.trim();
  const department = document.getElementById('project-department').value;
  const driveUrl = (document.getElementById('project-drive-url') || {}).value?.trim() || '';
  if (!name || !department) return showToast('กรุณากรอกชื่อและแผนก', 'error');

  const payload = { id: id || undefined, name, department, emails: App.tempEmails, driveUrl };
  const localId = Mutations.upsertProjectLocal(payload);
  closeModal('projectModal');
  showToast('บันทึกโครงการแล้ว');
  refreshCurrentView();

  try {
    await Api.saveProject(payload);
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

function openLicenseModal() {
  document.getElementById('license-name').value = '';
  document.getElementById('license-issue-date').value = '';
  document.getElementById('license-expiry-date').value = '';
  document.getElementById('license-alert-months').value = '3';
  document.getElementById('license-steps').value =
    '1. แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง\n2. ขอเอกสารสนับสนุนจากลูกค้า\n3. ได้รับเอกสารครบถ้วน\n4. ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ\n5. แจ้งผลให้ลูกค้าทราบ\n6. เสร็จสิ้นสมบูรณ์';
  openModal('licenseModal');
}

async function saveLicense() {
  const name = document.getElementById('license-name').value.trim();
  const issueDate = document.getElementById('license-issue-date').value;
  const expiryDate = document.getElementById('license-expiry-date').value;
  const alertMonths = parseInt(document.getElementById('license-alert-months').value, 10) || 3;
  const stepsTxt = document.getElementById('license-steps').value;
  if (!name || !issueDate || !expiryDate) return showToast('กรุณากรอกข้อมูลสำคัญให้ครบ', 'error');

  const steps = stepsTxt.split('\n').map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(Boolean);
  const payload = {
    projectId: App.currentProjectId,
    name, issueDate, expiryDate, alertMonths, driveUrl: '', steps,
    status: 'รอเริ่มดำเนินการ'
  };

  Mutations.addLicenseLocal(App.currentProjectId, payload);
  closeModal('licenseModal');
  showToast('บันทึกใบอนุญาตแล้ว');
  refreshCurrentView();

  try {
    await Api.saveLicense(payload);
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

async function saveTimelineUpdate() {
  const licenseId = document.getElementById('update-license-id').value;
  const step = document.getElementById('update-step').value;
  const note = document.getElementById('update-note').value.trim();
  if (!step && !note) return showToast('กรุณาระบุขั้นตอนหรือหมายเหตุ', 'error');

  Mutations.timelineUpdateLocal(licenseId, step, note);
  document.getElementById('update-note').value = '';
  renderTimeline(App.currentProjectId, Number(licenseId));
  renderProjectView(App.currentProjectId);
  showToast('บันทึกขั้นตอนแล้ว');

  try {
    await Api.saveTimelineUpdate({ licenseId, step, note });
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
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
  const to = (project.emails && project.emails.length) ? project.emails.join(', ') : '(ยังไม่มีอีเมล — ไม่สามารถส่งจริงได้)';
  preview.innerHTML = '<p><b>To:</b> ' + Utils.escapeHtml(to) + '</p>' +
    '<p><b>Subj:</b> [แจ้งเตือน] ' + Utils.escapeHtml(l.name) + '</p>' +
    '<p>โครงการ: ' + Utils.escapeHtml(project.name) + '<br>หมดอายุ: ' + expStr + '</p>';
}

async function sendTestEmail() {
  const select = document.getElementById('test-email-license-select');
  if (!select.value) return showToast('กรุณาเลือกใบอนุญาต', 'error');
  const saveLog = document.getElementById('test-email-save-log').checked;

  Utils.setLoading(true);
  try {
    await Api.sendTestEmail({
      projectId: App.activeTestProjectId,
      licenseId: select.value,
      saveLog
    });
    closeModal('testEmailModal');
    showToast('ส่งอีเมลทดสอบสำเร็จ');
    refreshCurrentView();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

Object.assign(window, {
  handleEmailInput, openProjectModal, saveProject, openLicenseModal, saveLicense,
  saveTimelineUpdate, openTestEmailModal, updateMockEmailPreview, sendTestEmail
});
