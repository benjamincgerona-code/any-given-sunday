import { supabaseAdmin } from '@/lib/supabase';
import { fetchWeekGames } from '@/lib/espn';
import { NextResponse } from 'next/server';

// Commissioner action: opens a new week and auto-loads its schedule from ESPN.
// Body: { leagueId, commissionerPin, weekNumber }
export async function POST(request) {
  const { leagueId, commissionerPin, weekNumber } = await request.json();

  if (!leagueId || !commissionerPin || !weekNumber) {
    return NextResponse.json(
      { error: 'leagueId, commissionerPin and weekNumber are required' },
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

  const { data: existingWeek } = await db
    .from('weeks')
    .select('id')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .maybeSingle();

  if (existingWeek) {
    return NextResponse.json({ error: `Week ${weekNumber} already exists` }, { status: 409 });
  }

  let games;
  try {
    games = await fetchWeekGames(weekNumber, league.season_year);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }

  const earliestKickoff = games.reduce(
    (earliest, g) => (new Date(g.kickoffAt) < new Date(earliest) ? g.kickoffAt : earliest),
    games[0].kickoffAt
  );

  const { data: week, error: weekError } = await db
    .from('weeks')
    .insert({
      league_id: leagueId,
      week_number: weekNumber,
      status: 'open',
      opened_at: new Date().toISOString(),
      locked_at: earliestKickoff,
    })
    .select()
    .single();

  if (weekError) {
    return NextResponse.json({ error: weekError.message }, { status: 500 });
  }

  const { data: insertedGames, error: gamesError } = await db
    .from('games')
    .insert(
      games.map((g) => ({
        week_id: week.id,
        external_game_id: g.externalGameId,
        home_team: g.homeTeam,
        away_team: g.awayTeam,
        kickoff_at: g.kickoffAt,
        is_mnf: g.isMnf,
        home_score: g.homeScore,
        away_score: g.awayScore,
        status: g.status,
      }))
    )
    .select();

  if (gamesError) {
    return NextResponse.json({ error: gamesError.message }, { status: 500 });
  }

  return NextResponse.json({ week, games: insertedGames });
}
