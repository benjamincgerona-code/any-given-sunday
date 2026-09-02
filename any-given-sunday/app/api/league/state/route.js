import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Everything a league's home screen needs in one call: league info, players,
// the current (most recent) week with its games, all picks/tiebreakers so
// far, current week's payment status, and season-long standings.
// Query: ?leagueId=...
export async function GET(request) {
  const leagueId = request.nextUrl.searchParams.get('leagueId');
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: league, error: leagueError } = await db
    .from('leagues')
    .select('id, name, join_code, entry_fee_cents, season_year, logo_color, announcement, created_at')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }

  const [{ data: players }, { data: weeks }] = await Promise.all([
    db.from('players').select('*').eq('league_id', leagueId).order('created_at'),
    db.from('weeks').select('*').eq('league_id', leagueId).order('week_number'),
  ]);

  const weekIds = (weeks || []).map((w) => w.id);

  const [{ data: games }, { data: tiebreakers }, { data: payments }] = await Promise.all([
    weekIds.length
      ? db.from('games').select('*').in('week_id', weekIds).order('kickoff_at')
      : Promise.resolve({ data: [] }),
    weekIds.length
      ? db.from('tiebreakers').select('*').in('week_id', weekIds)
      : Promise.resolve({ data: [] }),
    weekIds.length
      ? db.from('payments').select('*').in('week_id', weekIds)
      : Promise.resolve({ data: [] }),
  ]);

  const gameIds = (games || []).map((g) => g.id);
  const { data: picks } = gameIds.length
    ? await db.from('picks').select('*').in('game_id', gameIds)
    : { data: [] };

  // Most recent open/locked week, falling back to the most recently scored one.
  const activeWeeks = (weeks || []).filter((w) => w.status === 'open' || w.status === 'locked');
  const currentWeek =
    activeWeeks[activeWeeks.length - 1] ||
    (weeks && weeks.length ? weeks[weeks.length - 1] : null);

  const currentWeekGames = currentWeek
    ? (games || []).filter((g) => g.week_id === currentWeek.id)
    : [];
  const currentWeekTiebreakers = currentWeek
    ? (tiebreakers || []).filter((t) => t.week_id === currentWeek.id)
    : [];
  const currentWeekPayments = currentWeek
    ? (payments || []).filter((p) => p.week_id === currentWeek.id)
    : [];

  const standings = (players || [])
    .map((p) => {
      const seasonCorrect = (picks || []).filter(
        (pk) => pk.player_id === p.id && pk.is_correct === true
      ).length;
      const weeksWon = (weeks || []).filter((w) => w.winner_player_id === p.id).length;
      return { playerId: p.id, nickname: p.nickname, seasonCorrect, weeksWon };
    })
    .sort((a, b) => b.seasonCorrect - a.seasonCorrect || b.weeksWon - a.weeksWon);

  return NextResponse.json({
    league,
    players,
    weeks,
    currentWeek,
    games: currentWeekGames,
    picks: picks || [],
    tiebreakers: currentWeekTiebreakers,
    payments: currentWeekPayments,
    standings,
  });
}
