import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { COMPETITION_CARD_BACKGROUNDS } from '../constants/sportImages.js';

const CARD_BG = COMPETITION_CARD_BACKGROUNDS;
const VOLUNTEER_KEY = 'sportsbook_volunteer_players_v1';

function maxTeamsCap(c) {
  return c.maxTeams ?? 8;
}

function qualifiedCount(c) {
  return (c.teams || []).filter((ct) => ct.qualificationStatus === 'QUALIFIED').length;
}

/** Applications still active (excludes rejected). */
function appliedActiveCount(c) {
  return (c.teams || []).filter((ct) => ct.qualificationStatus !== 'REJECTED').length;
}

function isMainDrawFull(c) {
  return qualifiedCount(c) >= maxTeamsCap(c);
}

function statusLabel(status) {
  switch (status) {
    case 'APPLIED':
      return 'Applied — pending admin review';
    case 'APPROVED_FOR_QUALIFIERS':
      return 'Approved for qualifiers';
    case 'QUALIFIED':
      return 'Qualified for main competition';
    case 'REJECTED':
      return 'Rejected — you may apply again if slots remain';
    default:
      return status || '—';
  }
}

function rosterRows(detail, view, teamSearch) {
  const q = teamSearch.trim().toLowerCase();
  let rows = detail.teams || [];
  if (view === 'qualified') {
    rows = rows.filter((ct) => ct.qualificationStatus === 'QUALIFIED');
  }
  if (q) {
    rows = rows.filter((ct) => (ct.team?.name || '').toLowerCase().includes(q));
  }
  return rows;
}

export default function Competitions() {
  const { user, isRole } = useAuth();
  const canJoin = user && isRole('PLAYER');

  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const [teams, setTeams] = useState([]);
  const [joinTeamId, setJoinTeamId] = useState('');
  const [joinMsg, setJoinMsg] = useState(null);
  const [volunteerSport, setVolunteerSport] = useState('Soccer');
  const [volunteerTime, setVolunteerTime] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');
  const [volunteerNote, setVolunteerNote] = useState('');
  const [volunteerMsg, setVolunteerMsg] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [rosterView, setRosterView] = useState('qualified');

  const loadVolunteerData = useCallback(() => {
    try {
      const raw = localStorage.getItem(VOLUNTEER_KEY);
      const list = raw ? JSON.parse(raw) : [];
      setVolunteers(Array.isArray(list) ? list : []);
    } catch {
      setVolunteers([]);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/api/public/competitions', { token: null });
      setCompetitions(data.competitions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadVolunteerData();
  }, [loadVolunteerData]);

  useEffect(() => {
    if (!canJoin) {
      setTeams([]);
      return;
    }
    let c = false;
    (async () => {
      try {
        const data = await apiRequest('/api/player/teams');
        if (!c) {
          setTeams(data.teams || []);
          const first = data.teams?.[0];
          setJoinTeamId(first ? String(first.id) : '');
        }
      } catch {
        if (!c) setTeams([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [canJoin]);

  async function loadDetail(id) {
    setExpandedId(id);
    setDetail(null);
    setTeamSearch('');
    setRosterView('qualified');
    try {
      const data = await apiRequest(`/api/public/competitions/${id}`, {
        token: null,
      });
      setDetail(data.competition);
    } catch {
      setDetail(null);
    }
  }

  function myApplicationForCompetition(c) {
    if (!joinTeamId) return null;
    const tid = Number(joinTeamId);
    return (c.teams || []).find((ct) => ct.teamId === tid) || null;
  }

  async function applyToQualifiers(competitionId) {
    setJoinMsg(null);
    if (!joinTeamId) {
      setJoinMsg({ type: 'error', text: 'Select a team.' });
      return;
    }
    try {
      await apiRequest(`/api/player/competitions/${competitionId}/apply-qualifiers`, {
        method: 'POST',
        body: { teamId: Number(joinTeamId) },
      });
      setJoinMsg({
        type: 'ok',
        text: 'Application sent. An admin will review your team before qualifiers.',
      });
      await loadDetail(competitionId);
      await loadList();
    } catch (e) {
      setJoinMsg({ type: 'error', text: e.message });
    }
  }

  function saveVolunteer(list) {
    localStorage.setItem(VOLUNTEER_KEY, JSON.stringify(list));
    setVolunteers(list);
  }

  function submitVolunteer(e) {
    e.preventDefault();
    setVolunteerMsg(null);
    if (!user || !isRole('PLAYER')) {
      setVolunteerMsg({ type: 'error', text: 'Log in as a player to volunteer.' });
      return;
    }
    if (!volunteerSport || !volunteerTime.trim()) {
      setVolunteerMsg({ type: 'error', text: 'Please add sport and availability.' });
      return;
    }
    if (!volunteerPhone.trim()) {
      setVolunteerMsg({ type: 'error', text: 'Please add your phone number for contact.' });
      return;
    }
    const alreadyVolunteered = volunteers.some((v) => v.userId === user.id);
    if (alreadyVolunteered) {
      setVolunteerMsg({
        type: 'error',
        text: 'You already applied as a volunteer. Cancel your current application first.',
      });
      return;
    }
    const item = {
      id: Date.now(),
      userId: user.id,
      name: user.name,
      sport: volunteerSport,
      availability: volunteerTime.trim(),
      phone: volunteerPhone.trim(),
      note: volunteerNote.trim(),
      createdAt: new Date().toISOString(),
    };
    saveVolunteer([item, ...volunteers]);
    setVolunteerTime('');
    setVolunteerPhone('');
    setVolunteerNote('');
    setVolunteerMsg({ type: 'ok', text: 'You are now listed as an available player.' });
  }

  function cancelVolunteerApply() {
    if (!user) return;
    const next = volunteers.filter((v) => v.userId !== user.id);
    saveVolunteer(next);
    setVolunteerMsg({ type: 'ok', text: 'Your volunteer application has been canceled.' });
  }

  return (
    <div>
      <h1 className="page-title">Competitions</h1>
      <p className="muted" style={{ marginBottom: '1.5rem', maxWidth: 560 }}>
        Tournaments use a qualification flow: your team applies first, an admin approves you for
        qualifiers, then the best teams are marked qualified for the main draw (limited by max teams).
        Expand a card for rosters and sponsors.
      </p>

      {!canJoin ? (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <p style={{ margin: 0 }}>
            <Link to="/login">Log in</Link> as a player to apply with a team.
          </p>
        </div>
      ) : teams.length === 0 ? (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <p className="muted" style={{ margin: 0 }}>
            Create a team from your <Link to="/dashboard">dashboard</Link> first.
          </p>
        </div>
      ) : (
        <div className="form-group" style={{ maxWidth: 400 }}>
          <label htmlFor="teamPick">Team for applications</label>
          <select
            id="teamPick"
            value={joinTeamId}
            onChange={(e) => setJoinTeamId(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {joinMsg ? (
        <div className={joinMsg.type === 'ok' ? 'alert alert-success' : 'alert alert-error'}>
          {joinMsg.text}
        </div>
      ) : null}

      <div className="card card-glow" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ marginBottom: '0.35rem' }}>Need players? Find volunteers</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Players can volunteer to fill missing team spots and share their sport and phone contact.
        </p>
        {!canJoin ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            <Link to="/login">Log in</Link> as a player to volunteer.
          </p>
        ) : (
          <>
            <form onSubmit={submitVolunteer} className="volunteer-form">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="vol-sport">Sport</label>
                <select
                  id="vol-sport"
                  value={volunteerSport}
                  onChange={(e) => setVolunteerSport(e.target.value)}
                >
                  <option value="Soccer">Soccer</option>
                  <option value="Basketball">Basketball</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Volleyball">Volleyball</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="vol-time">Availability</label>
                <input
                  id="vol-time"
                  placeholder="e.g. Tue/Thu after 7pm"
                  value={volunteerTime}
                  onChange={(e) => setVolunteerTime(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="vol-note">Short note</label>
                <input
                  id="vol-note"
                  placeholder="Position, level, city..."
                  value={volunteerNote}
                  onChange={(e) => setVolunteerNote(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="vol-phone">Phone</label>
                <input
                  id="vol-phone"
                  type="tel"
                  placeholder="e.g. +961 70 123 456"
                  value={volunteerPhone}
                  onChange={(e) => setVolunteerPhone(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Volunteer
              </button>
            </form>
            {volunteerMsg ? (
              <div
                className={volunteerMsg.type === 'ok' ? 'alert alert-success' : 'alert alert-error'}
                style={{ marginTop: '0.85rem' }}
              >
                {volunteerMsg.text}
              </div>
            ) : null}
            <div style={{ marginTop: '0.95rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.65rem' }}>Available players</h3>
              {volunteers.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No volunteer players yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {volunteers.map((v) => (
                    <div
                      key={v.id}
                      className="facility-card-body"
                      style={{ border: '1px solid var(--border)', borderRadius: 10 }}
                    >
                      <strong>{v.name}</strong>
                      <p className="muted" style={{ margin: '0.2rem 0 0.45rem' }}>
                        {v.sport} · {v.availability}
                        {v.note ? ` · ${v.note}` : ''}
                      </p>
                      <p className="muted" style={{ margin: '0 0 0.45rem' }}>
                        Contact: {v.phone || 'Not provided'}
                      </p>
                      {user?.id === v.userId ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={cancelVolunteerApply}
                        >
                          Cancel my volunteer apply
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <p className="muted">Loading competitions…</p>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {competitions.map((c, idx) => {
            const bg = CARD_BG[idx % CARD_BG.length];
            const open = c.status === 'OPEN';
            const full = isMainDrawFull(c);
            const cap = maxTeamsCap(c);
            const qN = qualifiedCount(c);
            const appliedN = appliedActiveCount(c);
            const sportLabel = c.sportType || 'Multi-sport';
            const mine = canJoin ? myApplicationForCompetition(c) : null;
            const canSubmitApply =
              canJoin &&
              open &&
              !full &&
              (!mine || mine.qualificationStatus === 'REJECTED');
            let applyDisabledReason = null;
            if (mine?.qualificationStatus === 'APPLIED') {
              applyDisabledReason = 'Application pending review';
            } else if (mine?.qualificationStatus === 'APPROVED_FOR_QUALIFIERS') {
              applyDisabledReason = 'Approved for qualifiers — awaiting final qualification';
            } else if (mine?.qualificationStatus === 'QUALIFIED') {
              applyDisabledReason = 'Team already in main draw';
            }
            return (
              <li
                key={c.id}
                className="facility-card"
                style={{ marginBottom: '1.25rem', overflow: 'hidden' }}
              >
                <div
                  style={{
                    height: 140,
                    backgroundImage: `linear-gradient(to right, rgba(12,17,24,0.92), rgba(12,17,24,0.55)), url(${bg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '1.2rem' }}>{c.name}</strong>{' '}
                        <span className={open ? 'badge' : 'badge badge-warm'}>{c.status}</span>
                        <span className="badge" style={{ marginLeft: '0.35rem' }}>
                          Sport: {sportLabel}
                        </span>
                        {full ? (
                          <span className="badge badge-warm" style={{ marginLeft: '0.35rem' }}>
                            Competition full
                          </span>
                        ) : null}
                        <div className="muted" style={{ marginTop: '0.35rem' }}>
                          Starts {c.startDate?.slice?.(0, 10) || c.startDate}
                        </div>
                        <div className="muted" style={{ marginTop: '0.25rem' }}>
                          Applied teams: {appliedN} · Qualified: {qN}/{cap}
                        </div>
                        {mine ? (
                          <div className="muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
                            Your team: <strong>{statusLabel(mine.qualificationStatus)}</strong>
                          </div>
                        ) : null}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => loadDetail(c.id)}
                        >
                          {expandedId === c.id ? 'Refresh details' : 'Details'}
                        </button>
                        {canJoin && open && full ? (
                          <button type="button" className="btn btn-sm" disabled>
                            Competition full
                          </button>
                        ) : null}
                        {canJoin && open && !full && canSubmitApply ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => applyToQualifiers(c.id)}
                          >
                            Apply to qualifiers
                          </button>
                        ) : null}
                        {canJoin && open && !full && applyDisabledReason ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled
                            title={applyDisabledReason}
                          >
                            {applyDisabledReason}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                {expandedId === c.id && detail?.id === c.id ? (
                  <div className="facility-card-body" style={{ borderTop: '1px solid var(--border)' }}>
                    <p style={{ marginTop: 0 }}>
                      <span className="badge">Sport: {detail.sportType || 'Multi-sport'}</span>{' '}
                      <span className="muted">
                        Applied teams: {appliedActiveCount(detail)} · Qualified:{' '}
                        {qualifiedCount(detail)}/{maxTeamsCap(detail)}
                      </span>
                      {isMainDrawFull(detail) ? (
                        <>
                          {' '}
                          <span className="badge badge-warm">Competition full</span>
                        </>
                      ) : null}
                    </p>
                    <p>{detail.description}</p>
                    <h3 style={{ fontSize: '1rem' }}>Teams</h3>
                    <p className="muted" style={{ marginTop: '-0.25rem', fontSize: '0.9rem' }}>
                      <strong>Qualified</strong> teams are in the main draw. Other rows are still in the
                      application pipeline.
                    </p>
                    <div className="form-group" style={{ maxWidth: 360 }}>
                      <label htmlFor={`roster-view-${detail.id}`}>Show list</label>
                      <select
                        id={`roster-view-${detail.id}`}
                        value={rosterView}
                        onChange={(e) => setRosterView(e.target.value)}
                      >
                        <option value="qualified">Qualified teams (main draw)</option>
                        <option value="all">All applications</option>
                      </select>
                    </div>
                    {(detail.teams?.length ?? 0) > 4 ? (
                      <div className="form-group" style={{ maxWidth: 320 }}>
                        <label htmlFor={`team-filter-${detail.id}`}>Search by team name</label>
                        <input
                          id={`team-filter-${detail.id}`}
                          placeholder="Type to filter…"
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <ul>
                      {rosterRows(detail, rosterView, teamSearch).map((ct) => (
                        <li key={ct.id}>
                          {ct.team?.name}{' '}
                          <span className="badge badge-warm">{ct.qualificationStatus}</span>
                        </li>
                      ))}
                    </ul>
                    {rosterRows(detail, rosterView, teamSearch).length === 0 ? (
                      <p className="muted">No teams match this view or search.</p>
                    ) : null}
                    <h3 style={{ fontSize: '1rem' }}>Sponsors</h3>
                    <ul style={{ paddingLeft: '1.1rem' }}>
                      {detail.sponsorships?.length ? (
                        detail.sponsorships.map((s) => (
                          <li key={s.id} style={{ marginBottom: '0.75rem' }}>
                            <strong>{s.sponsor?.companyName}</strong> — $
                            {Number(s.amount).toFixed(2)}
                            {s.status === 'APPROVED' ? (
                              <span className="badge" style={{ marginLeft: '0.35rem' }}>
                                approved
                              </span>
                            ) : (
                              <span className="badge badge-warm" style={{ marginLeft: '0.35rem' }}>
                                {s.status}
                              </span>
                            )}
                            {s.adHeadline ? (
                              <div
                                className="card"
                                style={{
                                  marginTop: '0.5rem',
                                  padding: '0.65rem 0.85rem',
                                  fontSize: '0.9rem',
                                }}
                              >
                                {s.adImageUrl ? (
                                  <div
                                    style={{
                                      height: 72,
                                      borderRadius: 6,
                                      marginBottom: '0.45rem',
                                      backgroundImage: `url(${s.adImageUrl})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                    }}
                                    role="presentation"
                                  />
                                ) : null}
                                {s.adHeadline}
                              </div>
                            ) : null}
                          </li>
                        ))
                      ) : (
                        <li className="muted">None listed</li>
                      )}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
