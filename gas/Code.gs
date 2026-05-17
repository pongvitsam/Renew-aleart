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

var PUBLIC_ACTIONS_ = {
  ping: true,
  login: true,
  setupSpreadsheet: true
};

function routeAction_(action, data) {
  data = data || {};
  var sessionUser = null;
  if (!PUBLIC_ACTIONS_[action]) {
    sessionUser = AuthService.requireAuth_(data.sessionToken);
    data._sessionUser = sessionUser;
  }

  switch (action) {
    case 'ping':
      return { success: true, message: 'Renew Aleart API', version: '1.5.0' };
    case 'login':
      return AuthService.login(data);
    case 'logout':
      return AuthService.logout(data);
    case 'validateSession':
      return AuthService.validateSession(data);
    case 'listUsers':
      return AuthService.listUsers(data);
    case 'saveUser':
      return AuthService.saveUser(data);
    case 'deleteUser':
      return AuthService.deleteUser(data);
    case 'exportSnapshot':
      return SnapshotService.exportSnapshotNow();
    case 'getProjects': {
      var p = SheetService.getPayload();
      return { success: true, projects: p.projects, departments: p.departments };
    }
    case 'getLicenseDetail': {
      var lic = SheetService.getLicenseDetail(data.licenseId);
      return { success: true, license: lic };
    }
    case 'saveProject': {
      var saved = SheetService.saveProject(data);
      return { success: true, id: saved.id };
    }
    case 'deleteProject': {
      var removed = SheetService.deleteProject(data);
      return { success: true, id: removed.id };
    }
    case 'saveLicense': {
      var lic = SheetService.saveLicense(data);
      return { success: true, id: lic.id, projectId: data.projectId };
    }
    case 'saveLicenseSteps': {
      var stepRes = SheetService.saveLicenseSteps(data);
      return { success: true, licenseId: stepRes.id, status: stepRes.status, steps: stepRes.steps };
    }
    case 'saveTimelineUpdate':
      SheetService.saveTimelineUpdate(data);
      return { success: true, licenseId: data.licenseId };
    case 'completeRenewal': {
      var renewal = SheetService.completeRenewal(data);
      return { success: true, licenseId: renewal.licenseId, round: renewal.round };
    }
    case 'saveDepartment':
      DepartmentService.saveDepartment(data);
      return { success: true };
    case 'deleteDepartment':
      DepartmentService.deleteDepartment(data);
      return { success: true };
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
