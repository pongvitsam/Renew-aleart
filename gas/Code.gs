/**
 * Web App entry — Deploy เป็น Web App (Anyone) แล้วนำ URL /exec ไปใส่ docs/assets/js/config.js
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    var result = routeAction_(action, e && e.parameter ? e.parameter : {});
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var action = body.action || 'getProjects';
    var result = routeAction_(action, body.data || body);
    return jsonResponse_(result);
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}

function routeAction_(action, data) {
  switch (action) {
    case 'ping':
      return { success: true, message: 'License Monitor API', version: '1.0.0' };
    case 'getProjects':
      return { success: true, projects: SheetService.getAllData() };
    case 'saveProject':
      SheetService.saveProject(data);
      return { success: true, projects: SheetService.getAllData() };
    case 'saveLicense':
      SheetService.saveLicense(data);
      return { success: true, projects: SheetService.getAllData() };
    case 'saveTimelineUpdate':
      SheetService.saveTimelineUpdate(data);
      return { success: true, projects: SheetService.getAllData() };
    case 'sendTestEmail':
      var emailResult = EmailService.sendTestEmail(data);
      emailResult.projects = SheetService.getAllData();
      return emailResult;
    case 'setupSpreadsheet':
      return SheetService.setupSpreadsheet();
    default:
      throw new Error('Unknown action: ' + action);
  }
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** รันครั้งแรกใน Editor: สร้าง Sheet และบันทึก ID */
function setupSpreadsheet() {
  return SheetService.setupSpreadsheet();
}

/** ตั้ง trigger รายวัน 08:00 น. */
function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkAndSendExpiryAlerts') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('checkAndSendExpiryAlerts')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();
  return { success: true };
}

function checkAndSendExpiryAlerts() {
  return EmailService.checkAndSendExpiryAlerts();
}
