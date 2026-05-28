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
    const lastDoneIdx = nextPendingIdx < 0 ? steps.length - 1 : nextPendingIdx - 1;

    const flow = document.createElement('div');
    flow.className = 'timeline-flow';

    steps.forEach((step, idx) => {
      const done = roundHist.some(h => h.action === step);
      const current = license.status === step;
      const hist = roundHist.filter(h => h.action === step);
      const lastNote = hist.length ? hist[hist.length - 1] : null;
      const canSave = !done && idx === nextPendingIdx;
      const canCancel = done && idx === lastDoneIdx;

      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'timeline-step timeline-step-horizontal' + (done ? ' done' : '') + (current ? ' current' : '');
      row.disabled = !canSave && !canCancel;
      row.title = canSave ? 'กดเพื่อบันทึกขั้นตอนนี้' : (canCancel ? 'ยกเลิกขั้นตอนล่าสุดได้' : (done ? 'บันทึกแล้ว' : 'กรุณาบันทึกขั้นตอนก่อนหน้าให้ครบ'));
      const noteInputId = 'timeline-note-' + String(license.id) + '-' + String(idx);
      row.onclick = () => {
        if (!canSave) return;
        const noteEl = document.getElementById(noteInputId);
        const note = noteEl ? noteEl.value : '';
        saveTimelineStepQuick(step, note);
      };

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

        const noteLabel = document.createElement('label');
        noteLabel.className = 'block mt-2';
        noteLabel.innerHTML =
          '<span class="text-[11px] text-slate-500 font-bold">หมายเหตุ</span>' +
          '<textarea id="' + noteInputId + '" rows="2" placeholder="พิมพ์หมายเหตุของขั้นตอนนี้ (ไม่บังคับ)" class="w-full mt-1 border rounded-lg p-2 text-xs bg-white"></textarea>';
        body.appendChild(noteLabel);

        const inlineSaveBtn = document.createElement('button');
        inlineSaveBtn.type = 'button';
        inlineSaveBtn.className = 'mt-2 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg';
        inlineSaveBtn.textContent = 'บันทึกขั้นตอนนี้';
        inlineSaveBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const noteEl = document.getElementById(noteInputId);
          const note = noteEl ? noteEl.value : '';
          saveTimelineStepQuick(step, note);
        };
        body.appendChild(inlineSaveBtn);
      }

      if (canCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'mt-2 text-[11px] font-bold text-rose-600 hover:text-rose-700 underline';
        cancelBtn.textContent = 'ยกเลิกขั้นตอนนี้';
        cancelBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          cancelTimelineStepQuick(step);
        };
        body.appendChild(cancelBtn);
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

  App._timelineStepsEditorLocked = App._timelineStepsEditorLocked || {};
  App._timelineStepsEditorLocked[licenseId] = true;
  Mutations.updateLicenseStepsLocal(projectId, licenseId, steps, status);
  paintTimelineModal(Mutations.findLicense(projectId, licenseId));
  showToast('บันทึกรายการขั้นตอนแล้ว');
  refreshCurrentView({ skipSidebar: true });

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

function saveTimelineStepQuick(step, note) {
  App._timelineQuickStep = step;
  saveTimelineUpdate(step, note || '');
}

function cancelTimelineStepQuick(step) {
  if (typeof cancelTimelineStep === 'function') cancelTimelineStep(step);
}
