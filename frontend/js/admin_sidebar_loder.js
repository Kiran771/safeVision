document.addEventListener("DOMContentLoaded", () => {
    fetch("/html/admin_side_menu.html")
        .then(res => res.text())
        .then(html => {
            document.getElementById("sidebar-container").innerHTML = html;

            const script = document.createElement("script");
            script.src = "/js/sidebar_toggle.js";
            document.body.appendChild(script);
        })
        .catch(err => console.error("Sidebar load failed:", err));
});
