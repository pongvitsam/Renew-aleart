function openSettingsModal() {
  if (typeof updateSidebarNav === 'function') updateSidebarNav('settings');
  const input = document.getElementById('settings-min-alert-months');
  if (input) {
    input.value = String(Number(App.settings?.minAlertMonths) || 3);
  }
  openModal('settingsModal');
}

async function saveAppSettings() {
  const input = document.getElementById('settings-min-alert-months');
  const minAlertMonths = Number(input?.value || 0);
  if (!Number.isFinite(minAlertMonths) || minAlertMonths < 1) {
    showToast('กรุณาระบุจำนวนเดือนอย่างน้อย 1', 'error');
    return;
  }

  Utils.setLoading(true);
  try {
    const res = await Api.saveSettings({ minAlertMonths: minAlertMonths });
    if (res && res.settings) {
      App.settings = { ...App.settings, ...res.settings };
    } else {
      App.settings = { ...App.settings, minAlertMonths: minAlertMonths };
    }
    closeModal('settingsModal');
    showToast('บันทึกการตั้งค่าแล้ว');
    refreshCurrentView({ forceFull: true });
  } catch (err) {
    showToast('บันทึกการตั้งค่าไม่สำเร็จ: ' + err.message, 'error');
  } finally {
    Utils.setLoading(false);
  }
}

Object.assign(window, {
  openSettingsModal,
  saveAppSettings
});
