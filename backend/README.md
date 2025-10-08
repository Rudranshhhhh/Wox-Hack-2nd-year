# FoundIt! — Backend (Flask)

Simple Flask backend for the FoundIt! Campus Lost & Found portal.

Features implemented:
- POST /api/items — upload a found item (image + metadata)
- GET  /api/items — list and filter items
- POST /api/items/<id>/recover — mark an item as recovered (closes chat)
- Socket.IO chat namespace to exchange messages per item (room = item id)

Quick start (Windows PowerShell):

```powershell
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
# run the server (uses eventlet for Socket.IO)
python app.py
```

API contract (short):
- POST /api/items
  - form-data: name, category, description, location, contact (optional), image (file)
  - returns created item JSON
- GET /api/items
  - query params: q (keyword), category, location, recovered (true/false)
- POST /api/items/<id>/recover
  - marks item recovered and emits a Socket.IO event to close chat

Notes and next steps:
- For production, swap SQLite for a hosted DB and images to Cloudinary/S3 and secure file uploads.
- Frontend can use Socket.IO client to join item rooms and send/receive messages.
