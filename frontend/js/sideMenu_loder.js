document.addEventListener("DOMContentLoaded", () => {
  fetch("/html/sideMenu.html")
    .then(response => response.text())
    .then(html => {
      const sidebarContainer = document.getElementById("sidebar-container");
      sidebarContainer.innerHTML = html;

      // ===== Active menu item logic =====
      const sidebar = sidebarContainer.querySelector(".sidebar");
      if (sidebar) {
        const currentPath = window.location.pathname;
        sidebar.querySelectorAll(".nav-item a").forEach(link => {
          // Exact match for the current page
          if (link.getAttribute("href") === currentPath) {
            link.closest(".nav-item").classList.add("active");
          }
        });
      }
    })
    .catch(error => {
      console.error("Error loading sidebar:", error);
    });
});
