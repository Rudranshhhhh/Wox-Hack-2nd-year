import React, { useCallback, useEffect, useState } from 'react';
import './home.css';

export default function Browse(){
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadItems = useCallback((e) => {
    e.preventDefault();
    setLoading(true);
    const params = new URLSearchParams({ q: query, category, type, location });
    fetch(`http://localhost:5000/api/items?${params}`)
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load listings');
        return response.json();
      })
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [category, location, query, type]);

  useEffect(() => { loadItems({ preventDefault: () => {} }); }, [loadItems]);

  return (
    <main className="container" style={{padding:0,width:'95%'}}>
      <h2 style={{margin:'0 0 12px'}}>Browse items</h2>
      <form onSubmit={loadItems} className="browse-hero">
        <div className="search-row">
          <input
            type="text"
            className="search-input-lg"
            placeholder="Search by object, color, or feature (e.g., blue cap)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn search-apply" type="submit">Apply</button>
        </div>
        <div className="search-row">
          <select value={type} onChange={e => setType(e.target.value)}><option value="">Lost and found</option><option value="lost">Lost</option><option value="found">Found</option></select>
          <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" />
        </div>
      </form>
      {error && <p className="auth-hint" style={{color:'crimson'}}>{error}</p>}
      {loading ? <p>Loading listings...</p> : items.length === 0 ? <p>No matching reports yet.</p> : <div className="feature-grid item-grid">{items.map(item => <article className="feature item-card" key={item.id}>
        <span className="item-type">{item.type}</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <p><strong>{item.category || 'Other'}</strong> · {item.location || 'Location not shared'}</p>
        {item.detected_features?.length > 0 && <div className="feature-tags" aria-label="Detected features">
          {item.detected_features.map(feature => <span className="feature-tag" key={feature}>{feature}</span>)}
        </div>}
        {item.image_url && <img src={`http://localhost:5000${item.image_url}`} alt={item.name} />}
        <details><summary>Claim this item</summary><ClaimForm itemId={item.id} /></details>
      </article>)}</div>}
    </main>
  )
}

function ClaimForm({ itemId }) {
  const [email, setEmail] = useState('');
  const [proof, setProof] = useState('');
  const [sent, setSent] = useState(false);
  function submit(event) {
    event.preventDefault();
    fetch(`http://localhost:5000/api/items/${itemId}/claims`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ claimant_email: email, proof }) })
      .then(response => { if (!response.ok) throw new Error(); setSent(true); })
      .catch(() => setSent(false));
  }
  if (sent) return <p>Claim sent for verification.</p>;
  return <form className="claim-form" onSubmit={submit}><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" required /><textarea value={proof} onChange={e => setProof(e.target.value)} placeholder="Describe proof of ownership" required /><button className="btn" type="submit">Send claim</button></form>;
}

