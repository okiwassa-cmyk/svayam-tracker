import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('daily_records')
    .select('date,weight,body_fat,waist_cm,hrv,sleep_hours,sleep_score,energy_level,agni,steps,calories,dinacharya_flags')
    .order('date', { ascending: false })
    .limit(90)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
