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

  const [recordsRes, exerciseRes, abhyangaRes, mealsRes, fastingHabitRes] = await Promise.all([
    supabaseAdmin.from('daily_records').select('*').gte('date', from).lte('date', to).order('date'),
    supabaseAdmin.from('exercise_logs').select('date').gte('date', from).lte('date', to),
    supabaseAdmin.from('abhyanga_logs').select('date').gte('date', from).lte('date', to),
    supabaseAdmin.from('meal_logs').select('date,meal_type,logged_at,skipped,kapha_score').gte('date', from).lte('date', to),
    supabaseAdmin.from('habits').select('id,days_of_week').eq('name', 'ファスティング').maybeSingle(),
  ])

  const records = recordsRes.data ?? []
  const exerciseDates = new Set((exerciseRes.data ?? []).map((r: { date: string }) => r.date))
  const abhyangaDates = new Set((abhyangaRes.data ?? []).map((r: { date: string }) => r.date))
  const meals = mealsRes.data ?? []
  const fastingHabitId = fastingHabitRes.data?.id ?? null
  const fastingDays = fastingHabitRes.data?.days_of_week
    ? String(fastingHabitRes.data.days_of_week).split(',')
    : ['5']

  // Fetch fasting logs for the week if habit exists
  let fastingDates = new Set<string>()
  if (fastingHabitId) {
    const fastingLogsRes = await supabaseAdmin
      .from('habit_logs')
      .select('date')
      .eq('habit_id', fastingHabitId)
      .eq('completed', true)
      .gte('date', from)
      .lte('date', to)
    fastingDates = new Set((fastingLogsRes.data ?? []).map((r: { date: string }) => r.date))
  }

  // Per-day achievement（通常日4項目／断食日5項目）
  // 1. 朝のディナチャリア（8項目・部分点）
  // 2. 運動
  // 3. アビヤンガ
  // 4. 夕食時間（19時前 or スキップ）
  // (5) ファスティング（金曜のみ）
  const DINACHARYA_TOTAL = 8

  const habitRates = records.map((r) => {
    const flags = r.dinacharya_flags as Record<string, boolean> | null
    const dinacharyaDoneCount = flags ? Object.values(flags).filter(Boolean).length : 0
    const dinacharyaFraction = dinacharyaDoneCount / DINACHARYA_TOTAL

    const exerciseDone = exerciseDates.has(r.date)
    const abhyangaDone = abhyangaDates.has(r.date)

    const dinnerMeal = meals.find((m) => m.date === r.date && m.meal_type === 'dinner')
    const dinnerDone = dinnerMeal?.skipped === true || (
      dinnerMeal?.logged_at
        ? new Date(dinnerMeal.logged_at).toLocaleTimeString('en-US', { timeZone: 'Asia/Tokyo', hour12: false, hour: '2-digit', minute: '2-digit' }) < '19:00'
        : false
    )

    const weekday = new Date(r.date + 'T00:00:00+09:00').getDay()
    const isFastingDay = fastingDays.includes(String(weekday))
    const fastingDone = fastingDates.has(r.date)

    const totalItems = isFastingDay ? 5 : 4
    let score = dinacharyaFraction + (exerciseDone ? 1 : 0) + (abhyangaDone ? 1 : 0) + (dinnerDone ? 1 : 0)
    if (isFastingDay) score += fastingDone ? 1 : 0

    return { date: r.date, rate: Math.round((score / totalItems) * 100) }
  })

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

  // Meal quality (exclude skipped)
  const mealLogs = meals.filter((m) => !m.skipped)
  const excellentMeals = mealLogs.filter((m) => m.kapha_score === 'excellent').length
  const cautionMeals = mealLogs.filter((m) => ['caution', 'avoid'].includes(m.kapha_score ?? '')).length

  // Best habit day
  const bestDay = [...habitRates].sort((a, b) => b.rate - a.rate)[0] ?? null

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
    totalMeals: mealLogs.length,
    bestDay,
  })
}
