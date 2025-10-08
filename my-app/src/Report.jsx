import React, { useState } from 'react';
import './home.css';

export default function Report(){
  const [images, setImages] = useState([]);

  function handleFilesChange(e){
    const files = Array.from(e.target.files || []);
    setImages(files);
  }

  function handleSubmit(e){
    e.preventDefault();
    // For now just log the form submission
    // Hook this up to backend later
    const formData = new FormData(e.currentTarget);
    console.log('Report submitted', Object.fromEntries(formData.entries()), images);
    alert('Report submitted (demo)');
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Report an item</h2>
        <p className="auth-subtitle">Add details so the owner can find it</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Photos</label>
          <input name="photos" type="file" multiple accept="image/*" onChange={handleFilesChange} />

          <label>Item name</label>
          <input name="name" type="text" placeholder="e.g., Blue backpack" required />

          <label>Description</label>
          <input name="description" type="text" placeholder="Brand, color, identifying marks" required />

          <label>Location found</label>
          <input name="location" type="text" placeholder="Building, room, or area" required />

          <label>Contact info</label>
          <input name="contact" type="text" placeholder="Email or phone" />

          <div className="auth-actions">
            <button className="btn outline header-login" type="submit">Submit</button>
          </div>
        </form>
      </div>
    </main>
  )
}

