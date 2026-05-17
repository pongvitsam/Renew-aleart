/**
 * ดาวน์โหลด Font Awesome + ฟอนต์ Sarabun มาไว้ใน repo (รันครั้งเดียวเมื่ออัปเดตเวอร์ชัน)
 * node scripts/setup-vendor.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');

function get(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return get(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(url + ' -> ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function main() {
  const faBase = path.join(root, 'docs', 'assets', 'vendor', 'fontawesome');
  fs.mkdirSync(path.join(faBase, 'css'), { recursive: true });
  fs.mkdirSync(path.join(faBase, 'webfonts'), { recursive: true });
  const faVer = '6.4.0';
  await get(
    `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@${faVer}/css/all.min.css`,
    path.join(faBase, 'css', 'all.min.css')
  );
  for (const f of ['fa-solid-900.woff2', 'fa-regular-400.woff2', 'fa-brands-400.woff2']) {
    await get(
      `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@${faVer}/webfonts/${f}`,
      path.join(faBase, 'webfonts', f)
    );
  }

  const fontDir = path.join(root, 'docs', 'assets', 'fonts');
  fs.mkdirSync(fontDir, { recursive: true });
  for (const w of ['400', '600', '700']) {
    await get(
      `https://cdn.jsdelivr.net/npm/@fontsource/sarabun@5.0.8/files/sarabun-thai-${w}-normal.woff2`,
      path.join(fontDir, `sarabun-${w}.woff2`)
    );
  }
  console.log('Vendor assets ready.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
