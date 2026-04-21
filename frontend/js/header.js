// This script dynamically renders the header section of the admin dashboard 
// and super admin pages, including user profile information and notifications, 
// based on the user's role and configuration settings.
(function () {
  if (!document.getElementById('fa-cdn')) {
    const link = document.createElement('link');
    link.id = 'fa-cdn';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
    document.head.appendChild(link);
  }



  function getConfig() {
    const adminConfig = window.ADMIN_HEADER_CONFIG || {};
    const superAdminConfig = window.HEADER_CONFIG || {};

    let storedUser = {};
    try {
      storedUser = JSON.parse(sessionStorage.getItem("user")) || {};
    } catch (e) { }

    const role = (storedUser.role || sessionStorage.getItem("role") || "admin").toLowerCase();
    const name = storedUser.username || storedUser.name || "Admin";
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "JD";

    const title = adminConfig.title || superAdminConfig.title || document.title || "";
    const subtitle = adminConfig.subtitle || superAdminConfig.subtitle || "";

    return { role, name, initials, title, subtitle };
  }


function renderProfileModal({ name, role }) {
    if (document.getElementById('profileMenu')) return;

    const overlay = document.createElement('div');
    overlay.id = 'profileMenu';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;';

    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";

    overlay.innerHTML = `
      <div id="profileMenuCard" style="
        position:absolute;top:85px;right:16px;
        background:#fff;border:1px solid #e5e7eb;
        border-radius:10px;width:220px;
        box-shadow:0 4px 16px rgba(0,0,0,0.12);
        overflow:hidden;font-family:inherit;
      ">
        <div style="padding:16px;border-bottom:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div id="profileMenuAvatar" style="
              width:48px;height:48px;border-radius:50%;
              background:#e0e7ff;display:flex;align-items:center;
              justify-content:center;font-size:18px;font-weight:600;
              color:#4338ca;flex-shrink:0;
            ">${initials}</div>
            <div>
              <div id="profileMenuName" style="font-size:14px;font-weight:600;color:#111827;">${name}</div>
              <div id="profileMenuRole" style="font-size:12px;color:#6b7280;text-transform:capitalize;margin-top:2px;">${role}</div>
            </div>
          </div>
        </div>
        <div style="padding:6px;">
          <button id="profileMenuSettings" style="
            width:100%;display:flex;align-items:center;gap:10px;
            padding:10px 12px;border:none;background:transparent;
            border-radius:7px;cursor:pointer;font-size:13px;
            color:#111827;text-align:left;
          ">
            <img src="/resources/settings.png" width="18" height="18" alt="" />
            Account Setting
          </button>
          <button id="profileMenuLogout" style="
            width:100%;display:flex;align-items:center;gap:10px;
            padding:10px 12px;border:none;background:transparent;
            border-radius:7px;cursor:pointer;font-size:13px;
            color:#dc2626;text-align:left;
          ">
            <img src="/resources/logout.png" width="18" height="18" alt="" />
            Logout
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    ['profileMenuSettings', 'profileMenuLogout'].forEach(id => {
      const btn = document.getElementById(id);
      btn.addEventListener('mouseenter', () => btn.style.background = '#f3f4f6');
      btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
    });

    document.getElementById('profileMenuSettings').addEventListener('click', () => {
      closeMenu();
      window.location.href = '/html/accountSettings.html';
    });

    document.getElementById('profileMenuLogout').addEventListener('click', () => {
      closeMenu();
      sessionStorage.clear();
      window.location.href = '/html/login.html';
    });

    overlay.addEventListener('click', (e) => {
      if (!document.getElementById('profileMenuCard').contains(e.target)) closeMenu();
    });

    function closeMenu() {
      document.getElementById('profileMenu')?.remove();
    }
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
          <div class="notif-dropdown hidden" id="notifDropdown" style="top:70px">
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
      const adminProfile = el.querySelector('.admin');
      if (adminProfile) {
        adminProfile.style.cursor = 'pointer';
        adminProfile.addEventListener('click', (e) => {
          if (e.target.closest('#notificationWrapper')) return;
          if (document.getElementById('profileMenu')) {
            document.getElementById('profileMenu').remove();
            return;
          }
          renderProfileModal({ name, role });
        });
      }
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
      const card = el.querySelector('.user-card');
      if (card) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          if (document.getElementById('profileMenu')) {
            document.getElementById('profileMenu').remove();
            return;
          }
          renderProfileModal({ name, role });
        });
      }
    }
  }



    function initNotifications() {
      const bellBtn = document.getElementById('bellBtn');
      const notifDropdown = document.getElementById('notifDropdown');
      const clearBtn = document.getElementById('clearNotifBtn');
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
          const cameraId = sessionStorage.getItem("selected_camera_id");
          const url = cameraId
            ? `/accidents/notifications/clear?camera_id=${cameraId}`
            : '/accidents/notifications/clear';
          await fetch(url, {
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
        const cameraId = sessionStorage.getItem("selected_camera_id");
        const url = cameraId
          ? `/accidents/notifications?camera_id=${cameraId}`
          : '/accidents/notifications';

        const res = await fetch(url, {
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
        success: '<i class="fa-solid fa-circle-check"></i>',
        error: '<i class="fa-solid fa-circle-xmark"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
        info: '<i class="fa-solid fa-circle-info"></i>',
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

  }) ();