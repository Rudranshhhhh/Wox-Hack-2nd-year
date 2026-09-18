import os
import datetime
import base64
import json
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from models import db, Item, Message, User, Claim
from google.cloud import vision
import jwt
from flask_cors import CORS
from sqlalchemy import inspect, text
from dotenv import load_dotenv
from groq import Groq

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'data.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key')  # Change in production
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit payload to 16MB
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY')) if os.getenv('GROQ_API_KEY') else None
GROQ_MODEL = os.getenv('GROQ_VISION_MODEL', 'qwen/qwen3.8-27b')

# Enable CORS for all routes
CORS(app,
    origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    max_age=3600,
    supports_credentials=True)

# Setup Google Cloud Vision
vision_client = None
if os.path.exists(os.path.join(BASE_DIR, "service-key.json")):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(BASE_DIR, "service-key.json")
    try:
        vision_client = vision.ImageAnnotatorClient()
    except Exception:
        vision_client = None

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

def detect_features(file_path):
    """Return searchable visual features from Groq, then Google Vision if configured."""
    groq_features = detect_features_with_groq(file_path)
    if groq_features:
        return groq_features
    if not vision_client or not file_path:
        return []
    try:
        with open(file_path, 'rb') as image_file:
            image = vision.Image(content=image_file.read())
        response = vision_client.annotate_image({
            'image': image,
            'features': [
                {'type_': vision.Feature.Type.LABEL_DETECTION, 'max_results': 12},
                {'type_': vision.Feature.Type.IMAGE_PROPERTIES},
            ],
        })
        if response.error:
            return []
        labels = [label.description.lower() for label in response.label_annotations if label.score >= 0.55]
        colors = []
        if response.image_properties_annotation and response.image_properties_annotation.dominant_colors:
            colors = [
                color_name(red, green, blue)
                for color in response.image_properties_annotation.dominant_colors.colors[:5]
                for red, green, blue in [(color.color.red, color.color.green, color.color.blue)]
                if color.pixel_fraction >= 0.12
            ]
        return list(dict.fromkeys(colors + labels))[:15]
    except Exception as error:
        app.logger.warning('Image feature detection skipped: %s', error)
        return []

def detect_features_with_groq(file_path):
    if not groq_client or not file_path:
        return []
    try:
        with open(file_path, 'rb') as image_file:
            encoded_image = base64.b64encode(image_file.read()).decode('ascii')
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0,
            max_tokens=300,
            response_format={'type': 'json_object'},
            messages=[{
                'role': 'user',
                'content': [
                    {
                        'type': 'text',
                        'text': ('Analyze this lost-and-found item photo. Return JSON only with arrays '
                                 'objects and colors, plus strings category and description. Use short '
                                 'lowercase search terms and do not invent details.'),
                    },
                    {
                        'type': 'image_url',
                        'image_url': {'url': f'data:image/jpeg;base64,{encoded_image}'},
                    },
                ],
            }],
        )
        content = response.choices[0].message.content or '{}'
        result = json.loads(content)
        features = []
        for key in ('colors', 'objects', 'category'):
            value = result.get(key, [])
            if isinstance(value, str):
                value = [value]
            features.extend(
                normalized
                for item in value
                for normalized in [str(item).strip().lower()]
                if normalized and normalized not in {'unknown', 'none', 'n/a'}
            )
        return list(dict.fromkeys(features))[:15]
    except Exception as error:
        app.logger.warning('Groq image feature detection skipped: %s', error)
        return []

def color_name(red, green, blue):
    if max(red, green, blue) < 55:
        return 'black'
    if min(red, green, blue) > 205:
        return 'white'
    if red > green * 1.35 and red > blue * 1.35:
        return 'red'
    if blue > red * 1.3 and blue > green * 1.15:
        return 'blue'
    if green > red * 1.2 and green > blue * 1.1:
        return 'green'
    if red > 150 and green > 100 and blue < 100:
        return 'yellow'
    return 'multicolor'

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
def scan_image_base64():
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
    item_columns = {column['name'] for column in inspect(db.engine).get_columns('item')}
    if 'item_type' not in item_columns:
        db.session.execute(text("ALTER TABLE item ADD COLUMN item_type VARCHAR(20) NOT NULL DEFAULT 'found'"))
    if 'owner_email' not in item_columns:
        db.session.execute(text("ALTER TABLE item ADD COLUMN owner_email VARCHAR(160)"))
    if 'detected_features' not in item_columns:
        db.session.execute(text("ALTER TABLE item ADD COLUMN detected_features TEXT"))
    db.session.commit()
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
        'user_id': str(user.id),
        'email': user.email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }, app.config['JWT_SECRET_KEY'])
    
    return jsonify({
        'token': token,
        'email': user.email
    })

# Serve uploaded images
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Create a new item (found report)
@app.route('/api/items', methods=['POST'])
def create_item():
    name = request.form.get('name')
    item_type = request.form.get('type', 'found').lower()
    category = request.form.get('category')
    description = request.form.get('description')
    location = request.form.get('location')
    contact = request.form.get('contact')

    if not name or item_type not in ('lost', 'found'):
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

    image_features = detect_features(os.path.join(app.config['UPLOAD_FOLDER'], image_filename)) if image_filename else []

    item = Item(name=name, item_type=item_type, category=category, description=description,
                location=location, image_filename=image_filename, contact=contact,
                owner_email=request.form.get('owner_email'),
                detected_features=','.join(image_features))
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

# List items with simple filters
@app.route('/api/items', methods=['GET'])
def list_items():
    q = request.args.get('q')
    category = request.args.get('category')
    location = request.args.get('location')
    item_type = request.args.get('type')
    recovered = request.args.get('recovered')

    query = Item.query
    if q:
        query = query.filter((Item.name.ilike(f"%{q}%")) | (Item.description.ilike(f"%{q}%")) | (Item.detected_features.ilike(f"%{q}%")))
    if category:
        query = query.filter_by(category=category)
    if location:
        query = query.filter(Item.location.ilike(f"%{location}%"))
    if item_type in ('lost', 'found'):
        query = query.filter_by(item_type=item_type)
    if recovered is not None:
        if recovered.lower() in ('true', '1'):
            query = query.filter_by(recovered=True)
        else:
            query = query.filter_by(recovered=False)

    items = query.order_by(Item.created_at.desc()).all()
    return jsonify([i.to_dict() for i in items])

@app.route('/api/items/<int:item_id>/matches', methods=['GET'])
def item_matches(item_id):
    item = Item.query.get_or_404(item_id)
    opposite_type = 'lost' if item.item_type == 'found' else 'found'
    candidates = Item.query.filter(Item.item_type == opposite_type, Item.recovered.is_(False)).order_by(Item.created_at.desc()).all()
    def score(candidate):
        points = 0
        if item.category and candidate.category and item.category.lower() == candidate.category.lower():
            points += 2
        if item.location and candidate.location and item.location.lower() in candidate.location.lower():
            points += 1
        if item.name and candidate.name and any(word in candidate.name.lower() for word in item.name.lower().split()):
            points += 1
        return points
    return jsonify([candidate.to_dict() for candidate in sorted(candidates, key=score, reverse=True) if score(candidate) > 0][:10])

@app.route('/api/items/<int:item_id>/claims', methods=['POST'])
def create_claim(item_id):
    Item.query.get_or_404(item_id)
    data = request.get_json(silent=True) or {}
    if not data.get('claimant_email') or not data.get('proof'):
        return jsonify({'error': 'claimant_email and proof are required'}), 400
    claim = Claim(item_id=item_id, claimant_email=data['claimant_email'], proof=data['proof'])
    db.session.add(claim)
    db.session.commit()
    return jsonify(claim.to_dict()), 201

@app.route('/api/items/<int:item_id>/messages', methods=['GET', 'POST'])
def item_messages(item_id):
    Item.query.get_or_404(item_id)
    if request.method == 'GET':
        return jsonify([message.to_dict() for message in Message.query.filter_by(item_id=item_id).order_by(Message.timestamp.asc()).all()])
    data = request.get_json(silent=True) or {}
    if not data.get('sender') or not data.get('content'):
        return jsonify({'error': 'sender and content are required'}), 400
    message = Message(item_id=item_id, sender=data['sender'], content=data['content'])
    db.session.add(message)
    db.session.commit()
    return jsonify(message.to_dict()), 201

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

        content = image_file.read()
        extension = os.path.splitext(image_file.filename)[1] or '.jpg'
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as temporary_file:
                temporary_path = temporary_file.name
                temporary_file.write(content)
            features = detect_features(temporary_path)
        finally:
            if temporary_path and os.path.exists(temporary_path):
                os.unlink(temporary_path)

        return jsonify({'features': features})

    except Exception as e:
        print(f"Error in scan_image: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    try:
        print("Starting Flask server...")
        app.run(host='127.0.0.1', port=5000, debug=True)
    except Exception as e:
        print(f"Error starting server: {e}")
