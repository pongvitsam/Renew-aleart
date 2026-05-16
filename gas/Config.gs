/**
 * ตั้งค่าระบบ — สร้าง Spreadsheet ใหม่แล้ววาง ID ใน Script Properties ชื่อ SPREADSHEET_ID
 * หรือรันฟังก์ชัน setupSpreadsheet() ครั้งแรก
 */
var CONFIG = {
  SHEETS: {
    PROJECTS: 'Projects',
    LICENSES: 'Licenses',
    HISTORY: 'History'
  },
  PROP_SPREADSHEET_ID: 'SPREADSHEET_ID',
  DEFAULT_STEPS: [
    'แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง',
    'ขอเอกสารสนับสนุนจากลูกค้า',
    'ได้รับเอกสารครบถ้วน',
    'ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ',
    'แจ้งผลให้ลูกค้าทราบ',
    'เสร็จสิ้นสมบูรณ์'
  ]
};

function getSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(CONFIG.PROP_SPREADSHEET_ID);
  if (!id) {
    throw new Error('ยังไม่ได้ตั้งค่า SPREADSHEET_ID — รัน setupSpreadsheet() ใน Apps Script Editor');
  }
  return SpreadsheetApp.openById(id);
}
