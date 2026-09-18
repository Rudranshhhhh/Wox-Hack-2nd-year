# FoundIt! — Backend (Flask)

Simple Flask backend for the FoundIt! Campus Lost & Found portal.

Features implemented:
- POST /api/items — upload a lost or found item (image + metadata)
- GET  /api/items — list and filter items
- GET  /api/items/<id>/matches — ranked suggestions from the opposite report type
- POST /api/items/<id>/claims — submit an ownership proof for verification
- GET/POST /api/items/<id>/messages — coordinate a handover in an item thread
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

Create `backend/.env` with `GROQ_API_KEY` and optionally `GROQ_VISION_MODEL`. The image upload flow uses Groq first and falls back to Google Vision when Groq is unavailable.

API contract (short):
- POST /api/items
  - form-data: type (lost/found), name, category, description, location, contact (optional), owner_email (optional), image (file)
  - returns created item JSON
- GET /api/items
  - query params: q (keyword), category, location, type (lost/found), recovered (true/false)
- POST /api/items/<id>/recover
  - marks item recovered and emits a Socket.IO event to close chat

Notes and next steps:
- For production, swap SQLite for a hosted DB and images to Cloudinary/S3 and secure file uploads.
- Frontend can use Socket.IO client to join item rooms and send/receive messages.
