/**
 * Web App — Deploy แล้วใส่ URL /exec ใน docs/assets/js/config.js
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    return jsonResponse_(routeAction_(action, e && e.parameter ? e.parameter : {}));
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
    return jsonResponse_(routeAction_(action, body.data || body));
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message });
  }
}

function routeAction_(action, data) {
  var payload = function () {
    var p = SheetService.getPayload();
    return { success: true, projects: p.projects, departments: p.departments };
  };

  switch (action) {
    case 'ping':
      return { success: true, message: 'Renew Aleart API', version: '1.1.0' };
    case 'getProjects':
      return payload();
    case 'saveProject':
      SheetService.saveProject(data);
      return payload();
    case 'saveLicense':
      SheetService.saveLicense(data);
      return payload();
    case 'saveTimelineUpdate':
      SheetService.saveTimelineUpdate(data);
      return payload();
    case 'saveDepartment':
      DepartmentService.saveDepartment(data);
      return payload();
    case 'deleteDepartment':
      DepartmentService.deleteDepartment(data);
      return payload();
    case 'seedMockData':
      var seed = MockDataService.seedMockData(!!data.force);
      var p = SheetService.getPayload();
      seed.projects = p.projects;
      seed.departments = p.departments;
      return seed;
    case 'sendTestEmail':
      var emailResult = EmailService.sendTestEmail(data);
      var full = SheetService.getPayload();
      emailResult.projects = full.projects;
      emailResult.departments = full.departments;
      return emailResult;
    case 'setupSpreadsheet':
      return SheetService.setupSpreadsheet();
    default:
      throw new Error('Unknown action: ' + action);
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSpreadsheet() {
  return SheetService.setupSpreadsheet();
}

function seedMockData() {
  return MockDataService.seedMockData(false);
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'checkAndSendExpiryAlerts') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('checkAndSendExpiryAlerts').timeBased().everyDays(1).atHour(8).create();
  return { success: true };
}

function checkAndSendExpiryAlerts() {
  return EmailService.checkAndSendExpiryAlerts();
}
