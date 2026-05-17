const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'docs', 'assets', 'js');
const files = [
  'app-cache.js',
  'utils.js',
  'app-mutations.js',
  'app-state.js',
  'api.js',
  'app-auth.js',
  'app-index.js',
  'app-departments.js',
  'app-users.js',
  'app-sidebar.js',
  'app-date-picker.js',
  'app-calendar.js',
  'app-timeline.js',
  'app-renewal.js',
  'app-dashboard.js',
  'app-project.js',
  'app-modals.js',
  'app-main.js'
];

const out = files.map(f => {
  const p = path.join(root, f);
  return '/* ' + f + ' */\n' + fs.readFileSync(p, 'utf8');
}).join('\n');

const bundlePath = path.join(root, 'app.bundle.js');
fs.writeFileSync(bundlePath, out, 'utf8');
console.log('Wrote', bundlePath, '(' + files.length, 'files)');
