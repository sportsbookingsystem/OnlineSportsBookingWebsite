import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { facilityHeroImage, fieldThumb } from '../utils/media.js';
import { FALLBACK_FACILITY_IMAGE, SPORT_IMAGES } from '../constants/sportImages.js';

const FALLBACK_FACILITY = FALLBACK_FACILITY_IMAGE;

const SPORT_FILTERS = [
  { value: '', label: 'All sports' },
  { value: 'Basketball', label: 'Basketball' },
  { value: 'Soccer', label: 'Soccer' },
  { value: 'Tennis', label: 'Tennis' },
  { value: 'Volleyball', label: 'Volleyball' },
];

export default function Booking() {
  const { user, token, isRole } = useAuth();
  const canBook = user && isRole('PLAYER');

  const [sportFilter, setSportFilter] = useState('');
  const [facilities, setFacilities] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [facilityId, setFacilityId] = useState('');
  const [facility, setFacility] = useState(null);
  const [fieldId, setFieldId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [durationHours, setDurationHours] = useState(1);
  const [pricing, setPricing] = useState(null);
  const [notes, setNotes] = useState('');
  const [formMsg, setFormMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState('');

  const loadFacilities = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const qs = sportFilter
        ? `?sport=${encodeURIComponent(sportFilter)}`
        : '';
      const data = await apiRequest(`/api/public/facilities${qs}`, { token: null });
      setFacilities(data.facilities || []);
    } catch (e) {
      setListError(e.message || 'Could not load facilities');
    } finally {
      setLoadingList(false);
    }
  }, [sportFilter]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await apiRequest('/api/public/sport-pricing', { token: null });
        if (!cancelled) setPricing(d);
      } catch {
        if (!cancelled) setPricing(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFacilityId('');
    setFacility(null);
    setFieldId('');
  }, [sportFilter]);

  useEffect(() => {
    if (!facilityId) {
      setFacility(null);
      setFieldId('');
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const data = await apiRequest(`/api/public/facilities/${facilityId}`, {
          token: null,
        });
        if (!cancel) {
          setFacility(data.facility);
        }
      } catch {
        if (!cancel) setFacility(null);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [facilityId]);

  useEffect(() => {
    if (!facility?.fields?.length) {
      setFieldId('');
      return;
    }
    const ids = facility.fields.map((f) => String(f.id));
    setFieldId((prev) => (prev && ids.includes(prev) ? prev : ids[0]));
  }, [facility]);

  const loadMyBookings = useCallback(async () => {
    if (!canBook || !token) return;
    setBookingsError('');
    try {
      const data = await apiRequest('/api/player/bookings');
      setBookings(data.bookings || []);
    } catch (e) {
      setBookingsError(e.message);
    }
  }, [canBook, token]);

  useEffect(() => {
    loadMyBookings();
  }, [loadMyBookings]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('payment');
    if (!p) return;
    if (p === 'success') {
      setFormMsg({ type: 'ok', text: 'Payment successful. Booking confirmed.' });
      loadMyBookings();
    } else if (p === 'cancel') {
      setFormMsg({ type: 'error', text: 'Payment was cancelled.' });
    }
    const u = new URL(window.location.href);
    u.searchParams.delete('payment');
    window.history.replaceState({}, '', u.pathname + u.search + u.hash);
  }, [loadMyBookings]);

  async function submitBooking(e) {
    e.preventDefault();
    setFormMsg(null);
    if (!canBook) return;
    if (!fieldId || !bookingDate || !startTime) {
      setFormMsg({ type: 'error', text: 'Field, date, and start time are required.' });
      return;
    }
    setBusy(true);
    try {
      await apiRequest('/api/player/bookings', {
        method: 'POST',
        body: {
          fieldId: Number(fieldId),
          bookingDate,
          startTime,
          durationHours,
          notes: notes.trim() || undefined,
        },
      });
      setFormMsg({
        type: 'ok',
        text: 'Booking created. Use Pay with card below if payment is pending.',
      });
      setNotes('');
      await loadMyBookings();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function pay(bookingId) {
    setFormMsg(null);
    try {
      const data = await apiRequest(`/api/player/bookings/${bookingId}/pay`, {
        method: 'POST',
      });
      if (!data?.checkoutUrl) {
        throw new Error('Could not start payment checkout.');
      }
      window.location.assign(data.checkoutUrl);
    } catch (e) {
      setFormMsg({ type: 'error', text: e.message });
    }
  }

  async function cancelBooking(id) {
    if (!window.confirm('Cancel this booking?')) return;
    setFormMsg(null);
    try {
      await apiRequest(`/api/player/bookings/${id}/cancel`, {
        method: 'POST',
      });
      setFormMsg({ type: 'ok', text: 'Booking cancelled.' });
      await loadMyBookings();
    } catch (e) {
      setFormMsg({ type: 'error', text: e.message });
    }
  }

  const selectedField = facility?.fields?.find((f) => String(f.id) === fieldId);
  const detailCover = facility ? facilityHeroImage(facility) || FALLBACK_FACILITY : null;

  function hourlyForSport(sportType) {
    if (!pricing?.hourlyRatesUsd || !sportType) return null;
    return pricing.hourlyRatesUsd[String(sportType).trim().toLowerCase()] ?? null;
  }

  function quoteTotal() {
    const h = hourlyForSport(selectedField?.sportType);
    if (h == null) return null;
    return Math.round(h * durationHours * 100) / 100;
  }

  const quoted = quoteTotal();

  return (
    <div>
      <h1 className="page-title">Book a field</h1>
      <p className="muted" style={{ marginBottom: '1rem', maxWidth: 640 }}>
        Venues are listed from the database. Checkout uses platform rates in USD per hour for the
        whole field (not per player): Soccer $120/hr, Basketball $60/hr, Tennis $40/hr, Volleyball
        $50/hr. Choose a session length of 1, 1.5, or 2 hours, then use{' '}
        <strong>Pay with card</strong> to open secure Stripe Checkout.
      </p>

      <div className="form-group" style={{ maxWidth: 320, marginBottom: '1.5rem' }}>
        <label htmlFor="sport-filter">Filter by sport</label>
        <select
          id="sport-filter"
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
        >
          {SPORT_FILTERS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Venues</h2>
      {loadingList ? (
        <p className="muted">Loading venues…</p>
      ) : listError ? (
        <div className="alert alert-error">{listError}</div>
      ) : facilities.length === 0 ? (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <p style={{ margin: 0 }}>
            No venues match this filter. Try <strong>All sports</strong> or another sport, or check
            back later.
          </p>
        </div>
      ) : (
        <div className="grid-3" style={{ marginBottom: '2rem' }}>
          {facilities.map((f) => {
            const img = facilityHeroImage(f) || FALLBACK_FACILITY;
            const selected = String(f.id) === facilityId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFacilityId(String(f.id))}
                className="facility-card"
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  padding: 0,
                  border: selected ? '2px solid var(--accent)' : undefined,
                }}
              >
                <div
                  className="facility-card-img"
                  style={{ backgroundImage: `url(${img})` }}
                  role="presentation"
                />
                <div className="facility-card-body">
                  <strong style={{ fontSize: '1.05rem' }}>{f.name}</strong>
                  <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.88rem' }}>
                    {f.city} · {f.fields?.length || 0} field(s)
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {facility ? (
        <div className="card card-glow" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.25rem' }}>
            {detailCover ? (
              <div
                className="photo-venue-banner"
                style={{ backgroundImage: `url(${detailCover})` }}
                role="img"
                aria-label={facility.name}
              />
            ) : null}
            <div>
              <h2 style={{ marginBottom: '0.35rem' }}>{facility.name}</h2>
              <p style={{ marginTop: 0 }}>{facility.description}</p>
              <p className="muted">
                {facility.address}, {facility.city}
              </p>
              <h3 style={{ fontSize: '1rem', marginTop: '1.25rem' }}>Fields</h3>
              <div className="grid-3" style={{ marginTop: '0.75rem' }}>
                {facility.fields?.map((fld) => {
                  const sportFallback =
                    SPORT_IMAGES[String(fld?.sportType || '').toLowerCase()] || FALLBACK_FACILITY;
                  const thumb = fieldThumb(fld);
                  return (
                    <div key={fld.id} className="feature-tile" style={{ padding: 0, overflow: 'hidden' }}>
                      <div
                        className="photo-field-thumb"
                        style={{
                          backgroundImage: thumb
                            ? `url(${thumb}), url(${sportFallback})`
                            : `url(${sportFallback})`,
                        }}
                        role="presentation"
                      />
                      <div style={{ padding: '0.85rem 1rem' }}>
                        <strong>{fld.name}</strong>
                        <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                          {fld.sportType}
                          {hourlyForSport(fld.sportType) != null
                            ? ` · $${hourlyForSport(fld.sportType)}/hr (booking checkout)`
                            : ''}
                          {fld.slots?.length ? ` · ${fld.slots.length} weekly windows` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!canBook ? (
        <div className="card">
          <p style={{ margin: 0 }}>
            <Link to="/login">Log in</Link> as a <strong>Player</strong> to create bookings and pay.
          </p>
        </div>
      ) : (
        <div className="card">
          <h2>New booking</h2>
          {formMsg ? (
            <div
              className={formMsg.type === 'ok' ? 'alert alert-success' : 'alert alert-error'}
            >
              {formMsg.text}
            </div>
          ) : null}
          <form onSubmit={submitBooking}>
            <div className="form-group">
              <label htmlFor="field">Field (sport)</label>
              <select
                id="field"
                key={facilityId || 'none'}
                value={facility?.fields?.length ? fieldId : ''}
                onChange={(e) => setFieldId(e.target.value)}
                disabled={!facility?.fields?.length}
              >
                {!facility?.fields?.length ? (
                  <option value="">
                    {facilityId ? 'Loading fields…' : 'Select a venue above first'}
                  </option>
                ) : (
                  facility.fields.map((fld) => (
                    <option key={fld.id} value={String(fld.id)}>
                      {fld.sportType} — {fld.name}
                      {hourlyForSport(fld.sportType) != null
                        ? ` ($${hourlyForSport(fld.sportType)}/hr)`
                        : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedField ? (
              <p className="muted" style={{ fontSize: '0.88rem' }}>
                Pick a date on a day the field is open, and a start time inside those hours. End
                time is calculated from your session length.
              </p>
            ) : null}
            <div className="form-group">
              <label htmlFor="bdate">Date</label>
              <input
                id="bdate"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="st">Start time (HH:MM)</label>
              <input
                id="st"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00"
              />
            </div>
            <div className="form-group">
              <label htmlFor="dur">Session length</label>
              <select
                id="dur"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
              >
                <option value={1}>1 hour</option>
                <option value={1.5}>1.5 hours</option>
                <option value={2}>2 hours</option>
              </select>
              {quoted != null ? (
                <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.88rem' }}>
                  Estimated total for this field: <strong>${quoted.toFixed(2)} USD</strong> (full
                  court / pitch)
                </p>
              ) : null}
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Create booking'}
            </button>
          </form>
        </div>
      )}

      {canBook ? (
        <div className="card">
          <h2>My bookings</h2>
          {bookingsError ? (
            <div className="alert alert-error">{bookingsError}</div>
          ) : bookings.length === 0 ? (
            <p className="muted">No bookings yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        {b.field?.name} ({b.field?.facility?.name})
                      </td>
                      <td>{b.bookingDate?.slice?.(0, 10) || String(b.bookingDate)}</td>
                      <td>
                        {b.startTime}–{b.endTime}
                      </td>
                      <td>
                        <span className="badge">{b.status}</span>
                      </td>
                      <td>
                        {b.payment?.status || '—'}{' '}
                        {b.payment ? `($${Number(b.payment.amount).toFixed(2)})` : ''}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {b.payment?.status === 'PENDING' && b.status !== 'CANCELLED' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => pay(b.id)}
                          >
                            Pay with card
                          </button>
                        ) : null}{' '}
                        {(b.status === 'PENDING' || b.status === 'CONFIRMED') &&
                        b.status !== 'CANCELLED' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => cancelBooking(b.id)}
                          >
                            Cancel
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
