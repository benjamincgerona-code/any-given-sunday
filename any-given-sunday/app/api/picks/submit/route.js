import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Body: { playerId, weekId, picks: [{ gameId, pickedTeam }], tiebreakerPoints }
// `picks` and `tiebreakerPoints` are both optional so a player can submit
// picks before deciding on the MNF total, or vice versa, then come back.
export async function POST(request) {
  const { playerId, weekId, picks, tiebreakerPoints } = await request.json();

  if (!playerId || !weekId) {
    return NextResponse.json({ error: 'playerId and weekId are required' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: week, error: weekError } = await db
    .from('weeks')
    .select('*')
    .eq('id', weekId)
    .single();

  if (weekError || !week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }
  if (week.locked_at && new Date() >= new Date(week.locked_at)) {
    return NextResponse.json({ error: 'Picks are locked — kickoff has passed' }, { status: 403 });
  }

  const { data: player, error: playerError } = await db
    .from('players')
    .select('id, league_id')
    .eq('id', playerId)
    .single();

  if (playerError || !player || player.league_id !== week.league_id) {
    return NextResponse.json({ error: 'Player not found in this league' }, { status: 403 });
  }

  if (Array.isArray(picks) && picks.length) {
    const { data: games, error: gamesError } = await db
      .from('games')
      .select('id, week_id, home_team, away_team')
      .in(
        'id',
        picks.map((p) => p.gameId)
      );

    if (gamesError) {
      return NextResponse.json({ error: gamesError.message }, { status: 500 });
    }

    const gameById = new Map((games || []).map((g) => [g.id, g]));
    for (const pick of picks) {
      const game = gameById.get(pick.gameId);
      if (!game || game.week_id !== weekId) {
        return NextResponse.json({ error: 'Invalid game for this week' }, { status: 400 });
      }
      if (pick.pickedTeam !== game.home_team && pick.pickedTeam !== game.away_team) {
        return NextResponse.json({ error: `Invalid team pick for game ${game.id}` }, { status: 400 });
      }
    }

    const { error: upsertError } = await db.from('picks').upsert(
      picks.map((p) => ({
        game_id: p.gameId,
        player_id: playerId,
        picked_team: p.pickedTeam,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'game_id,player_id' }
    );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  if (Number.isFinite(tiebreakerPoints)) {
    const { error: tiebreakerError } = await db.from('tiebreakers').upsert(
      {
        week_id: weekId,
        player_id: playerId,
        guessed_total_points: tiebreakerPoints,
      },
      { onConflict: 'week_id,player_id' }
    );

    if (tiebreakerError) {
      return NextResponse.json({ error: tiebreakerError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
