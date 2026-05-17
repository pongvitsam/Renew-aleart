function rebuildAppIndex() {
  App.expiryEvents = [];
  App._projectStatusCache = Object.create(null);
  App.projects.forEach(project => {
    App._projectStatusCache[project.id] = Utils.computeProjectStatus(project);
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
