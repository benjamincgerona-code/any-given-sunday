'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ShieldLogo from '../ShieldLogo';

export default function CommissionerPage() {
  const router = useRouter();
  const [player, setPlayer] = useState(null);
  const [league, setLeague] = useState(null);
  const [pin, setPin] = useState('');
  const [state, setState] = useState(null);
  const [weekNumber, setWeekNumber] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const storedPlayer = localStorage.getItem('ags_player');
    const storedLeague = localStorage.getItem('ags_league');
    const storedPin = localStorage.getItem('ags_commissioner_pin');
    if (!storedPlayer || !storedLeague) {
      router.push('/');
      return;
    }
    const p = JSON.parse(storedPlayer);
    if (!p.is_commissioner) {
      router.push('/league');
      return;
    }
    setPlayer(p);
    setLeague(JSON.parse(storedLeague));
    if (storedPin) setPin(storedPin);
  }, [router]);

  const loadState = useCallback(async (leagueId) => {
    try {
      const res = await fetch(`/api/league/state?leagueId=${leagueId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState(data);
      setWeekNumber(String((data.weeks?.length ?? 0) + 1));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (league) loadState(league.id);
  }, [league, loadState]);

  if (!player || !league) return null;

  async function startWeek() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/week/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: league.id,
          commissionerPin: pin,
          weekNumber: Number(weekNumber),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(`Week ${weekNumber} opened with ${data.games.length} games.`);
      loadState(league.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function approve(playerId) {
    setError('');
    try {
      const res = await fetch('/api/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: league.id,
          commissionerPin: pin,
          weekId: state.currentWeek.id,
          playerId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadState(league.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function runScoring() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/scoring/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: league.id,
          commissionerPin: pin,
          weekId: state.currentWeek.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(data.scored ? 'Week scored and winner crowned!' : data.message);
      loadState(league.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const week = state?.currentWeek;
  const gamesSubmitted = (playerId) =>
    state.picks.filter(
      (p) => p.player_id === playerId && state.games.some((g) => g.id === p.game_id)
    ).length;

  return (
    <div className="container">
      <div className="brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldLogo />
          <div>
            <h1 style={{ fontSize: 20 }}>Commissioner</h1>
            <div className="label" style={{ marginBottom: 0 }}>{league.name}</div>
          </div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => router.push('/league')}>
          Back
        </button>
      </div>

      <div className="card">
        <div className="label">Join Code</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{league.join_code}</div>
        <div className="label">Commissioner PIN</div>
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" maxLength={4} />
      </div>

      {error && <div className="error-text">{error}</div>}
      {notice && <div className="card" style={{ color: 'var(--success)' }}>{notice}</div>}

      <div className="card">
        <div className="label" style={{ marginBottom: 8 }}>Start a Week</div>
        <input
          type="number"
          value={weekNumber}
          onChange={(e) => setWeekNumber(e.target.value)}
          placeholder="Week number"
        />
        <button onClick={startWeek} disabled={busy || !pin || !weekNumber}>
          {busy ? 'Working...' : `Start Week ${weekNumber || ''}`}
        </button>
      </div>

      {week && state && (
        <div className="card">
          <div className="label" style={{ marginBottom: 10 }}>
            Week {week.week_number} · {week.status}
          </div>

          {state.players.map((p) => {
            const payment = state.payments.find((pay) => pay.player_id === p.id);
            return (
              <div
                key={p.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <div>{p.nickname}{p.is_commissioner ? ' (commissioner)' : ''}</div>
                  <div className="label" style={{ marginBottom: 0 }}>
                    {gamesSubmitted(p.id)}/{state.games.length} picks · {payment?.status ?? 'unpaid'}
                  </div>
                </div>
                {payment?.status === 'pending' && (
                  <button
                    className="btn-secondary"
                    style={{ width: 'auto', padding: '8px 12px' }}
                    onClick={() => approve(p.id)}
                  >
                    Approve
                  </button>
                )}
              </div>
            );
          })}

          <button style={{ marginTop: 16 }} onClick={runScoring} disabled={busy || !pin}>
            {busy ? 'Working...' : 'Sync Scores & Run Scoring'}
          </button>
        </div>
      )}
    </div>
  );
}
