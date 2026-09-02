'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ShieldLogo from '../ShieldLogo';

function formatKickoff(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LeaguePage() {
  const router = useRouter();
  const [player, setPlayer] = useState(null);
  const [league, setLeague] = useState(null);
  const [state, setState] = useState(null);
  const [selections, setSelections] = useState({});
  const [tiebreaker, setTiebreaker] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedPlayer = localStorage.getItem('ags_player');
    const storedLeague = localStorage.getItem('ags_league');
    if (!storedPlayer || !storedLeague) {
      router.push('/');
      return;
    }
    setPlayer(JSON.parse(storedPlayer));
    setLeague(JSON.parse(storedLeague));
  }, [router]);

  const loadState = useCallback(async (leagueId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/league/state?leagueId=${leagueId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (league) loadState(league.id);
  }, [league, loadState]);

  useEffect(() => {
    if (!state?.currentWeek || !player) return;
    const myPicks = state.picks.filter(
      (p) => p.player_id === player.id && state.games.some((g) => g.id === p.game_id)
    );
    setSelections(Object.fromEntries(myPicks.map((p) => [p.game_id, p.picked_team])));
    const myTb = state.tiebreakers.find((t) => t.player_id === player.id);
    if (myTb) setTiebreaker(String(myTb.guessed_total_points));
  }, [state, player]);

  if (!player || !league) return null;
  if (loading) return <div className="container">Loading…</div>;
  if (error && !state) {
    return (
      <div className="container">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  const week = state.currentWeek;
  const isLocked = week && new Date() >= new Date(week.locked_at);
  const myPayment = state.payments.find((p) => p.player_id === player.id);

  function pick(gameId, team) {
    if (isLocked) return;
    setSelections((s) => ({ ...s, [gameId]: team }));
  }

  async function submitPicks() {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const picks = Object.entries(selections).map(([gameId, pickedTeam]) => ({
        gameId,
        pickedTeam,
      }));
      const res = await fetch('/api/picks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          weekId: week.id,
          picks,
          tiebreakerPoints: tiebreaker === '' ? undefined : Number(tiebreaker),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice('Picks saved!');
      loadState(league.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaid() {
    setError('');
    try {
      const res = await fetch('/api/payments/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, weekId: week.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadState(league.id);
    } catch (err) {
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem('ags_player');
    localStorage.removeItem('ags_league');
    localStorage.removeItem('ags_commissioner_pin');
    router.push('/');
  }

  return (
    <div className="container">
      <div className="brand" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldLogo />
          <div>
            <h1 style={{ fontSize: 20 }}>{league.name}</h1>
            <div className="label" style={{ marginBottom: 0 }}>Code {league.join_code}</div>
          </div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} onClick={logout}>
          Log out
        </button>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="label">Season Pot</div>
        <div className="pot-display">${((week?.pot_cents ?? 0) / 100).toFixed(2)}</div>
        {player.is_commissioner && (
          <button
            className="btn-secondary"
            style={{ marginTop: 12 }}
            onClick={() => router.push('/commissioner')}
          >
            Commissioner Dashboard
          </button>
        )}
      </div>

      {error && <div className="error-text">{error}</div>}
      {notice && <div className="card" style={{ color: 'var(--success)' }}>{notice}</div>}

      {!week && (
        <div className="card">Waiting for the commissioner to open Week 1.</div>
      )}

      {week && (
        <div className="card">
          <div className="label" style={{ marginBottom: 12 }}>
            Week {week.week_number} · {week.status === 'scored' ? 'Final' : isLocked ? 'Locked' : 'Open'}
          </div>

          {state.games.map((game) => {
            const mine = selections[game.id];
            const scored = week.status === 'scored';
            const myPick = state.picks.find(
              (p) => p.player_id === player.id && p.game_id === game.id
            );
            return (
              <div key={game.id} style={{ marginBottom: 16 }}>
                <div className="label" style={{ marginBottom: 6 }}>
                  {formatKickoff(game.kickoff_at)}
                  {game.is_mnf ? ' · Tiebreaker Game' : ''}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[game.away_team, game.home_team].map((team) => (
                    <button
                      key={team}
                      type="button"
                      disabled={isLocked}
                      onClick={() => pick(game.id, team)}
                      className="btn-secondary"
                      style={{
                        background: mine === team ? 'var(--accent)' : undefined,
                        borderColor: mine === team ? 'var(--accent)' : undefined,
                        color: mine === team ? 'white' : undefined,
                        opacity: isLocked && mine !== team ? 0.5 : 1,
                      }}
                    >
                      {team}
                      {scored && game.status === 'final' ? ` (${team === game.home_team ? game.home_score : game.away_score})` : ''}
                    </button>
                  ))}
                </div>
                {scored && myPick && (
                  <div className="label" style={{ color: myPick.is_correct ? 'var(--success)' : myPick.is_correct === false ? 'var(--danger)' : undefined }}>
                    {myPick.is_correct === true ? 'Correct' : myPick.is_correct === false ? 'Missed' : 'Push'}
                  </div>
                )}
              </div>
            );
          })}

          <div className="label">MNF Total Points Tiebreaker</div>
          <input
            type="number"
            value={tiebreaker}
            onChange={(e) => setTiebreaker(e.target.value)}
            placeholder="e.g. 45"
            disabled={isLocked}
          />

          {!isLocked && (
            <button onClick={submitPicks} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Picks'}
            </button>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="label">Your Payment ({(league.entry_fee_cents / 100).toFixed(2)})</div>
            {myPayment?.status === 'approved' ? (
              <div style={{ color: 'var(--success)' }}>Paid</div>
            ) : myPayment?.status === 'pending' ? (
              <div style={{ color: 'var(--text-dim)' }}>Pending commissioner approval</div>
            ) : (
              <button className="btn-secondary" onClick={markPaid}>
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="label" style={{ marginBottom: 10 }}>Standings</div>
        {state.standings.map((s, i) => (
          <div
            key={s.playerId}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}
          >
            <span>{i + 1}. {s.nickname}{s.playerId === player.id ? ' (you)' : ''}</span>
            <span>{s.seasonCorrect} correct{s.weeksWon ? ` · ${s.weeksWon} week wins` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
