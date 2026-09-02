import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Body: { joinCode, nickname }
export async function POST(request) {
  const { joinCode, nickname } = await request.json();

  if (!joinCode || !nickname) {
    return NextResponse.json(
      { error: 'joinCode and nickname are required' },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  const { data: league, error: leagueError } = await db
    .from('leagues')
    .select('id, name, join_code, entry_fee_cents, season_year, logo_color, announcement, created_at')
    .eq('join_code', joinCode.toUpperCase().trim())
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: 'League code not found' }, { status: 404 });
  }

  // Nickname must be unique within the league — if it already exists,
  // treat this as a returning player logging back in.
  const { data: existing } = await db
    .from('players')
    .select('*')
    .eq('league_id', league.id)
    .eq('nickname', nickname.trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ league, player: existing });
  }

  const { data: player, error: playerError } = await db
    .from('players')
    .insert({ league_id: league.id, nickname: nickname.trim() })
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  return NextResponse.json({ league, player });
}
