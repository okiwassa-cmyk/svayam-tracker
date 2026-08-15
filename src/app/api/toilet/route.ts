import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('toilet_logs')
    .select('*')
    .eq('date', date)
    .order('logged_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  try {
    const { date, type, condition, note, logged_at } = await req.json()
    if (!date || !type || condition == null)
      return NextResponse.json({ error: 'date, type, condition required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('toilet_logs')
      // logged_at を渡さなければDBの now() が入る（＝これまでの挙動）
      .insert({ date, type, condition, note: note || null, ...(logged_at ? { logged_at } : {}) })
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
    .from('toilet_logs')
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

  const { error } = await supabaseAdmin.from('toilet_logs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
