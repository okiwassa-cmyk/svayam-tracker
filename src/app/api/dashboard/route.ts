import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function getJSTDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days + 1)

  const fmt = (d: Date) =>
    d.toLocaleDateString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '-')

  return { from: fmt(start), to: fmt(end) }
}

export async function GET() {
  const { from, to } = getJSTDateRange(30)

  const [recordsRes, habitLogsRes, habitsRes] = await Promise.all([
    supabaseAdmin
      .from('daily_records')
      .select('date,weight,waist_cm,hrv,energy_level,agni,sleep_hours,calories,tier1_score,tier2_score,tier3_score')
      .gte('date', from)
      .lte('date', to)
      .order('date'),
    supabaseAdmin
      .from('habit_logs')
      .select('date,completed')
      .gte('date', from)
      .lte('date', to),
    supabaseAdmin
      .from('habits')
      .select('id'),
  ])

  const records = recordsRes.data ?? []
  const habitLogs = habitLogsRes.data ?? []
  const totalHabits = (habitsRes.data ?? []).length

  // Habit completion count per day
  const habitCountByDate: Record<string, number> = {}
  for (const log of habitLogs) {
    if (!habitCountByDate[log.date]) habitCountByDate[log.date] = 0
    if (log.completed) habitCountByDate[log.date]++
  }

  const data = records.map((r) => ({
    date: r.date,
    label: r.date.slice(5).replace('-', '/'),
    weight: r.weight,
    waist_cm: r.waist_cm,
    hrv: r.hrv,
    energy_level: r.energy_level,
    agni: r.agni,
    sleep_hours: r.sleep_hours,
    calories: r.calories,
    habit_rate: totalHabits > 0
      ? Math.round(((habitCountByDate[r.date] ?? 0) / totalHabits) * 100)
      : null,
    score_total: (r.tier1_score ?? 0) + (r.tier2_score ?? 0) + (r.tier3_score ?? 0),
  }))

  return NextResponse.json({ data, totalHabits })
}
