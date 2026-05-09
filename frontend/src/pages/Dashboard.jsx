import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role?.name;

  if (role === 'PLAYER') return <PlayerDashboard />;
  if (role === 'FACILITY_OWNER') return <OwnerDashboard />;
  if (role === 'SPONSOR') return <SponsorDashboard />;
  if (role === 'ADMIN') return <AdminDashboard />;

  return <p className="muted">Unknown role.</p>;
}

/** Shown on owner/sponsor dashboards when admin has not approved the account yet. */
function RoleVerificationBanner({ roleLabel, status, onRefresh }) {
  if (status !== 'PENDING' && status !== 'REJECTED') return null;
  if (status === 'PENDING') {
    return (
      <div className="card card-glow" style={{ marginBottom: '1.25rem', borderColor: 'var(--accent)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Verification pending</h2>
        <p style={{ marginBottom: '0.75rem' }}>
          Your <strong>{roleLabel}</strong> registration is waiting for a platform administrator to
          approve it. After approval, you can use all dashboard tools below. New requests also appear
          in the admin dashboard under <strong>Pending facility owners &amp; sponsors</strong>.
        </p>
        <button type="button" className="btn btn-sm" onClick={onRefresh}>
          Refresh status
        </button>
      </div>
    );
  }
  if (status === 'REJECTED') {
    return (
      <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
        <strong>Registration not approved.</strong> Your {roleLabel} request was rejected. Contact
        the platform administrator if you need help.
      </div>
    );
  }
  return (
    <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
      <strong>Verification required.</strong> Your account is not approved for {roleLabel} tools yet.
      If you just registered, wait for an administrator or click refresh.
      <div style={{ marginTop: '0.5rem' }}>
        <button type="button" className="btn btn-sm" onClick={onRefresh}>
          Refresh status
        </button>
      </div>
    </div>
  );
}

function PlayerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [teams, setTeams] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [joined, setJoined] = useState([]);
  const [teamName, setTeamName] = useState('');
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [b, t, r, j, p] = await Promise.all([
        apiRequest('/api/player/bookings'),
        apiRequest('/api/player/teams'),
        apiRequest('/api/player/rewards'),
        apiRequest('/api/player/competitions/joined'),
        apiRequest('/api/player/profile'),
      ]);
      setBookings(b.bookings || []);
      setTeams(t.teams || []);
      setRewards(r.rewards || []);
      setJoined(j.competitions || []);
      const pr = p.profile;
      setProfile({ name: pr.name || '', phone: pr.phone || '' });
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createTeam(e) {
    e.preventDefault();
    setMsg(null);
    if (!teamName.trim()) return;
    try {
      await apiRequest('/api/player/teams', {
        method: 'POST',
        body: { name: teamName.trim() },
      });
      setTeamName('');
      setMsg({ type: 'ok', text: 'Team created.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await apiRequest('/api/player/profile', {
        method: 'PUT',
        body: {
          name: profile.name.trim(),
          phone: profile.phone.trim() || undefined,
        },
      });
      setMsg({ type: 'ok', text: 'Profile updated.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <div>
      <h1 className="page-title">Player dashboard</h1>
      <p className="muted">Your profile, teams, bookings, and rewards in one place.</p>
      {err ? <div className="alert alert-error">{err}</div> : null}
      {msg ? (
        <div
          className={
            msg.type === 'ok' ? 'alert alert-success' : 'alert alert-error'
          }
        >
          {msg.text}
        </div>
      ) : null}

      <div className="card">
        <h2>Profile</h2>
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label htmlFor="pname">Name</label>
            <input
              id="pname"
              value={profile.name}
              onChange={(e) =>
                setProfile((s) => ({ ...s, name: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="pphone">Phone</label>
            <input
              id="pphone"
              value={profile.phone}
              onChange={(e) =>
                setProfile((s) => ({ ...s, phone: e.target.value }))
              }
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save profile
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Create team</h2>
        <form onSubmit={createTeam}>
          <div className="form-group">
            <label htmlFor="tname">Team name</label>
            <input
              id="tname"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Create
          </button>
        </form>
      </div>

      <div className="card">
        <h2>My teams ({teams.length})</h2>
        <ul>
          {teams.map((t) => (
            <li key={t.id}>
              {t.name} — {t.members?.length || 0} member(s)
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Competitions joined ({joined.length})</h2>
        <ul>
          {joined.map((c) => (
            <li key={c.id}>
              {c.name} <span className="badge">{c.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Recent bookings</h2>
        {bookings.length === 0 ? (
          <p className="muted">None — use Booking page.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Field</th>
                <th>When</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.slice(0, 8).map((b) => (
                <tr key={b.id}>
                  <td>{b.field?.name}</td>
                  <td>
                    {b.bookingDate?.slice?.(0, 10)} {b.startTime}–{b.endTime}
                  </td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Rewards</h2>
        {rewards.length === 0 ? (
          <p className="muted">No rewards yet.</p>
        ) : (
          <ul>
            {rewards.map((rw) => (
              <li key={rw.id}>
                ${Number(rw.amount).toFixed(2)} — {rw.status}{' '}
                <span className="muted">({rw.team?.name})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OwnerDashboard() {
  const { user, refreshUser } = useAuth();
  const verStatus = user?.roleVerificationStatus;
  // Legacy DBs may omit the column until migrated — only block explicit PENDING / REJECTED.
  const approved = verStatus !== 'PENDING' && verStatus !== 'REJECTED';

  const defaultSlots = () =>
    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '08:00',
      endTime: '22:00',
    }));

  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [hosted, setHosted] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(null);

  const [nfName, setNfName] = useState('');
  const [nfAddress, setNfAddress] = useState('');
  const [nfCity, setNfCity] = useState('');
  const [nfDesc, setNfDesc] = useState('');
  const [nfApproval, setNfApproval] = useState(false);

  const [photoFacId, setPhotoFacId] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [fieldFacId, setFieldFacId] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldSport, setFieldSport] = useState('Soccer');
  const [fieldImgUrl, setFieldImgUrl] = useState('');

  const [fieldPhotoId, setFieldPhotoId] = useState('');
  const [fieldPhotoUrl, setFieldPhotoUrl] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [f, b, r, h] = await Promise.all([
        apiRequest('/api/owner/facilities'),
        apiRequest('/api/owner/bookings'),
        apiRequest('/api/owner/reports/revenue'),
        apiRequest('/api/owner/competitions/hosted'),
      ]);
      setFacilities(f.facilities || []);
      setBookings(b.bookings || []);
      setRevenue(r.summary || null);
      setHosted(h.hosted || []);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    if (!approved) {
      setFacilities([]);
      setBookings([]);
      setRevenue(null);
      setHosted([]);
      setErr('');
      return;
    }
    load();
  }, [load, approved]);

  const allFields = useMemo(
    () =>
      facilities.flatMap((fac) =>
        (fac.fields || []).map((fld) => ({ ...fld, facilityName: fac.name })),
      ),
    [facilities],
  );

  useEffect(() => {
    if (!approved) return;
    if (facilities.length && !fieldFacId) {
      setFieldFacId(String(facilities[0].id));
    }
    if (facilities.length && !photoFacId) {
      setPhotoFacId(String(facilities[0].id));
    }
  }, [facilities, fieldFacId, photoFacId, approved]);

  useEffect(() => {
    if (!approved) return;
    if (allFields.length && !fieldPhotoId) {
      setFieldPhotoId(String(allFields[0].id));
    }
  }, [allFields, fieldPhotoId, approved]);

  async function approve(bookingId, approve_) {
    try {
      await apiRequest(`/api/owner/bookings/${bookingId}/approve`, {
        method: 'POST',
        body: { approve: approve_ },
      });
      const b = await apiRequest('/api/owner/bookings');
      setBookings(b.bookings || []);
    } catch (e) {
      alert(e.message);
    }
  }

  async function createFacility(e) {
    e.preventDefault();
    setMsg(null);
    if (!nfName.trim() || !nfAddress.trim() || !nfCity.trim()) return;
    try {
      await apiRequest('/api/owner/facilities', {
        method: 'POST',
        body: {
          name: nfName.trim(),
          address: nfAddress.trim(),
          city: nfCity.trim(),
          description: nfDesc.trim() || undefined,
          approvalRequired: nfApproval,
        },
      });
      setNfName('');
      setNfAddress('');
      setNfCity('');
      setNfDesc('');
      setNfApproval(false);
      setMsg({ type: 'ok', text: 'Facility created.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function addFacPhoto(e) {
    e.preventDefault();
    setMsg(null);
    if (!photoFacId || !photoUrl.trim()) return;
    try {
      await apiRequest(`/api/owner/facilities/${photoFacId}/photos`, {
        method: 'POST',
        body: { url: photoUrl.trim() },
      });
      setPhotoUrl('');
      setMsg({ type: 'ok', text: 'Facility photo added.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function createField(e) {
    e.preventDefault();
    setMsg(null);
    if (!fieldFacId || !fieldName.trim()) return;
    try {
      const body = {
        name: fieldName.trim(),
        sportType: fieldSport,
        pricePerSlot: 0,
        slots: defaultSlots(),
      };
      if (fieldImgUrl.trim()) {
        body.imageUrls = [fieldImgUrl.trim()];
      }
      await apiRequest(`/api/owner/facilities/${fieldFacId}/fields`, {
        method: 'POST',
        body,
      });
      setFieldName('');
      setFieldImgUrl('');
      setMsg({ type: 'ok', text: 'Field created with default weekly hours (08:00–22:00).' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function addFieldPhotoSubmit(e) {
    e.preventDefault();
    setMsg(null);
    if (!fieldPhotoId || !fieldPhotoUrl.trim()) return;
    try {
      await apiRequest(`/api/owner/fields/${fieldPhotoId}/photos`, {
        method: 'POST',
        body: { url: fieldPhotoUrl.trim() },
      });
      setFieldPhotoUrl('');
      setMsg({ type: 'ok', text: 'Field image added.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function toggleFieldMaintenance(fieldId, isActive) {
    setMsg(null);
    try {
      await apiRequest(`/api/owner/fields/${fieldId}`, {
        method: 'PUT',
        body: { isActive },
      });
      setMsg({
        type: 'ok',
        text: isActive ? 'Field marked available.' : 'Field marked unavailable (maintenance).',
      });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <div>
      <h1 className="page-title">Facility owner dashboard</h1>
      <p className="muted">
        Manage venues, fields, images, schedules, booking approvals, revenue, and competitions held
        on your pitches.
      </p>
      {err ? <div className="alert alert-error">{err}</div> : null}
      {msg ? (
        <div
          className={
            msg.type === 'ok' ? 'alert alert-success' : 'alert alert-error'
          }
        >
          {msg.text}
        </div>
      ) : null}

      <RoleVerificationBanner
        roleLabel="facility owner"
        status={verStatus}
        onRefresh={() => refreshUser()}
      />

      {!approved ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Facility management, booking approvals, and revenue reports unlock after an administrator
            approves your account from the <strong>Admin dashboard</strong> (Pending facility owners
            &amp; sponsors).
          </p>
        </div>
      ) : (
        <>
      <div className="card">
        <h2>Revenue (paid bookings on your fields)</h2>
        {revenue ? (
          <p>
            <strong>${Number(revenue.total).toFixed(2)}</strong> from {revenue.count}{' '}
            payment(s)
          </p>
        ) : (
          <p className="muted">—</p>
        )}
      </div>

      <div className="card">
        <h2>Add facility</h2>
        <form onSubmit={createFacility}>
          <div className="form-group">
            <label>Name</label>
            <input value={nfName} onChange={(e) => setNfName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Address</label>
            <input value={nfAddress} onChange={(e) => setNfAddress(e.target.value)} />
          </div>
          <div className="form-group">
            <label>City</label>
            <input value={nfCity} onChange={(e) => setNfCity(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea rows={2} value={nfDesc} onChange={(e) => setNfDesc(e.target.value)} />
          </div>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={nfApproval}
              onChange={(e) => setNfApproval(e.target.checked)}
            />
            Require owner approval before players can pay
          </label>
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">
              Create facility
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Facility photo (URL)</h2>
        <form onSubmit={addFacPhoto}>
          <div className="form-group">
            <label>Facility</label>
            <select
              value={photoFacId}
              onChange={(e) => setPhotoFacId(e.target.value)}
              disabled={!facilities.length}
            >
              {facilities.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Image URL</label>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!facilities.length}>
            Upload link
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Add field / court</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
          Player checkout uses platform hourly rates by sport. Internal reference price can stay at
          0. Default availability: every day 08:00–22:00 (adjust later via API if needed).
        </p>
        <form onSubmit={createField}>
          <div className="form-group">
            <label>Facility</label>
            <select
              value={fieldFacId}
              onChange={(e) => setFieldFacId(e.target.value)}
              disabled={!facilities.length}
            >
              {facilities.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Field name</label>
            <input value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Sport</label>
            <select value={fieldSport} onChange={(e) => setFieldSport(e.target.value)}>
              <option>Soccer</option>
              <option>Basketball</option>
              <option>Tennis</option>
              <option>Volleyball</option>
            </select>
          </div>
          <div className="form-group">
            <label>Hero image URL (optional)</label>
            <input value={fieldImgUrl} onChange={(e) => setFieldImgUrl(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!facilities.length}>
            Create field
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Field image (URL)</h2>
        <form onSubmit={addFieldPhotoSubmit}>
          <div className="form-group">
            <label>Field</label>
            <select
              value={fieldPhotoId}
              onChange={(e) => setFieldPhotoId(e.target.value)}
              disabled={!allFields.length}
            >
              {allFields.map((fld) => (
                <option key={fld.id} value={String(fld.id)}>
                  {fld.facilityName} — {fld.name} ({fld.sportType})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Image URL</label>
            <input value={fieldPhotoUrl} onChange={(e) => setFieldPhotoUrl(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!allFields.length}>
            Add image
          </button>
        </form>
      </div>

      <div className="card">
        <h2>My facilities ({facilities.length})</h2>
        <ul>
          {facilities.map((f) => (
            <li key={f.id} style={{ marginBottom: '0.75rem' }}>
              <strong>{f.name}</strong> — {f.city} — {f.fields?.length || 0} field(s)
              {f.approvalRequired ? (
                <span className="badge" style={{ marginLeft: '0.35rem' }}>
                  approval required
                </span>
              ) : null}
              <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
                {(f.fields || []).map((fld) => (
                  <li key={fld.id}>
                    {fld.name} ({fld.sportType}) —{' '}
                    {fld.isActive ? (
                      <span className="badge">active</span>
                    ) : (
                      <span className="badge badge-warm">maintenance</span>
                    )}{' '}
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => toggleFieldMaintenance(fld.id, !fld.isActive)}
                    >
                      {fld.isActive ? 'Mark maintenance' : 'Mark available'}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Competitions on your fields</h2>
        {hosted.length === 0 ? (
          <p className="muted">No competition matches assigned to your fields yet.</p>
        ) : (
          <ul>
            {hosted.map((h) => (
              <li key={h.competition.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{h.competition.name}</strong> — {h.matches.length} match(es) scheduled
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Booking requests</h2>
        {bookings.length === 0 ? (
          <p className="muted">No bookings.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Field</th>
                <th>When</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.user?.name}</td>
                  <td>{b.field?.name}</td>
                  <td>
                    {b.bookingDate?.slice?.(0, 10)} {b.startTime}–{b.endTime}
                  </td>
                  <td>{b.status}</td>
                  <td>
                    {b.field?.facility?.approvalRequired && b.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => approve(b.id, true)}
                        >
                          Approve
                        </button>{' '}
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => approve(b.id, false)}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function SponsorDashboard() {
  const { user, refreshUser } = useAuth();
  const verStatus = user?.roleVerificationStatus;
  const approved = verStatus !== 'PENDING' && verStatus !== 'REJECTED';

  const [offers, setOffers] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [offerCompId, setOfferCompId] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerPool, setOfferPool] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [o, a, c, sp] = await Promise.all([
        apiRequest('/api/sponsor/offers'),
        apiRequest('/api/sponsor/analytics'),
        apiRequest('/api/public/competitions', { token: null }),
        apiRequest('/api/sponsor/sponsor-profile'),
      ]);
      setOffers(o.offers || []);
      setAnalytics(a.analytics || []);
      setCompetitions(c.competitions || []);
      const s = sp.sponsor;
      if (s) {
        setCompanyName(s.companyName || '');
        setLogoUrl(s.logoUrl || '');
        setWebsite(s.website || '');
        setDescription(s.description || '');
      }
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    if (!approved) {
      setOffers([]);
      setAnalytics([]);
      setCompetitions([]);
      setErr('');
      return;
    }
    load();
  }, [load, approved]);

  useEffect(() => {
    if (!approved) return;
    if (competitions.length && !offerCompId) {
      setOfferCompId(String(competitions[0].id));
    }
  }, [competitions, offerCompId, approved]);

  async function saveCompany(e) {
    e.preventDefault();
    setMsg(null);
    if (!companyName.trim()) {
      setMsg({ type: 'error', text: 'Company name is required.' });
      return;
    }
    try {
      await apiRequest('/api/sponsor/sponsor-profile', {
        method: 'PUT',
        body: {
          companyName: companyName.trim(),
          website: website.trim() || undefined,
          description: description.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
        },
      });
      setMsg({ type: 'ok', text: 'Sponsor profile updated.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function submitOffer(e) {
    e.preventDefault();
    setMsg(null);
    const amt = Number(offerAmount);
    if (!offerCompId || !Number.isFinite(amt) || amt < 0) {
      setMsg({ type: 'error', text: 'Choose a competition and a valid budget.' });
      return;
    }
    try {
      const pool = offerPool.trim() ? Number(offerPool) : 0;
      await apiRequest('/api/sponsor/offers', {
        method: 'POST',
        body: {
          competitionId: Number(offerCompId),
          amount: amt,
          rewardContribution: Number.isFinite(pool) ? pool : 0,
          notes: offerNotes.trim() || undefined,
        },
      });
      setOfferAmount('');
      setOfferPool('');
      setOfferNotes('');
      setMsg({
        type: 'ok',
        text: 'Sponsorship submitted — pending platform approval.',
      });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function saveAd(sponsorshipId, adHeadline, adImageUrl) {
    setMsg(null);
    try {
      await apiRequest(`/api/sponsor/offers/${sponsorshipId}/ad`, {
        method: 'PUT',
        body: {
          adHeadline: adHeadline.trim() || null,
          adImageUrl: adImageUrl.trim() || null,
        },
      });
      setMsg({ type: 'ok', text: 'Sponsorship creative saved.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function acknowledge(sponsorshipId) {
    setMsg(null);
    try {
      await apiRequest(`/api/sponsor/offers/${sponsorshipId}/acknowledge`, {
        method: 'POST',
      });
      setMsg({ type: 'ok', text: 'Agreement acknowledged.' });
      await load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <div>
      <h1 className="page-title">Sponsor dashboard</h1>
      <p className="muted">
        Sponsor events, manage budgets and branding, and review performance for your approved
        partnerships. You cannot manage facilities or player bookings from here.
      </p>
      {err ? <div className="alert alert-error">{err}</div> : null}
      {msg ? (
        <div
          className={
            msg.type === 'ok' ? 'alert alert-success' : 'alert alert-error'
          }
        >
          {msg.text}
        </div>
      ) : null}

      <RoleVerificationBanner
        roleLabel="sponsor"
        status={verStatus}
        onRefresh={() => refreshUser()}
      />

      {!approved ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Sponsor tools (profile, offers, analytics) unlock after an administrator approves your
            account from the <strong>Admin dashboard</strong> (Pending facility owners &amp;
            sponsors).
          </p>
        </div>
      ) : (
        <>
      <div className="card">
        <h2>Brand profile</h2>
        <form onSubmit={saveCompany}>
          <div className="form-group">
            <label htmlFor="co">Company name</label>
            <input
              id="co"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="logo">Logo image URL</label>
            <input
              id="logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="web">Website</label>
            <input id="web" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="desc">Description</label>
            <textarea
              id="desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save profile
          </button>
        </form>
      </div>

      <div className="card">
        <h2>New sponsorship offer</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: '0.88rem' }}>
          Propose a budget for a competition. Platform administrators approve before it goes live.
        </p>
        <form onSubmit={submitOffer}>
          <div className="form-group">
            <label>Competition</label>
            <select
              value={offerCompId}
              onChange={(e) => setOfferCompId(e.target.value)}
              disabled={!competitions.length}
            >
              {competitions.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Budget (USD)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Reward pool contribution (USD, optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={offerPool}
              onChange={(e) => setOfferPool(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea rows={2} value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!competitions.length}>
            Submit offer
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Engagement & participation</h2>
        {analytics.length === 0 ? (
          <p className="muted">No sponsorship records yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Competition</th>
                <th>Status</th>
                <th>Teams</th>
                <th>Matches</th>
                <th>Played</th>
                <th>Budget</th>
                <th>Ack</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((row) => (
                <tr key={row.sponsorshipId}>
                  <td>{row.competition?.name}</td>
                  <td>{row.status}</td>
                  <td>{row.competition?.teamCount}</td>
                  <td>{row.competition?.matchCount}</td>
                  <td>{row.competition?.playedMatches}</td>
                  <td>${Number(row.amount).toFixed(2)}</td>
                  <td>{row.sponsorAcknowledged ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>My sponsorship offers ({offers.length})</h2>
        {offers.length === 0 ? (
          <p className="muted">No offers yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Competition</th>
                <th>Amount</th>
                <th>Reward pool</th>
                <th>Status</th>
                <th>Creative</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td>{o.competition?.name}</td>
                  <td>${Number(o.amount).toFixed(2)}</td>
                  <td>${Number(o.rewardContribution).toFixed(2)}</td>
                  <td>{o.status}</td>
                  <td style={{ minWidth: 220 }}>
                    {o.status === 'APPROVED' ? (
                      <SponsorAdRow
                        offer={o}
                        onSave={(headline, img) => saveAd(o.id, headline, img)}
                        onAck={() => acknowledge(o.id)}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}
    </div>
  );
}

function SponsorAdRow({ offer, onSave, onAck }) {
  const [headline, setHeadline] = useState(offer.adHeadline || '');
  const [img, setImg] = useState(offer.adImageUrl || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <input
        placeholder="Ad headline"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        style={{ fontSize: '0.85rem' }}
      />
      <input
        placeholder="Banner image URL"
        value={img}
        onChange={(e) => setImg(e.target.value)}
        style={{ fontSize: '0.85rem' }}
      />
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => onSave(headline, img)}>
          Save ad
        </button>
        {!offer.sponsorAcknowledged ? (
          <button type="button" className="btn btn-sm" onClick={onAck}>
            Acknowledge agreement
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [pendingRoles, setPendingRoles] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(null);

  const loadAll = useCallback(async () => {
    setErr('');
    try {
      const [s, u, b, f, r, p] = await Promise.all([
        apiRequest('/api/admin/stats'),
        apiRequest('/api/admin/users'),
        apiRequest('/api/admin/bookings'),
        apiRequest('/api/admin/facilities'),
        apiRequest('/api/admin/rewards'),
        apiRequest('/api/admin/pending-role-verifications'),
      ]);
      setStats(s.stats);
      setUsers(u.users || []);
      setBookings(b.bookings || []);
      setFacilities(f.facilities || []);
      setRewards(r.rewards || []);
      setPendingRoles(p.pending || []);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function setStatus(userId, status) {
    setMsg(null);
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: { status },
      });
      await loadAll();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function toggleFacility(id, isActive) {
    setMsg(null);
    try {
      await apiRequest(`/api/admin/facilities/${id}/active`, {
        method: 'PATCH',
        body: { isActive },
      });
      await loadAll();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function setRewardStatus(rewardId, status) {
    setMsg(null);
    try {
      await apiRequest(`/api/admin/rewards/${rewardId}`, {
        method: 'PATCH',
        body: { status },
      });
      await loadAll();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function approvePendingUser(userId) {
    setMsg(null);
    try {
      await apiRequest(`/api/admin/pending-role-verifications/${userId}/approve`, {
        method: 'POST',
      });
      await loadAll();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  async function rejectPendingUser(userId) {
    setMsg(null);
    try {
      await apiRequest(`/api/admin/pending-role-verifications/${userId}/reject`, {
        method: 'POST',
      });
      await loadAll();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <div>
      <h1 className="page-title">Admin dashboard</h1>
      <p className="muted">
        Reports and controls: platform-wide stats, all bookings, venues, users, and reward
        approvals.
      </p>
      <p style={{ marginBottom: '1rem' }}>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => loadAll()}>
          Refresh data
        </button>
      </p>
      {err ? <div className="alert alert-error">{err}</div> : null}
      {msg?.type === 'error' ? <div className="alert alert-error">{msg.text}</div> : null}

      <div className="card">
        <h2>Pending facility owners & sponsors</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          New sponsor and facility owner registrations appear here. Approve or reject each request —
          no email is required.
        </p>
        {pendingRoles.length === 0 ? (
          <p className="muted">No pending requests.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Requested role</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pendingRoles.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    {u.role?.name === 'FACILITY_OWNER'
                      ? 'Facility owner'
                      : u.role?.name === 'SPONSOR'
                        ? 'Sponsor'
                        : u.role?.name || '—'}
                  </td>
                  <td>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => approvePendingUser(u.id)}
                    >
                      Approve
                    </button>{' '}
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => rejectPendingUser(u.id)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {stats ? (
        <div className="card card-glow">
          <h2>Platform overview</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li>Users: {stats.users}</li>
            <li>Facilities: {stats.facilities}</li>
            <li>Bookings: {stats.bookings}</li>
            <li>Total paid (all payments): ${Number(stats.totalPaidAmount).toFixed(2)}</li>
            <li>Competitions: {stats.competitions}</li>
            <li>Pending rewards: {stats.rewardsPending}</li>
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h2>Booking report</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Every booking on the platform — player, venue, field, time, status, payment.
        </p>
        {bookings.length === 0 ? (
          <p className="muted">No bookings yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Player</th>
                  <th>Field</th>
                  <th>Venue</th>
                  <th>City</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Booking</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((bk) => (
                  <tr key={bk.id}>
                    <td>{bk.id}</td>
                    <td>{bk.user?.name}</td>
                    <td>{bk.field?.name}</td>
                    <td>{bk.field?.facility?.name}</td>
                    <td>{bk.field?.facility?.city}</td>
                    <td>{bk.bookingDate?.slice?.(0, 10)}</td>
                    <td>
                      {bk.startTime}–{bk.endTime}
                    </td>
                    <td>
                      <span className="badge">{bk.status}</span>
                    </td>
                    <td>
                      {bk.payment?.status || '—'}{' '}
                      {bk.payment ? `$${Number(bk.payment.amount).toFixed(2)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Venues (facilities)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Activate or deactivate listings on the platform.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>City</th>
                <th>Fields</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {facilities.map((fac) => (
                <tr key={fac.id}>
                  <td>{fac.name}</td>
                  <td>{fac.city}</td>
                  <td>{fac.fields?.length ?? 0}</td>
                  <td>{fac.isActive ? 'Yes' : 'No'}</td>
                  <td>
                    {fac.isActive ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => toggleFacility(fac.id, false)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => toggleFacility(fac.id, true)}
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Rewards</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Approve or mark rewards as paid.
        </p>
        {rewards.length === 0 ? (
          <p className="muted">No rewards.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Competition</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rewards.map((rw) => (
                  <tr key={rw.id}>
                    <td>{rw.team?.name}</td>
                    <td>{rw.competition?.name || '—'}</td>
                    <td>${Number(rw.amount).toFixed(2)}</td>
                    <td>
                      <span className="badge">{rw.status}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {rw.status === 'PENDING' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => setRewardStatus(rw.id, 'APPROVED')}
                          >
                            Approve
                          </button>{' '}
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setRewardStatus(rw.id, 'PAID')}
                          >
                            Mark paid
                          </button>
                        </>
                      ) : rw.status === 'APPROVED' ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => setRewardStatus(rw.id, 'PAID')}
                        >
                          Mark paid
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Users</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verification</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.slice(0, 80).map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role?.name}</td>
                <td>
                  <span className="badge">{u.roleVerificationStatus || '—'}</span>
                </td>
                <td>{u.status}</td>
                <td>
                  {u.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setStatus(u.id, 'SUSPENDED')}
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setStatus(u.id, 'ACTIVE')}
                    >
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
