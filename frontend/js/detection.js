document.getElementById("startDetection").addEventListener("click", async () => {
    console.clear();
    console.log("[START] Detection button clicked");

    // Get all required elements
    const videoUpload = document.getElementById("videoUpload");
    const videoElement = document.getElementById("cameraFeed");
    const detectionImg = document.getElementById("detectionStreamImg");
    const fpsElement = document.getElementById("videoFps");
    const noFramesMessage = document.getElementById("noFramesMessage");
    const overlay = document.getElementById("videoOverlay");
    const streamSection = document.getElementById("streamActiveSection");


    // Reset UI state
    if (overlay) overlay.style.display = "none";
    streamSection.style.display = "none";    
    detectionImg.src = "";
    detectionImg.style.display = "none";
    noFramesMessage.style.display = "block";
    noFramesMessage.textContent = "No accident detected yet";

    if (!videoUpload.files.length) {
        alert("Select a video first!");
        return;
    }

    const file = videoUpload.files[0];
    console.log("[FILE] Selected:", file.name);

    // Play original video
    videoElement.src = URL.createObjectURL(file);
    videoElement.play().catch(e => console.warn("[VIDEO] Play error:", e));

    // Upload video
    const formData = new FormData();
    formData.append("file", file);

    let videoFps = 30;
    console.log("[UPLOAD] Starting...");

    try {
        const resp = await fetch("http://127.0.0.1:8000/detection/upload-video", {
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

    // Show analyzing message
    noFramesMessage.textContent = "Analyzing video... (this may take a while)";

    await new Promise(r => setTimeout(r, 500));

    // Start stream
    let streamActive = true;
    let anyFrameReceived = false;

    try {
        const streamUrl = `http://127.0.0.1:8000/detection/stream-detection?${Date.now()}`;
        console.log("[STREAM] Loading:", streamUrl);

        detectionImg.src = streamUrl;

        detectionImg.onload = () => {
            console.log("[DETECTED] First frame received");
            anyFrameReceived = true;
            noFramesMessage.style.display = "none";
            streamSection.style.display = "block"; 
            detectionImg.style.display = "block";
        };

        detectionImg.onerror = () => {
            console.warn("[STREAM] Image load error");
            if (!anyFrameReceived) {
                noFramesMessage.textContent = "Error loading detection stream";
            }
        };

    } catch (err) {
        console.error("[STREAM] Setup error:", err);
        noFramesMessage.textContent = "Detection failed to start";
        streamActive = false;
    }

    // When original video ends
    videoElement.onended = () => {
        console.log("[VIDEO] Playback ended");

        if (overlay) overlay.style.display = "flex";

        // Do NOT show "no accident" yet — wait for stream to finish
        // We check streamActive in the interval below
    };

    // Hide overlay when playing again
    videoElement.onplay = () => {
        if (overlay) overlay.style.display = "none";
    };

    // Detect when backend stream actually ends
    const checkStreamEnd = setInterval(() => {
        // If we've received at least one frame OR stream has stopped
        if (anyFrameReceived || !streamActive) {
            clearInterval(checkStreamEnd);
            console.log("[STREAM] Processing completed (no more frames expected)");

            if (!anyFrameReceived) {
                noFramesMessage.textContent = "Analysis complete – No accident detected";
                noFramesMessage.style.display = "block";
            }
        }
    }, 2000); 

    // Cleanup on page unload or new click
    window.addEventListener('beforeunload', () => clearInterval(checkStreamEnd));
});