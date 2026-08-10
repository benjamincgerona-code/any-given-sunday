'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ShieldLogo from './ShieldLogo';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState('join'); // 'join' | 'create'
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/league/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode, nickname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('ags_player', JSON.stringify(data.player));
      localStorage.setItem('ags_league', JSON.stringify(data.league));
      router.push('/league');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/league/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueName, commissionerNickname: nickname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('ags_player', JSON.stringify(data.player));
      localStorage.setItem('ags_league', JSON.stringify(data.league));
      localStorage.setItem('ags_commissioner_pin', data.commissionerPin);
      router.push('/commissioner');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="brand">
        <ShieldLogo />
        <div>
          <h1 style={{ fontSize: 20 }}>Any Given Sunday</h1>
          <div className="label" style={{ marginBottom: 0 }}>Weekly NFL Pick&apos;em</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${mode === 'join' ? 'active' : ''}`} onClick={() => setMode('join')}>
          Join League
        </div>
        <div className={`tab ${mode === 'create' ? 'active' : ''}`} onClick={() => setMode('create')}>
          Start a League
        </div>
      </div>

      {mode === 'join' ? (
        <form className="card" onSubmit={handleJoin}>
          <div className="label">League Code</div>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. 7F3K9Q"
            maxLength={6}
            required
          />
          <div className="label">Your Nickname</div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Gridiron Greg"
            required
          />
          {error && <div className="error-text">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Joining...' : 'Join League'}
          </button>
        </form>
      ) : (
        <form className="card" onSubmit={handleCreate}>
          <div className="label">League Name</div>
          <input
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="e.g. The Boys Pick'em"
            required
          />
          <div className="label">Your Nickname (you&apos;ll be commissioner)</div>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Commissioner Chris"
            required
          />
          {error && <div className="error-text">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create League'}
          </button>
        </form>
      )}
    </div>
  );
}
