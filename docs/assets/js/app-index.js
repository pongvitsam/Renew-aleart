function rebuildAppIndex() {
  App.expiryEvents = [];
  App.projects.forEach(project => {
    (project.licenses || []).forEach(license => {
      if (!license.expiryDate) return;
      App.expiryEvents.push({
        date: license.expiryDate,
        project,
        license,
        status: Utils.calculateStatus(license.expiryDate, license.alertMonths).status
      });
    });
  });
}
