import { supabaseAdmin } from '@/lib/supabase';
import { generateJoinCode, generatePin } from '@/lib/codes';
import { NextResponse } from 'next/server';

// Creates a new private league and its commissioner (first player).
// Body: { leagueName, commissionerNickname, entryFeeCents?, seasonYear }
export async function POST(request) {
  const body = await request.json();
  const { leagueName, commissionerNickname, entryFeeCents, seasonYear } = body;

  if (!leagueName || !commissionerNickname) {
    return NextResponse.json(
      { error: 'leagueName and commissionerNickname are required' },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();
  const joinCode = generateJoinCode();
  const commissionerPin = generatePin();

  const { data: league, error: leagueError } = await db
    .from('leagues')
    .insert({
      name: leagueName,
      join_code: joinCode,
      commissioner_pin: commissionerPin,
      entry_fee_cents: entryFeeCents ?? 500,
      season_year: seasonYear ?? new Date().getFullYear(),
    })
    .select()
    .single();

  if (leagueError) {
    return NextResponse.json({ error: leagueError.message }, { status: 500 });
  }

  const { data: commissioner, error: playerError } = await db
    .from('players')
    .insert({
      league_id: league.id,
      nickname: commissionerNickname,
      is_commissioner: true,
    })
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  return NextResponse.json({
    league,
    player: commissioner,
    // Show these to the commissioner once — they need to save them.
    joinCode,
    commissionerPin,
  });
}
