function getUserRole() {
    const adminConfig = window.ADMIN_HEADER_CONFIG || {};
    const userConfig = window.HEADER_CONFIG || {};
    let storedUser = {};

    try {
        storedUser = JSON.parse(sessionStorage.getItem('user')) || {};
    } catch (e) { }
    
    const role = (
        adminConfig.role ||
        userConfig.role ||
        storedUser.role ||
        sessionStorage.getItem('role') || 'Admin'
    ).toLowerCase();
    
    return role;
}

function initializeWelcome() {
    let storedUser = {};
    let userName = 'User';
    let greeting = '';
    
    try {
        storedUser = JSON.parse(sessionStorage.getItem('user')) || {};
        userName = storedUser.username || storedUser.name || 'User';
    } catch (e) {}
    const hour = new Date().getHours();
    if (hour < 12) {
        greeting = 'Good Morning,';
    } else if (hour < 18) {
        greeting = 'Good Afternoon,';
    } else {
        greeting = 'Good Evening,';
    }
    const greetingEl = document.getElementById('welcome-greeting');
    const nameEl = document.getElementById('welcome-name');
    if (greetingEl) {
        greetingEl.textContent = greeting;
    }
    if (nameEl) {
        nameEl.textContent = userName;
    }
    console.log(`Welcome message set: ${greeting}, ${userName}`);
}

async function renderDashboard() {
    const userRole = getUserRole();
    console.log('User Role:', userRole);
    const contentEl = document.getElementById('dashboard-content');
    if (!contentEl) {
        console.error('dashboard-content element not found');
        return;
    }
    
    // Show loading state
    contentEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Loading dashboard...</div>';
    
    try {
        // Fetch data based on role
        let dashboardData;
        
        console.log('Fetching dashboard data...');
        
        if (userRole.toLowerCase().includes('Super Admin')) {
            console.log('Loading SuperAdmin stats...');
            dashboardData = await dashboardAPI.getSuperadminStats();
        } else {
            console.log('Loading Admin stats...');
            dashboardData = await dashboardAPI.getAdminStats();
        }
        
        console.log('Dashboard Data Received:', dashboardData);
        
        // Validate data exists
        if (!dashboardData || !dashboardData.metrics) {
            throw new Error('Invalid dashboard data received');
        }
        
        // Build dashboard HTML
        let html = '<div class="dashboard-grid">';
        
        // Metrics Row
        html += '<div class="metrics-row">';
        
        html += `
            <div class="metric-card total-alerts">
                <div class="metric-label">Total Alerts</div>
                <div class="metric-value">${dashboardData.metrics.total_alerts || 0}</div>
            </div>
        `;

        html += `
            <div class="metric-card unverified">
                <div class="metric-label">Unverified incidents</div>
                <div class="metric-value">${dashboardData.metrics.unverified_incidents || 0}</div>
            </div>
        `;
        
        html += '</div>';

        html += `
            <div class="resolved-card-row">
                <div class="resolved-card">
                    <div class="resolved-content">
                        <div class="metric-label">Confirmed</div>
                        <div class="metric-value">${dashboardData.metrics.confirmed || 0} <img src="/resources/confirmed.png" alt="Confirmed" class="resolved-icon-image"></div>
                        
                    </div>
                </div>
            </div>
        `;
        
        // Charts Row
        html += '<div class="charts-row">';

        // Alert Status Distribution Chart
        html += `
            <div class="chart-card dark">
                <h3>Alert status distribution</h3>
                <div class="time-filters">
                    <button class="filter-btn active" data-filter="24hrs">24hrs</button>
                    <button class="filter-btn" data-filter="7days">7days</button>
                    <button class="filter-btn" data-filter="30days">30days</button>
                </div>
                <div class="chart-container">
                    <canvas id="statusChart"></canvas>
                </div>
            </div>
        `;
        html += '</div>';

        // Incident Stats
        html += '<div class="incident-stats">';
        html += '<h3>Incident type stat\'s</h3>';
        html += '<div class="incident-grid">';

        const incidents = dashboardData.incidents || {};

        html += `
            <div class="incident-item">
                <div class="incident-label">Fire Incident</div>
                <div class="incident-value">${incidents.fire_incident || 0}</div>
            </div>
        `;

        html += `
            <div class="incident-item">
                <div class="incident-label">Car incidents</div>
                <div class="incident-value">${incidents.car_incidents || 0}</div>
            </div>
        `;
        
        html += '</div></div>';

        // Status Breakdown
        html += '<div class="status-breakdown">';
        html += '<h3>Status Break down</h3>';
        html += '<div class="status-items">';

        const breakdown = dashboardData.status_breakdown || { confirmed: 0, pending: 0, false_alarm: 0, total: 0 };
        const total = breakdown.total || 1;

        const statuses = [
            { name: 'Confirmed Incidents', count: breakdown.confirmed || 0, color: 'progress-resolved' },
            { name: 'Pending Reviews', count: breakdown.pending || 0, color: 'progress-pending' },
            { name: 'False Alarm', count: breakdown.false_alarm || 0, color: 'progress-false' }
        ];

        statuses.forEach(status => {
            const percentage = total > 0 ? (status.count / total) * 100 : 0;
            html += `
                <div class="status-item">
                    <div class="status-header">
                        <span class="status-name">${status.name}</span>
                        <span class="status-count">${status.count} incident${status.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${status.color}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }); 

        html += '</div></div>';
        html += '</div>';
        
        contentEl.innerHTML = html;
        console.log('Dashboard HTML rendered successfully');

        // Initialize charts with real data
        setTimeout(() => initializeChartsWithData(dashboardData), 100);
        
        // Setup time filters
        setupTimeFilters();
        
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        console.error('Error stack:', error.stack);
        
        contentEl.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #d32f2f;">
                <h3>Error loading dashboard</h3>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}


let chartInstances = {};

function initializeChartsWithData(dashboardData) {
    try {
        Object.values(chartInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
        chartInstances = {};
        const chartData = dashboardData.charts || {};
        
        if (!chartData.pending_reviews || !chartData.alert_distribution) {
            console.error('Chart data missing', chartData);
            return;
        }


        // Status Distribution Chart
        const statusCtx = document.getElementById('statusChart');
        if (statusCtx) {
            chartInstances.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: chartData.alert_distribution.labels || ['Confirmed', 'Pending', 'False Alarm'],
                    datasets: [{
                        data: chartData.alert_distribution.data || [0, 0, 0],
                        backgroundColor: ['#ef4444', '#1e40af', '#10b981'],
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { size: 12, family: "'Segoe UI', sans-serif" },
                                padding: 15,
                                usePointStyle: true,
                                color: '#ffffff'
                            }
                        }
                    }
                }
            });
            console.log('Status chart initialized');
        }
    } catch (error) {
        console.error('Error initializing charts:', error);
    }
}

function setupTimeFilters() {
    try {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const period = btn.dataset.filter;
                console.log('Fetching stats for period:', period);
                
                try {
                    const periodData = await dashboardAPI.getTimePeriodStats(period);
                    console.log('Period data:', periodData);
                    
                    if (chartInstances.status && periodData.chart_data) {
                        chartInstances.status.data.datasets[0].data = periodData.chart_data.data || [0, 0, 0];
                        chartInstances.status.data.labels = periodData.chart_data.labels || ['Confirmed', 'Pending', 'False Alarm'];
                        chartInstances.status.update();
                    }
                } catch (error) {
                    console.error(`Error fetching stats for ${period}:`, error);
                }
            });
        });
    } catch (error) {
        console.error('Error setting up time filters:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Rendering Dashboard');
    initializeWelcome();
    renderDashboard();
    
});

if (document.readyState !== 'loading') {
    console.log('DOM already loaded - Rendering Dashboard immediately');
    initializeWelcome();
    renderDashboard();
}