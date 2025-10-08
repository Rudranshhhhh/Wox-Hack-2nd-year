import React from 'react';
import './header.css';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Trace logo" className="brand-logo" />
          <div>
            <h1>Trace</h1>
            <p className="tag">Find it. Claim it. Close the loop.</p>
          </div>
        </Link>
        <nav className="nav">
          <Link to="/browse">Browse</Link>
          <Link to="/report">Report</Link>
        </nav>
        <div className="header-actions">
          <Link className="btn outline header-login" to="/login">Log in</Link>
          <Link className="btn outline header-login" to="/signup">Sign up</Link>
        </div>
      </div>
    </header>
  );
}
