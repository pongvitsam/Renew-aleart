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
  switch (action) {
    case 'ping':
      return { success: true, message: 'Renew Aleart API', version: '1.2.0' };
    case 'getProjects': {
      var p = SheetService.getPayload();
      return { success: true, projects: p.projects, departments: p.departments };
    }
    case 'saveProject': {
      var saved = SheetService.saveProject(data);
      return { success: true, id: saved.id };
    }
    case 'saveLicense': {
      var lic = SheetService.saveLicense(data);
      return { success: true, id: lic.id, projectId: data.projectId };
    }
    case 'saveTimelineUpdate':
      SheetService.saveTimelineUpdate(data);
      return { success: true, licenseId: data.licenseId };
    case 'saveDepartment':
      DepartmentService.saveDepartment(data);
      return { success: true };
    case 'deleteDepartment':
      DepartmentService.deleteDepartment(data);
      return { success: true };
    case 'seedMockData': {
      var seed = MockDataService.seedMockData(!!data.force);
      var full = SheetService.getPayload();
      seed.projects = full.projects;
      seed.departments = full.departments;
      return seed;
    }
    case 'sendTestEmail': {
      var emailResult = EmailService.sendTestEmail(data);
      return emailResult;
    }
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
