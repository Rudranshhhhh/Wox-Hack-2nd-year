import React from 'react';
import './home.css';
import { Link } from 'react-router-dom';

export default function Login(){
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Log in to continue</p>
        <form className="auth-form">
          <label>Email</label>
          <input type="email" placeholder="you@university.edu" />
          <label>Password</label>
          <input type="password" placeholder="Enter your password" />
          <div className="auth-actions">
            <button className="btn outline header-login" type="submit">Submit</button>
          </div>
          <div className="auth-hint">Forgot your password? You can reset it later.</div>
        </form>
      </div>
    </main>
  )
}
