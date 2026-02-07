(function () {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    let toggleBtn = sidebar.querySelector(".sidebar-toggle");
    if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.className = "sidebar-toggle";
        toggleBtn.innerHTML = "☰";
        sidebar.prepend(toggleBtn);
    }

    sidebar.classList.remove("collapsed");
    document.body.classList.remove("sidebar-collapsed");

    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");

        document.body.classList.toggle(
            "sidebar-collapsed",
            sidebar.classList.contains("collapsed")
        );
    });

    const currentPath = window.location.pathname;
    document.querySelectorAll(".nav-item a").forEach(link => {
        if (currentPath.includes(link.getAttribute("href"))) {
            link.closest(".nav-item").classList.add("active");
        }
    });
})();
