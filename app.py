from flask import Flask, render_template, request, Response, jsonify
import cv2
from ultralytics import YOLO
import numpy as np
from PIL import Image
import io
import base64

app = Flask(__name__)

# Load YOLO model
MODEL_PATH = 'weights/best.pt'
model = YOLO(MODEL_PATH)

# Waste categories
RECYCLABLE = ['cardboard_box', 'can', 'plastic_bottle_cap', 'plastic_bottle', 'reuseable_paper']
NON_RECYCLABLE = ['plastic_bag', 'scrap_paper', 'stick', 'plastic_cup', 'snack_bag', 'plastic_box', 
                  'straw', 'plastic_cup_lid', 'scrap_plastic', 'cardboard_bowl', 'plastic_cultery']
HAZARDOUS = ['battery', 'chemical_spray_can', 'chemical_plastic_bottle', 
             'chemical_plastic_gallon', 'light_bulb', 'paint_bucket']

def get_category(class_name):
    """Determine waste category"""
    if class_name in RECYCLABLE:
        return 'Recyclable', '#28a745'
    elif class_name in NON_RECYCLABLE:
        return 'Non-Recyclable', '#ffc107'
    elif class_name in HAZARDOUS:
        return 'Hazardous', '#dc3545'
    return 'Unknown', '#6c757d'

def detect_waste(image):
    """Perform waste detection on image"""
    # Run YOLO inference
    results = model(image, conf=0.25)
    
    # Process results
    detections = []
    for r in results:
        boxes = r.boxes
        for box in boxes:
            # Get box coordinates
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            confidence = float(box.conf[0])
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            
            category, color = get_category(class_name)
            
            detections.append({
                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                'class': class_name,
                'category': category,
                'confidence': confidence,
                'color': color
            })
    
    return detections

def draw_boxes(image, detections):
    """Draw bounding boxes on image"""
    img_copy = image.copy()
    
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        color_hex = det['color']
        
        # Convert hex to BGR
        color_bgr = tuple(int(color_hex.lstrip('#')[i:i+2], 16) for i in (4, 2, 0))
        
        # Draw rectangle
        cv2.rectangle(img_copy, (x1, y1), (x2, y2), color_bgr, 2)
        
        # Prepare label
        label = f"{det['class']} ({det['confidence']:.2f})"
        
        # Draw label background
        (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(img_copy, (x1, y1 - label_h - 10), (x1 + label_w, y1), color_bgr, -1)
        
        # Draw label text
        cv2.putText(img_copy, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return img_copy

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    """Handle image upload and detection"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Read and convert image
    image_bytes = file.read()
    image = Image.open(io.BytesIO(image_bytes))
    image_np = np.array(image)
    
    # Convert RGB to BGR for OpenCV
    if len(image_np.shape) == 3 and image_np.shape[2] == 3:
        image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
    else:
        image_bgr = image_np
    
    # Detect waste
    detections = detect_waste(image_bgr)
    
    # Draw boxes on image
    result_image = draw_boxes(image_bgr, detections)
    
    # Convert result to base64
    _, buffer = cv2.imencode('.jpg', result_image)
    result_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Calculate statistics
    stats = {
        'total': len(detections),
        'recyclable': sum(1 for d in detections if d['category'] == 'Recyclable'),
        'non_recyclable': sum(1 for d in detections if d['category'] == 'Non-Recyclable'),
        'hazardous': sum(1 for d in detections if d['category'] == 'Hazardous')
    }
    
    return jsonify({
        'image': result_base64,
        'detections': detections,
        'stats': stats
    })

@app.route('/webcam')
def webcam():
    """Render webcam page"""
    return render_template('webcam.html')

def gen_frames():
    """Generate webcam frames with detection"""
    camera = cv2.VideoCapture(0)
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        # Detect waste
        detections = detect_waste(frame)
        
        # Draw boxes
        result_frame = draw_boxes(frame, detections)
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', result_frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    
    camera.release()

@app.route('/video_feed')
def video_feed():
    """Video streaming route"""
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)