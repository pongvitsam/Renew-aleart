const RenewalUI = {
  renderPanel(license) {
    const panel = document.getElementById('renewal-panel');
    if (!panel) return;
    panel.replaceChildren();

    const current = document.createElement('div');
    current.className = 'renewal-current mb-4 p-3 rounded-xl border border-indigo-200 bg-indigo-50/50';
    const roundNum = Utils.renewalRoundCount(license) + 1;
    current.innerHTML =
      '<p class="text-xs font-bold text-indigo-800 uppercase mb-2"><i class="fa-solid fa-calendar-check mr-1"></i> รอบติดตามปัจจุบัน (รอบที่ ' + roundNum + ')</p>' +
      '<p class="text-sm"><span class="text-slate-500">วันเริ่ม:</span> <b>' + Utils.formatDate(license.issueDate) + '</b></p>' +
      '<p class="text-sm mt-1"><span class="text-slate-500">วันหมดอายุ:</span> <b>' + Utils.formatDate(license.expiryDate) + '</b></p>';
    panel.appendChild(current);

    const editExpiry = document.createElement('div');
    editExpiry.className = 'mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50/60';
    editExpiry.innerHTML =
      '<p class="text-xs font-bold text-blue-800 uppercase mb-2"><i class="fa-solid fa-calendar-days mr-1"></i> แก้ไขวันหมดอายุ</p>' +
      '<label class="text-xs font-bold block mb-2">วันหมดอายุใหม่</label>';
    const expiryMount = document.createElement('div');
    editExpiry.appendChild(expiryMount);
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'w-full mt-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 py-2 rounded-lg';
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกวันหมดอายุ';
    saveBtn.onclick = () => saveLicenseExpiryDate(license.id);
    editExpiry.appendChild(saveBtn);
    panel.appendChild(editExpiry);
    ThaiDatePicker.mount(expiryMount, {
      id: 'renewal-edit-expiry-date',
      placeholder: 'เลือกวันหมดอายุใหม่',
      value: license.expiryDate || ''
    });

    const ready = Utils.isRenewalStepsComplete(license);
    const formWrap = document.createElement('div');
    formWrap.className = 'renewal-form-wrap mb-4 p-3 rounded-xl border ' +
      (ready ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-slate-50');

    if (ready) {
      const title = document.createElement('p');
      title.className = 'text-sm font-bold text-emerald-800 mb-3';
      title.innerHTML = '<i class="fa-solid fa-circle-check mr-1"></i> ขั้นตอนครบแล้ว — กรอกวันสำหรับรอบติดตามถัดไป';
      formWrap.appendChild(title);

      const hint = document.createElement('p');
      hint.className = 'text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 mb-3';
      hint.textContent = 'เมื่อเริ่มรอบใหม่ ระบบจะลบประวัติขั้นตอนและ log ของรอบเก่าทั้งหมด';
      formWrap.appendChild(hint);

      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3';

      const issueLbl = document.createElement('label');
      issueLbl.className = 'text-xs font-bold block';
      issueLbl.innerHTML = '<span class="block mb-1">วันเริ่มรอบใหม่ *</span>';
      const issueMount = document.createElement('div');
      issueLbl.appendChild(issueMount);

      const expiryLbl = document.createElement('label');
      expiryLbl.className = 'text-xs font-bold block';
      expiryLbl.innerHTML = '<span class="block mb-1">วันหมดอายุรอบใหม่ *</span>';
      const expiryMount = document.createElement('div');
      expiryLbl.appendChild(expiryMount);

      grid.append(issueLbl, expiryLbl);
      formWrap.appendChild(grid);

      const noteLbl = document.createElement('label');
      noteLbl.className = 'text-xs font-bold block mb-3';
      noteLbl.innerHTML = 'หมายเหตุ (ไม่บังคับ)<textarea id="renewal-note" rows="2" class="w-full border rounded-lg p-2 text-sm mt-1" placeholder="เช่น ต่อใบอนุญาตครั้งที่ 2"></textarea>';
      formWrap.appendChild(noteLbl);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full btn-primary py-2.5 text-sm';
      btn.innerHTML = '<i class="fa-solid fa-rotate mr-1"></i> บันทึกและเริ่มรอบติดตามใหม่';
      btn.onclick = () => saveCompleteRenewal(license.id);
      formWrap.appendChild(btn);

      panel.appendChild(formWrap);

      ThaiDatePicker.mount(issueMount, { id: 'renewal-issue-date', placeholder: 'เลือกวันเริ่ม' });
      ThaiDatePicker.mount(expiryMount, { id: 'renewal-expiry-date', placeholder: 'เลือกวันหมดอายุ' });
    } else {
      formWrap.innerHTML =
        '<p class="text-sm text-slate-600"><i class="fa-solid fa-info-circle mr-1"></i> เมื่อบันทึกขั้นตอน <b>เสร็จสิ้นสมบูรณ์</b> ครบแล้ว จึงจะกรอกวันเริ่ม/หมดอายุรอบถัดไปได้</p>';
      panel.appendChild(formWrap);
    }

    const histTitle = document.createElement('p');
    histTitle.className = 'text-xs font-bold text-slate-600 uppercase mb-2 mt-2';
    histTitle.innerHTML = '<i class="fa-solid fa-clock-rotate-left mr-1"></i> ประวัติรอบต่ออายุย้อนหลัง (' + Utils.renewalRoundCount(license) + ' รอบ)';
    panel.appendChild(histTitle);

    const cycles = [...(license.renewalCycles || [])].reverse();
    if (!cycles.length) {
      const empty = document.createElement('p');
      empty.className = 'text-xs text-slate-400 text-center py-4 bg-white rounded-lg border border-dashed';
      empty.textContent = 'ยังไม่มีรอบย้อนหลัง — หลังบันทึกรอบใหม่จะแสดงที่นี่';
      panel.appendChild(empty);
      return;
    }

    cycles.forEach(c => {
      const card = document.createElement('article');
      card.className = 'renewal-round-card';
      card.innerHTML =
        '<div class="flex justify-between items-start gap-2 mb-1">' +
        '<span class="text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">รอบที่ ' + c.round + '</span>' +
        '<span class="text-[10px] text-slate-400">บันทึก ' + Utils.formatDate(c.archivedAt) + '</span></div>' +
        '<p class="text-sm text-slate-700">' + Utils.formatDate(c.issueDate) + ' → ' + Utils.formatDate(c.expiryDate) + '</p>' +
        (c.note ? '<p class="text-xs text-slate-500 mt-1">' + Utils.escapeHtml(c.note) + '</p>' : '');
      panel.appendChild(card);
    });
  }
};

async function saveCompleteRenewal(licenseId) {
  const issueDate = ThaiDatePicker.getValue('renewal-issue-date');
  const expiryDate = ThaiDatePicker.getValue('renewal-expiry-date');
  const note = document.getElementById('renewal-note')?.value?.trim() || '';
  if (!issueDate || !expiryDate) return showToast('กรุณาเลือกวันเริ่มและวันหมดอายุรอบใหม่', 'error');
  if (new Date(expiryDate + 'T12:00:00') <= new Date(issueDate + 'T12:00:00')) {
    return showToast('วันหมดอายุต้องหลังวันเริ่ม', 'error');
  }

  if (!confirm('เริ่มรอบติดตามใหม่จะลบประวัติขั้นตอนและ log ของรอบเก่าทั้งหมด\nต้องการดำเนินการต่อหรือไม่?')) {
    return;
  }

  Mutations.completeRenewalLocal(licenseId, issueDate, expiryDate, note);
  showToast('เริ่มรอบติดตามใหม่ — ล้างประวัติรอบเก่าแล้ว');
  renderTimeline(App.currentProjectId, licenseId);
  refreshCurrentView({ skipSidebar: true });

  try {
    await Api.completeRenewal({ licenseId, issueDate, expiryDate, note });
    const res = await Api.getLicenseDetail(licenseId);
    if (res.license) Api.mergeLicenseDetail(licenseId, res.license);
    renderTimeline(App.currentProjectId, licenseId);
  } catch (err) {
    showToast('ซิงค์ไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

window.saveCompleteRenewal = saveCompleteRenewal;

async function saveLicenseExpiryDate(licenseId) {
  const newExpiryDate = ThaiDatePicker.getValue('renewal-edit-expiry-date');
  if (!newExpiryDate) return showToast('กรุณาเลือกวันหมดอายุ', 'error');

  const project = Mutations.findProject(App.currentProjectId);
  const license = Mutations.findLicense(App.currentProjectId, licenseId);
  if (!project || !license) return showToast('ไม่พบข้อมูลใบอนุญาต', 'error');
  if (new Date(newExpiryDate + 'T12:00:00') <= new Date(license.issueDate + 'T12:00:00')) {
    return showToast('วันหมดอายุต้องหลังวันเริ่ม', 'error');
  }

  Mutations.updateLicenseDatesLocal(App.currentProjectId, licenseId, license.issueDate, newExpiryDate);
  showToast('บันทึกวันหมดอายุแล้ว');
  renderTimeline(App.currentProjectId, licenseId);
  refreshCurrentView({ skipSidebar: true });

  try {
    await Api.saveLicense({
      id: license.id,
      projectId: project.id,
      name: license.name,
      issueDate: license.issueDate,
      expiryDate: newExpiryDate,
      alertMonths: license.alertMonths,
      driveUrl: license.driveUrl || '',
      steps: license.steps || [],
      status: license.status
    });
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

window.saveLicenseExpiryDate = saveLicenseExpiryDate;
