import React, { useState } from 'react';
import './home.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth.js';

export default function Report(){
  const [images, setImages] = useState([]);
  const [type, setType] = useState('lost');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const { authToken } = useAuth();

  function handleFilesChange(e){
    const files = Array.from(e.target.files || []);
    setImages(files);
  }

  function handleSubmit(e){
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('type', type);
    formData.set('image', images[0] || '');
    setError('');
    fetch('http://localhost:5000/api/items', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not publish report');
      setSaved(true);
      setTimeout(() => navigate('/browse'), 700);
    }).catch(err => setError(err.message));
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Report an item</h2>
        <p className="auth-subtitle">Add details so the right person can find it</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Report type</label>
          <select name="type" value={type} onChange={e => setType(e.target.value)}>
            <option value="lost">I lost this item</option>
            <option value="found">I found this item</option>
          </select>
          <label>Photos</label>
          <input name="photos" type="file" accept="image/*" onChange={handleFilesChange} />

          <label>Item name</label>
          <input name="name" type="text" placeholder="e.g., Blue backpack" required />

          <label>Description</label>
          <input name="description" type="text" placeholder="Brand, color, identifying marks" required />

          <label>Location</label>
          <input name="location" type="text" placeholder="Building, room, or area" required />

          <label>Contact info</label>
          <input name="contact" type="text" placeholder="Email or phone" />

          <div className="auth-actions">
            <button className="btn outline header-login" type="submit">Publish report</button>
          </div>
          {saved && <div className="auth-hint">Report published. Finding possible matches...</div>}
          {error && <div className="auth-hint" style={{color:'crimson'}}>{error}</div>}
        </form>
      </div>
    </main>
  )
}

