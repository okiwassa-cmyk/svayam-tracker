import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date: bodyDate, ...fields } = body

    // Use provided date or fall back to today in JST
    const date = bodyDate && /^\d{4}-\d{2}-\d{2}$/.test(String(bodyDate))
      ? String(bodyDate)
      : new Date().toLocaleDateString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).replace(/\//g, '-')

    // Parse numeric fields, convert empty strings to null
    const numericFields = ['energy_level', 'agni', 'weight', 'body_fat', 'waist_cm', 'sleep_hours', 'hrv', 'calories', 'morning_clarity', 'tongue_coating', 'morning_hunger', 'dinner_time', 'dinner_amount', 'alcohol', 'steps', 'sleep_score']
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
