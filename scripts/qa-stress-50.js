const fs = require('fs');
const vm = require('vm');
const path = require('path');

function loadScript(filePath, context) {
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context, { filename: filePath });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeLicense(id, idx) {
  const year = 2026 + (idx % 2);
  const issueMonth = String((idx % 12) + 1).padStart(2, '0');
  const expMonth = String(((idx + 3) % 12) + 1).padStart(2, '0');
  return {
    id,
    name: `License-${id}`,
    issueDate: `${year}-${issueMonth}-01`,
    expiryDate: `${year}-${expMonth}-28`,
    alertMonths: (idx % 4) + 1,
    driveUrl: '',
    status: 'รอเริ่มดำเนินการ',
    steps: ['เริ่ม', 'ยื่น', 'เสร็จสิ้นสมบูรณ์'],
    renewalCycles: [],
    history: []
  };
}

function makeProject(id, licPerProject) {
  const licenses = [];
  for (let i = 0; i < licPerProject; i += 1) {
    licenses.push(makeLicense(id * 1000 + i, i));
  }
  return {
    id,
    name: `Project-${id}`,
    department: id % 2 ? 'Ops' : 'Sales',
    emails: [],
    driveUrl: '',
    isDemo: false,
    licenses
  };
}

function run() {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    String,
    Number,
    Array,
    Object,
    App: {
      projects: [],
      departments: [],
      settings: { minAlertMonths: 3 },
      _projectStatusCache: {}
    },
    DataCache: { set() {} },
    rebuildAppIndex() {},
    renderSidebar() {},
    showDashboard() {},
    renderProjectView() {},
    patchDashboard() {}
  });

  loadScript(path.join(__dirname, '..', 'docs', 'assets', 'js', 'utils.js'), context);
  loadScript(path.join(__dirname, '..', 'docs', 'assets', 'js', 'app-mutations.js'), context);

  const Utils = vm.runInContext('Utils', context);
  const Mutations = vm.runInContext('Mutations', context);
  const App = context.App;

  const projectCount = 50;
  const licensesPerProject = 4;
  for (let i = 1; i <= projectCount; i += 1) {
    App.projects.push(makeProject(i, licensesPerProject));
  }

  assert(App.projects.length === 50, 'Project generation failed');

  const t0 = Date.now();
  const sorted = Utils.sortProjectsByPriority(App.projects);
  assert(sorted.length === App.projects.length, 'Sort lost projects');

  let timelineOps = 0;
  App.projects.forEach((p) => {
    p.licenses.forEach((l) => {
      timelineOps += 1;
      Mutations.timelineUpdateLocal(l.id, 'เริ่ม', `note-${l.id}`);
      assert(l.history.length === 1, `Timeline save failed for ${l.id}`);
      Mutations.cancelTimelineStepLocal(l.id, 'เริ่ม');
      assert(l.history.length === 0, `Timeline cancel failed for ${l.id}`);
      Mutations.timelineUpdateLocal(l.id, 'เริ่ม', '');
      Mutations.timelineUpdateLocal(l.id, 'ยื่น', '');
      Mutations.timelineUpdateLocal(l.id, 'เสร็จสิ้นสมบูรณ์', '');
      assert(l.history.length === 3, `Timeline complete failed for ${l.id}`);
      Mutations.completeRenewalLocal(l.id, '2027-01-01', '2027-12-31', 'auto');
      assert(Array.isArray(l.renewalCycles) && l.renewalCycles.length === 1, `Renewal cycle not archived for ${l.id}`);
      assert(Array.isArray(l.history) && l.history.length === 1, `History reset failed for ${l.id}`);
    });
  });

  const t1 = Date.now();
  const elapsed = t1 - t0;
  const counts = Utils.licenseCounts(App.projects.flatMap((p) => p.licenses));
  assert(counts.total === projectCount * licensesPerProject, 'License count mismatch');

  console.log(JSON.stringify({
    ok: true,
    projectCount,
    licensesPerProject,
    totalLicenses: counts.total,
    timelineOps,
    elapsedMs: elapsed
  }, null, 2));
}

run();
