let selectedFile = null;

// Get elements
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const resultsSection = document.getElementById('resultsSection');
const loadingOverlay = document.getElementById('loadingOverlay');

// Drag and drop handlers
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('drag-over');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('drag-over');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// File input change handler
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Handle file selection
function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    selectedFile = file;
    uploadBtn.disabled = false;
    
    // Update upload box text
    const uploadBoxH3 = uploadBox.querySelector('h3');
    const uploadBoxP = uploadBox.querySelector('p');
    uploadBoxH3.textContent = 'Image selected!';
    uploadBoxP.textContent = file.name;
}

// Upload button click handler
uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        alert('Please select an image first');
        return;
    }
    
    // Show loading overlay
    loadingOverlay.classList.add('active');
    
    // Create form data
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        // Send request to backend
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        
        // Display results
        displayResults(data);
        
        // Hide loading overlay
        loadingOverlay.classList.remove('active');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while analyzing the image');
        loadingOverlay.classList.remove('active');
    }
});

// Display results
function displayResults(data) {
    // Show results section
    resultsSection.style.display = 'block';
    
    // Update statistics
    document.getElementById('totalCount').textContent = data.stats.total;
    document.getElementById('recyclableCount').textContent = data.stats.recyclable;
    document.getElementById('nonRecyclableCount').textContent = data.stats.non_recyclable;
    document.getElementById('hazardousCount').textContent = data.stats.hazardous;
    
    // Display result image
    const resultImage = document.getElementById('resultImage');
    resultImage.src = 'data:image/jpeg;base64,' + data.image;
    
    // Display detection list
    const detectionList = document.getElementById('detectionList');
    detectionList.innerHTML = '';
    
    if (data.detections.length === 0) {
        detectionList.innerHTML = '<p style="text-align: center; color: #666;">No waste items detected</p>';
        return;
    }
    
    data.detections.forEach((detection, index) => {
        const detectionItem = document.createElement('div');
        detectionItem.className = `detection-item ${detection.category.toLowerCase().replace('-', '-')}`;
        
        detectionItem.innerHTML = `
            <div class="detection-info">
                <h4>${detection.class.replace(/_/g, ' ').toUpperCase()}</h4>
                <p>Category: ${detection.category}</p>
            </div>
            <div class="detection-confidence">
                ${(detection.confidence * 100).toFixed(1)}%
            </div>
        `;
        
        detectionList.appendChild(detectionItem);
    });
}

// Reset form
function resetForm() {
    selectedFile = null;
    fileInput.value = '';
    uploadBtn.disabled = true;
    
    const uploadBoxH3 = uploadBox.querySelector('h3');
    const uploadBoxP = uploadBox.querySelector('p');
    uploadBoxH3.textContent = 'Drop your image here';
    uploadBoxP.textContent = 'or click to browse';
}