// Configuration
const ITEMS_PER_PAGE = 8; 
let currentPage = 1;
let totalPages = 1;
let allIncidents = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    fetchIncidents();
});

// Fetch incidents from API
async function fetchIncidents() {
    showLoading();

    try {
        const response = await fetch('http://127.0.0.1:8000/accidents/');
        if (!response.ok) throw new Error('Failed to fetch accidents');

        allIncidents = await response.json();

        // Show no data if empty
        if (!allIncidents || allIncidents.length === 0) {
            showNoData();
            return;
        }

        totalPages = Math.ceil(allIncidents.length / ITEMS_PER_PAGE);
        renderIncidents();
        renderPagination();
        hideLoading();
    } catch (error) {
        console.error('Error fetching incidents:', error);
        showNoData();
    }
}

// Render incidents cards
function renderIncidents() {
    const grid = document.getElementById('incidents-grid');
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageIncidents = allIncidents.slice(startIndex, endIndex);

    if (!pageIncidents || pageIncidents.length === 0) {
        showNoData();
        return;
    }

    grid.innerHTML = pageIncidents.map(incident => `
        <div class="incident-card" onclick="openModal(${incident.accidentid})">
            <div class="incident-id">Accident ID: ${incident.accidentid}</div>
            <div class="incident-info">
                <div class="info-item"><span class="info-label">Time:</span> ${incident.timestamp ? new Date(incident.timestamp).toLocaleTimeString() : 'Unknown'}</div>
                <div class="info-item"><span class="info-label">Confidence:</span> ${incident.confidence ? `${Math.round(incident.confidence * 100)}%` : 'N/A'}</div>
                <div class="info-item"><span class="info-label">Location:</span> ${incident.location || 'Unknown'}</div>
                <div class="info-item"><span class="info-label">Status:</span> ${incident.status}</div>
            </div>
            <button class="verify-button" onclick="event.stopPropagation(); openModal(${incident.accidentid})">
                View & Verify
            </button>
        </div>
    `).join('');
}

// Pagination controls
function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    let paginationHTML = `
        <button onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>First</button>
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
    `;

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) startPage = Math.max(1, endPage - maxVisiblePages + 1);

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }

    paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        <button onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>Last</button>
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Open single incident page
function openModal(incidentId) {
    window.location.href = `/frontend/html/verify_incident.html?id=${incidentId}`;
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


function startAutoRefresh(intervalMs = 30000) {
    setInterval(() => {
        const scrollPos = window.scrollY;
        fetchIncidents().then(() => window.scrollTo(0, scrollPos));
    }, intervalMs);
}

startAutoRefresh(30000);
