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
      return true;
    }
    this.showLogin();
    return false;
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
    if (badge && user) {
      const roleLabel = user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน';
      badge.innerHTML =
        '<i class="fa-solid fa-user-circle"></i> ' +
        Utils.escapeHtml(user.displayName || user.username) +
        ' <span class="text-slate-400 font-normal">(' + roleLabel + ')</span>';
    }
    if (adminBtn) {
      adminBtn.classList.toggle('hidden', !user || user.role !== 'admin');
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

    if (btn) btn.disabled = true;
    try {
      const res = await Api.login({ username, password });
      AuthStore.set({ token: res.token, user: res.user, expiresAt: res.expiresAt });
      App.currentUser = res.user;
      this.showApp();
      this.updateChrome();
      if (!Auth._started) {
        Auth._started = true;
        loadProjects().catch(onProjectsLoadError);
      }
    } catch (err) {
      if (errEl) errEl.textContent = err.message || 'เข้าสู่ระบบไม่สำเร็จ';
    } finally {
      if (btn) btn.disabled = false;
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
    if (e.key === 'Enter') this.submitLogin();
  }
};

Object.assign(window, {
  Auth, AuthStore, submitLogin: () => Auth.submitLogin(), logout: () => Auth.logout()
});
