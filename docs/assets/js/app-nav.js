function updateSidebarNav(view) {
  document.querySelectorAll('.sidebar-nav [data-nav]').forEach(btn => {
    btn.classList.toggle('nav-active', btn.dataset.nav === view);
  });
}

window.updateSidebarNav = updateSidebarNav;
