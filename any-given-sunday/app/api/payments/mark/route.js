import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Player action: "I paid" — flags it for the commissioner to approve.
// Body: { playerId, weekId }
export async function POST(request) {
  const { playerId, weekId } = await request.json();

  if (!playerId || !weekId) {
    return NextResponse.json({ error: 'playerId and weekId are required' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from('payments')
    .select('status')
    .eq('week_id', weekId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing?.status === 'approved') {
    return NextResponse.json({ payment: existing });
  }

  const { data: payment, error } = await db
    .from('payments')
    .upsert(
      {
        week_id: weekId,
        player_id: playerId,
        status: 'pending',
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'week_id,player_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payment });
}
