const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'docs', 'assets', 'js');
fs.readdirSync(dir).filter(f => f.endsWith('.js')).forEach(f => {
  const fp = path.join(dir, f);
  let c = fs.readFileSync(fp, 'utf8');
  const n = c
    .replace(/createElement\('motion[^']*'\)/g, "createElement('div')")
    .replace(/<\/?motion[^>]*>/gi, m => (m.startsWith('</') ? '</motionmotiondiv>' : '<motionmotionmotionmotiondiv>'))
    .replace(/<\/?motionmotiondiv>/gi, m => (m.startsWith('</') ? '</div>' : '<div>'));
  if (n !== c) {
    fs.writeFileSync(fp, n, 'utf8');
    console.log('fixed', f);
  }
});
