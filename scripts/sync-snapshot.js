/**
 * ดึงข้อมูลจาก GAS แล้วเขียน docs/data/payload.json
 * node scripts/sync-snapshot.js
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'docs', 'assets', 'js', 'config.js');
const configSrc = fs.readFileSync(configPath, 'utf8');
const apiUrl = (configSrc.match(/API_URL:\s*'([^']+)'/) || [])[1];
if (!apiUrl) {
  console.error('ไม่พบ API_URL ใน config.js');
  process.exit(1);
}

const body = JSON.stringify({ action: 'getProjects', data: {} });

async function postJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    });
    const text = await res.text();
    return { ok: res.ok, text };
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  console.log('Fetching from GAS (อาจใช้เวลา 30–120 วินาที)...');
  let result;
  try {
    result = await postJson(apiUrl, 180000);
  } catch (e) {
    console.error('เชื่อมต่อ API ไม่สำเร็จ:', e.message);
    process.exit(1);
  }

  const { text } = result;
  if (text.indexOf('<!DOCTYPE') === 0 || text.indexOf('<html') >= 0) {
    console.error('ได้ HTML แทน JSON — Deploy Web App (New version) ใน Apps Script ก่อน');
    process.exit(1);
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('JSON ไม่ถูกต้อง:', text.slice(0, 300));
    process.exit(1);
  }

  if (!json.success || !json.projects) {
    console.error('API error:', json.error || text.slice(0, 300));
    process.exit(1);
  }

  const out = {
    version: 1,
    updatedAt: Date.now(),
    projects: json.projects,
    departments: json.departments || []
  };
  const outPath = path.join(__dirname, '..', 'docs', 'data', 'payload.json');
  fs.writeFileSync(outPath, JSON.stringify(out), 'utf8');
  console.log('Wrote', outPath, '—', out.projects.length, 'projects,', out.departments.length, 'departments');
})();
