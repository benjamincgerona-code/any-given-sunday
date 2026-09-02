// Free, unauthenticated ESPN scoreboard feed — no API key needed.
// Used to auto-load each week's schedule and to pull final scores for scoring.
const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// Regular season = seasontype 2. `week` is the NFL week number (1-18).
export async function fetchWeekGames(weekNumber, seasonYear) {
  const url = `${SCOREBOARD_URL}?seasontype=2&week=${weekNumber}&dates=${seasonYear}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ESPN schedule request failed (${res.status})`);
  }
  const data = await res.json();
  const events = data.events || [];
  if (events.length === 0) {
    throw new Error(`No games found for week ${weekNumber}, ${seasonYear}`);
  }

  const games = events.map(parseEvent).sort(
    (a, b) => new Date(a.kickoffAt) - new Date(b.kickoffAt)
  );

  // The last game to kick off in the week is the week's marquee/tiebreaker
  // game (almost always Monday Night Football).
  games[games.length - 1].isMnf = true;

  return games;
}

function parseEvent(event) {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((c) => c.homeAway === 'home');
  const away = competition?.competitors?.find((c) => c.homeAway === 'away');
  const status = event.status?.type || {};

  return {
    externalGameId: event.id,
    homeTeam: home?.team?.abbreviation ?? 'HOME',
    awayTeam: away?.team?.abbreviation ?? 'AWAY',
    kickoffAt: event.date,
    isMnf: false,
    status: status.completed ? 'final' : status.state === 'in' ? 'in_progress' : 'scheduled',
    homeScore: home?.score !== undefined ? Number(home.score) : null,
    awayScore: away?.score !== undefined ? Number(away.score) : null,
  };
}

// Re-fetches the same week's scoreboard so scores can be synced onto
// already-stored games (matched by externalGameId).
export async function fetchWeekScores(weekNumber, seasonYear) {
  const games = await fetchWeekGames(weekNumber, seasonYear);
  const byId = new Map(games.map((g) => [g.externalGameId, g]));
  return byId;
}
