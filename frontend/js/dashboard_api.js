// DashboardAPI class to handle all API interactions for the dashboard page, 
// including fetching stats, pending incidents, and verifying/rejecting incidents.
class DashboardAPI {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        console.log('DashboardAPI initialized with baseURL:', this.baseURL || '(root)');
    }

    getAuthHeaders() {
        const token = sessionStorage.getItem("access_token");

        if (!token) {
            window.location.href = "/html/login.html";
            throw new Error(' No token found.')
        }

        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        };
    }
    async handleResponse(response) {
        if (response.status === 401) {
            console.warn('Token expired or unauthorized. Redirecting to login...');
            sessionStorage.clear();
            window.location.href = '/html/login.html';
            return;
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    async getAdminStats(cameraId = null) {
        try {
            const url = cameraId
                ? `${this.baseURL}/dashboard/admin/stats?camera_id=${cameraId}`
                : `${this.baseURL}/dashboard/admin/stats`;
            const response = await fetch(url, { headers: this.getAuthHeaders() });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            throw error;
        }
    }

    async getSuperadminStats() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/superadmin/stats`, {
                headers: this.getAuthHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching superadmin stats:', error);
            throw error;
        }
    }

    async getPendingIncidents() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/pending-incidents`, {
                headers: this.getAuthHeaders()

            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('Error fetching pending incidents:', error);
            throw error;
        }
    }

    async getTimePeriodStats(period = '7days', cameraId = null) {
        try {
            const url = cameraId
                ? `${this.baseURL}/dashboard/time-period-stats?period=${period}&camera_id=${cameraId}`
                : `${this.baseURL}/dashboard/time-period-stats?period=${period}`;
            const response = await fetch(url, { headers: this.getAuthHeaders() });
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`Error fetching stats for ${period}:`, error);
            throw error;
        }
    }


    async getCameraStats(cameraId) {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/camera-stats/${cameraId}`, {
                headers: this.getAuthHeaders()
            });
            return await this.handleResponse(response);
            
        } catch (error) {
            console.error(`Error fetching camera ${cameraId} stats:`, error);
            throw error;
        }
    }

    async verifyIncident(incidentId) {
        try {
            const response = await fetch(`${this.baseURL}/accidents/${incidentId}/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                }
            });
            return await this.handleResponse(response);

        } catch (error) {
            console.error(`Error verifying incident ${incidentId}:`, error);
            throw error;
        }
    }

    async rejectIncident(incidentId) {
        try {
            const response = await fetch(`${this.baseURL}/accidents/${incidentId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                }
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`Error rejecting incident ${incidentId}:`, error);
            throw error;
        }
    }

}

const dashboardAPI = new DashboardAPI('');

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardAPI;
}