from flask import Flask, request, jsonify
from google.cloud import vision
import os
import base64
from io import BytesIO

app = Flask(__name__)
vision_client = vision.ImageAnnotatorClient()

@app.route('/scan_image', methods=['POST'])
def scan_image():
    try:
        # Get base64 image from request
        image_data = request.json.get('image')
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Create vision image
        image = vision.Image(content=image_bytes)
        
        # Perform label detection
        response = vision_client.label_detection(image=image)
        labels = response.label_annotations
        
        # Extract label descriptions
        results = [{'description': label.description, 'score': label.score} for label in labels]
        
        return jsonify({'labels': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)