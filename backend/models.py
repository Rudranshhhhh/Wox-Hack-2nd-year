from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from pymongo import MongoClient
from bcrypt import hashpw, gensalt, checkpw
import os
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()

# MongoDB setup with connection test
try:
    print("Connecting to MongoDB...")
    mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
    print(f"Using MongoDB URI: {mongo_uri}")
    
    mongo_client = MongoClient(mongo_uri)
    # Test the connection
    mongo_client.server_info()
    print("Successfully connected to MongoDB")
    
    mongo_db = mongo_client[os.getenv('MONGODB_DB', 'wox_hack_db')]
    users_collection = mongo_db.users
    print("MongoDB collections initialized")
except Exception as e:
    print(f"MongoDB connection error: {str(e)}")
    raise

class User:
    @staticmethod
    def create_user(email, password):
        try:
            # Check if user exists
            if users_collection.find_one({"email": email}):
                print(f"User with email {email} already exists")
                return None

            # Hash password
            hashed = hashpw(password.encode('utf-8'), gensalt())
            
            # Create user document
            user = {
                "email": email,
                "password": hashed
            }
            
            # Insert into MongoDB
            print(f"Attempting to insert user with email: {email}")
            result = users_collection.insert_one(user)
            print(f"Insert result: {result.inserted_id}")
            
            user['_id'] = result.inserted_id
            return user
            
        except Exception as e:
            print(f"Error creating user: {str(e)}")
            raise Exception(f"Failed to create user: {str(e)}")

    @staticmethod
    def verify_user(email, password):
        user = users_collection.find_one({"email": email})
        if user and checkpw(password.encode('utf-8'), user['password']):
            return user
        return None

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
