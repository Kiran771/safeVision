let = isRedirecting = false
function getAuthHeaders() {
    const token = sessionStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function handleResponse(response) {
    if (response.status === 401) {
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

const urlParams = new URLSearchParams(window.location.search);
const incidentId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    loadIncidentData();
    setupEventListeners();
});

async function loadIncidentData() {
    try {
        const response = await fetch(`/accidents/${incidentId}`, {
            headers: getAuthHeaders()
        });
        const incident = await handleResponse(response);
        if (!incident) return;

        document.getElementById('incident-time').textContent = incident.timestamp
            ? new Date(incident.timestamp).toLocaleTimeString()
            : 'Unknown';
        document.getElementById('confidence').textContent = incident.confidence
            ? `${Math.round(incident.confidence * 100)}%`
            : 'N/A';

        if (incident.location) {
            document.getElementById('location-address').textContent = incident.location.address || incident.location;
        }

        setConfidenceBar(incident.confidence || 0)
        loadFrameImage(incident.frame_path)

    } catch (error) {
        console.error('Error loading incident data:', error);
        alert(`Failed to load incident data: ${error.message}`);
    }
}



function setConfidenceBar(confidence) {
    const fill = document.getElementById('confidence-fill')
    const textEl = document.getElementById('confidence-score-text')
    const percentage = Math.round(confidence * 100)

    setTimeout(() => { fill.style.width = `${percentage}%` }, 100)

    if (confidence >= 0.7) {
        fill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
    } else if (confidence >= 0.4) {
        fill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
    } else {
        fill.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
    }
    if (textEl) {
        textEl.textContent = `Confidence: ${percentage}%`
    }
}


async function loadFrameImage(frameUrl) {
    const originalImg = document.getElementById('original-img');
    if (!frameUrl) {
        originalImg.style.display = 'none';
        return;
    }
    try {
        const response = await fetch(
            `/accidents/frame-image?path=${encodeURIComponent(frameUrl)}`,
            { headers: getAuthHeaders() }
        );
        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = '/html/login.html';
            return;
        }
        if (!response.ok) throw new Error('Image load failed');
        const blob = await response.blob();
        originalImg.src = URL.createObjectURL(blob);
        originalImg.style.display = 'block';
    } catch (err) {
        console.error('Failed to load frame image:', err);
        originalImg.style.display = 'none';
    }
}

function setupEventListeners() {
    document.getElementById('confirm-btn').addEventListener('click', confirmIncident);
    document.getElementById('reject-btn').addEventListener('click', rejectIncident);
    document.getElementById('cancel-btn').addEventListener('click', cancel);
}

async function confirmIncident() {
    const confirmed = confirm('Are you sure you want to CONFIRM this incident?');
    if (!confirmed) return;

    try {
        const response = await fetch(`/accidents/${incidentId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });

        const result = await handleResponse(response);
        if (!result) return;

        if (!response.ok) {
            throw new Error(result?.detail || 'Failed to confirm incident');
        }
        alert('Incident confirmed successfully!');

        window.location.href = '/html/verify.html';
    } catch (error) {
        console.error('Error confirming incident:', error);
        alert(`Failed to confirm incident: ${error.message}`);
    }
}


async function rejectIncident() {
    const confirmed = confirm('Are you sure you want to REJECT this incident?');
    if (!confirmed) return;

    try {
        const response = await fetch(`/accidents/${incidentId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });

        const result = await handleResponse(response);
        if (!result) return;

        if (!response.ok) {
            throw new Error(result?.detail || 'Failed to reject incident');
        }

        alert('Incident rejected successfully!');
        window.location.href = '/html/verify.html';
    } catch (error) {
        console.error('Error rejecting incident:', error);
        alert(`Failed to reject incident: ${error.message}`);
    }
}

function cancel() {
    window.location.href = '/html/verify.html';
}

document.getElementById('original-img').addEventListener('error', function () {
    this.style.display = 'none';
    this.parentElement.classList.add('loading');
});