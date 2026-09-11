import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 週3回の目標は有酸素（北斗など）。朝のヨガ・筋トレは毎日なので数に入れない
const CARDIO_TYPES = ['ボクササイズ', 'ランニング', '自転車', '散歩']

// date を含む週（月曜はじまり）の頭と終わりを返す
function weekRange(date: string) {
  const d = new Date(date + 'T00:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7 // 月=0
  const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - dow)
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6)
  const f = (x: Date) => x.toISOString().slice(0, 10)
  return { start: f(mon), end: f(sun) }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  // ?week=1 で、その週に有酸素をやった日数だけ返す（曜日ごとの○×は作らない）
  if (searchParams.get('week')) {
    const { start, end } = weekRange(date)
    const { data, error } = await supabaseAdmin
      .from('exercise_logs')
      .select('date, type')
      .gte('date', start)
      .lte('date', end)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const days = new Set((data ?? []).filter((r) => CARDIO_TYPES.includes(r.type)).map((r) => r.date))
    return NextResponse.json({ cardioDays: days.size, target: 3, start, end })
  }

  const { data, error } = await supabaseAdmin
    .from('exercise_logs')
    .select('*')
    .eq('date', date)
    .order('logged_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  try {
    const { date, type, duration_min, note, logged_at } = await req.json()
    if (!date || !type || duration_min == null)
      return NextResponse.json({ error: 'date, type, duration_min required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('exercise_logs')
      // logged_at を渡さなければDBの now() が入る（＝これまでの挙動）
      .insert({ date, type, duration_min, note: note || null, ...(logged_at ? { logged_at } : {}) })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { id, logged_at } = await req.json()
  if (!id || !logged_at)
    return NextResponse.json({ error: 'id, logged_at required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('exercise_logs')
    .update({ logged_at })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('exercise_logs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
