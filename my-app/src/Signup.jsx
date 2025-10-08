import React from 'react';
import './home.css';

export default function Signup(){
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Join the campus lost & found</p>
        <form className="auth-form">
          <label>Email</label>
          <input type="email" placeholder="you@university.edu" />
          <label>Password</label>
          <input type="password" placeholder="Create a strong password" />
          <label>Confirm Password</label>
          <input type="password" placeholder="Re-enter your password" />
          <div className="auth-actions">
            <button className="btn outline header-login" type="submit">Submit</button>
          </div>
          <div className="auth-hint">Already have an account? Log in from the header.</div>
        </form>
      </div>
    </main>
  )
}

