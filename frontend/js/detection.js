let activeView = "center";

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

let syncRunning  = false 
let stopSyncFunc = null

async function startSyncedDetection(videoElement, detectionImg, videoFps) {
    const noFramesMsg  = document.getElementById('noFramesMessage')
    const framesLayout = document.getElementById('framesLayout')

    syncRunning = true

    await fetch('http://127.0.0.1:8000/detection/reset-generator', {
        method: 'POST'
    })

    async function fetchAndSyncFrame() {
        if (!syncRunning) return

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/detection/next-frame?t=${Date.now()}`
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
            const accConf     = parseFloat(response.headers.get('X-Accident-Conf') || '0')

            const blob      = await response.blob()
            const objectUrl = URL.createObjectURL(blob)

            if (detectionImg.src?.startsWith('blob:')) {
                URL.revokeObjectURL(detectionImg.src)
            }

            detectionImg.src = objectUrl

            detectionImg.onload = () => {
                if (framesLayout.style.display === 'none' ||
                    framesLayout.style.display === '') {
                    noFramesMsg.style.display  = "none"
                    framesLayout.style.display = "grid"
                }
                attemptCrop(detectionImg, 0)  
            }

            const targetTime = frameNumber / videoFps
            if (Math.abs(videoElement.currentTime - targetTime) > 0.3) {
                videoElement.currentTime = targetTime
            }
            try { await videoElement.play() } catch(e) {}

            if (accConf >= 0.70) {
                const alertBtn = document.getElementById('alertMessage')
                if (alertBtn) {
                    alertBtn.style.background = '#ef4444'
                    alertBtn.textContent      = `ACCIDENT CONFIDENCE: ${Math.round(accConf * 100)}%`
                }
            }

            if (syncRunning) fetchAndSyncFrame()

        } catch (err) {
            console.error('[SYNC] Error:', err)
            if (syncRunning) setTimeout(fetchAndSyncFrame, 1000)
        }
    }

    fetchAndSyncFrame()
    return () => {
        syncRunning = false; 
        videoElement.pause() 
    }
}


async function loadRecentAccidents() {
    const tbody = document.getElementById("eventTableBody");
    if (!tbody) return;
    try {
        const resp = await fetch("http://127.0.0.1:8000/accidents/recent?limit=10");
        if (!resp.ok) throw new Error("Failed to fetch");
        const data = await resp.json();
        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="no-data">No recent events</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(d => {
            const date = new Date(d.timestamp);
            const timeStr = isNaN(date) ? d.timestamp : 
            date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

            const statusClass = {
                pending:  "status-pending",
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
setInterval(loadRecentAccidents,15000)



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
        const resp = await fetch("http://127.0.0.1:8000/detection/upload-video?camera_id=3", {
            method: "POST",
            body: formData
        });

        if (!resp.ok) {
            const err = await resp.text();
            console.error("[UPLOAD] Failed:", resp.status, err);
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
        navigator.sendBeacon("http://127.0.0.1:8000/detection/clear-video");
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

