import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

import { SPORT_IMAGES } from '../constants/sportImages.js';

const SIDE_IMG = SPORT_IMAGES.tennis;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (location.state?.registeredPending) {
      setInfo(location.state.registeredPending);
    }
  }, [location.state]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      <div
        className="auth-visual"
        style={{ backgroundImage: `url(${SIDE_IMG})` }}
        aria-hidden
      />
      <div className="auth-panel">
        <h1 className="page-title">Welcome back</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          New here? <Link to="/register">Create an account</Link>
        </p>
        {info ? <div className="alert alert-success">{info}</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}
        <form onSubmit={onSubmit} className="card" style={{ maxWidth: 420 }}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
