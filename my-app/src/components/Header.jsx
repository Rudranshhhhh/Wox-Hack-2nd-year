import React from 'react';
import './header.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.js';

export default function Header() {
  const { isAuthenticated, logout } = useAuth?.() || {};
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Trace logo" className="brand-logo" />
          <div>
            <h1>Trace</h1>
          </div>
        </Link>
        <nav className="nav">
          <Link to="/browse">Browse</Link>
          <Link to="/report">Report</Link>
          <a href="mailto:trace@university.edu">Contact</a>
        </nav>
        <div className="header-actions">
          {isAuthenticated ? <button className="btn outline header-login" type="button" onClick={logout}>Log out</button> : <>
            <Link className="btn outline header-login" to="/login">Log in</Link>
            <Link className="btn primary header-login" to="/signup">Sign up</Link>
          </>}
        </div>
      </div>
    </header>
  );
}
