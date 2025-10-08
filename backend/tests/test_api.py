import os
import tempfile
import pytest
from app import app, db

@pytest.fixture
def client():
    db_fd, db_path = tempfile.mkstemp()
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
    os.close(db_fd)
    os.unlink(db_path)

def test_list_empty(client):
    rv = client.get('/api/items')
    assert rv.status_code == 200
    assert rv.get_json() == []
