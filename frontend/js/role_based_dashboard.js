guardPage(["super admin", "admin"]);
function getUserRole() {
    const adminConfig = window.ADMIN_HEADER_CONFIG || {};
    const superAdminConfig = window.HEADER_CONFIG || {};
    let storedUser = {};

    try {
        storedUser = JSON.parse(sessionStorage.getItem("user")) || {};
    } catch (e) { }

    const role = (
        adminConfig.role ||
        superAdminConfig.role ||
        storedUser.role ||
        sessionStorage.getItem("role") ||
        "Admin"
    ).toLowerCase();

    return role;
}

function initializeWelcome() {
    let storedUser = {};
    let userName = "User";
    let greeting = "";
    try {
        storedUser = JSON.parse(sessionStorage.getItem("user")) || {};
        userName = storedUser.username || storedUser.name || "User";
    } catch (e) { }
    const hour = new Date().getHours();
    if (hour < 12) {
        greeting = "Good Morning,";
    } else if (hour < 18) {
        greeting = "Good Afternoon,";
    } else {
        greeting = "Good Evening,";
    }
    const greetingEl = document.getElementById("welcome-greeting");
    const nameEl = document.getElementById("welcome-name");
    if (greetingEl) {
        greetingEl.textContent = greeting;
    }
    if (nameEl) {
        nameEl.textContent = userName;
    }
    console.log(`Welcome message set: ${greeting}, ${userName}`);
}

async function renderSuperAdminDashboard(contentEl) {
    try {
        contentEl.innerHTML = '<div class="sa-loading">Loading dashboard…</div>';

        const [statsRes, periodRes, adminsRes] = await Promise.all([
            fetch("/dashboard/superadmin/stats", {
                headers: dashboardAPI.getAuthHeaders(),
            }),
            fetch("/dashboard/time-period-stats?period=7days", {
                headers: dashboardAPI.getAuthHeaders(),
            }),
            fetch("/admins/stats", { headers: dashboardAPI.getAuthHeaders() }),
        ]);

        const stats = await statsRes.json();
        const period = await periodRes.json();
        const admins = await adminsRes.json();

        contentEl.innerHTML = buildSuperAdminHTML(stats, admins);

        setTimeout(() => initSuperAdminCharts(stats, period), 120);
        setupSATimeFilters();
    } catch (err) {
        console.error("SuperAdmin dashboard error:", err);
        contentEl.innerHTML = `<div class="sa-error"><p>${err.message}</p>
      <button onclick="location.reload()">Retry</button></div>`;
    }
}

function buildSuperAdminHTML(stats, admins) {
    const m = stats.metrics || {};
    const sb = stats.status_breakdown || {};
    const inc = stats.incidents || {};
    const total = sb.total || 1;

    const pct = (n) => (total > 0 ? ((n / total) * 100).toFixed(1) : 0);

    return `
    <div class="sa-dashboard">
    <div class="sa-row sa-stats-row">
        <div class="sa-card sa-stat blue-light">
        <div class="sa-stat-label">Total Admins</div>
        <div class="sa-stat-value">${admins.total ?? 0}</div>
        </div>
        <div class="sa-card sa-stat blue-light">
        <div class="sa-stat-label">Total Cameras</div>
        <div class="sa-stat-value" id="sa-total-cameras">—</div>
        </div>
        <div class="sa-card sa-stat blue-light">
        <div class="sa-stat-label">Active Cameras</div>
        <div class="sa-stat-value" id="sa-active-cameras">—</div>
        </div>
        <div class="sa-card sa-stat blue-light">
        <div class="sa-stat-label">Unassigned Admins</div>
        <div class="sa-stat-value">${admins.unassigned ?? 0}</div>
        </div>
    </div>

    <div class="sa-row sa-alert-row">
        <div class="sa-card sa-alert-card dark-slate">
        <div class="sa-stat-label">Total Alerts Sent</div>
        <div class="sa-stat-value">${m.total_alerts ?? 0}</div>
        </div>
        <div class="sa-card sa-alert-card dark-slate">
        <div class="sa-stat-label">Active Emergency Contacts</div>
        <div class="sa-stat-value" id="sa-contacts">—</div>
        </div>
        <div class="sa-card sa-alert-card dark-teal">
        <div class="sa-stat-label">High-Confidence Detections</div>
        <div class="sa-stat-value" id="sa-high-conf">—</div>
        <div class="sa-stat-sub">confidence ≥ 70 %</div>
        </div>
    </div>

    <div class="sa-row sa-charts-row">
        <div class="sa-card sa-chart-card">
        <div class="sa-chart-header">
            <h3>Alert Status Distribution</h3>
            <div class="sa-time-filters">
            <button class="sa-filter active" data-period="24hrs">24hrs</button>
            <button class="sa-filter" data-period="7days">7days</button>
            <button class="sa-filter" data-period="30days">30days</button>
            </div>
        </div>
        <div class="sa-chart-wrap"><canvas id="saStatusChart"></canvas></div>
        </div>

        <div class="sa-card sa-chart-card">
        <div class="sa-chart-header">
            <h3>Accidents Over Time</h3>
        </div>
        <div class="sa-chart-wrap"><canvas id="saTimelineChart"></canvas></div>
        </div>

    </div>


    <div class="sa-row sa-charts-row">

        <div class="sa-card sa-chart-card">
        <div class="sa-chart-header">
            <h3>Detections by Camera</h3>
        </div>
        <div class="sa-chart-wrap"><canvas id="saCameraChart"></canvas></div>
        </div>

        <div class="sa-card sa-incident-card">
        <h3>Incident Type Stats</h3>
        <div class="sa-incident-grid">
            <div class="sa-inc-item">
            <div class="sa-inc-label">Fire Incidents</div>
            <div class="sa-inc-value">${inc.fire_incident ?? 0}</div>
            </div>
            <div class="sa-inc-item">
            <div class="sa-inc-label">Car Incidents</div>
            <div class="sa-inc-value">${inc.car_incidents ?? 0}</div>
            </div>
            <div class="sa-inc-item">
            <div class="sa-inc-label">Pending Reviews</div>
            <div class="sa-inc-value">${sb.pending ?? 0}</div>
            </div>
            <div class="sa-inc-item">
            <div class="sa-inc-label">Confirmed</div>
            <div class="sa-inc-value">${sb.confirmed ?? 0}</div>
            </div>
        </div>
        </div>

    </div>

    <div class="sa-card sa-breakdown-card">
        <h3>Status Breakdown</h3>
        <div class="sa-breakdown-list">
        ${saProgressBar("Confirmed Incidents", sb.confirmed ?? 0, pct(sb.confirmed ?? 0), "bar-confirmed")}
        ${saProgressBar("Pending Reviews", sb.pending ?? 0, pct(sb.pending ?? 0), "bar-pending")}
        ${saProgressBar("False Alarms", sb.false_alarm ?? 0, pct(sb.false_alarm ?? 0), "bar-false")}
        </div>
    </div>

    </div>`;
}

function saProgressBar(label, count, pct, cls) {
    return `
    <div class="sa-bar-item">
        <div class="sa-bar-header">
        <span class="sa-bar-label">${label}</span>
        <span class="sa-bar-count">${count} incidents</span>
        </div>
        <div class="sa-bar-track">
        <div class="sa-bar-fill ${cls}" style="width:${pct}%"></div>
        
        </div>
    </div>`;
}

let saCharts = {};

async function initSuperAdminCharts(stats, period) {
    Object.values(saCharts).forEach((c) => c && c.destroy());
    saCharts = {};

    const sb = stats.status_breakdown || {};
    const chartDefaults = {
        font: { family: "'Segoe UI', sans-serif", size: 13 },
        color: "#374151",
    };
    Chart.defaults.font = chartDefaults.font;
    Chart.defaults.color = chartDefaults.color;

    const statusCtx = document.getElementById("saStatusChart");
    if (statusCtx) {
        saCharts.status = new Chart(statusCtx, {
            type: "doughnut",
            data: {
                labels: ["Confirmed", "Pending", "Rejected"],
                datasets: [
                    {
                        data: [sb.confirmed ?? 0, sb.pending ?? 0, sb.false_alarm ?? 0],
                        backgroundColor: ["#e32020", "#2563eb", "#f59e0b"],
                        borderWidth: 3,
                        borderColor: "#fff",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { padding: 16, usePointStyle: true },
                    },
                },
            },
        });
    }

    const timelineCtx = document.getElementById("saTimelineChart");
    if (timelineCtx) {
        const labels = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(
                d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            );
        }

        let dailyData = [0, 0, 0, 0, 0, 0, 0];
        try {
            const r = await fetch("/dashboard/superadmin/stats", {
                headers: dashboardAPI.getAuthHeaders(),
            });
            const d = await r.json();
            if (d.charts && d.charts.daily_counts) dailyData = d.charts.daily_counts;
        } catch (_) { }

        saCharts.timeline = new Chart(timelineCtx, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Accidents",
                        data: dailyData,
                        backgroundColor: (ctx) => {
                            const val = ctx.raw;
                            if (val === Math.max(...dailyData)) return "#dc2626";
                            return "#93c5fd";
                        },
                        borderRadius: 6,
                        borderSkipped: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "#f1f5f9" },
                    },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    const cameraCtx = document.getElementById("saCameraChart");
    if (cameraCtx) {
        let camLabels = [],
            camData = [];
        try {
            const r = await fetch("/cameras/", {
                headers: dashboardAPI.getAuthHeaders(),
            });
            const cameras = await r.json();

            const countRes = await fetch("/dashboard/superadmin/stats", {
                headers: dashboardAPI.getAuthHeaders(),
            });
            const countData = await countRes.json();
            const camStats = countData.charts?.camera_stats || {};

            cameras.forEach((cam) => {
                camLabels.push(`Cam #${cam.cameraid}`);
                camData.push(camStats[cam.cameraid] ?? 0);
            });

            document.getElementById("sa-total-cameras").textContent = cameras.length;
            document.getElementById("sa-active-cameras").textContent = cameras.filter(
                (c) => c.status?.toLowerCase() === "active",
            ).length;
        } catch (_) { }

        saCharts.camera = new Chart(cameraCtx, {
            type: "bar",
            data: {
                labels: camLabels,
                datasets: [
                    {
                        label: "Detections",
                        data: camData,
                        backgroundColor: "#305083",
                        borderRadius: 6,
                        borderSkipped: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: camLabels.length > 6 ? "y" : "x",
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "#f1f5f9" },
                    },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    try {
        const r = await fetch("/contacts/", {
            headers: dashboardAPI.getAuthHeaders(),
        });
        const contacts = await r.json();
        const active = contacts.filter((c) => c.is_active).length;
        document.getElementById("sa-contacts").textContent = active;
    } catch (_) { }

    try {
        const r = await fetch("/dashboard/superadmin/stats", {
            headers: dashboardAPI.getAuthHeaders(),
        });
        const d = await r.json();
        document.getElementById("sa-high-conf").textContent =
            d.metrics?.high_confidence ?? "—";
    } catch (_) { }
}

function setupSATimeFilters() {
    document.querySelectorAll(".sa-filter").forEach((btn) => {
        btn.addEventListener("click", async () => {
            document
                .querySelectorAll(".sa-filter")
                .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const p = btn.dataset.period;
            try {
                const r = await fetch(`/dashboard/time-period-stats?period=${p}`, {
                    headers: dashboardAPI.getAuthHeaders(),
                });
                const d = await r.json();
                if (saCharts.status && d.chart_data) {
                    saCharts.status.data.datasets[0].data = d.chart_data.data;
                    saCharts.status.data.labels = d.chart_data.labels;
                    saCharts.status.update();
                }
            } catch (err) {
                console.error(err);
            }
        });
    });
}

async function renderAdminDashboard(contentEl) {
    contentEl.innerHTML =
        '<div style="padding:2rem;text-align:center;color:#666;">Loading dashboard...</div>';
    try {
        const cameraId = sessionStorage.getItem('selected_camera_id');
        const dashboardData = await dashboardAPI.getAdminStats(cameraId);

        if (!dashboardData || !dashboardData.metrics) {
            throw new Error("Invalid dashboard data received");
        }

        let html = '<div class="dashboard-grid">';
        html += `
        <div class="chart-card" style="grid-column: 1 / -1; display:flex; align-items:center; gap:16px; padding: 1.4rem 2rem;">
            <span style="font-size:0.95rem; font-weight:600; color:#374151; white-space:nowrap;">
                Active Camera
            </span>
            <select id="cameraSelect" style="
                flex:1;
                max-width:280px;
                background:#f8fafc;
                border:1.5px solid #cbd5e1;
                border-radius:0.6rem;
                color:#0f172a;
                font-size:0.95rem;
                font-weight:500;
                padding:8px 14px;
                cursor:pointer;
                outline:none;
                transition: border-color 0.2s;
            ">
                <option disabled>Loading...</option>
            </select>
            <span id="cameraStatusBadge" style="
                padding: 5px 14px;
                border-radius: 9999px;
                font-size: 0.8rem;
                font-weight: 600;
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
                white-space: nowrap;
            ">● Active</span>
        </div>`;
        html += '<div class="metrics-row">';
        html += `<div class="metric-card total-alerts">
                    <div class="metric-label">Total Detection</div>
                    <div class="metric-value">${dashboardData.metrics.total_alerts || 0}</div>
                </div>`;
        html += `<div class="metric-card unverified">
                    <div class="metric-label">Unverified incidents</div>
                    <div class="metric-value">${dashboardData.metrics.unverified_incidents || 0}</div>
                </div>`;
        html += `<div class="metric-card confirmed">
                    <div class="metric-label">Confirmed</div>
                    <div class="metric-value">${dashboardData.metrics.confirmed || 0}</div>
                </div>`;
        html += "</div>";


        html += '<div class="charts-row">';
        html += `<div class="chart-card dark">
                    <h3>Alert status distribution</h3>
                    <div class="time-filters">
                        <button class="filter-btn active" data-filter="24hrs">24hrs</button>
                        <button class="filter-btn" data-filter="7days">7days</button>
                        <button class="filter-btn" data-filter="30days">30days</button>
                    </div>
                    <div class="chart-container">
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>`;
        html += "</div>";

        const incidents = dashboardData.incidents || {};
        html += '<div class="incident-stats">';
        html += "<h3>Incident type stat's</h3>";
        html += '<div class="incident-grid">';
        html += `<div class="incident-item">
                    <div class="incident-label">Fire Incident</div>
                    <div class="incident-value">${incidents.fire_incident || 0}</div>
                </div>`;
        html += `<div class="incident-item">
                    <div class="incident-label">Car incidents</div>
                    <div class="incident-value">${incidents.car_incidents || 0}</div>
                </div>`;
        html += "</div></div>";

        const breakdown = dashboardData.status_breakdown || {
            confirmed: 0,
            pending: 0,
            false_alarm: 0,
            total: 0,
        };
        const total = breakdown.total || 1;
        const statuses = [
            {
                name: "Confirmed Incidents",
                count: breakdown.confirmed || 0,
                color: "progress-resolved",
            },
            {
                name: "Pending Reviews",
                count: breakdown.pending || 0,
                color: "progress-pending",
            },
            {
                name: "Rejected Alarm",
                count: breakdown.false_alarm || 0,
                color: "progress-false",
            },
        ];

        html +=
            '<div class="status-breakdown"><h3>Status Break down</h3><div class="status-items">';
        statuses.forEach((status) => {
            const percentage = total > 0 ? (status.count / total) * 100 : 0;
            html += `<div class="status-item">
                        <div class="status-header">
                            <span class="status-name">${status.name}</span>
                            <span class="status-count">${status.count} incident${status.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${status.color}" style="width:${percentage}%"></div>
                        </div>
                    </div>`;
        });
        html += "</div></div>";
        html += "</div>";

        contentEl.innerHTML = html;
        setTimeout(() => initializeChartsWithData(dashboardData), 100);
        setupTimeFilters();
        await loadAdminCameras();
    } catch (error) {
        console.error("Error rendering admin dashboard:", error);
        contentEl.innerHTML = `<div style="padding:2rem;text-align:center;color:#d32f2f;">
            <h3>Error loading dashboard</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()" 
                style="padding:0.5rem 1rem;background:#2563eb;color:white;border:none;border-radius:0.5rem;cursor:pointer;">
                Retry
            </button>
        </div>`;
    }
}
function updateCameraBadge(status) {
    const badge = document.getElementById('cameraStatusBadge');
    if (!badge) return;
    const styles = {
        active: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', label: '● Active' },
        inactive: { bg: '#fee2e2', color: '#dc2626', border: '#fecaca', label: '● Inactive' },
        maintenance: { bg: '#fef9c3', color: '#a16207', border: '#fde68a', label: '● Maintenance' },
    };
    const s = styles[status?.toLowerCase()] || styles.active;
    badge.textContent = s.label;
    badge.style.background = s.bg;
    badge.style.color = s.color;
    badge.style.borderColor = s.border;
}
async function loadAdminCameras() {
    const select = document.getElementById('cameraSelect');
    if (!select) return;

    try {
        const resp = await fetch('/cameras/my-cameras', {
            headers: dashboardAPI.getAuthHeaders()
        });

        if (!resp.ok) {
            select.innerHTML = '<option disabled>No cameras assigned</option>';

            const badge = document.getElementById('cameraStatusBadge');
            if (badge) {
                badge.textContent = '● Unassigned';
                badge.style.background = '#fee2e2';
                badge.style.color = '#dc2626';
                badge.style.borderColor = '#fecaca';
            }
            return;
        }

        const cameras = await resp.json();
        select.innerHTML = cameras.map(cam =>
            `<option value="${cam.camera_id}" data-status="${cam.status}">
                Camera ${cam.camera_id} — ${cam.status}
            </option>`
        ).join('');

        const saved = sessionStorage.getItem('selected_camera_id');
        const stillValid = saved && cameras.some(cam => cam.camera_id == saved);
        if (stillValid) {
            select.value = saved;
        } else {
            sessionStorage.setItem('selected_camera_id', cameras[0].camera_id);
            select.value = cameras[0].camera_id;
        }

        updateCameraBadge(cameras.find(c => c.camera_id == select.value)?.status);
        select.addEventListener('change', () => {
            const newCameraId = select.value;
            sessionStorage.setItem('selected_camera_id', newCameraId);
            window.dispatchEvent(new CustomEvent('cameraChanged', {
                detail: { cameraId: newCameraId }
            }));
            localStorage.setItem('selected_camera_id', newCameraId);
            const selectedStatus = select.options[select.selectedIndex].dataset.status;
            updateCameraBadge(selectedStatus);
            const contentEl = document.getElementById('dashboard-content');
            if (contentEl) renderAdminDashboard(contentEl);
        });

    } catch (err) {
        console.error('[CAMERA SELECT] Failed:', err);
    }
}

async function renderDashboard() {
    const userRole = getUserRole();
    const contentEl = document.getElementById("dashboard-content");
    if (!contentEl) return;

    if (userRole.includes("super")) {
        await renderSuperAdminDashboard(contentEl);
    } else {
        await renderAdminDashboard(contentEl);
    }
}

let chartInstances = {};
function initializeChartsWithData(dashboardData) {
    try {
        Object.values(chartInstances).forEach((chart) => {
            if (chart) chart.destroy();
        });
        chartInstances = {};
        const chartData = dashboardData.charts || {};

        if (!chartData.alert_distribution) {
            console.error("Chart data missing", chartData);
            return;
        }

        const statusCtx = document.getElementById("statusChart");
        if (statusCtx) {
            chartInstances.status = new Chart(statusCtx, {
                type: "doughnut",
                data: {
                    labels: chartData.alert_distribution.labels || [
                        "Confirmed",
                        "Pending",
                        "Rejected Alarm",
                    ],
                    datasets: [
                        {
                            data: chartData.alert_distribution.data || [0, 0, 0],
                            backgroundColor: ["#e32020", "#3564a1", "#f59e0b"],
                            borderColor: "#ffffff",
                            borderWidth: 2,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                font: { size: 14, family: "'Segoe UI', sans-serif" },
                                padding: 15,
                                usePointStyle: true,
                                color: "#000000",
                            },
                            textAlign: "center",
                        },
                    },
                },
            });
            console.log("Status chart initialized");
        }
    } catch (error) {
        console.error("Error initializing charts:", error);
    }
}

function setupTimeFilters() {
    try {
        document.querySelectorAll(".filter-btn").forEach((btn) => {
            btn.addEventListener("click", async () => {
                document
                    .querySelectorAll(".filter-btn")
                    .forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");

                const period = btn.dataset.filter;
                console.log("Fetching stats for period:", period);

                try {
                    const cameraId = sessionStorage.getItem('selected_camera_id');
                    const periodData = await dashboardAPI.getTimePeriodStats(period, cameraId);
                    console.log("Period data:", periodData);

                    if (chartInstances.status && periodData.chart_data) {
                        chartInstances.status.data.datasets[0].data = periodData.chart_data
                            .data || [0, 0, 0];
                        chartInstances.status.data.labels = periodData.chart_data
                            .labels || ["Confirmed", "Pending", "Rejected Alarm"];
                        chartInstances.status.update();
                    }
                } catch (error) {
                    console.error(`Error fetching stats for ${period}:`, error);
                }
            });
        });
    } catch (error) {
        console.error("Error setting up time filters:", error);
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initializeWelcome();
        renderDashboard();
    });
} else {
    initializeWelcome();
    renderDashboard();
}
