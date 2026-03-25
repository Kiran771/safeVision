function getAuthHeaders() {
    const token = sessionStorage.getItem("access_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

let isRedirecting= false
async function handleResponse(response) {
    if (response.status === 401) {
        if (isRedirecting) return null;
        isRedirecting= true
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
        return data; 
    }
    return data;
}
let activeView = "center";
const detectedFrames = []
const maxFrames = 10

const frameSrcs = {
    center: null,
    top: null,
    corner: null,
    bottom: null,

};

const CROP_REGIONS = {
    top: (w, h) => ({ sx: 0, sy: 0, sw: w, sh: h * 0.33 }),
    corner: (w, h) => ({ sx: w * 0.5, sy: 0, sw: w * 0.5, sh: h * 0.5 }),
    bottom: (w, h) => ({ sx: 0, sy: h * 0.67, sw: w, sh: h * 0.33 }),
};

let syncRunning = false
let stopSyncFunc = null

async function startSyncedDetection(videoElement, detectionImg, videoFps) {
    const noFramesMsg = document.getElementById('noFramesMessage')
    const framesLayout = document.getElementById('framesLayout')

    syncRunning = true

    await fetch('/detection/reset-generator', {
        method: 'POST',
        headers:getAuthHeaders()
        
    })

    async function fetchAndSyncFrame() {
        if (!syncRunning) return

        try {
            const response = await fetch(
                `/detection/next-frame?t=${Date.now()}`,{
                    headers:getAuthHeaders()
                }
            )

            if (response.status === 204) {
                console.log('[SYNC] Detection complete')
                syncRunning = false
                videoElement.pause()
                loadRecentAccidents()
                return
            }

            if (!response.ok) {
                if (syncRunning) setTimeout(fetchAndSyncFrame, 500)
                return
            }

            const frameNumber = parseInt(response.headers.get('X-Frame-Number') || '0')
            const accConf = parseFloat(response.headers.get('X-Accident-Conf') || '0')

            const blob = await response.blob()
            const objectUrl = URL.createObjectURL(blob)

            if (detectionImg.src?.startsWith('blob:') && !detectedFrames.find(f => f.url === detectionImg.src)) {
                URL.revokeObjectURL(detectionImg.src);
            }
            detectionImg.src = objectUrl

            detectedFrames.push({ url: objectUrl, frameNumber, accConf }); if (detectedFrames.length >  maxFrames) { 
                const removed = detectedFrames.shift(); URL.revokeObjectURL(removed.url);  
            }

            detectionImg.onload = () => {
                    if (framesLayout.style.display === 'none' || framesLayout.style.display === '') 
                    {
                        noFramesMsg.style.display = "none"
                        framesLayout.style.display = "grid"
                    }
                    attemptCrop(detectionImg, 0)
                    renderFrameStrip();  
                }

                const targetTime = frameNumber / videoFps
                if (Math.abs(videoElement.currentTime - targetTime) > 0.3) {
                    videoElement.currentTime = targetTime
                }
                try { await videoElement.play() } catch (e) { }

                if (syncRunning) fetchAndSyncFrame()

            } catch (err) {
                console.error('[SYNC] Error:', err)
                console.error('[SYNC] Backend reachable?')
                fetch('/health').then(r => console.log('[HEALTH]', r.status))
                .catch(e => console.error('[HEALTH] Backend down!', e))
                if (syncRunning) setTimeout(fetchAndSyncFrame, 1000)
            }
        }

    fetchAndSyncFrame()
        return () => {
            syncRunning = false;
            videoElement.pause()
        }
    
}

async function loadCurrentSensitivity() {
    try {
        const resp = await fetch('/settings/sensitivity', {
            headers: getAuthHeaders()
        });
        const data = await handleResponse(resp);
        if (!data) return;

        highlightActiveThreshold(data.sensitivity);
    } catch (err) {
        console.error('[THRESHOLD] Failed to load sensitivity:', err);
    }
}

function highlightActiveThreshold(activeLevel) {
    document.querySelectorAll('.threshold-btn').forEach(btn => {
        if (btn.dataset.value === activeLevel) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

async function setSensitivity(level) {
    try {
        const resp = await fetch(`/settings/sensitivity/${level}`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        const data = await handleResponse(resp);
        if (!data) return;

        highlightActiveThreshold(level);
        console.log(`[THRESHOLD] Set to: ${level}`);

    } catch (err) {
        console.error('[THRESHOLD] Failed to update:', err);
    }
}

document.querySelectorAll('.threshold-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const level = btn.dataset.value;
        setSensitivity(level);
    });
});

loadCurrentSensitivity();


function renderFrameStrip() {
    let strip = document.getElementById('detectionStrip');
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'detectionStrip';
        strip.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            max-height: 220px;
            overflow-y: auto;
            padding: 6px;
            background: rgba(0,0,0,0.25);
            border-radius: 8px;
            margin-top: 10px;
        `;
        const framesLayout = document.getElementById('framesLayout');
        framesLayout.parentNode.insertBefore(strip, framesLayout.nextSibling);
    }
    const frame = detectedFrames[detectedFrames.length - 1];
    if (!frame) return;

    if (strip.children.length >= maxFrames) {
        strip.removeChild(strip.firstChild);
    }

    strip.innerHTML = '';   

    detectedFrames.forEach((frame, i) => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            position: relative;
            width: 110px;
            height: 70px;
            flex-shrink: 0;
            border-radius: 5px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid ${frame.accConf >= 0.70 ? '#ef4444' : '#4b5563'};
            transition: transform .15s;
        `;
        wrapper.title = `Frame ${frame.frameNumber} — Conf: ${Math.round(frame.accConf * 100)}%`;
        wrapper.onmouseenter = () => wrapper.style.transform = 'scale(1.06)';
        wrapper.onmouseleave = () => wrapper.style.transform = 'scale(1)';

        const img = document.createElement('img');
        img.src = frame.url;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

        const badge = document.createElement('span');
        badge.textContent = Math.round(frame.accConf * 100) + '%';
        badge.style.cssText = `
            position: absolute;
            bottom: 2px; right: 4px;
            font-size: 10px;
            font-weight: 700;
            color: #fff;
            background: ${frame.accConf >= 0.70 ? '#ef4444' : '#374151'};
            padding: 1px 4px;
            border-radius: 3px;
            pointer-events: none;
        `;

        wrapper.onclick = () => {
            const detectionImg = document.getElementById('detectionStreamImg');
            detectionImg.src   = frame.url;
            activeView         = 'center';
            updateCenterLabel('center');
            strip.querySelectorAll('div').forEach(d => d.style.outline = 'none');
            wrapper.style.outline = '2px solid #60a5fa';
        };

        wrapper.appendChild(img);
        wrapper.appendChild(badge);
        strip.appendChild(wrapper);
    });

    strip.scrollTop = strip.scrollHeight;
}

    async function loadRecentAccidents() {
        const tbody = document.getElementById("eventTableBody");
        if (!tbody) return;
        const camera_id = sessionStorage.getItem("selected_camera_id");

        if (!camera_id) {
            console.warn("No camera selected");
            tableBody.innerHTML = `<tr><td colspan="6">Please select a camera</td></tr>`;
            return;
        }
        try {
            const resp = await fetch(`/accidents/recent?camera_id=${camera_id}`,{headers: getAuthHeaders()});
            const data = await handleResponse(resp);
            if (!data) return;
            if (!data.length) {
                tbody.innerHTML = `<tr><td colspan="4" class="no-data">No recent events</td></tr>`;
                return;
            }
            tbody.innerHTML = data.map(d => {
                const date = new Date(d.timestamp);
                const timeStr = isNaN(date) ? d.timestamp :
                    date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

                const statusClass = {
                    pending: "status-pending",
                    reviewed: "status-reviewed",
                    rejected: "status-rejected",
                }[d.status] || "status-pending";
                const conf = d.confidence != null
                    ? (d.confidence * 100).toFixed(1) + "%"
                    : "—";
                return `
            <tr>
                <td style="text-align:center">${d.accidentid}</td>
                <td style="text-align:center">${timeStr}</td>
                <td style="text-align:center">
                    <span class="status-badge ${statusClass}">${d.status}</span>
                </td>
                <td style="text-align:center">${conf}</td>
            </tr>`;
            }).join("");
        } catch (err) {
            console.error("[TABLE] Failed to load accidents:", err);
            tbody.innerHTML = `<tr><td colspan="4" class="no-data">Failed to load events</td></tr>`;
        }
    }

    loadRecentAccidents();
    setInterval(loadRecentAccidents, 15000)

    async function loadStats() {
        const camera_id = sessionStorage.getItem("selected_camera_id");

        if (!camera_id) {
            console.warn("No camera selected");
            tableBody.innerHTML = `<tr><td colspan="6">Please select a camera</td></tr>`;
            return;
        }
        try {
            const resp = await fetch(`/accidents/stats?camera_id=${camera_id}`,{
                headers: getAuthHeaders()
            });
            const data = await handleResponse(resp);
            if (!data) return;
            const unverified = document.getElementById('unverifiedCount');
            const detected   = document.getElementById('detectedCount');
            if (unverified) unverified.textContent = data.pending;
            if (detected)   detected.textContent   = data.confirmed;
        } catch (err) {
            console.error('[STATS] Failed:', err);
        }
    }

    loadStats();
    setInterval(loadStats, 15000);

    document.getElementById("startDetection").addEventListener("click", async () => {
        console.clear();
        console.log("[START] Detection button clicked");
        const videoUpload = document.getElementById("videoUpload");
        const videoElement = document.getElementById("cameraFeed");
        const detectionImg = document.getElementById("detectionStreamImg");
        const fpsElement = document.getElementById("videoFps");
        const noFramesMsg = document.getElementById("noFramesMessage");
        const overlay = document.getElementById("videoOverlay");
        const framesLayout = document.getElementById("framesLayout");

        if (overlay) overlay.style.display = "none";
        detectionImg.src = "";
        framesLayout.style.display = "none";
        noFramesMsg.style.display = "block";
        noFramesMsg.textContent = "No accident detected yet";

        detectedFrames.length = 0;
        const oldStrip = document.getElementById('detectionStrip');
        if (oldStrip) oldStrip.remove();

        if (!videoUpload.files.length) {
            alert("Select a video first!");
            return;
        }

        const file = videoUpload.files[0];
        console.log("[FILE] Selected:", file.name);

        videoElement.src = URL.createObjectURL(file);

        // Upload video
        const formData = new FormData();
        formData.append("file", file);

        let videoFps = 30;
        console.log("[UPLOAD] Starting...");

        try {
            const cameraId = sessionStorage.getItem('selected_camera_id');
            if (!cameraId) {
                alert("No camera selected. Please go to the dashboard and select a camera first.");
                return;
            }
            const resp = await fetch(`/detection/upload-video?camera_id=${cameraId}`,{
                method: "POST",
                body: formData,
                headers:getAuthHeaders()
            });

            if (!resp.ok) {
                const err = await resp.text();
                alert("Upload failed");
                return;
            }
            const data = await resp.json();
            videoFps = Math.round(data.fps || 30);
            console.log("[UPLOAD] OK → FPS:", videoFps);
        } catch (err) {
            console.error("[UPLOAD] Error:", err);
            alert("Cannot connect to backend");
            return;
        }

        fpsElement.textContent = `${videoFps} fps`;

        noFramesMsg.textContent = "Analyzing video... (this may take a while)";

        await new Promise(r => setTimeout(r, 500));

        stopSyncFunc = await startSyncedDetection(videoElement, detectionImg, videoFps)
        videoElement.onended = () => {
            console.log("[VIDEO] Playback ended");
            if (overlay) overlay.style.display = "flex";

        };

        videoElement.onplay = () => {
            if (overlay) overlay.style.display = "none";
        };

        window.addEventListener("beforeunload", () => {
            if (stopSyncFunc) stopSyncFunc()
            navigator.sendBeacon("/detection/clear-video");
        });
    });

    function attemptCrop(imgEl, attempt) {
        const w = imgEl.naturalWidth || imgEl.offsetWidth;
        const h = imgEl.naturalHeight || imgEl.offsetHeight;
        if (!w || !h) {
            if (attempt < 15) {
                setTimeout(() => attemptCrop(imgEl, attempt + 1), 50);

            }
            else {
                console.warn("[CROP] No dimensions after retries, skipping");
            }
            return;

        }
        frameSrcs.center = imgEl.src;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        Object.entries(CROP_REGIONS).forEach(([view, regionFn]) => {

            const { sx, sy, sw, sh } = regionFn(w, h);
            canvas.width = Math.round(sw);
            canvas.height = Math.round(sh);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(
                imgEl,
                Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh),
                0, 0, canvas.width, canvas.height
            );
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
            frameSrcs[view] = dataUrl;
            setThumbImage(view + "Frame", dataUrl, view);
            console.log(`[CROP] ${view} ${canvas.width}x${canvas.height}`);

        });

    }

    function resetFrames() {
        Object.keys(frameSrcs).forEach(k => frameSrcs[k] = null);
        ["topFrame", "cornerFrame", "bottomFrame"].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const img = el.querySelector("img");
            if (img) img.remove();
            el.classList.add("empty");
            el.style.cursor = "default";
            el.onclick = null;
        });
        updateCenterLabel("center");
        const cf = document.getElementById("centerFrame");
        if (cf) cf.classList.remove("is-crop");

    }
    function setThumbImage(frameId, src, view) {
        const el = document.getElementById(frameId);
        if (!el || !src) return;
        let img = el.querySelector("img");
        if (!img) {
            img = document.createElement("img");
            img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;";
            el.appendChild(img);
        }
        img.src = src;
        img.alt = view + " view";
        el.classList.remove("empty");
        el.style.cursor = "pointer";
        el.onclick = () => swapToCenter(view);
    }

    function swapToCenter(view) {
        if (view === activeView) return;
        const centerImg = document.getElementById("detectionStreamImg");

        frameSrcs[activeView] = centerImg.src;
        centerImg.src = frameSrcs[view];
        activeView = view;
        updateCenterLabel(view);
        const cf = document.getElementById("centerFrame");
        if (cf) cf.classList.toggle("is-crop", view !== "center");
        console.log("[SWAP] Center now showing:", view);
    }

    function updateCenterLabel(view) {
        const label = document.querySelector("#centerFrame .frame-view-label");
        if (!label) return;
        const names = {
            center: "Center view",
            top: "Top view",
            corner: "Corner view",
            bottom: "Bottom view"
        };
        label.textContent = names[view] || "Center view";

    }

    function openFrameModal() {
        const src = document.getElementById("detectionStreamImg").src;
        if (!src) return;
        document.getElementById("modalFullImg").src = src;
        const label = document.getElementById("modalViewLabel");
        if (label) {
            label.textContent = activeView.charAt(0).toUpperCase() + activeView.slice(1) + " View — Full";
        }
        document.getElementById("frameModalOverlay").classList.add("open");

    }

    function closeFrameModal() {
        document.getElementById("frameModalOverlay").classList.remove("open");
    }

    function handleOverlayClick(e) {
        if (e.target === document.getElementById("frameModalOverlay")) {
            closeFrameModal();
        }
    }
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeFrameModal();
    });

