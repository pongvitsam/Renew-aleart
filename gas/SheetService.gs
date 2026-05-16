var SheetService = (function () {

  function setupSpreadsheet() {
    var ss = SpreadsheetApp.create('Renew Aleart - License');
    PropertiesService.getScriptProperties().setProperty(CONFIG.PROP_SPREADSHEET_ID, ss.getId());
    initSheets_(ss);
    DepartmentService.seedDefaultsIfEmpty_();
    MockDataService.seedMockData(false);
    return { spreadsheetId: ss.getId(), url: ss.getUrl() };
  }

  function initSheets_(ss) {
    ensureSheet_(ss, CONFIG.SHEETS.DEPARTMENTS, ['id', 'name']);
    ensureSheet_(ss, CONFIG.SHEETS.PROJECTS, [
      'id', 'name', 'department', 'emails', 'isDemo', 'createdAt', 'updatedAt'
    ]);
    ensureSheet_(ss, CONFIG.SHEETS.LICENSES, [
      'id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths',
      'driveUrl', 'status', 'steps', 'createdAt', 'updatedAt'
    ]);
    ensureSheet_(ss, CONFIG.SHEETS.HISTORY, [
      'id', 'licenseId', 'date', 'action', 'note', 'createdAt'
    ]);
  }

  function ensureSheet_(ss, name, headers) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }

  function migrateSheets_(ss) {
    var proj = ss.getSheetByName(CONFIG.SHEETS.PROJECTS);
    if (proj && proj.getLastRow() > 0) {
      var h = proj.getRange(1, 1, 1, proj.getLastColumn()).getValues()[0];
      if (h.indexOf('isDemo') === -1) {
        proj.getRange(1, h.length + 1).setValue('isDemo');
      }
    }
    if (!ss.getSheetByName(CONFIG.SHEETS.DEPARTMENTS)) {
      ensureSheet_(ss, CONFIG.SHEETS.DEPARTMENTS, ['id', 'name']);
    }
  }

  function openSs_() {
    var ss = getSpreadsheet_();
    initSheets_(ss);
    migrateSheets_(ss);
    return ss;
  }

  function ensureInitialized() {
    return openSs_();
  }

  function readTable_(sheetName) {
    var ss = openSs_();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = [];
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = data[i][j];
      }
      rows.push(row);
    }
    return rows;
  }

  function appendRow_(sheetName, rowObj, headers) {
    var ss = ensureInitialized();
    var sheet = ss.getSheetByName(sheetName);
    var now = new Date().toISOString();
    var rowValues = headers.map(function (h) {
      if (h === 'createdAt' || h === 'updatedAt') return now;
      return rowObj[h] !== undefined ? rowObj[h] : '';
    });
    rowValues[0] = rowObj.id || Date.now();
    sheet.appendRow(rowValues);
    return Number(rowValues[0]);
  }

  function parseJson_(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(String(str)); } catch (e) { return fallback; }
  }

  function isDemoRow_(p) {
    return p.isDemo === true || p.isDemo === 'true' || String(p.name).indexOf('[ทดลอง]') === 0;
  }

  function getAllData() {
    var projectRows = readTable_(CONFIG.SHEETS.PROJECTS);
    var licenseRows = readTable_(CONFIG.SHEETS.LICENSES);
    var historyRows = readTable_(CONFIG.SHEETS.HISTORY);

    var historyByLicense = {};
    historyRows.forEach(function (h) {
      var lid = String(h.licenseId);
      if (!historyByLicense[lid]) historyByLicense[lid] = [];
      historyByLicense[lid].push({
        id: h.id,
        date: formatDateValue_(h.date),
        action: h.action || '',
        note: h.note || ''
      });
    });

    var licensesByProject = {};
    licenseRows.forEach(function (l) {
      var pid = String(l.projectId);
      if (!licensesByProject[pid]) licensesByProject[pid] = [];
      licensesByProject[pid].push({
        id: Number(l.id),
        name: l.name,
        issueDate: formatDateValue_(l.issueDate),
        expiryDate: formatDateValue_(l.expiryDate),
        alertMonths: Number(l.alertMonths) || 3,
        driveUrl: l.driveUrl || '',
        status: l.status || '-',
        steps: parseJson_(l.steps, CONFIG.DEFAULT_STEPS.slice()),
        history: historyByLicense[String(l.id)] || []
      });
    });

    return projectRows.map(function (p) {
      return {
        id: Number(p.id),
        name: p.name,
        department: p.department || '',
        emails: parseJson_(p.emails, []),
        isDemo: isDemoRow_(p),
        licenses: licensesByProject[String(p.id)] || []
      };
    });
  }

  function getPayload() {
    return {
      projects: getAllData(),
      departments: DepartmentService.getDepartments()
    };
  }

  function formatDateValue_(val) {
    if (!val) return '';
    if (val instanceof Date) {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    var s = String(val);
    if (s.indexOf('T') > -1) return s.split('T')[0];
    return s;
  }

  function upsertRow_(sheetName, id, rowObj, headers) {
    var ss = ensureInitialized();
    var sheet = ss.getSheetByName(sheetName);
    var data = sheet.getDataRange().getValues();
    var now = new Date().toISOString();
    var rowValues = headers.map(function (h) {
      if (h === 'updatedAt') return now;
      if (h === 'createdAt' && !id) return now;
      return rowObj[h] !== undefined ? rowObj[h] : '';
    });

    if (id) {
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
          if (rowObj.createdAt) rowValues[headers.indexOf('createdAt')] = data[i][headers.indexOf('createdAt')];
          sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
          return Number(id);
        }
      }
    }

    var newId = id || Date.now();
    rowValues[0] = newId;
    sheet.appendRow(rowValues);
    return Number(newId);
  }

  function saveProject(data) {
    var emails = data.emails || [];
    var name = (data.name || '').trim();
    var department = (data.department || '').trim();
    if (!name) throw new Error('กรุณาระบุชื่อโครงการ');
    if (!department) throw new Error('กรุณาเลือกแผนก');

    var id = data.id ? Number(data.id) : null;
    var existingDemo = 'false';
    if (id) {
      var rows = readTable_(CONFIG.SHEETS.PROJECTS);
      for (var i = 0; i < rows.length; i++) {
        if (Number(rows[i].id) === id) {
          existingDemo = isDemoRow_(rows[i]) ? 'true' : 'false';
          break;
        }
      }
    }

    upsertRow_(CONFIG.SHEETS.PROJECTS, id, {
      id: id || '',
      name: name,
      department: department,
      emails: JSON.stringify(emails),
      isDemo: data.isDemo === true || data.isDemo === 'true' ? 'true' : existingDemo,
      createdAt: ''
    }, ['id', 'name', 'department', 'emails', 'isDemo', 'createdAt', 'updatedAt']);
    return { success: true };
  }

  function saveLicense(data) {
    var steps = data.steps || CONFIG.DEFAULT_STEPS;
    var id = data.id ? Number(data.id) : null;
    var newId = upsertRow_(CONFIG.SHEETS.LICENSES, id, {
      id: id || '',
      projectId: data.projectId,
      name: data.name,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      alertMonths: data.alertMonths || 3,
      driveUrl: data.driveUrl || '',
      status: data.status || 'รอเริ่มดำเนินการ',
      steps: JSON.stringify(steps),
      createdAt: ''
    }, [
      'id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths',
      'driveUrl', 'status', 'steps', 'createdAt', 'updatedAt'
    ]);
    return { success: true, id: newId };
  }

  function saveTimelineUpdate(data) {
    var licenseId = data.licenseId;
    var step = data.step || '';
    var note = data.note || '';

    if (step) {
      var licenses = readTable_(CONFIG.SHEETS.LICENSES);
      for (var i = 0; i < licenses.length; i++) {
        if (String(licenses[i].id) === String(licenseId)) {
          upsertRow_(CONFIG.SHEETS.LICENSES, Number(licenseId), {
            id: licenseId,
            projectId: licenses[i].projectId,
            name: licenses[i].name,
            issueDate: formatDateValue_(licenses[i].issueDate),
            expiryDate: formatDateValue_(licenses[i].expiryDate),
            alertMonths: licenses[i].alertMonths,
            driveUrl: licenses[i].driveUrl,
            status: step,
            steps: licenses[i].steps,
            createdAt: licenses[i].createdAt
          }, [
            'id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths',
            'driveUrl', 'status', 'steps', 'createdAt', 'updatedAt'
          ]);
          break;
        }
      }
    }

    var ss = ensureInitialized();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.HISTORY);
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    sheet.appendRow([
      Date.now(),
      licenseId,
      today,
      step || 'บันทึกทั่วไป',
      note,
      new Date().toISOString()
    ]);
    return { success: true };
  }

  function addHistoryEntry(licenseId, action, note) {
    appendRow_(CONFIG.SHEETS.HISTORY, {
      id: Date.now(),
      licenseId: licenseId,
      date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      action: action,
      note: note
    }, ['id', 'licenseId', 'date', 'action', 'note', 'createdAt']);
  }

  return {
    setupSpreadsheet: setupSpreadsheet,
    getAllData: getAllData,
    getPayload: getPayload,
    saveProject: saveProject,
    saveLicense: saveLicense,
    saveTimelineUpdate: saveTimelineUpdate,
    addHistoryEntry: addHistoryEntry,
    readTable_: readTable_,
    appendRow_: appendRow_,
    ensureInitialized: ensureInitialized
  };
})();
