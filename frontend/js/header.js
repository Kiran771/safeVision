(function () {
  if (!document.getElementById('fa-cdn')) {
    const link = document.createElement('link');
    link.id   = 'fa-cdn';
    link.rel  = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
    document.head.appendChild(link);
  }

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
        <div class="notification-wrapper" id="notificationWrapper">
          <div class="bell-btn" id="bellBtn">
            <img src='/resources/notification.png' alt="notifications">
            <span class="notif-badge hidden" id="notifBadge">0</span>
          </div>
          <div class="notif-dropdown hidden" id="notifDropdown">
            <div class="notif-header">
              <span>Notifications</span>
              <button class="clear-btn" id="clearNotifBtn">Clear all</button>
            </div>
            <div class="notif-list" id="notifList">
              <p class="notif-empty">No notifications</p>
            </div>
          </div>
        </div>

        <div class="admin-icon"></div>
        <div>
          <span class="admin-name">${name}</span>
          <span class="admin-role">${role}</span>
        </div>
      </div>
    </header>
  `;

  initNotifications();
}else {
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

  function initNotifications() {
    const bellBtn       = document.getElementById('bellBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const clearBtn      = document.getElementById('clearNotifBtn');
    if (!bellBtn) return;

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');
      if (!notifDropdown.classList.contains('hidden')) {
        fetchNotifications();
      }
    });

    document.addEventListener('click', (e) => {
      if (!document.getElementById('notificationWrapper')?.contains(e.target)) {
        notifDropdown?.classList.add('hidden');
      }
    });

    clearBtn?.addEventListener('click', async () => {
      try {
        const token = sessionStorage.getItem("access_token");
        await fetch('/accidents/notifications/clear', {
          method: 'DELETE',
          headers: { "Authorization": `Bearer ${token}` }
        });
        document.getElementById('notifList').innerHTML = '<p class="notif-empty">No notifications</p>';
        updateBadge(0);
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    });

    fetchNotifications();
    setInterval(fetchNotifications, 10000);
  }

  async function fetchNotifications() {
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) return;
      const res = await fetch('/accidents/notifications', {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const notifications = data.notifications || [];
      updateBadge(notifications.length);
      renderNotifications(notifications);
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  }

  function renderNotifications(notifications) {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (!notifications.length) {
      list.innerHTML = '<p class="notif-empty">No notifications</p>';
      return;
    }

    const iconMap = {
      success : '<i class="fa-solid fa-circle-check"></i>',
      error   : '<i class="fa-solid fa-circle-xmark"></i>',
      warning : '<i class="fa-solid fa-triangle-exclamation"></i>',
      info    : '<i class="fa-solid fa-circle-info"></i>',
    };

    list.innerHTML = notifications.map(n => `
      <div class="notif-item notif-${n.type || 'info'}">
        <span class="notif-icon">${iconMap[n.type] || iconMap.info}</span>
        <span class="notif-msg">${n.message}</span>
      </div>
    `).join('');

    list.scrollTop = 0;
  }

  function updateBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderHeader);
  } else {
    renderHeader();
  }

  window.HeaderLoader = { refresh: renderHeader };

})();