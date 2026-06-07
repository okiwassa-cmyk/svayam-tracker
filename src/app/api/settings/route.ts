import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('user_settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { start_date, target_weight, target_waist, fasting_day, wake_time, lunch_time, sleep_time } = body

  const { data, error } = await supabaseAdmin
    .from('user_settings')
    .upsert({
      id: 1,
      start_date: start_date || null,
      target_weight: target_weight ? parseFloat(target_weight) : null,
      target_waist: target_waist ? parseFloat(target_waist) : null,
      fasting_day: fasting_day != null ? parseInt(fasting_day) : null,
      wake_time: wake_time || '06:00',
      lunch_time: lunch_time || '12:00',
      sleep_time: sleep_time || '22:00',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
