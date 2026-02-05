document.addEventListener("DOMContentLoaded", () => {
    fetch("/frontend/html/admin_side_menu.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("sidebar-container").innerHTML = html;

            const script = document.createElement("script");
            script.src = "/frontend/js/sidebar_toggle.js";
            document.body.appendChild(script);
        })
        .catch(err => console.error("Sidebar load failed:", err));
});
