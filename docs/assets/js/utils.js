const Utils = {
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
  },

  calculateStatus(expiryDate, alertMonths) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', text: 'หมดอายุแล้ว', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    }
    if (diffDays <= (alertMonths * 30)) {
      return { status: 'warning', text: 'ใกล้หมดอายุ', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    }
    return { status: 'safe', text: 'ปกติ', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icon = type === 'success'
      ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>'
      : '<i class="fa-solid fa-circle-exclamation text-rose-500"></i>';
    const bg = type === 'success'
      ? 'bg-white border-l-4 border-emerald-500'
      : 'bg-white border-l-4 border-rose-500 text-rose-700';

    toast.className = `${bg} p-4 rounded-r-xl shadow-lg flex items-center gap-3 transform transition-all duration-500 translate-y-10 opacity-0 min-w-[250px] pointer-events-auto`;
    toast.innerHTML = '<span class="text-xl shrink-0">' + icon + '</span><span class="text-sm font-bold"></span>';
    toast.querySelector('span:last-child').textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-10');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  },

  setLoading(isLoading) {
    const el = document.getElementById('loading-overlay');
    if (!el) return;
    el.classList.toggle('hidden', !isLoading);
    el.classList.toggle('flex', isLoading);
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      if (id === 'timelineModal') {
        document.getElementById('update-step').value = '';
        document.getElementById('update-note').value = '';
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
