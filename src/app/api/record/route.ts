import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, ...fields } = body

    if (!date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    // Parse numeric fields, convert empty strings to null
    const numericFields = ['energy_level', 'agni', 'weight', 'body_fat', 'sleep_hours', 'hrv', 'calories']
    const sanitized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(fields)) {
      if (numericFields.includes(k)) {
        const n = Number(v)
        sanitized[k] = (v === '' || v === null || v === undefined || isNaN(n)) ? null : n
      } else {
        sanitized[k] = v
      }
    }

    // Upsert: insert or update by date
    const { data, error } = await supabaseAdmin
      .from('daily_records')
      .upsert({ date, ...sanitized }, { onConflict: 'date' })
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('daily_records')
    .select('*')
    .eq('date', date)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
