import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Commissioner action: approves a player's payment and adds it to the pot.
// Body: { leagueId, commissionerPin, weekId, playerId }
export async function POST(request) {
  const { leagueId, commissionerPin, weekId, playerId } = await request.json();

  if (!leagueId || !commissionerPin || !weekId || !playerId) {
    return NextResponse.json(
      { error: 'leagueId, commissionerPin, weekId and playerId are required' },
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

  const { data: existing } = await db
    .from('payments')
    .select('*')
    .eq('week_id', weekId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing?.status === 'approved') {
    return NextResponse.json({ payment: existing });
  }

  const { data: payment, error: paymentError } = await db
    .from('payments')
    .upsert(
      {
        week_id: weekId,
        player_id: playerId,
        status: 'approved',
        marked_at: existing?.marked_at ?? new Date().toISOString(),
        approved_at: new Date().toISOString(),
      },
      { onConflict: 'week_id,player_id' }
    )
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  const { data: week, error: weekError } = await db
    .from('weeks')
    .select('pot_cents')
    .eq('id', weekId)
    .single();

  if (!weekError && week) {
    await db
      .from('weeks')
      .update({ pot_cents: week.pot_cents + league.entry_fee_cents })
      .eq('id', weekId);
  }

  return NextResponse.json({ payment });
}
