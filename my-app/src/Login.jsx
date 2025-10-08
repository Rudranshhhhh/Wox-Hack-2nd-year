import React, { useState } from 'react';
import './home.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.js';

export default function Login(){
  const { login } = useAuth?.() || { login: () => {} };
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e){
    e.preventDefault();
    setError('');
    setLoading(true);
    fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || data?.message || 'Login failed';
        throw new Error(message);
      }
      const token = data?.token || data?.accessToken || 'token';
      login(token);
      navigate('/browse', { replace: true });
    })
    .catch((err) => {
      setError(err.message || 'Login failed');
    })
    .finally(() => setLoading(false));
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Log in to continue</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input name="email" type="email" placeholder="you@university.edu" value={email} onChange={e=>setEmail(e.target.value)} required />
          <label>Password</label>
          <input name="password" type="password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <div className="auth-actions">
            <button className="btn outline header-login" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Submit'}</button>
          </div>
          {error && <div className="auth-hint" style={{color:'crimson'}}>{error}</div>}
          <div className="auth-hint">Forgot your password? You can reset it later.</div>
        </form>
      </div>
    </main>
  )
}
