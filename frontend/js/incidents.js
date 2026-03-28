function getAuthHeaders() {
    const token = sessionStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

let = isRedirecting=false
async function handleResponse(response) {
    if (response.status === 401) {
        console.warn('Token expired. Redirecting to login...');
        isRedirecting=true
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


const ITEMS_PER_PAGE = 8;
let currentPage = 1;
let totalPages = 1;
let allIncidents = [];


document.addEventListener('DOMContentLoaded', () => {
    fetchIncidents();
});


async function fetchIncidents() {
    showLoading();
    try {
        const cameraId = sessionStorage.getItem('selected_camera_id');
        let url = '/accidents/pending';
        if (cameraId) url += `?camera_id=${cameraId}`;

        const response = await fetch(url, { headers: getAuthHeaders() });
        const data = await handleResponse(response);
        if (!data) return;

        allIncidents = data;
        if (!allIncidents.length) {
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

function openModal(incidentId) {
    window.location.href = `/html/verify_incident.html?id=${incidentId}`;
}

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
    setInterval(async () => {
        try {
            const cameraId = sessionStorage.getItem('selected_camera_id');
            let url = '/accidents/pending';
            if (cameraId) url += `?camera_id=${cameraId}`;

            const response = await fetch(url, { headers: getAuthHeaders() });
            const fresh = await handleResponse(response);
            if (!fresh || fresh.length === 0) return;

            if (JSON.stringify(fresh) !== JSON.stringify(allIncidents)) {
                const scrollPos = window.scrollY;
                allIncidents = fresh;
                totalPages = Math.ceil(allIncidents.length / ITEMS_PER_PAGE);
                renderIncidents();
                renderPagination();
                window.scrollTo(0, scrollPos);
            }
        } catch (err) {
            console.error('Auto-refresh failed:', err);
        }
    }, intervalMs);
}

startAutoRefresh(30000);
