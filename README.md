# Renew-alert — License Monitor

ระบบแจ้งเตือนต่ออายุใบอนุญาต (โครงการ / ใบอนุญาต / Timeline / อีเมล)

## โครงสร้างโปรเจกต์

```
Renew-aleart/
├── docs/                 # Frontend → GitHub Pages
│   ├── index.html
│   └── assets/
│       ├── css/app.css
│       └── js/           # config, api, utils, app-*.js
├── gas/                  # Google Apps Script (Backend)
│   ├── Code.gs
│   ├── Config.gs
│   ├── SheetService.gs
│   └── EmailService.gs
├── .clasp.json           # Script ID ที่เชื่อมกับ GAS
└── .github/workflows/    # Deploy Pages อัตโนมัติ
```

## 1) ตั้งค่า Google Apps Script (Backend)

1. เปิด [Apps Script](https://script.google.com) โปรเจกต์ ID: `1zgHFhb67AAWEFKPAadw0UjYJVclLxi5KfqV2imWL2bX8-JuLalTS1ojW`
2. อัปโหลดไฟล์ในโฟลเดอร์ `gas/` (ใช้ [clasp](https://github.com/google/clasp): `clasp push`)
3. ใน Editor รันฟังก์ชัน **`setupSpreadsheet()`** ครั้งแรก → สร้าง Google Sheet และบันทึก `SPREADSHEET_ID` ใน Script Properties
4. **Deploy** → New deployment → Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. คัดลอก URL ที่ลงท้าย **`/exec`**

### Trigger แจ้งเตือนอัตโนมัติ (รายวัน)

รันฟังก์ชัน **`installDailyTrigger()`** ใน Editor หนึ่งครั้ง

## 2) ตั้งค่า Frontend

แก้ไฟล์ `docs/assets/js/config.js`:

```javascript
const CONFIG = {
  API_URL: 'https://script.google.com/macros/s/XXXX/exec', // URL จากขั้นตอน Deploy
  APP_TITLE: 'License Monitor - ระบบแจ้งเตือนต่ออายุใบอนุญาต'
};
```

หรือทดสอบชั่วคราวด้วย query string:

`https://<user>.github.io/Renew-aleart/?apiUrl=<encodeURIComponent(execUrl)>`

## 3) GitHub Pages

1. Repo → **Settings** → **Pages** → Source: **GitHub Actions**
2. Push ขึ้น `main` → workflow `Deploy GitHub Pages` จะ deploy โฟลเดอร์ `docs/`

## API Actions (POST JSON)

| action | คำอธิบาย |
|--------|----------|
| `getProjects` | ดึงโครงการ + ใบอนุญาต + ประวัติ |
| `saveProject` | บันทึกโครงการ (อีเมล ≥ 5) |
| `saveLicense` | เพิ่มใบอนุญาต |
| `saveTimelineUpdate` | อัปเดตสถานะ/บันทึก log |
| `sendTestEmail` | ส่งอีเมลทดสอบ |

## สร้าง index.html ใหม่

```bash
node scripts/build-index.js
```
