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
      'id', 'name', 'department', 'emails', 'driveUrl', 'isDemo', 'createdAt', 'updatedAt'
    ]);
    ensureSheet_(ss, CONFIG.SHEETS.LICENSES, [
      'id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths',
      'driveUrl', 'status', 'steps', 'renewalCycles', 'createdAt', 'updatedAt'
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
      if (h.indexOf('isDemo') === -1) proj.getRange(1, h.length + 1).setValue('isDemo');
      h = proj.getRange(1, 1, 1, proj.getLastColumn()).getValues()[0];
      if (h.indexOf('driveUrl') === -1) proj.getRange(1, h.length + 1).setValue('driveUrl');
    }
    if (!ss.getSheetByName(CONFIG.SHEETS.DEPARTMENTS)) {
      ensureSheet_(ss, CONFIG.SHEETS.DEPARTMENTS, ['id', 'name']);
    }
    var lic = ss.getSheetByName(CONFIG.SHEETS.LICENSES);
    if (lic && lic.getLastRow() > 0) {
      var lh = lic.getRange(1, 1, 1, lic.getLastColumn()).getValues()[0];
      if (lh.indexOf('renewalCycles') === -1) {
        lic.getRange(1, lh.length + 1).setValue('renewalCycles');
      }
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
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) return [];
    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
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
      var cycles = parseJson_(l.renewalCycles, []);
      cycles.sort(function (a, b) { return (a.round || 0) - (b.round || 0); });
      licensesByProject[pid].push({
        id: Number(l.id),
        name: l.name,
        issueDate: formatDateValue_(l.issueDate),
        expiryDate: formatDateValue_(l.expiryDate),
        alertMonths: Number(l.alertMonths) || 3,
        driveUrl: l.driveUrl || '',
        status: l.status || '-',
        steps: parseJson_(l.steps, CONFIG.DEFAULT_STEPS.slice()),
        renewalCycles: cycles,
        history: historyByLicense[String(l.id)] || []
      });
    });

    return projectRows.map(function (p) {
      return {
        id: Number(p.id),
        name: p.name,
        department: p.department || '',
        emails: parseJson_(p.emails, []),
        driveUrl: p.driveUrl || '',
        isDemo: isDemoRow_(p),
        licenses: licensesByProject[String(p.id)] || []
      };
    });
  }

  function getPayload() {
    var cached = PayloadCache.get();
    if (cached) return cached;
    var payload = {
      projects: getAllData(),
      departments: DepartmentService.getDepartments()
    };
    PayloadCache.set(payload);
    return payload;
  }

  function invalidateCache_() {
    PayloadCache.clear();
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

  function findDataRow_(sheet, id) {
    if (!id) return -1;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    var ids = sheet.getRange(2, 1, lastRow, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) return i + 2;
    }
    return -1;
  }

  function upsertRow_(sheetName, id, rowObj, headers) {
    var ss = ensureInitialized();
    var sheet = ss.getSheetByName(sheetName);
    var now = new Date().toISOString();
    var rowValues = headers.map(function (h) {
      if (h === 'updatedAt') return now;
      if (h === 'createdAt' && !id) return now;
      return rowObj[h] !== undefined ? rowObj[h] : '';
    });

    var rowIdx = findDataRow_(sheet, id);
    if (rowIdx > 0) {
      if (rowObj.createdAt) {
        var createdCol = headers.indexOf('createdAt') + 1;
        if (createdCol > 0) {
          rowValues[headers.indexOf('createdAt')] = sheet.getRange(rowIdx, createdCol).getValue();
        }
      }
      sheet.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
      return Number(id);
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

    var newId = upsertRow_(CONFIG.SHEETS.PROJECTS, id, {
      id: id || '',
      name: name,
      department: department,
      emails: JSON.stringify(emails),
      driveUrl: data.driveUrl || '',
      isDemo: data.isDemo === true || data.isDemo === 'true' ? 'true' : existingDemo,
      createdAt: ''
    }, ['id', 'name', 'department', 'emails', 'driveUrl', 'isDemo', 'createdAt', 'updatedAt']);
    invalidateCache_();
    return { success: true, id: newId };
  }

  function saveLicense(data) {
    var steps = data.steps || CONFIG.DEFAULT_STEPS;
    var id = data.id ? Number(data.id) : null;
    var existingCycles = '[]';
    if (id) {
      var licRows = readTable_(CONFIG.SHEETS.LICENSES);
      for (var li = 0; li < licRows.length; li++) {
        if (Number(licRows[li].id) === id) {
          existingCycles = licRows[li].renewalCycles || '[]';
          break;
        }
      }
    }
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
      renewalCycles: data.renewalCycles !== undefined ? data.renewalCycles : existingCycles,
      createdAt: ''
    }, [
      'id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths',
      'driveUrl', 'status', 'steps', 'renewalCycles', 'createdAt', 'updatedAt'
    ]);
    invalidateCache_();
    return { success: true, id: newId };
  }

  function saveTimelineUpdate(data) {
    var licenseId = data.licenseId;
    var step = data.step || '';
    var note = data.note || '';

    var ss = ensureInitialized();
    if (step) {
      var licSheet = ss.getSheetByName(CONFIG.SHEETS.LICENSES);
      var rowIdx = findDataRow_(licSheet, licenseId);
      if (rowIdx > 0) {
        var headers = licSheet.getRange(1, 1, 1, licSheet.getLastColumn()).getValues()[0];
        var statusCol = headers.indexOf('status') + 1;
        var updatedCol = headers.indexOf('updatedAt') + 1;
        if (statusCol > 0) licSheet.getRange(rowIdx, statusCol).setValue(step);
        if (updatedCol > 0) licSheet.getRange(rowIdx, updatedCol).setValue(new Date().toISOString());
      }
    }

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
    invalidateCache_();
    return { success: true };
  }

  function getLicenseRow_(licenseId) {
    var rows = readTable_(CONFIG.SHEETS.LICENSES);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) === String(licenseId)) return rows[i];
    }
    return null;
  }

  function completeRenewal(data) {
    var licenseId = data.licenseId;
    var newIssue = data.issueDate;
    var newExpiry = data.expiryDate;
    var note = (data.note || '').trim();
    if (!licenseId) throw new Error('ไม่พบใบอนุญาต');
    if (!newIssue || !newExpiry) throw new Error('กรุณากรอกวันเริ่มและวันหมดอายุรอบถัดไป');

    var lic = getLicenseRow_(licenseId);
    if (!lic) throw new Error('ไม่พบใบอนุญาต');

    var steps = parseJson_(lic.steps, CONFIG.DEFAULT_STEPS.slice());
    var lastStep = steps.length ? steps[steps.length - 1] : '';
    var status = String(lic.status || '');
    var ready = status === lastStep;
    if (!ready && lastStep) {
      var hist = readTable_(CONFIG.SHEETS.HISTORY);
      var done = {};
      hist.forEach(function (h) {
        if (String(h.licenseId) === String(licenseId)) done[h.action] = true;
      });
      ready = steps.every(function (s) { return done[s]; });
    }
    if (!ready) {
      throw new Error('ยังดำเนินการขั้นตอนไม่ครบ — บันทึกขั้นตอน "เสร็จสิ้นสมบูรณ์" ก่อนเริ่มรอบใหม่');
    }

    var cycles = parseJson_(lic.renewalCycles, []);
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var oldIssue = formatDateValue_(lic.issueDate);
    var oldExpiry = formatDateValue_(lic.expiryDate);
    if (oldIssue && oldExpiry) {
      cycles.push({
        round: cycles.length + 1,
        issueDate: oldIssue,
        expiryDate: oldExpiry,
        archivedAt: today,
        note: note || 'บันทึกรอบต่ออายุ'
      });
    }

    var firstStep = steps[0] || 'รอเริ่มดำเนินการ';
    upsertRow_(CONFIG.SHEETS.LICENSES, Number(licenseId), {
      id: licenseId,
      projectId: lic.projectId,
      name: lic.name,
      issueDate: newIssue,
      expiryDate: newExpiry,
      alertMonths: lic.alertMonths,
      driveUrl: lic.driveUrl || '',
      status: firstStep,
      steps: lic.steps,
      renewalCycles: JSON.stringify(cycles),
      createdAt: lic.createdAt
    }, [
      'id', 'projectId', 'name', 'issueDate', 'expiryDate', 'alertMonths',
      'driveUrl', 'status', 'steps', 'renewalCycles', 'createdAt', 'updatedAt'
    ]);

    var sheet = ensureInitialized().getSheetByName(CONFIG.SHEETS.HISTORY);
    sheet.appendRow([
      Date.now(),
      licenseId,
      today,
      'เริ่มรอบติดตามใหม่',
      'รอบที่ ' + (cycles.length + 1) + ' · ' + newIssue + ' ถึง ' + newExpiry + (note ? ' · ' + note : ''),
      new Date().toISOString()
    ]);

    invalidateCache_();
    return { success: true, licenseId: licenseId, round: cycles.length + 1 };
  }

  function addHistoryEntry(licenseId, action, note) {
    appendRow_(CONFIG.SHEETS.HISTORY, {
      id: Date.now(),
      licenseId: licenseId,
      date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      action: action,
      note: note
    }, ['id', 'licenseId', 'date', 'action', 'note', 'createdAt']);
    invalidateCache_();
  }

  return {
    invalidateCache_: invalidateCache_,
    setupSpreadsheet: setupSpreadsheet,
    getAllData: getAllData,
    getPayload: getPayload,
    saveProject: saveProject,
    saveLicense: saveLicense,
    saveTimelineUpdate: saveTimelineUpdate,
    completeRenewal: completeRenewal,
    addHistoryEntry: addHistoryEntry,
    readTable_: readTable_,
    appendRow_: appendRow_,
    ensureInitialized: ensureInitialized
  };
})();
