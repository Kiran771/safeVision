const API_BASE = "";
function getAuthHeaders() {
    const token = sessionStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

let isRedirecting = false
async function handleResponse(response) {
    if (response.status === 401) {
        if (isRedirecting) return null;
        console.warn('Token expired. Redirecting to login...');
        isRedirecting = true
        sessionStorage.clear();
        alert("Session expired. Please login again.");
        window.location.href = '/html/login.html';
        return null;
    }
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }
    if (!response.ok) {
        console.error("API Error:", data);
        return data;
    }
    return data;
}

let profile = null;


document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
});


async function loadProfile() {
    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
        });

        const data = await handleResponse(response);
        if (!data) return;

        profile = data;
        renderProfile(profile);
        showCard();

    } catch (err) {
        console.error("[loadProfile] Network error:", err);
        alert("Could not load profile. Please check your connection.");
    }
}

function renderProfile(user) {
    const initial = (user.username || "?")[0].toUpperCase();

    setEl("avatarCircle", initial);
    setEl("displayName", user.username || "—");
    setEl("displayEmail", user.email || "—");
    setEl("roleLabel", user.role || "—");
    setEl("statusLabel", user.is_active ? "Active" : "Inactive");
    const statusBadge = document.getElementById("badgeStatus");
    if (statusBadge) {
        statusBadge.className = "badge " + (user.is_active ? "badge-active" : "badge-inactive");
    }
    setVal("inputUsername", user.username || "");
    setVal("inputEmail", user.email || "");
    setVal("inputContact", user.contact || "");
    setVal("inputRole", user.role || "");
}

async function saveProfile() {
    clearErrors();

    const username = getVal("inputUsername").trim();
    const email = getVal("inputEmail").trim();
    const contact = getVal("inputContact").trim();

    let valid = true;
    if (!username) {
        setError("err-username", "Username is required.");
        valid = false;
    }
    if (!email || !isValidEmail(email)) {
        setError("err-email", "A valid email is required.");
        valid = false;
    }
    if (!valid) return;

    const payload = {};
    if (username !== (profile?.username || "")) payload.username = username;
    if (email !== (profile?.email || "")) payload.email = email;
    if (contact !== (profile?.contact || "")) payload.contact = contact || null;

    if (Object.keys(payload).length === 0) {
        alert("No changes to save.");
        return;
    }

    setBtnLoading("btnSaveProfile", true);

    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            body: JSON.stringify(payload),
        });

        const data = await handleResponse(response);
        if (!data) return;

        if (!response.ok) {
            const detail = data?.detail || "Update failed.";
            if (detail.toLowerCase().includes("username")) setError("err-username", detail);
            else if (detail.toLowerCase().includes("email")) setError("err-email", detail);
            else alert(detail);
            return;
        }

        profile = data;
        renderProfile(data);
        alert("Profile updated successfully.");

    } catch (err) {
        console.error("[saveProfile] Network error:", err);
        alert("Network error. Please try again.");
    } finally {
        setBtnLoading("btnSaveProfile", false);
    }
}

function discardProfile() {
    if (profile) renderProfile(profile);
    clearErrors();
}

async function savePassword() {
    clearErrors();

    const current_password = getVal("inputCurrentPass");
    const new_password = getVal("inputNewPass");
    const confirm_password = getVal("inputConfirmPass");

    // Client-side validation
    let valid = true;
    if (!current_password) {
        setError("err-currentPass", "Current password is required.");
        valid = false;
    }
    if (!new_password) {
        setError("err-newPass", "New password is required.");
        valid = false;
    } else if (new_password.length < 8) {
        setError("err-newPass", "Password must be at least 8 characters.");
        valid = false;
    }
    if (!confirm_password) {
        setError("err-confirmPass", "Please confirm your new password.");
        valid = false;
    } else if (new_password && new_password !== confirm_password) {
        setError("err-confirmPass", "Passwords do not match.");
        valid = false;
    }
    if (!valid) return;

    setBtnLoading("btnSavePass", true);

    try {
        const response = await fetch(`${API_BASE}/auth/profile/change-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            body: JSON.stringify({ current_password, new_password, confirm_password }),
        });

        const data = await handleResponse(response);
        if (!data) return;

        if (!response.ok) {
            const detail = data?.detail || "Password change failed.";
            if (detail.toLowerCase().includes("current")) setError("err-currentPass", detail);
            else if (detail.toLowerCase().includes("match")) setError("err-confirmPass", detail);
            else if (detail.toLowerCase().includes("different")) setError("err-newPass", detail);
            else alert(detail);
            return;
        }

        alert("Password updated successfully.");
        clearPassFields();

    } catch (err) {
        console.error("[savePassword] Network error:", err);
        alert("Network error. Please try again.");
    } finally {
        setBtnLoading("btnSavePass", false);
    }
}

function checkStrength(val) {
    let score = 0;
    if (val.length >= 8) score++;
    if (val.length >= 12) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const widths = ["0%", "20%", "40%", "65%", "85%", "100%"];
    const colors = ["transparent", "#d93838", "#e07a1a", "#d4ac1a", "#48bb78", "#2f9e64"];
    const labels = [
        "At least 8 characters recommended",
        "Weak — too short",
        "Fair — add uppercase & numbers",
        "Good — add a symbol",
        "Strong",
        "Very strong",
    ];

    const fill = document.getElementById("strengthFill");
    const label = document.getElementById("strengthLabel");
    if (!fill || !label) return;

    fill.style.width = widths[score];
    fill.style.backgroundColor = colors[score];
    label.textContent = labels[score];
    label.style.color = score === 0 ? "#a8bfce" : colors[score];
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";


    const img = btn.querySelector("img");
    if (img) {
        const eyeOpen = img.dataset.eyeOpen || img.src;
        const eyeClosed = img.dataset.eyeClosed || img.src;
        img.src = isPassword ? eyeClosed : eyeOpen;
    }
}

function switchTab(tab, el) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
    ["profile", "security"].forEach(p => {
        const panel = document.getElementById(`tab-${p}`);
        if (panel) panel.classList.toggle("hidden", p !== tab);
    });
    clearErrors();
}

function clearPassFields() {
    ["inputCurrentPass", "inputNewPass", "inputConfirmPass"].forEach(id => setVal(id, ""));

    const fill = document.getElementById("strengthFill");
    const label = document.getElementById("strengthLabel");
    if (fill) { fill.style.width = "0%"; fill.style.backgroundColor = "transparent"; }
    if (label) { label.textContent = "At least 8 characters recommended"; label.style.color = ""; }

    clearErrors();
}

function clearErrors() {
    document.querySelectorAll(".field-error").forEach(el => { el.textContent = ""; });
    document.querySelectorAll(".form-input").forEach(el => {
        el.classList.remove("is-error", "is-ok");
    });
}

function showCard() {
    const content = document.getElementById("cardContent");
    if (content) content.classList.remove("hidden");
}
function setBtnLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;

    const iconSpan = btn.querySelector(".btn-icon");

    if (loading) {
        const spinner = document.createElement("span");
        spinner.className = "btn-spinner";
        spinner.id = `${btnId}-spinner`;
        if (iconSpan) iconSpan.style.display = "none";
        btn.prepend(spinner);
    } else {
        const spinner = document.getElementById(`${btnId}-spinner`);
        if (spinner) spinner.remove();
        if (iconSpan) iconSpan.style.display = "";
    }
}

function getVal(id) { return document.getElementById(id)?.value ?? ""; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function setEl(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

function setError(errId, msg) {
    const errEl = document.getElementById(errId);
    if (errEl) errEl.textContent = msg;

    const inputId = errId.replace("err-", "input");
    const input = document.getElementById(
        inputId.charAt(0).toUpperCase() + inputId.slice(1)
    ) ?? document.getElementById(inputId);
    if (input) input.classList.add("is-error");
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

