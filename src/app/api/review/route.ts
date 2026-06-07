import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function getJSTWeekRange() {
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const jstNow = new Date(now.getTime() + jstOffset)
  const day = jstNow.getUTCDay() // 0=Sun
  const startOfWeek = new Date(jstNow)
  startOfWeek.setUTCDate(jstNow.getUTCDate() - day)
  startOfWeek.setUTCHours(0, 0, 0, 0)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return {
    from: fmt(new Date(startOfWeek.getTime() - jstOffset)),
    to: fmt(new Date(now.getTime() + jstOffset)).slice(0, 10),
  }
}

export async function GET() {
  const { from, to } = getJSTWeekRange()

  const [recordsRes, habitLogsRes, habitsRes, mealsRes] = await Promise.all([
    supabaseAdmin.from('daily_records').select('*').gte('date', from).lte('date', to).order('date'),
    supabaseAdmin.from('habit_logs').select('date,completed,habit_id').gte('date', from).lte('date', to),
    supabaseAdmin.from('habits').select('id,name,tier'),
    supabaseAdmin.from('meal_logs').select('date,kapha_score,pitta_score,description').gte('date', from).lte('date', to),
  ])

  const records = recordsRes.data ?? []
  const habitLogs = habitLogsRes.data ?? []
  const habits = habitsRes.data ?? []
  const meals = mealsRes.data ?? []
  const totalHabits = habits.length

  // Per-day habit completion
  const habitByDate: Record<string, number> = {}
  for (const log of habitLogs) {
    if (!habitByDate[log.date]) habitByDate[log.date] = 0
    if (log.completed) habitByDate[log.date]++
  }

  // Habit completion rates
  const habitRates = records.map((r) => ({
    date: r.date,
    rate: totalHabits > 0 ? Math.round((habitByDate[r.date] ?? 0) / totalHabits * 100) : 0,
  }))

  const avgHabitRate = habitRates.length
    ? Math.round(habitRates.reduce((s, r) => s + r.rate, 0) / habitRates.length)
    : null

  // Weight
  const weights = records.filter((r) => r.weight).map((r) => r.weight!)
  const firstWeight = weights[0]
  const lastWeight = weights[weights.length - 1]
  const weightDelta = firstWeight && lastWeight ? +(lastWeight - firstWeight).toFixed(1) : null

  // Waist
  const waists = records.filter((r) => r.waist_cm).map((r) => r.waist_cm!)
  const waistDelta = waists.length >= 2 ? +(waists[waists.length - 1] - waists[0]).toFixed(1) : null

  // Avg energy & agni
  const withEnergy = records.filter((r) => r.energy_level)
  const avgEnergy = withEnergy.length
    ? +(withEnergy.reduce((s, r) => s + r.energy_level!, 0) / withEnergy.length).toFixed(1)
    : null

  const withAgni = records.filter((r) => r.agni)
  const avgAgni = withAgni.length
    ? +(withAgni.reduce((s, r) => s + r.agni!, 0) / withAgni.length).toFixed(1)
    : null

  // Meal quality
  const excellentMeals = meals.filter((m) => m.kapha_score === 'excellent').length
  const cautionMeals = meals.filter((m) => ['caution', 'avoid'].includes(m.kapha_score ?? '')).length

  // Best habit day
  const bestDay = habitRates.sort((a, b) => b.rate - a.rate)[0] ?? null

  return NextResponse.json({
    from,
    to,
    recordCount: records.length,
    avgHabitRate,
    habitRates,
    weightDelta,
    lastWeight,
    waistDelta,
    avgEnergy,
    avgAgni,
    excellentMeals,
    cautionMeals,
    totalMeals: meals.length,
    bestDay,
  })
}
