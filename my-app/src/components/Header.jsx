import React from 'react';
import './header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand">
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="Trace logo" className="brand-logo" />
          <div>
            <h1>Campus Lost & Found</h1>
            <p className="tag">Find it. Claim it. Close the loop.</p>
          </div>
        </div>
        <nav className="nav">
          <a href="#browse">Browse</a>
          <a href="#report">Report</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}
