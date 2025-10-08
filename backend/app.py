import os
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from models import db, Item, Message
from flask_socketio import SocketIO, join_room, leave_room, emit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'data.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

CORS(app)

# init DB
db.init_app(app)

# SocketIO (use eventlet when running)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='eventlet')

# Helpers
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.before_first_request
def create_tables():
    db.create_all()

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
    socketio.emit('item_recovered', {'item_id': item.id}, room=f'item_{item.id}')
    return jsonify({'message': 'marked as recovered'})

# Socket.IO events for chat
@socketio.on('join')
def handle_join(data):
    item_id = data.get('item_id')
    user = data.get('user', 'anonymous')
    if not item_id:
        return
    room = f'item_{item_id}'
    join_room(room)
    emit('status', {'msg': f'{user} has entered the chat.'}, room=room)

@socketio.on('leave')
def handle_leave(data):
    item_id = data.get('item_id')
    user = data.get('user', 'anonymous')
    if not item_id:
        return
    room = f'item_{item_id}'
    leave_room(room)
    emit('status', {'msg': f'{user} has left the chat.'}, room=room)

@socketio.on('message')
def handle_message(data):
    item_id = data.get('item_id')
    sender = data.get('sender', 'anonymous')
    content = data.get('content')
    if not item_id or not content:
        return
    item = Item.query.get(item_id)
    if not item:
        emit('error', {'msg': 'item not found'})
        return
    if item.recovered:
        emit('error', {'msg': 'item already recovered, chat closed.'})
        return
    msg = Message(item_id=item_id, sender=sender, content=content)
    db.session.add(msg)
    db.session.commit()
    room = f'item_{item_id}'
    emit('message', msg.to_dict(), room=room)

if __name__ == '__main__':
    # ensure upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    # run with eventlet for Socket.IO support
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
