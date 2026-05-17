const Utils = {
  TH_MONTHS_SHORT: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  TH_MONTHS_FULL: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  TH_DOW: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],

  toBE(year) { return year + 543; },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return `${date.getDate()} ${this.TH_MONTHS_SHORT[date.getMonth()]} ${this.toBE(date.getFullYear())}`;
  },

  formatMonthYear(year, month) {
    return `${this.TH_MONTHS_FULL[month]} พ.ศ. ${this.toBE(year)}`;
  },

  calculateStatus(expiryDate, alertMonths) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate + 'T12:00:00');
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { status: 'expired', text: 'หมดอายุแล้ว', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    }
    if (diffDays <= (alertMonths || 3) * 30) {
      return { status: 'warning', text: 'ใกล้หมดอายุ', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
    return { status: 'safe', text: 'ปกติ', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  },

  licenseCounts(licenses) {
    let safe = 0, warning = 0, expired = 0;
    (licenses || []).forEach(l => {
      const s = this.calculateStatus(l.expiryDate, l.alertMonths).status;
      if (s === 'expired') expired++;
      else if (s === 'warning') warning++;
      else safe++;
    });
    return { safe, warning, expired, total: (licenses || []).length };
  },

  getProjectStatus(project) {
    const licenses = project.licenses || [];
    const counts = this.licenseCounts(licenses);
    if (!counts.total) {
      return { status: 'empty', text: 'ไม่มีใบอนุญาต', pill: 'empty', border: 'status-empty', counts };
    }
    if (counts.expired > 0) {
      return { status: 'expired', text: 'หมดอายุ ' + counts.expired, pill: 'expired', border: 'status-expired', counts };
    }
    if (counts.warning > 0) {
      return { status: 'warning', text: 'ใกล้หมดอายุ ' + counts.warning, pill: 'warning', border: 'status-warning', counts };
    }
    return { status: 'safe', text: 'ปกติ', pill: 'safe', border: 'status-safe', counts };
  },

  /** ลำดับความสำคัญ: หมดอายุ(0) → ใกล้หมดอายุ(1) → ปกติ(2) → ไม่มีใบอนุญาต(3) */
  projectPriorityRank(status) {
    return { expired: 0, warning: 1, safe: 2, empty: 3 }[status] ?? 9;
  },

  /** วันจนถึงวันหมดอายุที่เร่งด่วนที่สุด (ติดลบ = หมดอายุแล้ว) */
  nearestUrgentExpiryDays(project) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let nearest = Infinity;
    (project.licenses || []).forEach(l => {
      const s = this.calculateStatus(l.expiryDate, l.alertMonths);
      if (s.status === 'expired' || s.status === 'warning') {
        const exp = new Date(l.expiryDate + 'T12:00:00');
        const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        if (days < nearest) nearest = days;
      }
    });
    return nearest === Infinity ? 99999 : nearest;
  },

  compareProjectsByPriority(a, b) {
    const sa = this.getProjectStatus(a);
    const sb = this.getProjectStatus(b);
    const ra = this.projectPriorityRank(sa.status);
    const rb = this.projectPriorityRank(sb.status);
    if (ra !== rb) return ra - rb;

    const da = this.nearestUrgentExpiryDays(a);
    const db = this.nearestUrgentExpiryDays(b);
    if (da !== db) return da - db;

    if (sa.counts.expired !== sb.counts.expired) return sb.counts.expired - sa.counts.expired;
    if (sa.counts.warning !== sb.counts.warning) return sb.counts.warning - sa.counts.warning;

    return (a.name || '').localeCompare(b.name || '', 'th');
  },

  sortProjectsByPriority(projects) {
    return [...(projects || [])].sort((a, b) => this.compareProjectsByPriority(a, b));
  },

  compareAlertsByPriority(a, b) {
    const order = { expired: 0, warning: 1 };
    const oa = order[a.st.status] ?? 9;
    const ob = order[b.st.status] ?? 9;
    if (oa !== ob) return oa - ob;
    const da = new Date(a.license.expiryDate + 'T12:00:00').getTime();
    const db = new Date(b.license.expiryDate + 'T12:00:00').getTime();
    if (da !== db) return da - db;
    return (a.project.name || '').localeCompare(b.project.name || '', 'th');
  },

  debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icon = type === 'success'
      ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>'
      : '<i class="fa-solid fa-circle-exclamation text-rose-500"></i>';
    toast.className = 'toast-item ' + (type === 'success'
      ? 'toast-success'
      : 'toast-error');
    toast.innerHTML = '<span class="text-xl">' + icon + '</span><span class="text-sm font-bold">' + this.escapeHtml(message) + '</span>';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  },

  setLoading(isLoading) {
    const el = document.getElementById('loading-overlay');
    if (!el) return;
    el.classList.toggle('hidden', !isLoading);
    el.classList.toggle('flex', isLoading);
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      if (id === 'timelineModal') {
        const s = document.getElementById('update-step');
        const n = document.getElementById('update-note');
        if (s) s.value = '';
        if (n) n.value = '';
      }
    }
  },

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  isDriveUrl(url) {
    const u = String(url || '').trim();
    return /^https?:\/\//i.test(u) && /drive\.google|docs\.google/i.test(u);
  },

  getProjectDriveUrl(project) {
    return this.isDriveUrl(project?.driveUrl) ? String(project.driveUrl).trim() : '';
  },

  parseStepsText(text) {
    return String(text || '')
      .split('\n')
      .map(s => s.trim().replace(/^\d+\.\s*/, ''))
      .filter(Boolean);
  },

  formatStepsText(steps) {
    return (steps || [])
      .map((s, i) => (i + 1) + '. ' + s)
      .join('\n');
  },

  ROUND_START_ACTION: 'เริ่มรอบติดตามใหม่',

  /** ประวัติที่นับเป็นความคืบหน้ารอบปัจจุบัน (หลังเริ่มรอบใหม่แล้วไม่นับ log เก่า) */
  getCurrentRoundProgressHistory(license) {
    const hist = [...(license?.history || [])];
    let lastStart = -1;
    hist.forEach((h, i) => {
      if (h.action === this.ROUND_START_ACTION) lastStart = i;
    });
    if (lastStart < 0) return hist;
    return hist.slice(lastStart + 1);
  },

  /** ประวัติที่แสดงใน panel (รวมบันทึกเริ่มรอบใหม่) */
  getCurrentRoundDisplayHistory(license) {
    const hist = [...(license?.history || [])];
    let lastStart = -1;
    hist.forEach((h, i) => {
      if (h.action === this.ROUND_START_ACTION) lastStart = i;
    });
    if (lastStart < 0) return hist;
    return hist.slice(lastStart);
  },

  currentRoundNumber(license) {
    return this.renewalRoundCount(license) + 1;
  },

  resolveStatusAfterStepsChange(steps, currentStatus, history) {
    if (!steps.length) return currentStatus || '';
    if (currentStatus && steps.includes(currentStatus)) return currentStatus;
    const done = new Set((history || []).map(h => h.action));
    const next = steps.find(s => !done.has(s));
    return next || steps[steps.length - 1];
  },

  resolveStatusAfterStepsChangeForLicense(license, steps, currentStatus) {
    const roundHist = license
      ? this.getCurrentRoundProgressHistory(license)
      : [];
    return this.resolveStatusAfterStepsChange(steps, currentStatus, roundHist);
  },

  isRenewalStepsComplete(license) {
    const steps = license?.steps || [];
    if (!steps.length) return false;
    const last = steps[steps.length - 1];
    const hist = this.getCurrentRoundProgressHistory(license);
    if (license.status === last && hist.some(h => h.action === last)) return true;
    return steps.every(s => hist.some(h => h.action === s));
  },

  renewalRoundCount(license) {
    return (license?.renewalCycles || []).length;
  },

  buildDriveOpenControl(project, opts) {
    opts = opts || {};
    const url = this.getProjectDriveUrl(project);
    const onEdit = opts.onEdit;

    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = opts.className || 'btn-primary text-sm px-4 py-2 inline-flex items-center gap-2 shrink-0';
      a.innerHTML = '<i class="fa-brands fa-google-drive"></i> ' + (opts.label || 'เปิดโฟลเดอร์ Drive');
      return a;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.disabled = true;
    btn.className = opts.disabledClassName ||
      'text-sm px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed inline-flex items-center gap-2 shrink-0';
    btn.title = 'ต้องวาง URL Google Drive ของโครงการก่อนจึงจะเปิดได้';
    btn.innerHTML = '<i class="fa-brands fa-google-drive"></i> ' + (opts.disabledLabel || 'เปิด Drive (ยังไม่มีลิงก์)');
    return btn;
  }
};

function openModal(id) { Utils.openModal(id); }
function closeModal(id) { Utils.closeModal(id); }
function showToast(msg, type) { Utils.showToast(msg, type); }
