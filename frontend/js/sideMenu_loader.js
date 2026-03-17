
const token = sessionStorage.getItem("access_token");
if (!token) {
    window.location.href = "/html/login.html";
}
document.addEventListener("DOMContentLoaded", async () => {
    try {
        //Get user role from sessionStorage 
        const userRole = getUserRole();
        console.log("User role detected:", userRole);

        if (!userRole) {
            console.warn("No user role found. User not logged in.");
            window.location.href = "/html/login.html";
            return;
        }

        const sidebarPath = getSidebarPath(userRole);
        console.log("Loading sidebar from:", sidebarPath);
        await loadSidebar(sidebarPath);

        initializeSidebarToggle();

        highlightActiveMenuItem();

        filterMenuItemsByRole(userRole);

    } catch (error) {
        console.error("Sidebar initialization failed:", error);
    }
});


function getUserRole() {
    const role = sessionStorage.getItem("role");

    if (!role) {
        console.warn("No role in sessionStorage!");
        console.warn("Make sure user is logged in");
        return null;
    }

    console.log("Found role in sessionStorage:", role);
    return role.toLowerCase();
}


function getSidebarPath(role) {
    const roleNormalized = role.toLowerCase();

    const sidebarPaths = {
        "super admin": "/html/sideMenu.html",
        "admin": "/html/admin_side_menu.html"
    };

    const path = sidebarPaths[roleNormalized];
    console.log("Sidebar path for role '" + role + "':", path);
    return path || "/html/admin_side_menu.html";
}


async function loadSidebar(sidebarPath) {
    try {
        console.log("Fetching sidebar from:", sidebarPath);

        const response = await fetch(sidebarPath);
        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }

        const html = await response.text();
        const container = document.getElementById("sidebar-container");

        if (!container) {
            console.error(" sidebar-container not found in DOM!");
            return;
        }

        console.log("Sidebar HTML loaded, inserting into DOM");
        container.innerHTML = html;
        console.log("Sidebar inserted successfully");
        const logoutSection = container.querySelector(".logout-section");
        if (logoutSection) {
            const logoutAnchor = logoutSection.querySelector("a");
            if (logoutAnchor) {
                logoutAnchor.addEventListener("click", (e) => {
                    e.preventDefault();  
                    e.stopPropagation();
                    logout();
                });
            }
        }

    } catch (error) {
        console.error("Error loading sidebar:", error);
    }
}


//Initialize sidebar toggle

function initializeSidebarToggle() {
    console.log("Initializing sidebar toggle...");

    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) {
        console.error("Sidebar element not found!");
        return;
    }

    console.log("Found sidebar element");

    sidebar.classList.remove("collapsed");
    document.body.classList.remove("sidebar-collapsed");

    // Sidebar toggle button setup
    let toggleBtn = sidebar.querySelector(".sidebar-toggle");
    if (!toggleBtn) {
        console.log("Creating toggle button...");
        toggleBtn = document.createElement("button");
        toggleBtn.className = "sidebar-toggle";
        toggleBtn.innerHTML = "☰";
        sidebar.prepend(toggleBtn);
    }

    // Toggle button logic
    toggleBtn.addEventListener("click", () => {
        console.log("Toggle clicked");
        sidebar.classList.toggle("collapsed");
        document.body.classList.toggle(
            "sidebar-collapsed",
            sidebar.classList.contains("collapsed")
        );
    });

    // Active link highlighting
    const currentPath = window.location.pathname;
    console.log("Current page path:", currentPath);

    sidebar.querySelectorAll(".nav-item a").forEach(link => {
        const href = link.getAttribute("href");
        if (!href) return;
        if (currentPath.includes(href)) {
            link.closest(".nav-item").classList.add("active");
        } else {
            link.closest(".nav-item").classList.remove("active");
        }
    });
    sidebar.querySelectorAll(".nav-item").forEach(item => {
        const link = item.querySelector("a");
        if (!link) return;
        item.addEventListener("click", () => {
            const href = link.getAttribute("href");
            if (!href) return;
            window.location.href = href;
        });
    });

    console.log("Toggle function initialized");
}


// Highlight the active menu item based on current page

function highlightActiveMenuItem() {
    console.log("Highlighting active menu item...");

    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) {
        console.error(" Sidebar not found for highlighting");
        return;
    }

    const currentPath = window.location.pathname;
    console.log("Current page path:", currentPath);

    const navItems = sidebar.querySelectorAll(".nav-item");
    let found = false;

    navItems.forEach(item => {
        const link = item.querySelector("a");
        if (!link) return;
        const href = link.getAttribute("href");
        if (!href) return; 
        if (currentPath.includes(href)) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    });

    if (!found) {
        console.log("No active menu item matched");
    }
}

function filterMenuItemsByRole(userRole) {
    console.log("Filtering menu items for role:", userRole);

    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) {
        console.error("Sidebar not found for filtering");
        return;
    }

    const navItems = sidebar.querySelectorAll(".nav-item");
    const roleNormalized = userRole.toLowerCase();
    let visibleCount = 0;

    navItems.forEach(item => {
        const allowedRoles = item.getAttribute("data-role");
        const link = item.querySelector("a");
        const linkText = link ? link.textContent : "Unknown";

        if (!allowedRoles) {
            item.style.display = "block";
            visibleCount++;
            console.log("Visible (no role restriction):", linkText);
            return;
        }

        const rolesArray = allowedRoles
            .split(",")
            .map(r => r.trim())
            .map(r => r.toLowerCase());

        const hasAccess = rolesArray.includes(roleNormalized);

        if (hasAccess) {
            item.style.setProperty("display", "flex", "important");
            visibleCount++;
            console.log("Visible:", linkText);
        } else {
            item.style.display = "none";
            console.log(" Hidden:", linkText, "(allowed roles:", allowedRoles + ")");
        }
    });

    console.log("Total visible menu items:", visibleCount);
}

function logout() {
    console.log("Logging out...");
    sessionStorage.clear();
    window.location.href = "/html/login.html"; 
}