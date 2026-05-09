import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { SITE_NAME } from '../constants/brand.js';
import { HERO_IMAGE, SHOWCASE_SPORTS } from '../constants/sportImages.js';

const FEATURES = [
  {
    icon: '🏟️',
    title: 'Venues across Lebanon',
    text: 'Real facilities in Beirut, Tripoli, and beyond — photos and pricing from the database.',
  },
  {
    icon: '🏆',
    title: 'Leagues & cups',
    text: 'Join competitions, manage teams, and track sponsorships through the same platform.',
  },
  {
    icon: '⚡',
    title: 'Players & admins',
    text: 'Book and pay as a player; owners approve requests; admins run reports and oversight.',
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="hero" aria-label="Welcome">
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          role="presentation"
        />
        <div className="hero-inner">
          <p className="hero-kicker">Lebanon · multi-sport booking</p>
          <h1>Book courts and pitches across Lebanon.</h1>
          <p className="muted" style={{ fontSize: '1.05rem', maxWidth: 540 }}>
            Basketball, soccer, tennis, and volleyball — find a venue, reserve a slot, and manage
            your games in one place. Built for players, facility owners, and administrators.
          </p>
          <div className="hero-actions">
            <Link to="/booking" className="btn btn-primary">
              Find a venue
            </Link>
            <Link to="/competitions" className="btn">
              Competitions
            </Link>
            {!user ? (
              <Link to="/register" className="btn btn-ghost">
                Create account
              </Link>
            ) : (
              <Link to="/dashboard" className="btn btn-ghost">
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }} className="card card-glow">
        <h2 style={{ marginBottom: '0.75rem', fontSize: '1.15rem' }}>Rewards & prizes</h2>
        <p className="muted" style={{ margin: 0, maxWidth: 720, lineHeight: 1.6 }}>
          During regular competitions and daily matches, the winning team earns a{' '}
          <strong style={{ color: 'var(--text)' }}>free booking</strong> for their next match.
        </p>
        <p className="muted" style={{ margin: '0.85rem 0 0', maxWidth: 720, lineHeight: 1.6 }}>
          For major sponsored events and tournaments funded by sponsors, winning teams receive{' '}
          <strong style={{ color: 'var(--text)' }}>cash prizes or other rewards</strong> according
          to the rules published for that sponsored event.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }} className="card card-glow">
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Looking ahead</h2>
        <p className="muted" style={{ margin: 0, maxWidth: 720 }}>
          We plan to introduce <strong style={{ color: 'var(--text)' }}>AI-powered features</strong>{' '}
          in the future — for example smarter slot suggestions, demand forecasts for venue owners,
          and assistant tools for league organizers. Stay tuned.
        </p>
      </section>

      <section style={{ marginBottom: '2.75rem' }}>
        <h2 className="page-title">Why {SITE_NAME}</h2>
        <p className="muted" style={{ marginBottom: '1.5rem', maxWidth: 560 }}>
          Live listings for venues, fields, bookings, payments, and admin reports — always up to date.
        </p>
        <div className="grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-tile">
              <div className="feature-icon" aria-hidden>
                {f.icon}
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2.75rem' }}>
        <h2 className="page-title">Sports we support</h2>
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Filter venues by sport on the booking page — each field type has its own pricing and
          photos.
        </p>
        <div
          className="grid-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
        >
          {SHOWCASE_SPORTS.map((s) => (
            <figure
              key={s.key}
              className="facility-card"
              style={{ margin: 0, padding: 0, border: 'none' }}
            >
              <div
                className="facility-card-img facility-card-img--contain"
                style={{ backgroundImage: `url(${s.src})` }}
                role="img"
                aria-label={s.alt}
              />
              <figcaption className="facility-card-body">
                <strong>{s.caption}</strong>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="card card-glow" style={{ marginBottom: 0 }}>
        <h2 style={{ marginBottom: '0.75rem' }}>Get started</h2>
        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link to="/booking">Book a field</Link> — sign in as a <strong>Player</strong> to create
            bookings and complete payment.
          </li>
          <li style={{ marginBottom: '0.5rem' }}>
            <Link to="/competitions">Join a competition</Link> with a team from your dashboard.
          </li>
          <li>
            Admins use the dashboard for <strong>stats, user controls, booking reports, venues, and
            rewards</strong>.
          </li>
        </ul>
        <p className="muted" style={{ marginTop: '1.25rem', marginBottom: 0, fontSize: '0.85rem' }}>
          <strong>Players</strong> can register and use the platform immediately.{' '}
          <strong>Facility owners</strong> and <strong>sponsors</strong> submit a request that an
          administrator must approve before they can sign in.
        </p>
      </section>
    </div>
  );
}
