const TimelineUI = {
  render(license) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.replaceChildren();

    const steps = license.steps || [];
    if (!steps.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-500 text-center py-4';
      empty.textContent = 'ยังไม่มีขั้นตอน — กรอกด้านบนแล้วกดบันทึก';
      container.appendChild(empty);
      return;
    }

    const roundHist = Utils.getCurrentRoundProgressHistory(license);
    const roundNo = Utils.currentRoundNumber(license);
    const nextPendingIdx = steps.findIndex(s => !roundHist.some(h => h.action === s));

    const flow = document.createElement('div');
    flow.className = 'timeline-flow';

    steps.forEach((step, idx) => {
      const done = roundHist.some(h => h.action === step);
      const current = license.status === step;
      const hist = roundHist.filter(h => h.action === step);
      const lastNote = hist.length ? hist[hist.length - 1] : null;
      const canSave = (!done && idx === (nextPendingIdx < 0 ? steps.length - 1 : nextPendingIdx)) || current;

      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'timeline-step timeline-step-horizontal' + (done ? ' done' : '') + (current ? ' current' : '');
      row.disabled = !canSave;
      row.title = canSave ? 'กดเพื่อบันทึกขั้นตอนนี้' : (done ? 'บันทึกแล้ว' : 'กรุณาบันทึกขั้นตอนก่อนหน้าให้ครบ');
      row.onclick = () => saveTimelineStepQuick(step);

      const dot = document.createElement('div');
      dot.className = 'timeline-dot';
      dot.innerHTML = done ? '<i class="fa-solid fa-check"></i>' : current ? '<i class="fa-solid fa-play"></i>' : '<span>' + (idx + 1) + '</span>';

      const body = document.createElement('div');
      body.className = 'timeline-body';
      const title = document.createElement('p');
      title.className = 'font-bold text-sm text-slate-800';
      title.textContent = step;
      body.appendChild(title);

      if (lastNote && lastNote.note) {
        const note = document.createElement('p');
        note.className = 'text-xs text-slate-600 mt-1';
        note.innerHTML = '<i class="fa-regular fa-comment mr-1"></i>' + Utils.escapeHtml(lastNote.note);
        body.appendChild(note);
      }
      if (lastNote) {
        const dt = document.createElement('p');
        dt.className = 'text-[10px] text-slate-400 mt-1';
        dt.textContent = Utils.formatDate(lastNote.date);
        body.appendChild(dt);
      }

      if (canSave) {
        const pin = document.createElement('p');
        pin.className = 'text-[11px] text-indigo-600 font-bold mt-2';
        pin.textContent = 'กดเพื่อบันทึกขั้นตอนนี้';
        body.appendChild(pin);
      }

      row.append(dot, body);
      flow.appendChild(row);
      if (idx < steps.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'timeline-arrow';
        arrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        flow.appendChild(arrow);
      }
    });
    container.appendChild(flow);

    const hint = document.createElement('p');
    hint.className = 'text-[11px] text-slate-500 mt-3 text-center';
    hint.textContent = 'ความคืบหน้าเฉพาะรอบที่ ' + roundNo + ' (ไม่รวมรอบเก่า)';
    container.appendChild(hint);
  },

  renderLogs(license) {
    const displayHist = Utils.getCurrentRoundDisplayHistory(license);
    document.getElementById('log-count').textContent = displayHist.length + ' ครั้ง';
    const logBox = document.getElementById('history-log-container');
    logBox.replaceChildren();
    if (license._historyLoading) {
      const loading = document.createElement('p');
      loading.className = 'text-center text-slate-400 text-sm py-6';
      loading.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> กำลังโหลดประวัติ...';
      logBox.appendChild(loading);
      return;
    }
    const list = [...displayHist].reverse();
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'text-center text-slate-400 text-sm py-6';
      empty.textContent = 'ยังไม่มีประวัติ';
      logBox.appendChild(empty);
      return;
    }
    list.forEach(h => {
      const item = document.createElement('article');
      item.className = 'log-item';
      item.innerHTML =
        '<div class="flex justify-between gap-2 mb-1">' +
        '<span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">' + Utils.escapeHtml(h.action) + '</span>' +
        '<span class="text-[10px] text-slate-400">' + Utils.formatDate(h.date) + '</span></div>' +
        '<p class="text-sm text-slate-600">' + Utils.escapeHtml(h.note || '—') + '</p>';
      logBox.appendChild(item);
    });
  }
};

async function renderTimeline(projectId, licenseId) {
  const project = App.projects.find(p => p.id === projectId);
  let license = project?.licenses?.find(l => l.id === licenseId);
  if (!license) return;

  App.currentProjectId = projectId;
  document.getElementById('timelineModalTitle').textContent = license.name;
  document.getElementById('update-license-id').value = license.id;
  openModal('timelineModal');
  paintTimelineModal(license);

  const needsDetail = !Array.isArray(license.history);
  if (!needsDetail) return;

  license._historyLoading = true;
  TimelineUI.renderLogs(license);
  try {
    const res = await Api.getLicenseDetail(licenseId);
    if (res.license) {
      Api.mergeLicenseDetail(licenseId, res.license);
      license = App.projects.find(p => p.id === projectId)?.licenses?.find(l => l.id === licenseId);
      if (license) {
        license._historyLoading = false;
        paintTimelineModal(license);
      }
    }
  } catch {
    if (license) {
      license._historyLoading = false;
      TimelineUI.renderLogs(license);
    }
  }
}

function paintTimelineModal(license) {
  const stepsEdit = document.getElementById('timeline-steps-edit');
  if (stepsEdit) {
    const defaultSteps = [
      'แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง',
      'ขอเอกสารสนับสนุนจากลูกค้า',
      'ได้รับเอกสารครบถ้วน',
      'ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ',
      'แจ้งผลให้ลูกค้าทราบ',
      'เสร็จสิ้นสมบูรณ์'
    ];
    stepsEdit.value = Utils.formatStepsText(license.steps?.length ? license.steps : defaultSteps);
  }
  TimelineUI.render(license);
  RenewalUI.renderPanel(license);
  TimelineUI.renderLogs(license);
}

async function saveLicenseSteps() {
  const licenseId = Number(document.getElementById('update-license-id').value);
  const projectId = App.currentProjectId;
  const license = Mutations.findLicense(projectId, licenseId);
  if (!license) return showToast('ไม่พบใบอนุญาต', 'error');

  const steps = Utils.parseStepsText(document.getElementById('timeline-steps-edit').value);
  if (!steps.length) return showToast('ต้องมีอย่างน้อย 1 ขั้นตอน', 'error');

  const status = Utils.resolveStatusAfterStepsChangeForLicense(license, steps, license.status);

  Mutations.updateLicenseStepsLocal(projectId, licenseId, steps, status);
  paintTimelineModal(Mutations.findLicense(projectId, licenseId));
  showToast('บันทึกรายการขั้นตอนแล้ว');
  refreshCurrentView();

  try {
    await Api.saveLicenseSteps({ licenseId, steps });
    const res = await Api.getLicenseDetail(licenseId);
    if (res.license) {
      Api.mergeLicenseDetail(licenseId, res.license);
      paintTimelineModal(Mutations.findLicense(projectId, licenseId));
    }
  } catch (err) {
    showToast('ซิงค์ข้อมูลไม่สำเร็จ: ' + err.message, 'error');
    Api.refreshInBackground();
  }
}

window.renderTimeline = renderTimeline;
window.saveLicenseSteps = saveLicenseSteps;

function saveTimelineStepQuick(step) {
  App._timelineQuickStep = step;
  const stepEl = document.getElementById('update-step');
  if (stepEl) stepEl.value = step;
  saveTimelineUpdate();
}
