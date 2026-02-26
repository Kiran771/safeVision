(function () {

  function cfg() {
    const c = window.HEADER_CONFIG || {};
    return {
      title    : c.title    || document.title || "",
      subtitle : c.subtitle || "",
      initials : c.initials || localStorage.getItem("adminInitials") || "JD",
      name     : c.name     || localStorage.getItem("adminName")     || "James",
      role     : c.role     || localStorage.getItem("adminRole")     || "Administrator",
    };
  }

  function renderHeader() {
    const el = document.getElementById("header-container");
    if (!el) return;
    const { title, subtitle, initials, name, role } = cfg();

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

  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHeader);
  } else {
    renderHeader();
  }


  window.HeaderLoader = { refresh: renderHeader };

})();