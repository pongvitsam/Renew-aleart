const AuthStore = {
  KEY: 'renew_session_v1',

  get() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o.token || !o.user) return null;
      if (o.expiresAt && Date.now() > new Date(o.expiresAt).getTime()) {
        this.clear();
        return null;
      }
      return o;
    } catch {
      return null;
    }
  },

  set(session) {
    localStorage.setItem(this.KEY, JSON.stringify(session));
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  getToken() {
    const s = this.get();
    return s ? s.token : null;
  }
};

const Auth = {
  _started: false,

  init() {
    const session = AuthStore.get();
    if (session) {
      App.currentUser = session.user;
      this.showApp();
      this.updateChrome();
      if (typeof updateSidebarNav === 'function') updateSidebarNav('dashboard');
      return true;
    }
    this.showLogin();
    this.warmupApi();
    return false;
  },

  warmupApi() {
    if (!CONFIG?.API_URL?.trim()) return;
    const run = () => Api.ping().catch(() => {});
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 2500);
    }
  },

  showLogin() {
    const screen = document.getElementById('login-screen');
    const root = document.getElementById('app-root');
    if (screen) screen.classList.remove('hidden');
    if (root) root.classList.add('hidden');
    document.body.classList.add('login-mode');
  },

  showApp() {
    const screen = document.getElementById('login-screen');
    const root = document.getElementById('app-root');
    if (screen) screen.classList.add('hidden');
    if (root) root.classList.remove('hidden');
    document.body.classList.remove('login-mode');
  },

  updateChrome() {
    const user = App.currentUser;
    const badge = document.getElementById('user-badge');
    const adminBtn = document.getElementById('admin-users-btn');
    const sidebarUser = document.getElementById('sidebar-user-label');
    const roleLabel = user?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน';
    const name = user ? (user.displayName || user.username) : '—';

    if (badge && user) {
      badge.innerHTML =
        '<i class="fa-solid fa-user-circle"></i> ' +
        Utils.escapeHtml(name) +
        ' <span class="text-slate-400 font-normal">(' + roleLabel + ')</span>';
    }
    if (sidebarUser) {
      sidebarUser.textContent = user ? name + ' · ' + roleLabel : '';
    }
    if (adminBtn) {
      adminBtn.classList.toggle('hidden', !user || user.role !== 'admin');
    }
  },

  setLoginLoading(loading) {
    const btn = document.getElementById('login-submit-btn');
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังเข้าสู่ระบบ...';
    } else {
      btn.textContent = btn.dataset.label || 'เข้าสู่ระบบ';
    }
  },

  async submitLogin() {
    const username = (document.getElementById('login-username')?.value || '').trim();
    const password = document.getElementById('login-password')?.value || '';
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-submit-btn');

    if (errEl) errEl.textContent = '';
    if (!username || !password) {
      if (errEl) errEl.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
      return;
    }

    if (!CONFIG?.API_URL?.trim()) {
      if (errEl) errEl.textContent = 'ยังไม่ได้ตั้งค่า API — ตรวจสอบ config.js';
      return;
    }

    this.setLoginLoading(true);
    try {
      const res = await Api.login({ username, password });
      if (!res.token || !res.user) {
        throw new Error('API ตอบกลับไม่ครบ — Deploy GAS เวอร์ชันล่าสุด (New version)');
      }
      AuthStore.set({ token: res.token, user: res.user, expiresAt: res.expiresAt });
      App.currentUser = res.user;
      this.showApp();
      this.updateChrome();
      if (typeof updateSidebarNav === 'function') updateSidebarNav('dashboard');
      if (!Auth._started) {
        Auth._started = true;
        loadProjects().catch(onProjectsLoadError);
      }
    } catch (err) {
      console.error('login failed', err);
      let msg = err.message || 'เข้าสู่ระบบไม่สำเร็จ';
      if (/Unknown action/i.test(msg)) {
        msg = 'API ยังไม่มีระบบ login — Deploy GAS → New version แล้วลองใหม่';
      } else if (/failed to fetch|network/i.test(msg)) {
        msg = 'เชื่อมต่อ API ไม่ได้ — ตรวจสอบเน็ตหรือ Deploy Web App';
      }
      if (errEl) errEl.textContent = msg;
    } finally {
      this.setLoginLoading(false);
    }
  },

  async logout() {
    const token = AuthStore.getToken();
    AuthStore.clear();
    App.currentUser = null;
    Auth._started = false;
    try {
      if (token) await Api.logout({ sessionToken: token });
    } catch (_) {}
    App.projects = [];
    App.departments = [];
    DataCache.clear();
    this.showLogin();
    const main = document.getElementById('main-content');
    if (main) main.replaceChildren();
  },

  forceLogout(message) {
    AuthStore.clear();
    App.currentUser = null;
    Auth._started = false;
    this.showLogin();
    const errEl = document.getElementById('login-error');
    if (errEl && message) errEl.textContent = message;
  },

  onLoginKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.submitLogin();
    }
  }
};

function onLoginKeydown(e) {
  Auth.onLoginKeydown(e);
}

Object.assign(window, {
  Auth, AuthStore, submitLogin: () => Auth.submitLogin(), logout: () => Auth.logout(), onLoginKeydown
});
