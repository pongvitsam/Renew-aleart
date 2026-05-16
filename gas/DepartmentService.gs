var DepartmentService = (function () {

  function seedDefaultsIfEmpty_() {
    var rows = SheetService.readTable_(CONFIG.SHEETS.DEPARTMENTS);
    if (rows.length > 0) return;
    CONFIG.DEFAULT_DEPARTMENTS.forEach(function (name, i) {
      SheetService.appendRow_(CONFIG.SHEETS.DEPARTMENTS, {
        id: Date.now() + i,
        name: name
      }, ['id', 'name']);
    });
  }

  function countProjectsByDepartment_(deptName) {
    var projects = SheetService.readTable_(CONFIG.SHEETS.PROJECTS);
    var n = 0;
    projects.forEach(function (p) {
      if (String(p.department) === String(deptName)) n++;
    });
    return n;
  }

  function getDepartments() {
    seedDefaultsIfEmpty_();
    var rows = SheetService.readTable_(CONFIG.SHEETS.DEPARTMENTS);
    var projects = SheetService.readTable_(CONFIG.SHEETS.PROJECTS);
    var countByDept = {};
    projects.forEach(function (p) {
      var d = String(p.department || '');
      countByDept[d] = (countByDept[d] || 0) + 1;
    });
    return rows.map(function (r) {
      var name = String(r.name);
      var count = countByDept[name] || 0;
      return {
        id: Number(r.id),
        name: name,
        projectCount: count,
        canDelete: count === 0
      };
    });
  }

  function saveDepartment(data) {
    var name = (data.name || '').trim();
    if (!name) throw new Error('กรุณาระบุชื่อแผนก');
    seedDefaultsIfEmpty_();
    var rows = SheetService.readTable_(CONFIG.SHEETS.DEPARTMENTS);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].name).toLowerCase() === name.toLowerCase()) {
        throw new Error('มีแผนกชื่อนี้อยู่แล้ว');
      }
    }
    SheetService.appendRow_(CONFIG.SHEETS.DEPARTMENTS, {
      id: Date.now(),
      name: name
    }, ['id', 'name']);
    return { success: true };
  }

  function deleteDepartment(data) {
    var id = Number(data.id);
    seedDefaultsIfEmpty_();
    var rows = SheetService.readTable_(CONFIG.SHEETS.DEPARTMENTS);
    var target = null;
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i].id) === id) {
        target = rows[i];
        break;
      }
    }
    if (!target) throw new Error('ไม่พบแผนก');
    var count = countProjectsByDepartment_(target.name);
    if (count > 0) {
      throw new Error('ไม่สามารถลบแผนกนี้ได้ — มีโครงการใช้งาน ' + count + ' โครงการ');
    }
    var ss = SheetService.ensureInitialized();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.DEPARTMENTS);
    var dataRange = sheet.getDataRange().getValues();
    for (var r = 1; r < dataRange.length; r++) {
      if (Number(dataRange[r][0]) === id) {
        sheet.deleteRow(r + 1);
        break;
      }
    }
    return { success: true };
  }

  return {
    getDepartments: getDepartments,
    saveDepartment: saveDepartment,
    deleteDepartment: deleteDepartment,
    seedDefaultsIfEmpty_: seedDefaultsIfEmpty_
  };
})();
