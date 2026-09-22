import React, { useCallback, useEffect, useState } from 'react';
import './home.css';

export default function Browse() {
  const [query, setQuery]       = useState('');
  const [category, setCategory] = useState('');
  const [type, setType]         = useState('');
  const [location, setLocation] = useState('');
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const loadItems = useCallback((e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ q: query, category, type, location });
    fetch(`http://localhost:5000/api/items?${params}`)
      .then(async res => {
        if (!res.ok) throw new Error('Unable to load listings');
        return res.json();
      })
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [category, location, query, type]);

  useEffect(() => { loadItems({ preventDefault: () => {} }); }, [loadItems]);

  useEffect(() => {
    if (!selectedItem) return;
    const handler = (e) => { if (e.key === 'Escape') setSelectedItem(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedItem]);

  function imageUrl(item) {
    return item.image_url ? `http://localhost:5000${item.image_url}` : '';
  }

  function formatDate(value) {
    if (!value) return 'Recently reported';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(value));
  }

  /* derive a "username" from the email or fall back gracefully */
  function getUsername(item) {
    if (item.reporter_email) return 'u/' + item.reporter_email.split('@')[0];
    if (item.user_email)     return 'u/' + item.user_email.split('@')[0];
    return 'u/anonymous';
  }

  return (
    <div className="reddit-page">

      {/* ── Top search bar ── */}
      <div className="reddit-searchbar-wrap">
        <form className="reddit-searchbar" onSubmit={loadItems}>
          <input
            type="text"
            className="reddit-search-input"
            placeholder="Search lost & found items…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="">All</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Category"
          />
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location"
          />
          <button className="btn primary" type="submit">Search</button>
        </form>
      </div>

      {/* ── Feed ── */}
      <div className="reddit-feed">

        {error && (
          <div className="feed-message feed-error" role="alert">{error}</div>
        )}

        {loading ? (
          <div className="feed-message">Loading reports…</div>
        ) : items.length === 0 ? (
          <div className="feed-message">
            <strong>No matching reports yet.</strong>
            <span>Try a broader search or check back soon.</span>
          </div>
        ) : (
          items.map(item => (
            <article className="reddit-post" key={item.id}>

              {/* ── Post header: avatar + username + date + type badge ── */}
              <div className="rp-header">
                <div className="rp-avatar" aria-hidden="true">
                  {getUsername(item).charAt(2).toUpperCase()}
                </div>
                <div className="rp-header-text">
                  <span className="rp-username">{getUsername(item)}</span>
                  <span className="rp-date">· {formatDate(item.created_at)}</span>
                </div>
                <span className={`post-type ${item.type}`}>{item.type}</span>
              </div>

              {/* ── Title ── */}
              <h2 className="rp-title">{item.name}</h2>

              {/* ── Meta: category + location ── */}
              <p className="rp-meta">
                {item.category || 'Other'}
                {item.location ? <> &nbsp;·&nbsp; 📍 {item.location}</> : ''}
              </p>

              {/* ── Description ── */}
              {item.description && (
                <p className="rp-description">{item.description}</p>
              )}

              {/* ── Image (full width) ── */}
              {item.image_url && (
                <div className="rp-image-wrap">
                  <img
                    className="rp-image"
                    src={imageUrl(item)}
                    alt={item.name}
                    loading="lazy"
                  />
                </div>
              )}

              {/* ── Feature tags ── */}
              {item.detected_features?.length > 0 && (
                <div className="feature-tags rp-tags">
                  {item.detected_features.slice(0, 5).map(f => (
                    <span className="feature-tag" key={f}>{f}</span>
                  ))}
                </div>
              )}

              {/* ── Footer action ── */}
              <div className="rp-footer">
                <button
                  className="rp-view-btn"
                  type="button"
                  onClick={() => setSelectedItem(item)}
                >
                  View full post →
                </button>
              </div>

            </article>
          ))
        )}
      </div>

      {/* ── Detail modal ── */}
      {selectedItem && (
        <div
          className="post-modal-backdrop"
          role="presentation"
          onMouseDown={e => { if (e.target === e.currentTarget) setSelectedItem(null); }}
        >
          <section
            className="post-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-modal-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setSelectedItem(null)}
              aria-label="Close item details"
            >×</button>

            <div className="modal-image-wrap">
              {selectedItem.image_url
                ? <img className="modal-image" src={imageUrl(selectedItem)} alt={selectedItem.name} />
                : <div className="modal-image modal-image-empty">No photo available</div>
              }
            </div>

            <div className="modal-content">
              <div className="post-meta">
                <span className={`modal-type ${selectedItem.type}`}>{selectedItem.type} item</span>
                <span>{formatDate(selectedItem.created_at)}</span>
              </div>
              <h2 id="post-modal-title">{selectedItem.name}</h2>
              <p className="modal-location">
                {selectedItem.category || 'Other'} · {selectedItem.location || 'Location not shared'}
              </p>
              <p className="modal-description">
                {selectedItem.description || 'No additional description was provided.'}
              </p>
              {selectedItem.detected_features?.length > 0 && (
                <div className="feature-tags">
                  {selectedItem.detected_features.map(f => (
                    <span className="feature-tag" key={f}>{f}</span>
                  ))}
                </div>
              )}
              <details className="claim-details">
                <summary>Claim this item</summary>
                <ClaimForm itemId={selectedItem.id} />
              </details>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ClaimForm({ itemId }) {
  const [email, setEmail] = useState('');
  const [proof, setProof] = useState('');
  const [sent, setSent]   = useState(false);

  function submit(e) {
    e.preventDefault();
    fetch(`http://localhost:5000/api/items/${itemId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimant_email: email, proof }),
    })
      .then(res => { if (!res.ok) throw new Error(); setSent(true); })
      .catch(() => setSent(false));
  }

  if (sent) return <p>Claim sent for verification.</p>;
  return (
    <form className="claim-form" onSubmit={submit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" required />
      <textarea value={proof} onChange={e => setProof(e.target.value)} placeholder="Describe proof of ownership" required />
      <button className="btn primary" type="submit">Send claim</button>
    </form>
  );
}
