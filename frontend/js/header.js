(function () {

  function getConfig() {
    const adminConfig = window.ADMIN_HEADER_CONFIG || {};
    const userConfig = window.HEADER_CONFIG || {};

    let storedUser = {};
    try {
      storedUser = JSON.parse(sessionStorage.getItem("user")) || {};
    } catch (e) {}

    const role = (adminConfig.role || userConfig.role || storedUser.role || sessionStorage.getItem("role") || "Admin").toLowerCase();
    const name = adminConfig.name || userConfig.name || storedUser.username || storedUser.name || "Admin";
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "JD";
    const title = adminConfig.title || userConfig.title || document.title || "";
    const subtitle = adminConfig.subtitle || userConfig.subtitle || "";

    return { role, name, initials, title, subtitle };
  }

  function renderHeader() {
    const el = document.getElementById("header-container");
    if (!el) return;

    const { role, name, initials, title, subtitle } = getConfig();

    if (role === "admin") {
      el.innerHTML = `
        <header class="admin-header">
          <h3>${title}</h3>
          ${subtitle ? `<p class="header-subtitle">${subtitle}</p>` : ""}
          <div class="admin">
            <div class="admin-icon"></div>
            <div>
              <span class="admin-name">${name}</span>
              <span class="admin-role">${role}</span>
            </div>
          </div>
        </header>
      `;
    } else {
      el.innerHTML = `
        <header class="header">
          <div class="header-left">
            <h1 class="header-title">${title}</h1>
            ${subtitle ? `<p class="header-subtitle">${subtitle}</p>` : ""}
          </div>
          <div class="header-right">
            <div class="user-card">
              <div class="user-profile">${initials}</div>
              <div class="user-info">
                <div class="user-name">${name}</div>
                <div class="user-role">${role}</div>
              </div>
            </div>
          </div>
        </header>
      `;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHeader);
  } else {
    renderHeader();
  }

  window.HeaderLoader = { refresh: renderHeader };

})();