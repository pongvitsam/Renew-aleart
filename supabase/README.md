# Supabase สำหรับ Renew Aleart

## 1) สร้างโปรเจกต์ Supabase

1. ไปที่ [supabase.com](https://supabase.com) → New project  
2. รอฐานข้อมูลพร้อม

## 2) รัน SQL

ใน **SQL Editor** รันตามลำดับ:

1. `migrations/001_schema.sql` — ตาราง + seed แผนก + admin  
2. `migrations/002_rpc.sql` — ฟังก์ชัน API ทั้งหมด

## 3) ตั้งค่า Frontend

แก้ `docs/assets/js/config.js`:

```javascript
const CONFIG = {
  DATA_PROVIDER: 'supabase',
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbG...',
  // ...
};
```

จาก Dashboard → **Project Settings** → **API** → Project URL และ `anon` `public` key

## 4) Build และ deploy

```bash
npm run build:index
```

Push ขึ้น GitHub Pages แล้ว **Ctrl+F5**

## บัญชีเริ่มต้น

| ชื่อผู้ใช้ | รหัสผ่าน |
|------------|----------|
| `admin`    | `1234`   |

ควรเปลี่ยนรหัสทันทีหลังติดตั้ง

## ทดสอบด้วย URL (ไม่แก้ไฟล์)

```
https://<user>.github.io/Renew-aleart/?provider=supabase&supabaseUrl=<encode>&supabaseKey=<encode>
```

## ข้อจำกัดโหมด Supabase

- **ส่งอีเมลทดสอบ / แจ้งเตือนอัตโนมัติ** — ยังไม่รองรับ (ใช้โหมด `gas` หรือเพิ่ม Edge Function + SMTP ภายหลัง)
- ข้อมูลเดิมใน Google Sheets **ไม่ย้ายอัตโนมัติ** — ต้อง import เองหรือใช้ GAS ต่อ

## สลับกลับ Google Sheets

ตั้ง `DATA_PROVIDER: 'gas'` และใส่ `API_URL` ของ Apps Script
