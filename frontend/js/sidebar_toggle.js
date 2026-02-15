(function () {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    // Sidebar toggle setup
    let toggleBtn = sidebar.querySelector(".sidebar-toggle");
    if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.className = "sidebar-toggle";
        toggleBtn.innerHTML = "☰";
        sidebar.prepend(toggleBtn);
    }

    // Restore sidebar state from localStorage
    const isCollapsed = localStorage.getItem("sidebar-collapsed") === "true";
    if (isCollapsed) {
        sidebar.classList.add("collapsed");
        document.body.classList.add("sidebar-collapsed");
    } else {
        sidebar.classList.remove("collapsed");
        document.body.classList.remove("sidebar-collapsed");
    }

    //  Toggle button logic 
    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        document.body.classList.toggle(
            "sidebar-collapsed",
            sidebar.classList.contains("collapsed")
        );

        // Save state to localStorage
        localStorage.setItem("sidebar-collapsed", sidebar.classList.contains("collapsed"));
    });

    //  Active link highlighting 
    const currentPath = window.location.pathname;
    document.querySelectorAll(".nav-item a").forEach(link => {
        if (currentPath.includes(link.getAttribute("href"))) {
            link.closest(".nav-item").classList.add("active");
        } else {
            link.closest(".nav-item").classList.remove("active");
        }
    });

    //  Make entire nav-item clickable 
    document.querySelectorAll(".nav-item").forEach(item => {
        const link = item.querySelector("a");
        if (!link) return;

        item.addEventListener("click", () => {
            window.location.href = link.getAttribute("href");
        });
    });
})();
