import React, { useEffect, useRef, useState } from 'react';
import './home.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth.js';

export default function Report(){
  const [images, setImages] = useState([]);
  const [type, setType] = useState('lost');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState('');
  const [features, setFeatures] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { authToken } = useAuth();

  useEffect(() => {
    function handlePaste(event) {
      const pastedImage = Array.from(event.clipboardData?.items || [])
        .find(item => item.type.startsWith('image/'));
      if (pastedImage) {
        event.preventDefault();
        handleFile(pastedImage.getAsFile());
      }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    setImages([file]);
    setPreview(URL.createObjectURL(file));
    setFeatures([]);
    setAnalysisStatus('analyzing');
    setError('');

    const scanData = new FormData();
    scanData.append('image', file);
    fetch('http://localhost:5000/api/scan_image', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: scanData
    })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Could not analyze this image');
        return data;
      })
      .then(data => {
        setFeatures(data.features || []);
        setAnalysisStatus(data.features?.length ? 'complete' : 'empty');
      })
      .catch(err => {
        setAnalysisStatus('error');
        setError(err.message);
      });
  }

  function handleFilesChange(e){
    handleFile(e.target.files?.[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function handleSubmit(e){
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!images[0]) {
      setError('Upload a photo before publishing your report.');
      return;
    }
    formData.set('type', type);
    formData.set('image', images[0]);
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

  const workflowSteps = [
    { key: 'upload', label: 'Upload photo', done: images.length > 0 },
    { key: 'analyze', label: 'Detect features', done: analysisStatus === 'complete' || analysisStatus === 'empty' },
    { key: 'details', label: 'Add details', done: false },
  ];

  return (
    <main className="report-page">
      <div className="report-layout">
        <aside className="workflow-panel">
          <span className="eyebrow">Trace / new report</span>
          <h2 className="auth-title">Help the right person find it.</h2>
          <p className="auth-subtitle">Start with a photo. Trace will read the useful visual clues before you add the final details.</p>
          <div className="workflow-steps" aria-label="Report workflow">
            {workflowSteps.map((step, index) => <div className={`workflow-step ${step.done ? 'is-done' : ''} ${analysisStatus === 'analyzing' && step.key === 'analyze' ? 'is-active' : ''}`} key={step.key}>
              <span className="step-number">{step.done ? '✓' : index + 1}</span>
              <span>{step.label}</span>
            </div>)}
          </div>
          <div className="workflow-note"><span>✦</span> Your photo is used to find visual clues like color, object type, and category.</div>
        </aside>

        <div className="report-card">
          <div className="report-card-heading">
            <div><span className="eyebrow">Step 01</span><h1>Report an item</h1></div>
            <span className={`status-pill ${analysisStatus}`}>{analysisStatus === 'complete' ? 'Analysis ready' : analysisStatus === 'analyzing' ? 'Analyzing' : 'Draft'}</span>
          </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field-label">What happened?</label>
          <select name="type" value={type} onChange={e => setType(e.target.value)}>
            <option value="lost">I lost this item</option>
            <option value="found">I found this item</option>
          </select>

          <div className="field-label upload-label-row"><span>Photo of the item</span><span className="field-hint">Required</span></div>
          <div className={`dropzone ${isDragging ? 'is-dragging' : ''} ${preview ? 'has-preview' : ''}`} onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} name="photos" type="file" accept="image/*" onChange={handleFilesChange} hidden />
            {preview ? <div className="preview-wrap"><img className="report-preview" src={preview} alt="Selected item preview" /><div className="preview-overlay">Choose a different photo</div></div> : <div className="dropzone-copy"><span className="upload-icon">↑</span><strong>Drop, paste, or browse</strong><span>JPG, PNG, or GIF up to 16 MB</span></div>}
          </div>

          <section className={`analysis-panel ${analysisStatus}`} aria-live="polite">
            <div className="analysis-heading"><span className="analysis-spark">✦</span><div><strong>What Trace sees</strong><span>{analysisStatus === 'analyzing' ? 'Reading your image...' : analysisStatus === 'complete' ? 'These clues will make search easier.' : 'Upload a photo to reveal visual clues.'}</span></div></div>
            {analysisStatus === 'analyzing' && <div className="scan-line" />}
            {features.length > 0 && <div className="detected-features">{features.map(feature => <span className="detected-feature" key={feature}>{feature}</span>)}</div>}
            {analysisStatus === 'empty' && <span className="analysis-empty">No clear features detected yet. Add your own description below.</span>}
          </section>

          <label className="field-label">Item name</label>
          <input name="name" type="text" placeholder="e.g., Blue backpack" required />

          <label className="field-label">Description</label>
          <input name="description" type="text" placeholder="Brand, color, identifying marks" required />

          <label className="field-label">Category</label>
          <input name="category" type="text" placeholder="e.g., Accessories, Electronics" />

          <label className="field-label">Location</label>
          <input name="location" type="text" placeholder="Building, room, or area" required />

          <label className="field-label">Contact info <span className="field-hint">Optional</span></label>
          <input name="contact" type="text" placeholder="Email or phone" />

          <div className="auth-actions report-actions">
            <button className="btn primary report-submit" type="submit">Publish report <span>→</span></button>
          </div>
          {saved && <div className="auth-hint">Report published. Finding possible matches...</div>}
          {error && <div className="auth-hint" style={{color:'crimson'}}>{error}</div>}
        </form>
      </div>
      </div>
    </main>
  )
}

