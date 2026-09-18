from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from bcrypt import hashpw, gensalt, checkpw

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.LargeBinary, nullable=False)

    @staticmethod
    def create_user(email, password):
        normalized_email = email.strip().lower()
        if User.query.filter_by(email=normalized_email).first():
            return None
        user = User(email=normalized_email, password_hash=hashpw(password.encode('utf-8'), gensalt()))
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def verify_user(email, password):
        user = User.query.filter_by(email=email.strip().lower()).first()
        if user and checkpw(password.encode('utf-8'), user.password_hash):
            return user
        return None

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    item_type = db.Column(db.String(20), nullable=False, default='found')
    category = db.Column(db.String(80), nullable=True)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(120), nullable=True)
    image_filename = db.Column(db.String(260), nullable=True)
    contact = db.Column(db.String(120), nullable=True)
    owner_email = db.Column(db.String(160), nullable=True)
    detected_features = db.Column(db.Text, nullable=True)
    recovered = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.item_type,
            'category': self.category,
            'description': self.description,
            'location': self.location,
            'image_url': f"/uploads/{self.image_filename}" if self.image_filename else None,
            'contact': self.contact,
            'owner_email': self.owner_email,
            'detected_features': self.detected_features.split(',') if self.detected_features else [],
            'recovered': self.recovered,
            'created_at': self.created_at.isoformat()
        }

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    sender = db.Column(db.String(80), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'item_id': self.item_id,
            'sender': self.sender,
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),
        }

class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('item.id'), nullable=False)
    claimant_email = db.Column(db.String(160), nullable=False)
    proof = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'item_id': self.item_id,
            'claimant_email': self.claimant_email,
            'proof': self.proof,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
        }
