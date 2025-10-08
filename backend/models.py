from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80), nullable=True)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(120), nullable=True)
    image_filename = db.Column(db.String(260), nullable=True)
    contact = db.Column(db.String(120), nullable=True)
    recovered = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'location': self.location,
            'image_url': f"/uploads/{self.image_filename}" if self.image_filename else None,
            'contact': self.contact,
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
