class DashboardAPI {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        console.log('DashboardAPI initialized with baseURL:', this.baseURL || '(root)');
    }
    async getAdminStats() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/admin/stats`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            throw error;
        }
    }

    async getSuperadminStats() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/superadmin/stats`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching superadmin stats:', error);
            throw error;
        }
    }

    async getPendingIncidents() {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/pending-incidents`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching pending incidents:', error);
            throw error;
        }
    }

    async getTimePeriodStats(period = '7days') {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/time-period-stats?period=${period}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching stats for ${period}:`, error);
            throw error;
        }
    }


    async getCameraStats(cameraId) {
        try {
            const response = await fetch(`${this.baseURL}/dashboard/camera-stats/${cameraId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
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
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
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
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
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