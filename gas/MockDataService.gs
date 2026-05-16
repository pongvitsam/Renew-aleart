var MockDataService = (function () {

  var DEMO_PREFIX = '[ทดลอง] ';

  function seedMockData(force) {
    DepartmentService.seedDefaultsIfEmpty_();
    var projects = SheetService.readTable_(CONFIG.SHEETS.PROJECTS);
    if (projects.length > 0 && !force) {
      return { success: true, message: 'มีข้อมูลอยู่แล้ว — ใช้ force:true เพื่อเพิ่มชุดทดลองซ้ำ', seeded: false };
    }

    var today = new Date();
    var y = today.getFullYear();
    var soon = Utilities.formatDate(new Date(y, today.getMonth() + 2, 15), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var expired = Utilities.formatDate(new Date(y - 1, today.getMonth(), 1), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var safe = Utilities.formatDate(new Date(y + 2, 5, 19), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var issue1 = Utilities.formatDate(new Date(y - 2, 0, 15), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var issue2 = Utilities.formatDate(new Date(y - 4, 4, 20), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    var p1Id = Date.now();
    var p2Id = p1Id + 1;
    var l1Id = p1Id + 100;
    var l2Id = p1Id + 101;

    SheetService.appendRow_(CONFIG.SHEETS.PROJECTS, {
      id: p1Id,
      name: DEMO_PREFIX + 'โครงการก่อสร้างคอนโด The Grand',
      department: 'ก่อสร้างและวิศวกรรม',
      emails: JSON.stringify(['pm@thegrand.com', 'engineer@thegrand.com', 'safety@thegrand.com', 'director@company.com', 'admin@thegrand.com']),
      driveUrl: 'https://drive.google.com/drive/folders/demo-grand',
      isDemo: 'true'
    }, ['id', 'name', 'department', 'emails', 'driveUrl', 'isDemo', 'createdAt', 'updatedAt']);

    SheetService.appendRow_(CONFIG.SHEETS.PROJECTS, {
      id: p2Id,
      name: DEMO_PREFIX + 'นิติบุคคล อาคาร A',
      department: 'นิติบุคคลอาคารชุด',
      emails: JSON.stringify(['juristic@bldga.com', 'manager@bldga.com']),
      driveUrl: 'https://drive.google.com/drive/folders/demo-bldga',
      isDemo: 'true'
    }, ['id', 'name', 'department', 'emails', 'driveUrl', 'isDemo', 'createdAt', 'updatedAt']);

    var steps1 = CONFIG.DEFAULT_STEPS.slice();
    SheetService.appendRow_(CONFIG.SHEETS.LICENSES, {
      id: l1Id,
      projectId: p1Id,
      name: 'ใบอนุญาตก่อสร้างอาคาร (อ.1)',
      issueDate: issue1,
      expiryDate: soon,
      alertMonths: 3,
      driveUrl: 'https://drive.google.com/',
      status: 'ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ',
      steps: JSON.stringify(steps1)
    }, ['id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths', 'driveUrl', 'status', 'steps', 'createdAt', 'updatedAt']);

    var steps2 = ['เตรียมเอกสาร', 'ยื่นต่ออายุ', 'รอรับใบจริง', 'เสร็จสิ้นสมบูรณ์'];
    SheetService.appendRow_(CONFIG.SHEETS.LICENSES, {
      id: l2Id,
      projectId: p2Id,
      name: 'ใบอนุญาตใช้เครื่องยนต์ดีเซล (เครื่องปั่นไฟ)',
      issueDate: issue2,
      expiryDate: safe,
      alertMonths: 6,
      driveUrl: '',
      status: '-',
      steps: JSON.stringify(steps2)
    }, ['id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths', 'driveUrl', 'status', 'steps', 'createdAt', 'updatedAt']);

    var hist = [
      { licenseId: l1Id, date: issue1, action: 'แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง', note: 'อีเมลแจ้งเตือนส่งออกเรียบร้อย (ทดลอง)' },
      { licenseId: l1Id, date: issue1, action: 'ได้รับเอกสารครบถ้วน', note: 'เอกสารครบ เตรียมยื่นเขต (ทดลอง)' },
      { licenseId: l1Id, date: soon, action: 'ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ', note: 'ยื่นที่สำนักงานเขตแล้ว รอนัดตรวจ (ทดลอง)' }
    ];
    hist.forEach(function (h, i) {
      SheetService.appendRow_(CONFIG.SHEETS.HISTORY, {
        id: Date.now() + i,
        licenseId: h.licenseId,
        date: h.date,
        action: h.action,
        note: h.note
      }, ['id', 'licenseId', 'date', 'action', 'note', 'createdAt']);
    });

    SheetService.invalidateCache_();
    return { success: true, seeded: true, message: 'เพิ่มข้อมูลทดลองครบทุกฟังก์ชันแล้ว' };
  }

  return { seedMockData: seedMockData };
})();
