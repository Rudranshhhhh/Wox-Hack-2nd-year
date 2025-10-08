import React from 'react';
import './home.css';

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-copy">
            <h2>Lost something? We can help.</h2>
            <p className="lead">Report or search lost & found items across campus. Upload a photo, add details, and chat securely with finders.</p>
            <div className="cta-row">
              <a className="btn primary" href="#report">Report an item</a>
              <a className="btn" href="#browse">Browse items</a>
            </div>
          </div>
          <div className="hero-media" aria-hidden>
            <div className="card media-card">
              <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Trace logo" className="site-logo" />
            </div>
          </div>
        </div>
      </section>

      <section className="features container">
        <h3>How it works</h3>
        <div className="feature-grid">
          <div className="feature">
            <h4>Report & Upload</h4>
            <p>Upload a photo, add location and description. Posts go to the shared portal.</p>
          </div>
          <div className="feature">
            <h4>Search & Filter</h4>
            <p>Search by keywords, category, or location to quickly find matches.</p>
          </div>
          <div className="feature">
            <h4>Chat Securely</h4>
            <p>Message the finder directly from the item's page to verify ownership.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
