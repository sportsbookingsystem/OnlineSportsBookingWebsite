import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SPORT_IMAGES } from '../constants/sportImages.js';
import { SITE_NAME } from '../constants/brand.js';

const ROLE_OPTIONS = [
  { value: 'player', label: 'Player' },
  { value: 'facility_owner', label: 'Facility owner' },
  { value: 'sponsor', label: 'Sponsor' },
];

const SIDE_IMG = SPORT_IMAGES.soccer;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [roleKey, setRoleKey] = useState('player');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Name and email are required; password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        roleKey,
        companyName:
          roleKey === 'sponsor' && companyName.trim()
            ? companyName.trim()
            : undefined,
      });
      if (result?.pendingVerification) {
        navigate('/login', {
          replace: true,
          state: { registeredPending: result.message },
        });
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
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
        <h1 className="page-title">Join {SITE_NAME}</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        {error ? <div className="alert alert-error">{error}</div> : null}
        <form onSubmit={onSubmit} className="card" style={{ maxWidth: 440 }}>
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="remail">Email</label>
            <input
              id="remail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="rpass">Password (min 6)</label>
            <input
              id="rpass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone (optional)</label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {roleKey === 'facility_owner' || roleKey === 'sponsor' ? (
              <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                Facility owner and sponsor accounts stay pending until an administrator approves them
                in the Admin Dashboard. You cannot sign in until then.
              </p>
            ) : null}
          </div>
          {roleKey === 'sponsor' ? (
            <div className="form-group">
              <label htmlFor="company">Company / brand name</label>
              <input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Shown on sponsorships (optional — a default will be used if empty)"
              />
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Creating…' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
