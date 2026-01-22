let streamActive = false;

// Get elements
const webcamStream = document.getElementById('webcamStream');
const toggleStreamBtn = document.getElementById('toggleStream');
const captureBtn = document.getElementById('captureBtn');

// Toggle webcam stream
toggleStreamBtn.addEventListener('click', () => {
    if (!streamActive) {
        // Start stream
        webcamStream.style.display = 'block';
        streamActive = true;
        
        // Update button
        toggleStreamBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="6" y="4" width="3" height="12" fill="white"/>
                <rect x="11" y="4" width="3" height="12" fill="white"/>
            </svg>
            Stop Camera
        `;
        toggleStreamBtn.classList.add('btn-danger');
        
        // Enable capture button
        captureBtn.disabled = false;
    } else {
        // Stop stream
        webcamStream.style.display = 'none';
        streamActive = false;
        
        // Update button
        toggleStreamBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="5" width="16" height="10" rx="2" stroke="white" stroke-width="2"/>
                <circle cx="10" cy="10" r="2" fill="white"/>
            </svg>
            Start Camera
        `;
        toggleStreamBtn.classList.remove('btn-danger');
        
        // Disable capture button
        captureBtn.disabled = true;
    }
});

// Capture screenshot
captureBtn.addEventListener('click', () => {
    // Create canvas to capture current frame
    const canvas = document.createElement('canvas');
    canvas.width = webcamStream.naturalWidth;
    canvas.height = webcamStream.naturalHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(webcamStream, 0, 0);
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waste-detection-${Date.now()}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/jpeg');
});