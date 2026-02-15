// Configuration
const ITEMS_PER_PAGE = 8; // 2 rows x 4 columns
let currentPage = 1;
let totalPages = 1;
let allIncidents = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    fetchIncidents();
    setupModalEvents();
});

// Fetch incidents from API or use mock data
async function fetchIncidents() {
    showLoading();
    
    try {
        // Replace this with your actual API endpoint
        // const response = await fetch('/api/incidents');
        // const data = await response.json();
        // allIncidents = data.incidents;
        
        // Mock data for demonstration
        allIncidents = generateMockIncidents(25); // Generate 25 incidents for demo
        
        totalPages = Math.ceil(allIncidents.length / ITEMS_PER_PAGE);
        renderIncidents();
        renderPagination();
        hideLoading();
    } catch (error) {
        console.error('Error fetching incidents:', error);
        showNoData();
    }
}

// Generate mock incident data
function generateMockIncidents(count) {
    const incidents = [];
    const times = ['12:43 PM', '1:15 PM', '2:30 PM', '3:45 PM', '4:20 PM', '5:10 PM'];
    
    for (let i = 1; i <= count; i++) {
        incidents.push({
            id: i,
            time: times[Math.floor(Math.random() * times.length)],
            confidence: (0.85 + Math.random() * 0.14).toFixed(2),
            location: `Location ${i}`,
            status: 'pending',
            date: new Date().toLocaleDateString(),
            videoUrl: '#',
            imageUrl: '#'
        });
    }
    
    return incidents;
}

// Render incidents for current page
function renderIncidents() {
    const grid = document.getElementById('incidents-grid');
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageIncidents = allIncidents.slice(startIndex, endIndex);
    
    if (pageIncidents.length === 0) {
        showNoData();
        return;
    }
    
    grid.innerHTML = pageIncidents.map(incident => `
        <div class="incident-card" onclick="openModal(${incident.id})">
            <div class="incident-id">Accident Id: ${incident.id}</div>
            <div class="incident-info">
                <div class="info-item">
                    <span class="info-label">Time:</span> ${incident.time}
                </div>
                <div class="info-item">
                    <span class="info-label">Confidence:</span> ${incident.confidence}
                </div>
            </div>
            <button class="verify-button" onclick="event.stopPropagation(); openModal(${incident.id})">
                View & verify
            </button>
        </div>
    `).join('');
}

// Render pagination controls
function renderPagination() {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    let paginationHTML = `
        <button onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>
            First
        </button>
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            Previous
        </button>
    `;
    
    // Show page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button 
                onclick="changePage(${i})" 
                class="${i === currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }
    
    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next
        </button>
        <button onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
            Last
        </button>
        <span class="page-info">Page ${currentPage} of ${totalPages}</span>
    `;
    
    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    
    currentPage = page;
    renderIncidents();
    renderPagination();
    
    // Scroll to top of incidents
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Modal functions
function setupModalEvents() {
    const modal = document.getElementById('incident-modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function openModal(incidentId) {
    // Redirect to the verify incident detail page
    window.location.href = `/frontend/html/verify_incident.html?id=${incidentId}`;
}

function closeModal() {
    const modal = document.getElementById('incident-modal');
    modal.style.display = 'none';
}

async function verifyIncident(incidentId) {
    try {
        // Replace with actual API call
        // await fetch(`/api/incidents/${incidentId}/verify`, { method: 'POST' });
        
        // Update local data
        const incident = allIncidents.find(i => i.id === incidentId);
        if (incident) {
            incident.status = 'verified';
        }
        
        alert(`Incident ${incidentId} has been verified successfully!`);
        closeModal();
        renderIncidents();
    } catch (error) {
        console.error('Error verifying incident:', error);
        alert('Failed to verify incident. Please try again.');
    }
}

async function rejectIncident(incidentId) {
    try {
        // Replace with actual API call
        // await fetch(`/api/incidents/${incidentId}/reject`, { method: 'POST' });
        
        // Update local data
        const incident = allIncidents.find(i => i.id === incidentId);
        if (incident) {
            incident.status = 'rejected';
        }
        
        alert(`Incident ${incidentId} has been rejected.`);
        closeModal();
        renderIncidents();
    } catch (error) {
        console.error('Error rejecting incident:', error);
        alert('Failed to reject incident. Please try again.');
    }
}

// Utility functions
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('incidents-grid').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
    document.getElementById('no-data').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('incidents-grid').style.display = 'grid';
}

function showNoData() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('incidents-grid').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
    document.getElementById('no-data').style.display = 'block';
}

// Real-time updates (optional - if you want to poll for new incidents)
function startAutoRefresh(intervalMs = 30000) {
    setInterval(() => {
        const currentScroll = window.scrollY;
        fetchIncidents().then(() => {
            window.scrollTo(0, currentScroll);
        });
    }, intervalMs);
}


startAutoRefresh(30000);