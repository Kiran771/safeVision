// Get incident ID from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const incidentId = urlParams.get('id');

// Load incident data when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadIncidentData();
    setupEventListeners();
});

// Load incident data
async function loadIncidentData() {
    try {
        // Replace with your actual API endpoint
        // const response = await fetch(`/api/incidents/${incidentId}`);
        // const incident = await response.json();
        
        // Mock data for demonstration
        const incident = {
            id: incidentId || 1,
            time: '1:11 PM',
            confidence: 0.90,
            anomalyScore: 0.60,
            originalFrameUrl: '/path/to/original-frame.jpg',
            reconstructedFrameUrl: '/path/to/reconstructed-frame.jpg',
            date: new Date().toLocaleDateString(),
            location: {
                address: 'Main St & 5th Ave',
                zone: 'Downtown District',
                coordinates: '40.7128° N, 74.0060° W'
            }
        };
        
        document.getElementById('incident-time').textContent = incident.time;
        document.getElementById('confidence').textContent = `${Math.round(incident.confidence * 100)}%`;
        
        // Populate location information
        if (incident.location) {
            document.getElementById('location-address').textContent = incident.location.address;
            document.getElementById('location-coords').textContent = incident.location.coordinates;
        }
        
        // Set anomaly score
        setAnomalyScore(incident.anomalyScore);
        
        // Load images (if available)
        loadFrameImages(incident.originalFrameUrl, incident.reconstructedFrameUrl);
        
    } catch (error) {
        console.error('Error loading incident data:', error);
        alert('Failed to load incident data. Please try again.');
    }
}

// Set anomaly score bar
function setAnomalyScore(score) {
    const anomalyFill = document.getElementById('anomaly-fill');
    const anomalyText = document.getElementById('anomaly-score-text');
    const percentage = Math.round(score * 100);
    
    // Set width with animation
    setTimeout(() => {
        anomalyFill.style.width = `${percentage}%`;
    }, 100);
    
    // Change color based on score
    if (score >= 0.7) {
        anomalyFill.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
    } else if (score >= 0.4) {
        anomalyFill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    } else {
        anomalyFill.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
    }
    
    // Update score text
    if (anomalyText) {
        anomalyText.textContent = `Anomaly Score: ${score.toFixed(2)} mse`;
    }
}

// Load frame images
function loadFrameImages(originalUrl, reconstructedUrl) {
    const originalImg = document.getElementById('original-img');
    const reconstructedImg = document.getElementById('reconstructed-img');
    
    // Set image sources if URLs are provided
    if (originalUrl && originalUrl !== '/path/to/original-frame.jpg') {
        originalImg.src = originalUrl;
        originalImg.style.display = 'block';
    } else {
        originalImg.style.display = 'none';
    }
    
    if (reconstructedUrl && reconstructedUrl !== '/path/to/reconstructed-frame.jpg') {
        reconstructedImg.src = reconstructedUrl;
        reconstructedImg.style.display = 'block';
    } else {
        reconstructedImg.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('confirm-btn').addEventListener('click', confirmIncident);
    document.getElementById('reject-btn').addEventListener('click', rejectIncident);
    document.getElementById('cancel-btn').addEventListener('click', cancel);
}

// Confirm incident
async function confirmIncident() {
    const confirmed = confirm('Are you sure you want to CONFIRM this incident?');
    if (!confirmed) return;
    
    try {
        // Replace with your actual API endpoint
        // await fetch(`/api/incidents/${incidentId}/confirm`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' }
        // });
        
        alert('Incident confirmed successfully!');
        
        // Redirect back to verify incidents page
        window.location.href = '/frontend/html/verify.html';
        
    } catch (error) {
        console.error('Error confirming incident:', error);
        alert('Failed to confirm incident. Please try again.');
    }
}

// Reject incident
async function rejectIncident() {
    const confirmed = confirm('Are you sure you want to REJECT this incident?');
    if (!confirmed) return;
    
    try {
        // Replace with your actual API endpoint
        // await fetch(`/api/incidents/${incidentId}/reject`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' }
        // });
        
        alert('Incident rejected successfully!');
        
        // Redirect back to verify incidents page
        window.location.href = '/frontend/html/verify.html';
        
    } catch (error) {
        console.error('Error rejecting incident:', error);
        alert('Failed to reject incident. Please try again.');
    }
}

// Cancel and go back
function cancel() {
    // Go back to verify incidents page
    window.location.href = '/frontend/html/verify.html';
}

// Handle image load errors
document.getElementById('original-img').addEventListener('error', function() {
    this.style.display = 'none';
    this.parentElement.classList.add('loading');
});

document.getElementById('reconstructed-img').addEventListener('error', function() {
    this.style.display = 'none';
    this.parentElement.classList.add('loading');
});