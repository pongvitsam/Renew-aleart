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
    toast.className = (type === 'success'
      ? 'bg-white border-l-4 border-emerald-500'
      : 'bg-white border-l-4 border-rose-500 text-rose-700') +
      ' p-4 rounded-r-xl shadow-lg flex items-center gap-3 min-w-[250px] pointer-events-auto';
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
  }
};

function openModal(id) { Utils.openModal(id); }
function closeModal(id) { Utils.closeModal(id); }
function showToast(msg, type) { Utils.showToast(msg, type); }
