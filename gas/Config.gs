/**
 * ตั้งค่าระบบ — สร้าง Spreadsheet ใหม่แล้วรัน setupSpreadsheet()
 */
var CONFIG = {
  SHEETS: {
    PROJECTS: 'Projects',
    LICENSES: 'Licenses',
    HISTORY: 'History',
    DEPARTMENTS: 'Departments'
  },
  PROP_SPREADSHEET_ID: 'SPREADSHEET_ID',
  DEFAULT_DEPARTMENTS: [
    'ก่อสร้างและวิศวกรรม',
    'นิติบุคคลอาคารชุด',
    'บริหารทรัพยากรอาคาร',
    'ส่วนกลาง (HQ)',
    'อื่นๆ'
  ],
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
