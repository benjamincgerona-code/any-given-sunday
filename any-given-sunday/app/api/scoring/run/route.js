import { supabaseAdmin } from '@/lib/supabase';
import { fetchWeekScores } from '@/lib/espn';
import { NextResponse } from 'next/server';

// Commissioner action: pulls final scores from ESPN, grades every pick, and
// — once every game in the week is final — crowns the week's winner using
// most correct picks, then the MNF tiebreaker as the tiebreaker.
// Body: { leagueId, commissionerPin, weekId }
export async function POST(request) {
  const { leagueId, commissionerPin, weekId } = await request.json();

  if (!leagueId || !commissionerPin || !weekId) {
    return NextResponse.json(
      { error: 'leagueId, commissionerPin and weekId are required' },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  const { data: league, error: leagueError } = await db
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }
  if (league.commissioner_pin !== String(commissionerPin)) {
    return NextResponse.json({ error: 'Incorrect commissioner PIN' }, { status: 403 });
  }

  const { data: week, error: weekError } = await db
    .from('weeks')
    .select('*')
    .eq('id', weekId)
    .eq('league_id', leagueId)
    .single();

  if (weekError || !week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  const { data: games, error: gamesError } = await db
    .from('games')
    .select('*')
    .eq('week_id', weekId);

  if (gamesError || !games?.length) {
    return NextResponse.json({ error: 'No games found for this week' }, { status: 404 });
  }

  let liveScores;
  try {
    liveScores = await fetchWeekScores(week.week_number, league.season_year);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  const updatedGames = [];
  for (const game of games) {
    const live = liveScores.get(game.external_game_id);
    if (!live) {
      updatedGames.push(game);
      continue;
    }
    const { data: updated, error } = await db
      .from('games')
      .update({
        home_score: live.homeScore,
        away_score: live.awayScore,
        status: live.status,
      })
      .eq('id', game.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    updatedGames.push(updated);
  }

  const { data: picks, error: picksError } = await db
    .from('picks')
    .select('*')
    .in(
      'game_id',
      updatedGames.map((g) => g.id)
    );

  if (picksError) {
    return NextResponse.json({ error: picksError.message }, { status: 500 });
  }

  const gameById = new Map(updatedGames.map((g) => [g.id, g]));
  for (const pick of picks || []) {
    const game = gameById.get(pick.game_id);
    if (!game || game.status !== 'final' || game.home_score === null || game.away_score === null) {
      continue;
    }
    const winningTeam =
      game.home_score === game.away_score
        ? null
        : game.home_score > game.away_score
          ? game.home_team
          : game.away_team;
    const isCorrect = winningTeam === null ? null : pick.picked_team === winningTeam;

    await db.from('picks').update({ is_correct: isCorrect }).eq('id', pick.id);
  }

  const allFinal = updatedGames.every((g) => g.status === 'final');
  if (!allFinal) {
    return NextResponse.json({
      week,
      games: updatedGames,
      scored: false,
      message: 'Scores synced. Waiting on games still in progress before the week can be closed out.',
    });
  }

  const { data: freshPicks } = await db
    .from('picks')
    .select('*')
    .in(
      'game_id',
      updatedGames.map((g) => g.id)
    );

  const { data: tiebreakers } = await db
    .from('tiebreakers')
    .select('*')
    .eq('week_id', weekId)
    .order('created_at');

  const { data: players } = await db.from('players').select('id').eq('league_id', leagueId);

  const correctCountByPlayer = new Map();
  for (const player of players || []) correctCountByPlayer.set(player.id, 0);
  for (const pick of freshPicks || []) {
    if (pick.is_correct === true) {
      correctCountByPlayer.set(pick.player_id, (correctCountByPlayer.get(pick.player_id) || 0) + 1);
    }
  }

  const mnfGame = updatedGames.find((g) => g.is_mnf);
  const actualMnfTotal = mnfGame ? mnfGame.home_score + mnfGame.away_score : null;
  const tiebreakerByPlayer = new Map((tiebreakers || []).map((t) => [t.player_id, t]));

  let winnerId = null;
  let bestScore = null;
  for (const [playerId, correctCount] of correctCountByPlayer.entries()) {
    const tb = tiebreakerByPlayer.get(playerId);
    const distance =
      actualMnfTotal !== null && tb ? Math.abs(tb.guessed_total_points - actualMnfTotal) : Infinity;
    const candidate = { playerId, correctCount, distance, tiebreakAt: tb?.created_at ?? null };

    if (
      !bestScore ||
      candidate.correctCount > bestScore.correctCount ||
      (candidate.correctCount === bestScore.correctCount && candidate.distance < bestScore.distance)
    ) {
      bestScore = candidate;
      winnerId = playerId;
    }
  }

  const { data: scoredWeek, error: scoredWeekError } = await db
    .from('weeks')
    .update({
      status: 'scored',
      scored_at: new Date().toISOString(),
      winner_player_id: winnerId,
    })
    .eq('id', weekId)
    .select()
    .single();

  if (scoredWeekError) {
    return NextResponse.json({ error: scoredWeekError.message }, { status: 500 });
  }

  return NextResponse.json({ week: scoredWeek, games: updatedGames, scored: true });
}
