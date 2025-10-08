import os
import datetime
import base64
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from models import db, Item, Message, User
from google.cloud import vision
import jwt
from flask_cors import CORS, cross_origin
from models import db, Item, Message, User
import datetime
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'data.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key')  # Change in production
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit payload to 16MB

# Enable CORS for all routes
CORS(app, 
    origins=["http://localhost:3000"], 
    allow_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    max_age=3600,
    supports_credentials=True)

# Setup Google Cloud Vision
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(BASE_DIR, "service-key.json")
vision_client = vision.ImageAnnotatorClient()

# Add logging
@app.after_request
def after_request(response):
    print(f"Request: {request.method} {request.path}")
    print(f"Response Status: {response.status}")
    return response

# Error handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'error': 'File too large',
        'message': 'The image size exceeds the maximum allowed size (16MB)'
    }), 413

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        'error': 'Internal server error',
        'message': str(error)
    }), 500

@app.errorhandler(400)
def bad_request_error(error):
    return jsonify({
        'error': 'Bad request',
        'message': str(error)
    }), 400

@app.errorhandler(401)
def unauthorized_error(error):
    return jsonify({
        'error': 'Unauthorized',
        'message': 'Authentication is required to access this resource'
    }), 401

# init DB
db.init_app(app)

# Helpers
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper function to verify JWT token
def verify_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except (jwt.InvalidTokenError, IndexError):
        return None

@app.route('/scan_image', methods=['POST'])
def scan_image():
    # Verify user authentication
    auth_payload = verify_token()
    if not auth_payload:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get base64 image from request
        if not request.is_json:
            return jsonify({'error': 'Request must be JSON'}), 400
            
        image_data = request.json.get('image')
        if not image_data:
            return jsonify({'error': 'No image provided'}), 400

        # Decode base64 image
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception:
            return jsonify({'error': 'Invalid base64 image data'}), 400
        
        # Create vision image
        image = vision.Image(content=image_bytes)
        
        # Perform label detection
        response = vision_client.label_detection(image=image)
        
        if response.error:
            return jsonify({'error': f'Vision API error: {response.error.message}'}), 500
            
        labels = response.label_annotations
        
        # Extract label descriptions and scores
        results = [{
            'description': label.description,
            'score': label.score,
            'topicality': label.topicality
        } for label in labels]
        
        return jsonify({
            'labels': results,
            'user': auth_payload.get('sub')  # Include user ID from token
        })
        
    except Exception as e:
        print(f"Error in scan_image: {str(e)}")
        return jsonify({'error': 'Internal server error processing image'}), 500

# Create tables before first request
with app.app_context():
    db.create_all()
    # ensure upload folder exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Auth endpoints
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        print("Received signup request")
        if not request.is_json:
            print("Request is not JSON")
            return jsonify({'error': 'Content-Type must be application/json'}), 400
            
        data = request.get_json()
        print(f"Received data: {data}")
        
        if not data or not data.get('email') or not data.get('password'):
            print("Missing email or password")
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email']
        password = data['password']
        
        # Basic email validation
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Basic password validation
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        try:
            user = User.create_user(email, password)
            if not user:
                return jsonify({'error': 'Email already exists'}), 409
            
            return jsonify({'message': 'User created successfully'}), 201
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
            return jsonify({'error': f'Database error: {str(db_error)}'}), 500
            
    except Exception as e:
        print(f"Error in signup: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500
    password = data['password']
    
    # Basic email validation
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Basic password validation
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    user = User.create_user(email, password)
    if not user:
        return jsonify({'error': 'Email already exists'}), 409
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.verify_user(data['email'], data['password'])
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Generate JWT token
    token = jwt.encode({
        'user_id': str(user['_id']),
        'email': user['email'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }, app.config['JWT_SECRET_KEY'])
    
    return jsonify({
        'token': token,
        'email': user['email']
    })

# Serve uploaded images
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Create a new item (found report)
@app.route('/api/items', methods=['POST'])
def create_item():
    name = request.form.get('name')
    category = request.form.get('category')
    description = request.form.get('description')
    location = request.form.get('location')
    contact = request.form.get('contact')

    if not name:
        return jsonify({'error': 'name is required'}), 400

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # ensure unique filename
            base, ext = os.path.splitext(filename)
            counter = 1
            candidate = filename
            while os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], candidate)):
                candidate = f"{base}_{counter}{ext}"
                counter += 1
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], candidate))
            image_filename = candidate

    item = Item(name=name, category=category, description=description, location=location, image_filename=image_filename, contact=contact)
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

# List items with simple filters
@app.route('/api/items', methods=['GET'])
def list_items():
    q = request.args.get('q')
    category = request.args.get('category')
    location = request.args.get('location')
    recovered = request.args.get('recovered')

    query = Item.query
    if q:
        query = query.filter((Item.name.ilike(f"%{q}%")) | (Item.description.ilike(f"%{q}%")))
    if category:
        query = query.filter_by(category=category)
    if location:
        query = query.filter_by(location=location)
    if recovered is not None:
        if recovered.lower() in ('true', '1'):
            query = query.filter_by(recovered=True)
        else:
            query = query.filter_by(recovered=False)

    items = query.order_by(Item.created_at.desc()).all()
    return jsonify([i.to_dict() for i in items])

# Mark item as recovered
@app.route('/api/items/<int:item_id>/recover', methods=['POST'])
def recover_item(item_id):
    item = Item.query.get_or_404(item_id)
    if item.recovered:
        return jsonify({'message': 'already recovered'}), 400
    item.recovered = True
    db.session.commit()
    # notify room that the item was recovered
    return jsonify({'message': 'marked as recovered'})

# Image scanning with Google Cloud Vision API
@app.route("/api/scan_image", methods=["POST"])
def scan_image():
    try:
        if "image" not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        image_file = request.files["image"]
        if not image_file.filename:
            return jsonify({"error": "No file selected"}), 400

        # Read the image
        content = image_file.read()

        # Create an image instance
        image = vision.Image(content=content)

        # Perform label detection
        response = vision_client.label_detection(image=image)
        labels = response.label_annotations

        # Get object detection as well for more detailed analysis
        object_response = vision_client.object_localization(image=image)
        objects = object_response.localized_object_annotations

        # Combine results
        label_results = [{"label": label.description, "confidence": round(label.score * 100, 2)} 
                        for label in labels]
        
        object_results = [{"object": obj.name, "confidence": round(obj.score * 100, 2)} 
                         for obj in objects]

        return jsonify({
            "success": True,
            "labels": label_results,
            "objects": object_results
        })

    except Exception as e:
        print(f"Error in scan_image: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    try:
        print("Starting Flask server...")
        app.run(host='127.0.0.1', port=5000, debug=True)
    except Exception as e:
        print(f"Error starting server: {e}")
