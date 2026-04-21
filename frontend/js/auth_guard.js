function guardPage(allowedRoles) {
    const token = sessionStorage.getItem("access_token");
    const expiresAt = sessionStorage.getItem("expires_at");

if (!token) {
    window.location.href = "/html/login.html";
    return;
}

if (expiresAt && Date.now() > parseInt(expiresAt)) {
    sessionStorage.clear();
    alert("Your session has expired. Please log in again.");
    window.location.href = "/html/login.html";
    return;
}

const role = (sessionStorage.getItem("role") || "").toLowerCase();
const allowed = allowedRoles.map(r => r.toLowerCase());
if (!allowed.includes(role)) {
    window.location.href = "/html/dashboard.html";
}
}