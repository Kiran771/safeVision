document.getElementById("startDetection").addEventListener("click", async () => {
    const videoUpload = document.getElementById("videoUpload");
    if (!videoUpload.files.length) return alert("Select a video first!");

    const file = videoUpload.files[0];

    // Play uploaded video in main video container
    const videoElement = document.getElementById("cameraFeed");
    const videoURL = URL.createObjectURL(file);
    videoElement.src = videoURL;
    videoElement.load();
    videoElement.play();

    //  Clear previous frames
    const framesContainer = document.getElementById("detectionFramesContainer");
    framesContainer.innerHTML = "";

    //  Send video to server for accident frame detection
    const formData = new FormData();
    formData.append("video", file);

    try {
        const response = await fetch("/detection/detect-accident", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Detection API failed");

        const reader = response.body.getReader();
        let buffer = new Uint8Array();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Append incoming chunks to buffer
            const temp = new Uint8Array(buffer.length + value.length);
            temp.set(buffer, 0);
            temp.set(value, buffer.length);
            buffer = temp;

            // Try to extract JPEG frame from buffer
            const start = buffer.indexOf(0xFF);
            const end = buffer.indexOf(0xD9, start);
            if (start !== -1 && end !== -1) {
                const frameBytes = buffer.slice(start, end + 1);
                const img = document.createElement("img");
                img.src = URL.createObjectURL(new Blob([frameBytes], { type: "image/jpeg" }));
                img.className = "detection-frame";
                framesContainer.appendChild(img);

                // Remove used bytes
                buffer = buffer.slice(end + 1);
            }
        }
    } catch (err) {
        console.error("Error streaming accident frames:", err);
    }
});
