import React, { useState } from 'react';
import './home.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './auth.js';

export default function Signup(){
  const { login } = useAuth?.() || { login: () => {} };
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e){
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    fetch('http://localhost:5000/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || data?.message || 'Signup failed';
        throw new Error(message);
      }
      // Backend returns only a message on signup success; redirect to login
      navigate('/login', { replace: true });
    })
    .catch((err) => {
      setError(err.message || 'Signup failed');
    })
    .finally(() => setLoading(false));
  }

  return (
    <main className="auth-page signup-page">
      <div className="auth-card">
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Join the campus lost & found</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input name="email" type="email" placeholder="you@university.edu" value={email} onChange={e=>setEmail(e.target.value)} required />
          <label>Password</label>
          <input name="password" type="password" placeholder="Create a strong password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <label>Confirm Password</label>
          <input name="confirmPassword" type="password" placeholder="Re-enter your password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
          <div className="auth-actions">
            <button className="btn outline header-login" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Submit'}</button>
          </div>
          {error && <div className="auth-hint" style={{color:'crimson'}}>{error}</div>}
          <div className="auth-hint">Already have an account? Log in from the header.</div>
        </form>
      </div>
    </main>
  )
}

