function guardPage(allowedRoles) {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
        window.location.href = "/html/login.html";
        return;
    }

    const role = (sessionStorage.getItem("role") || "").toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (!allowed.includes(role)) {
        window.location.href = "/html/dashboard.html";
    }
}