const TimelineUI = {
  render(license) {
    const container = document.getElementById('timeline-container');
    if (!container) return;
    container.replaceChildren();

    (license.steps || []).forEach((step, idx) => {
      const done = (license.history || []).some(h => h.action === step);
      const current = license.status === step;
      const hist = (license.history || []).filter(h => h.action === step);
      const lastNote = hist.length ? hist[hist.length - 1] : null;

      const row = document.createElement('div');
      row.className = 'timeline-step' + (done ? ' done' : '') + (current ? ' current' : '');

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

      if (!done && !current) {
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'text-[11px] text-indigo-600 font-bold mt-2';
        pin.textContent = 'บันทึกขั้นตอนนี้';
        pin.onclick = () => {
          document.getElementById('update-step').value = step;
          document.getElementById('update-note').focus();
        };
        body.appendChild(pin);
      }

      row.append(dot, body);
      container.appendChild(row);
    });
  },

  renderLogs(license) {
    document.getElementById('log-count').textContent = (license.history?.length || 0) + ' ครั้ง';
    const logBox = document.getElementById('history-log-container');
    logBox.replaceChildren();
    const list = [...(license.history || [])].reverse();
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

function renderTimeline(projectId, licenseId) {
  const project = App.projects.find(p => p.id === projectId);
  const license = project?.licenses?.find(l => l.id === licenseId);
  if (!license) return;

  document.getElementById('timelineModalTitle').textContent = license.name;
  document.getElementById('update-license-id').value = license.id;

  TimelineUI.render(license);
  TimelineUI.renderLogs(license);

  const select = document.getElementById('update-step');
  select.replaceChildren();
  select.append(new Option('-- เลือกขั้นตอน --', ''));
  (license.steps || []).forEach(s => select.append(new Option(s, s, false, license.status === s)));

  openModal('timelineModal');
}

window.renderTimeline = renderTimeline;
