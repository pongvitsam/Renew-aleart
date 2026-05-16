var EmailService = (function () {

  function buildAlertHtml_(project, license) {
    var exp = new Date(license.expiryDate);
    var now = new Date();
    var monthsLeft = (exp.getFullYear() - now.getFullYear()) * 12 + (exp.getMonth() - now.getMonth());
    var thMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var expStr = exp.getDate() + ' ' + thMonths[exp.getMonth()] + ' ' + (exp.getFullYear() + 543);
    var remainText = monthsLeft > 0 ? 'อีก ' + monthsLeft + ' เดือน' : 'หมดอายุแล้ว';

    return [
      '<div style="font-family:Sarabun,Arial,sans-serif;max-width:600px;margin:0 auto;">',
      '<h2 style="color:#4f46e5;">[แจ้งเตือน] ใบอนุญาตใกล้หมดอายุ</h2>',
      '<p><b>โครงการ:</b> ' + escapeHtml_(project.name) + '</p>',
      '<p><b>แผนก:</b> ' + escapeHtml_(project.department) + '</p>',
      '<p><b>ใบอนุญาต:</b> ' + escapeHtml_(license.name) + '</p>',
      '<p><b>วันหมดอายุ:</b> ' + expStr + '</p>',
      '<p><b>คงเหลือ:</b> <span style="color:#e11d48;font-weight:bold;">' + remainText + '</span></p>',
      license.driveUrl ? '<p><a href="' + license.driveUrl + '">เปิดเอกสาร Google Drive</a></p>' : '',
      '<hr><p style="font-size:12px;color:#64748b;">ส่งจากระบบ License Monitor — Renew Alert</p>',
      '</div>'
    ].join('');
  }

  function escapeHtml_(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sendTestEmail(data) {
    var projects = SheetService.getAllData();
    var project = null;
    var license = null;

    for (var i = 0; i < projects.length; i++) {
      if (Number(projects[i].id) === Number(data.projectId)) {
        project = projects[i];
        for (var j = 0; j < project.licenses.length; j++) {
          if (Number(project.licenses[j].id) === Number(data.licenseId)) {
            license = project.licenses[j];
            break;
          }
        }
        break;
      }
    }

    if (!project || !license) {
      throw new Error('ไม่พบโครงการหรือใบอนุญาต');
    }

    var subject = '[แจ้งเตือน] ใบอนุญาตหมดอายุ - ' + license.name;
    var htmlBody = buildAlertHtml_(project, license);
    var recipients = project.emails.join(',');

    MailApp.sendEmail({
      to: recipients,
      subject: subject,
      htmlBody: htmlBody
    });

    if (data.saveLog) {
      SheetService.addHistoryEntry(
        license.id,
        'ทดสอบแจ้งเตือน',
        'ส่งอีเมลทดสอบไป ' + project.emails.length + ' ปลายทาง'
      );
    }

    return { success: true, sentTo: project.emails.length };
  }

  function checkAndSendExpiryAlerts() {
    var projects = SheetService.getAllData();
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var sent = 0;

    projects.forEach(function (project) {
      project.licenses.forEach(function (license) {
        var exp = new Date(license.expiryDate);
        var diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
        var threshold = (Number(license.alertMonths) || 3) * 30;

        if (diffDays >= 0 && diffDays <= threshold) {
          try {
            MailApp.sendEmail({
              to: project.emails.join(','),
              subject: '[แจ้งเตือน] ใบอนุญาตหมดอายุ - ' + license.name,
              htmlBody: buildAlertHtml_(project, license)
            });
            SheetService.addHistoryEntry(
              license.id,
              'แจ้งเตือนอัตโนมัติ',
              'ระบบส่งอีเมลแจ้งเตือน (เหลือ ' + diffDays + ' วัน)'
            );
            sent++;
          } catch (e) {
            Logger.log('Email failed: ' + e.message);
          }
        }
      });
    });

    return { sent: sent };
  }

  return {
    sendTestEmail: sendTestEmail,
    checkAndSendExpiryAlerts: checkAndSendExpiryAlerts
  };
})();
