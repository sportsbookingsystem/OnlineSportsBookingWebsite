import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SITE_NAME, SITE_TITLE } from '../constants/brand.js';

function navClass({ isActive }) {
  return isActive ? 'active' : undefined;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  useEffect(() => {
    document.title = SITE_TITLE;
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden>
              ⚡
            </span>
            {SITE_NAME}
          </Link>
          <nav className="nav-links">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/booking" className={navClass}>
              Book a field
            </NavLink>
            <NavLink to="/competitions" className={navClass}>
              Competitions
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className={navClass}>
                  Dashboard
                </NavLink>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => logout()}>
                  Log out
                </button>
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {user.name} <span className="badge">{user.role?.name}</span>
                </span>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navClass}>
                  Log in
                </NavLink>
                <Link to="/register" className="btn btn-sm btn-primary">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container" style={{ padding: '1.75rem 1.25rem 3rem' }}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="container">
          <p style={{ margin: '0 0 0.75rem' }}>
            <strong style={{ color: 'var(--text)' }}>{SITE_NAME}</strong> — sports venue booking
            focused on <strong style={{ color: 'var(--text)' }}>Lebanon</strong>.
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>
            Coming later: AI-assisted scheduling and insights for players and venue owners.
          </p>
        </div>
      </footer>
    </>
  );
}
