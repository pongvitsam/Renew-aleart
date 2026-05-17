const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const configSrc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'assets', 'js', 'config.js'), 'utf8');
const apiUrl = (configSrc.match(/API_URL:\s*'([^']+)'/) || [])[1] || '';
const bootInline =
  '<script>(function(){var K="renew_payload_v3";' +
  'try{var raw=localStorage.getItem(K);if(raw){var o=JSON.parse(raw);if(Date.now()-o.t<6048e5){window.__BOOT_CACHE__=o.data;document.documentElement.classList.add("has-cache");}}}catch(e){}})();</script>';
const ASSET_V = '27';
const base = '/Renew-aleart';
try {
  execSync('node "' + path.join(__dirname, 'bundle-js.js') + '"', { stdio: 'inherit' });
} catch (e) {
  console.warn('bundle-js skipped:', e.message);
}
const d = 'd' + 'iv';

const modal = (id, maxW, inner) =>
  `<${d} id="${id}" class="fixed inset-0 bg-slate-900/50 hidden items-center justify-center z-50 p-4">` +
  `<${d} class="bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] flex flex-col">${inner}</${d}></${d}>`;

const projectModal = modal('projectModal', 'max-w-lg', `
<${d} class="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 flex justify-between text-white font-bold"><span id="projectModalTitle">เพิ่มโครงการใหม่</span><button type="button" onclick="closeModal('projectModal')"><i class="fa-solid fa-xmark"></i></button></${d}>
<${d} class="p-5 space-y-4 overflow-y-auto flex-1">
<input type="hidden" id="project-id">
<label class="block text-sm font-bold">ชื่อโครงการ *<input id="project-name" class="w-full border rounded-xl px-4 py-3 mt-1"></label>
<label class="block text-sm font-bold">แผนก * <button type="button" onclick="closeModal('projectModal');openDepartmentModal()" class="text-xs text-indigo-600 font-bold ml-1">จัดการแผนก</button>
<select id="project-department" class="w-full border rounded-xl px-4 py-3 mt-1 block"><option value="">-- เลือกแผนก --</option></select></label>
<label class="block text-sm font-bold">อีเมลรับแจ้งเตือน (ไม่บังคับ)
<${d} class="border rounded-xl p-2 mt-1"><${d} id="email-tags" class="flex flex-wrap gap-2 mb-2"></${d}>
<input type="email" id="email-input" onkeydown="handleEmailInput(event)" placeholder="พิมพ์อีเมลแล้วกด Enter" class="w-full outline-none text-sm"></${d}>
<span id="email-counter" class="text-xs font-bold text-slate-500">ไม่บังคับ</span></label>
<label class="block text-sm font-bold">Google Drive โครงการ (โฟลเดอร์ละโครงการ)
<input type="url" id="project-drive-url" placeholder="https://drive.google.com/drive/folders/..." class="w-full border rounded-xl px-4 py-3 mt-1 text-sm">
<p class="text-xs text-slate-500 font-normal mt-1">ต้องวาง URL ก่อนจึงจะกดเปิดไฟล์ได้ — ไม่มีลิงก์จะเปิดไม่ได้</p></label>
</${d}>
<${d} class="p-5 border-t flex flex-wrap gap-3 items-center">
<button type="button" id="project-delete-btn" onclick="deleteProject()" class="hidden btn-danger py-3 px-4 rounded-xl font-bold text-sm"><i class="fa-solid fa-trash-can mr-1"></i>ลบโครงการ</button>
<${d} class="flex-1"></${d}>
<button type="button" onclick="closeModal('projectModal')" class="border py-3 px-5 rounded-xl font-bold">ยกเลิก</button>
<button type="button" onclick="saveProject()" class="bg-blue-600 text-white py-3 px-6 rounded-xl font-bold">บันทึก</button>
</${d}>`);

const licenseModal = modal('licenseModal', 'max-w-xl', `
<${d} class="bg-emerald-600 p-5 text-white font-bold flex justify-between"><span>เพิ่มใบอนุญาต</span><button type="button" onclick="closeModal('licenseModal')"><i class="fa-solid fa-xmark"></i></button></${d}>
<${d} class="p-5 space-y-4 overflow-y-auto flex-1">
<label class="block text-sm font-bold">ชื่อ *<input id="license-name" class="w-full border rounded-xl px-4 py-3 mt-1"></label>
<${d} class="grid grid-cols-2 gap-4">
<label class="text-sm font-bold block">วันที่ออก *<${d} id="license-issue-date-mount" class="mt-1"></${d}></label>
<label class="text-sm font-bold block">หมดอายุ *<${d} id="license-expiry-date-mount" class="mt-1"></${d}></label></${d}>
<label class="text-sm font-bold">แจ้งเตือน (เดือน)<input type="number" id="license-alert-months" min="1" value="3" class="w-full border rounded-xl p-2 mt-1 block w-full max-w-xs"></label>
<p class="text-xs text-slate-500">ไฟล์ Drive ใช้ลิงก์ของโครงการ — ตั้งในหน้าแก้ไขโครงการ</p>
<label class="text-sm font-bold">ขั้นตอน<textarea id="license-steps" rows="5" class="w-full border rounded-lg p-2 mt-1 text-sm"></textarea></label>
</${d}>
<${d} class="p-5 border-t flex gap-3">
<button type="button" onclick="closeModal('licenseModal')" class="flex-1 border py-3 rounded-xl font-bold">ยกเลิก</button>
<button type="button" onclick="saveLicense()" class="flex-[2] bg-emerald-500 text-white py-3 rounded-xl font-bold">บันทึก</button>
</${d}>`);

const timelineModal = modal('timelineModal', 'max-w-4xl h-[90vh]', `
<${d} class="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white font-bold flex justify-between items-center"><span><i class="fa-solid fa-list-check mr-2"></i><span id="timelineModalTitle">ขั้นตอนใบอนุญาต</span></span><button type="button" onclick="closeModal('timelineModal')" class="w-8 h-8 rounded-lg bg-white/20"><i class="fa-solid fa-xmark"></i></button></${d}>
<${d} class="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
<${d} class="md:w-1/2 p-5 overflow-y-auto border-r bg-slate-50 custom-scrollbar">
<${d} class="steps-editor-box mb-4">
<h4 class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><i class="fa-solid fa-pen-to-square text-indigo-500"></i> แก้ไขขั้นตอนดำเนินการ</h4>
<p class="text-xs text-slate-500 mb-2">แก้ไขได้ตลอดเวลา — หนึ่งบรรทัดต่อหนึ่งขั้นตอน</p>
<textarea id="timeline-steps-edit" rows="6" class="w-full border rounded-xl p-2.5 text-sm bg-white" placeholder="1. ขั้นตอนแรก&#10;2. ขั้นตอนถัดไป"></textarea>
<button type="button" onclick="saveLicenseSteps()" class="w-full mt-2 bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm"><i class="fa-solid fa-floppy-disk mr-1"></i> บันทึกรายการขั้นตอน</button>
</${d}>
<h4 class="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><i class="fa-solid fa-shoe-prints text-purple-500"></i> ความคืบหน้า</h4><${d} id="timeline-container" class="pr-2 mb-4"></${d}><h4 class="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2 border-t pt-4"><i class="fa-solid fa-rotate text-emerald-500"></i> รอบต่ออายุ</h4><${d} id="renewal-panel"></${d}></${d}>
<${d} class="md:w-1/2 flex flex-col">
<${d} class="p-4 border-b bg-white"><input type="hidden" id="update-license-id">
<label class="text-xs font-bold text-slate-600 block mb-1">อัปเดตขั้นตอน<select id="update-step" class="w-full border rounded-xl p-2.5 text-sm mt-1"></select></label>
<label class="text-xs font-bold text-slate-600 block mt-3">หมายเหตุ<textarea id="update-note" rows="3" placeholder="รายละเอียดเพิ่มเติม..." class="w-full border rounded-xl p-2.5 text-sm mt-1"></textarea></label>
<button type="button" onclick="saveTimelineUpdate()" class="w-full mt-3 btn-primary py-2.5 text-sm">บันทึกขั้นตอน</button></${d}>
<${d} class="p-4 flex-1 overflow-y-auto bg-slate-50 custom-scrollbar"><p class="text-sm font-bold text-slate-700 mb-3"><i class="fa-solid fa-clock-rotate-left text-indigo-500 mr-1"></i>ประวัติ <span id="log-count" class="text-indigo-600">0</span></p><${d} id="history-log-container"></${d}></${d}>
</${d}></${d}>`);

const userAdminModal = modal('userAdminModal', 'max-w-lg', `
<${d} class="bg-indigo-700 p-5 text-white font-bold flex justify-between"><span><i class="fa-solid fa-users-gear mr-2"></i>จัดการผู้ใช้</span><button type="button" onclick="closeModal('userAdminModal')"><i class="fa-solid fa-xmark"></i></button></${d}>
<${d} class="p-5 space-y-4 flex-1 overflow-y-auto">
<${d} class="border rounded-xl p-4 bg-slate-50 space-y-3">
<p id="user-form-title" class="text-sm font-bold text-slate-700">เพิ่มผู้ใช้</p>
<input type="hidden" id="user-form-id">
<label class="block text-xs font-bold">ชื่อผู้ใช้ (login) *<input id="user-form-username" class="w-full border rounded-xl px-3 py-2 text-sm mt-1" autocomplete="off"></label>
<label class="block text-xs font-bold">ชื่อที่แสดง<input id="user-form-display" class="w-full border rounded-xl px-3 py-2 text-sm mt-1"></label>
<label class="block text-xs font-bold">รหัสผ่าน<input type="password" id="user-form-password" class="w-full border rounded-xl px-3 py-2 text-sm mt-1" placeholder="รหัสผ่าน (บังคับเมื่อเพิ่มใหม่)"></label>
<${d} class="grid grid-cols-2 gap-3">
<label class="text-xs font-bold">บทบาท<select id="user-form-role" class="w-full border rounded-xl px-3 py-2 text-sm mt-1 block"><option value="user">ผู้ใช้งาน</option><option value="admin">ผู้ดูแลระบบ</option></select></label>
<label class="text-xs font-bold flex items-end gap-2 pb-2"><input type="checkbox" id="user-form-active" checked class="rounded"> เปิดใช้งาน</label></${d}>
<${d} class="flex gap-2"><button type="button" onclick="resetUserForm()" class="flex-1 border py-2 rounded-xl text-sm font-bold">ล้างฟอร์ม</button><button type="button" onclick="saveAppUser()" class="flex-[2] bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold">บันทึกผู้ใช้</button></${d}>
</${d}>
<${d} id="user-admin-list" class="space-y-2"></${d}>
</${d}>`);

const departmentModal = modal('departmentModal', 'max-w-md', `
<${d} class="bg-slate-800 p-5 text-white font-bold flex justify-between"><span>จัดการแผนก</span><button type="button" onclick="closeModal('departmentModal')"><i class="fa-solid fa-xmark"></i></button></${d}>
<${d} class="p-5 space-y-3 flex-1 overflow-y-auto">
<${d} class="flex gap-2"><input id="new-department-name" type="text" placeholder="ชื่อแผนกใหม่" class="flex-1 border rounded-xl px-3 py-2 text-sm"><button type="button" onclick="addDepartment()" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">เพิ่ม</button></${d}>
<p class="text-xs text-slate-500">ลบได้เฉพาะแผนกที่ยังไม่มีโครงการ</p>
<${d} id="department-list" class="space-y-2"></${d}>
</${d}>`);

const testModal = modal('testEmailModal', 'max-w-2xl', `
<${d} class="p-5 border-b font-bold flex justify-between"><span>ทดสอบอีเมล</span><button type="button" onclick="closeModal('testEmailModal')"><i class="fa-solid fa-xmark"></i></button></${d}>
<${d} class="p-5 flex-1 overflow-y-auto space-y-4">
<label class="text-sm font-bold block">ใบอนุญาต<select id="test-email-license-select" onchange="updateMockEmailPreview()" class="w-full border rounded-xl p-3 mt-1"></select></label>
<${d} id="mock-email-preview" class="bg-slate-50 border p-4 rounded-xl text-sm"></${d}>
<label class="flex gap-2 text-sm"><input type="checkbox" id="test-email-save-log" checked class="mt-1"> บันทึกลงประวัติ</label>
</${d}>
<${d} class="p-5 border-t flex gap-3">
<button type="button" onclick="closeModal('testEmailModal')" class="flex-1 border py-3 rounded-xl font-bold">ยกเลิก</button>
<button type="button" onclick="sendTestEmail()" class="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold">ส่งทดสอบ</button>
</${d}>`);

const html = [
  '<!DOCTYPE html><html lang="th"><head>',
  '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '<title>Renew Aleart</title>',
  bootInline,
  '<link rel="icon" href="' + base + '/favicon.svg" type="image/svg+xml">',
  '<link rel="preconnect" href="https://script.google.com" crossorigin>',
  '<link rel="preconnect" href="https://script.googleusercontent.com" crossorigin>',
  '<link rel="dns-prefetch" href="https://script.google.com">',
  '<link rel="dns-prefetch" href="https://script.googleusercontent.com">',
  '<link rel="stylesheet" href="' + base + '/assets/css/tailwind.css?v=' + ASSET_V + '">',
  '<link rel="stylesheet" href="' + base + '/assets/css/app.css?v=' + ASSET_V + '">',
  '<link rel="stylesheet" href="' + base + '/assets/vendor/fontawesome/css/all.min.css?v=' + ASSET_V + '">',
  '</head><body class="text-slate-800 h-screen overflow-hidden login-mode">',
  `<${d} id="login-screen" class="fixed inset-0 z-[80] flex items-center justify-center p-4 login-screen-bg">`,
  `<${d} class="login-card w-full max-w-md">`,
  `<${d} class="text-center mb-6"><i class="fa-solid fa-shield-halved text-4xl text-indigo-500"></i><h1 class="text-2xl font-bold mt-2">Renew Aleart</h1><p class="text-sm text-slate-500">เข้าสู่ระบบเพื่อจัดการใบอนุญาต</p></${d}>`,
  `<label class="block text-sm font-bold mb-1">ชื่อผู้ใช้<input id="login-username" type="text" autocomplete="username" class="w-full border rounded-xl px-4 py-3 mt-1" onkeydown="onLoginKeydown(event)"></label>`,
  `<label class="block text-sm font-bold mb-4">รหัสผ่าน<input id="login-password" type="password" autocomplete="current-password" class="w-full border rounded-xl px-4 py-3 mt-1" onkeydown="onLoginKeydown(event)"></label>`,
  `<p id="login-error" class="text-sm text-rose-600 mb-3 min-h-[1.25rem]"></p>`,
  `<button type="button" id="login-submit-btn" onclick="submitLogin()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700">เข้าสู่ระบบ</button>`,
  `</${d}></${d}>`,
  `<${d} id="app-root" class="app-shell hidden h-screen flex overflow-hidden">`,
  `<${d} id="loading-overlay" class="hidden fixed inset-0 bg-slate-900/40 z-[70] items-center justify-center backdrop-blur-sm"><${d} class="loader-card"><i class="fa-solid fa-spinner fa-spin mr-2"></i>กำลังโหลด...</${d}></${d}>`,
  `<${d} class="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-40 flex items-center justify-between px-4"><span class="text-indigo-600 font-bold"><i class="fa-solid fa-shield-halved"></i> Renew Aleart</span><button type="button" onclick="toggleSidebar()" class="text-2xl"><i class="fa-solid fa-bars"></i></button></${d}>`,
  '<aside id="sidebar" class="fixed md:static inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 -translate-x-full md:translate-x-0 transition-transform z-50 flex flex-col">',
  `<${d} class="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 font-bold text-white text-lg gap-2"><i class="fa-solid fa-shield-halved text-indigo-400"></i> Renew Aleart</${d}>`,
  `<${d} class="p-4 space-y-2 sidebar-nav">` +
  `<button type="button" onclick="showDashboard()" class="w-full bg-slate-800 text-white py-3 rounded-xl"><i class="fa-solid fa-chart-pie text-indigo-400"></i> ภาพรวม</button>` +
  `<button type="button" onclick="openProjectModal()" class="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl"><i class="fa-solid fa-plus"></i> สร้างโครงการใหม่</button>` +
  `<button type="button" onclick="openDepartmentModal()" class="w-full bg-slate-800 text-slate-200 py-2.5 rounded-xl text-sm border border-slate-700"><i class="fa-solid fa-building"></i> จัดการแผนก</button>` +
  `<button type="button" onclick="openTestEmailModalFromNav()" class="w-full bg-slate-800 text-slate-200 py-2.5 rounded-xl text-sm border border-slate-700"><i class="fa-solid fa-envelope"></i> ทดสอบอีเมล</button>` +
  `<button type="button" id="admin-users-btn" onclick="openUserAdminModal()" class="hidden w-full bg-slate-800 text-slate-200 py-2.5 rounded-xl text-sm border border-slate-700"><i class="fa-solid fa-users-gear"></i> จัดการผู้ใช้</button>` +
  `</${d}>`,
  `<${d} class="px-4 pb-3"><input type="text" id="project-search" placeholder="ค้นหาโครงการ..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-slate-200"></${d}>`,
  `<${d} id="project-list-container" class="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4"></${d}>`,
  '<p class="p-4 text-xs text-slate-500 text-center border-t border-slate-800">&copy; Pongvit Y. 2026 License</p>',
  '</aside>',
  `<${d} id="sidebar-overlay" onclick="toggleSidebar()" class="fixed inset-0 bg-slate-900/50 z-40 hidden md:hidden"></${d}>`,
  '<main class="app-main flex-1 flex flex-col min-w-0 bg-slate-50 pt-16 md:pt-0">',
  `<header class="hidden md:flex h-16 bg-white border-b items-center justify-between px-8 glass-panel"><h2 id="page-title" class="text-xl font-bold">ภาพรวมระบบ</h2><${d} class="flex items-center gap-3"><span id="user-badge" class="text-sm bg-slate-100 px-3 py-1 rounded-full border"><i class="fa-solid fa-user-circle"></i> —</span><button type="button" onclick="logout()" class="text-xs text-slate-500 hover:text-rose-600 font-bold px-2 py-1 rounded-lg border border-slate-200">ออกจากระบบ</button></${d}></header>`,
  `<${d} id="main-content" class="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8"></${d}>`,
  '</main>',
  `<${d} id="toast-container" class="fixed bottom-4 right-4 z-[60] flex flex-col gap-3 pointer-events-none"></${d}>`,
  projectModal,
  licenseModal,
  timelineModal,
  testModal,
  departmentModal,
  userAdminModal,
  '</${d}>',
  '<script src="/Renew-aleart/assets/js/config.js?v=' + ASSET_V + '"></script>',
  '<script defer src="/Renew-aleart/assets/js/app.bundle.js?v=' + ASSET_V + '"></script>',
  '</body></html>'
].join('');

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'index.html'), html, 'utf8');
console.log('Wrote docs/index.html');
