import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: fetch habits with today's log status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const [habitsRes, logsRes] = await Promise.all([
    supabaseAdmin.from('habits').select('*').order('sort_order'),
    supabaseAdmin.from('habit_logs').select('*').eq('date', date),
  ])

  if (habitsRes.error || logsRes.error) {
    return NextResponse.json({ error: habitsRes.error?.message ?? logsRes.error?.message }, { status: 500 })
  }

  const habits = habitsRes.data ?? []
  const logs = logsRes.data ?? []

  const result = habits.map((h) => {
    const log = logs.find((l) => l.habit_id === h.id)
    return { ...h, completed: log?.completed ?? false, log_id: log?.id }
  })

  return NextResponse.json({ data: result })
}

// PATCH: update habit frequency
export async function PATCH(req: NextRequest) {
  const { id, frequency } = await req.json()
  const { data, error } = await supabaseAdmin
    .from('habits')
    .update({ frequency })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST: toggle habit completion
export async function POST(req: NextRequest) {
  try {
    const { date, habit_id, completed } = await req.json()

    if (!date || !habit_id) {
      return NextResponse.json({ error: 'date and habit_id are required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('habit_logs')
      .upsert({ date, habit_id, completed }, { onConflict: 'date,habit_id' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
