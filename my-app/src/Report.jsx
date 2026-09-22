import React, { useEffect, useRef, useState } from 'react';
import './home.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth.js';

const CATEGORIES = ['Bags', 'Electronics', 'Clothing', 'Accessories', 'Stationery', 'ID/Cards', 'Keys', 'Books', 'Sports', 'Other'];

export default function Report() {
  const [image, setImage]           = useState(null);
  const [preview, setPreview]       = useState('');
  const [type, setType]             = useState('lost');

  // Controlled form fields — auto-filled by AI
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('');
  const [location, setLocation]     = useState('');
  const [contact, setContact]       = useState('');

  const [features, setFeatures]     = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // idle | analyzing | complete | invalid | error
  const [invalidReason, setInvalidReason]   = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError]           = useState('');
  const [saved, setSaved]           = useState(false);

  const fileInputRef = useRef(null);
  const navigate     = useNavigate();
  const { authToken } = useAuth();

  // Paste from clipboard
  useEffect(() => {
    function handlePaste(e) {
      const pasted = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
      if (pasted) { e.preventDefault(); handleFile(pasted.getAsFile()); }
    }
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  });

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, GIF).');
      return;
    }

    // Reset form fields so user sees what the AI fills in
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setFeatures([]);
    setName('');
    setDescription('');
    setCategory('');
    setAnalysisStatus('analyzing');
    setInvalidReason('');
    setError('');

    const body = new FormData();
    body.append('image', file);

    fetch('http://localhost:5000/api/analyze_image', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body,
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Analysis failed');
        return data;
      })
      .then(data => {
        if (!data.valid) {
          // Image rejected — wipe preview so user can't submit it
          setImage(null);
          setPreview('');
          setAnalysisStatus('invalid');
          setInvalidReason(data.reason || 'This image doesn\'t look like a lostable item.');
          return;
        }

        // Auto-fill whatever the AI returned
        if (data.name)        setName(data.name);
        if (data.description) setDescription(data.description);
        if (data.category)    setCategory(data.category);
        setFeatures(data.features || []);
        setAnalysisStatus(data.features?.length ? 'complete' : 'empty');
      })
      .catch(err => {
        setAnalysisStatus('error');
        setError(err.message);
      });
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!image) {
      setError('Please upload a valid photo of the item before publishing.');
      return;
    }
    if (analysisStatus === 'invalid') {
      setError('The uploaded image was rejected. Please upload a valid item photo.');
      return;
    }

    const formData = new FormData();
    formData.set('type',        type);
    formData.set('name',        name);
    formData.set('description', description);
    formData.set('category',    category);
    formData.set('location',    location);
    formData.set('contact',     contact);
    formData.set('image',       image);

    setError('');
    fetch('http://localhost:5000/api/items', {
      method: 'POST',
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: formData,
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not publish report');
        setSaved(true);
        setTimeout(() => navigate('/browse'), 700);
      })
      .catch(err => setError(err.message));
  }

  const workflowSteps = [
    { key: 'upload',  label: 'Upload photo',    done: !!image },
    { key: 'analyze', label: 'AI auto-fill',    done: analysisStatus === 'complete' || analysisStatus === 'empty' },
    { key: 'details', label: 'Confirm & publish', done: false },
  ];

  return (
    <main className="report-page">
      <div className="report-layout">

        {/* ── Left panel ── */}
        <aside className="workflow-panel">
          <span className="eyebrow">Trace / new report</span>
          <h2 className="auth-title">Help the right person find it.</h2>
          <p className="auth-subtitle">
            Upload a photo — Trace will read the item and fill in the name, description,
            and category for you. Just confirm the details and publish.
          </p>
          <div className="workflow-steps" aria-label="Report workflow">
            {workflowSteps.map((step, i) => (
              <div
                key={step.key}
                className={[
                  'workflow-step',
                  step.done ? 'is-done' : '',
                  analysisStatus === 'analyzing' && step.key === 'analyze' ? 'is-active' : '',
                ].join(' ')}
              >
                <span className="step-number">{step.done ? '✓' : i + 1}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
          <div className="workflow-note">
            <span>✦</span> Only photos of real, physical items found or lost on campus are accepted.
          </div>
        </aside>

        {/* ── Report card ── */}
        <div className="report-card">
          <div className="report-card-heading">
            <div>
              <span className="eyebrow">Step 01</span>
              <h1>Report an item</h1>
            </div>
            <span className={`status-pill ${analysisStatus}`}>
              {analysisStatus === 'complete'  ? '✓ Auto-filled'  :
               analysisStatus === 'analyzing' ? 'Analyzing…'    :
               analysisStatus === 'invalid'   ? '✕ Invalid image' :
               analysisStatus === 'error'     ? 'Analysis error' :
               'Draft'}
            </span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>

            {/* Type toggle */}
            <label className="field-label">What happened?</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              <option value="lost">I lost this item</option>
              <option value="found">I found this item</option>
            </select>

            {/* Drop zone */}
            <div className="field-label upload-label-row">
              <span>Photo of the item</span>
              <span className="field-hint">Required</span>
            </div>
            <div
              className={`dropzone ${isDragging ? 'is-dragging' : ''} ${preview ? 'has-preview' : ''} ${analysisStatus === 'invalid' ? 'dropzone-rejected' : ''}`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleFile(e.target.files?.[0])}
                hidden
              />

              {/* Invalid image — show rejection message */}
              {analysisStatus === 'invalid' ? (
                <div className="dropzone-copy dropzone-invalid">
                  <span className="upload-icon upload-icon-rejected">✕</span>
                  <strong>Image not accepted</strong>
                  <span>{invalidReason}</span>
                  <span className="field-hint" style={{ marginTop: 4 }}>Click to try a different photo</span>
                </div>
              ) : preview ? (
                <div className="preview-wrap">
                  <img className="report-preview" src={preview} alt="Selected item" />
                  <div className="preview-overlay">Choose a different photo</div>
                </div>
              ) : (
                <div className="dropzone-copy">
                  <span className="upload-icon">↑</span>
                  <strong>Drop, paste, or browse</strong>
                  <span>JPG, PNG, or GIF · real item photos only</span>
                </div>
              )}
            </div>

            {/* AI analysis panel */}
            <section className={`analysis-panel ${analysisStatus}`} aria-live="polite">
              <div className="analysis-heading">
                <span className="analysis-spark">✦</span>
                <div>
                  <strong>What Trace sees</strong>
                  <span>
                    {analysisStatus === 'analyzing' ? 'Reading your image and filling in the form…' :
                     analysisStatus === 'complete'  ? 'Fields auto-filled — review and adjust if needed.' :
                     analysisStatus === 'invalid'   ? 'Image rejected. Upload a valid item photo.' :
                     analysisStatus === 'error'     ? 'Could not analyse image. Fill details manually.' :
                     'Upload a photo to auto-fill the form below.'}
                  </span>
                </div>
              </div>
              {analysisStatus === 'analyzing' && <div className="scan-line" />}
              {features.length > 0 && (
                <div className="detected-features">
                  {features.map(f => <span className="detected-feature" key={f}>{f}</span>)}
                </div>
              )}
            </section>

            {/* ── Auto-filled fields ── */}
            <label className="field-label">
              Item name
              {analysisStatus === 'complete' && name && (
                <span className="field-hint autofilled-badge">✦ auto-filled</span>
              )}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Blue Jansport Backpack"
              required
            />

            <label className="field-label">
              Description
              {analysisStatus === 'complete' && description && (
                <span className="field-hint autofilled-badge">✦ auto-filled</span>
              )}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Color, brand, distinguishing marks…"
              rows={3}
              required
            />

            <label className="field-label">
              Category
              {analysisStatus === 'complete' && category && (
                <span className="field-hint autofilled-badge">✦ auto-filled</span>
              )}
            </label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label className="field-label">Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Building, room, or area on campus"
              required
            />

            <label className="field-label">
              Contact info
              <span className="field-hint">Optional</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Email or phone"
            />

            <div className="auth-actions report-actions">
              <button
                className="btn primary report-submit"
                type="submit"
                disabled={analysisStatus === 'analyzing' || analysisStatus === 'invalid'}
              >
                Publish report <span>→</span>
              </button>
            </div>

            {saved  && <div className="auth-hint">Report published — finding possible matches…</div>}
            {error  && <div className="auth-hint" style={{ color: 'crimson' }}>{error}</div>}
          </form>
        </div>

      </div>
    </main>
  );
}
