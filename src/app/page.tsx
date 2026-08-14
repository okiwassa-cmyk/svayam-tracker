export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '@/components/BottomNav'
import EncouragementCard from '@/components/EncouragementCard'
import { supabaseAdmin } from '@/lib/supabase'
import type { DailyRecord, HabitLog, Habit, UserSettings } from '@/lib/types'

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+09:00')
  return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

async function getTodayData() {
  const today = getTodayJST()

  // Get start of this week (Monday JST)
  const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const dayOfWeek = nowJST.getDay()
  const monday = new Date(nowJST)
  monday.setDate(nowJST.getDate() - ((dayOfWeek + 6) % 7))
  const weekStart = monday.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')

  const [recordRes, habitLogsRes, habitsRes, settingsRes, exerciseRes, abhyangaRes, mealRes, fastingThisWeekRes] = await Promise.all([
    supabaseAdmin.from('daily_records').select('*').eq('date', today).maybeSingle(),
    supabaseAdmin.from('habit_logs').select('*').eq('date', today),
    supabaseAdmin.from('habits').select('*').order('sort_order'),
    supabaseAdmin.from('user_settings').select('*').eq('id', 1).maybeSingle(),
    supabaseAdmin.from('exercise_logs').select('id').eq('date', today).limit(1),
    supabaseAdmin.from('abhyanga_logs').select('id').eq('date', today).limit(1),
    supabaseAdmin.from('meal_logs').select('meal_type,logged_at,skipped,kapha_score').eq('date', today),
    supabaseAdmin.from('habit_logs').select('habit_id,completed').gte('date', weekStart).eq('completed', true),
  ])

  return {
    today,
    record: recordRes.data as DailyRecord | null,
    habitLogs: (habitLogsRes.data ?? []) as HabitLog[],
    habits: (habitsRes.data ?? []) as Habit[],
    settings: settingsRes.data as UserSettings | null,
    exerciseDone: (exerciseRes.data?.length ?? 0) > 0,
    abhyangaDone: (abhyangaRes.data?.length ?? 0) > 0,
    meals: (mealRes.data ?? []) as { meal_type: string; logged_at: string | null; skipped: boolean; kapha_score: string | null }[],
    fastingLogIds: (fastingThisWeekRes.data ?? []).map((l: { habit_id: string }) => l.habit_id),
  }
}

export default async function HomePage() {
  const { today, record, habits, settings, exerciseDone, abhyangaDone, meals, fastingLogIds } = await getTodayData()

  const experimentDay = settings?.start_date
    ? Math.floor((Date.now() - new Date(settings.start_date + 'T00:00:00+09:00').getTime()) / 86400000) + 1
    : null

  const morningDone = record?.energy_level != null
  const eveningDone = record?.dinner_time != null

  // 今日の達成判定（朝のディナチャリアは部分点・断食は金曜のみ）
  const flags = record?.dinacharya_flags as Record<string, boolean> | null | undefined
  const dinacharyaDoneCount = flags ? Object.values(flags).filter(Boolean).length : 0
  const dinacharyaTotal = 9
  const dinacharyaFraction = dinacharyaTotal > 0 ? dinacharyaDoneCount / dinacharyaTotal : 0

  // 夕食は朝の入力（昨夜の夕食 daily_records.dinner_time）ベース。0=食べなかった/1=18時台/2=19時台/3=20時以降
  const dinnerTime = record?.dinner_time ?? null
  const dinnerSkipped = dinnerTime === 0
  const dinnerDone = dinnerTime === 0 || dinnerTime === 1 || dinnerTime === 2
  const dinnerDetail = dinnerTime == null ? '未記録'
    : dinnerTime === 0 ? '食べなかった'
    : dinnerTime === 1 ? '18時台'
    : dinnerTime === 2 ? '19時台' : '20時以降'

  const todayWeekday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay()
  const fastingHabit = habits.find((h) => h.name === 'ファスティング')
  const fastingThisWeek = fastingHabit ? fastingLogIds.includes(fastingHabit.id) : false
  const fastingDays = fastingHabit?.days_of_week ? String(fastingHabit.days_of_week).split(',') : ['5']
  const isFastingDay = fastingDays.includes(String(todayWeekday))

  const mealLogs = meals.filter((m) => !m.skipped)
  const excellentMeals = mealLogs.filter((m) => m.kapha_score === 'excellent').length

  const keyHabits = [
    { label: '朝のディナチャリア', detail: `${dinacharyaDoneCount}/${dinacharyaTotal}`, done: dinacharyaDoneCount === dinacharyaTotal, fraction: dinacharyaFraction, link: '/morning', ama: false },
    { label: '運動', detail: exerciseDone ? '記録あり' : '未記録', done: exerciseDone, fraction: exerciseDone ? 1 : 0, link: '/habits', ama: false },
    { label: 'アビヤンガ', detail: abhyangaDone ? '達成' : '未記録', done: abhyangaDone, fraction: abhyangaDone ? 1 : 0, link: '/habits', ama: false },
    { label: '夕食時間', detail: dinnerDetail, done: dinnerDone, fraction: dinnerDone ? 1 : 0, link: '/morning', ama: false },
    // できたかどうかは翌朝の記録で付ける。当日は「まだ」ではなく、これから振り返る状態として見せる
    ...(isFastingDay ? [{ label: 'ファスティング', detail: fastingThisWeek ? '達成' : '翌朝に記録', done: fastingThisWeek, fraction: fastingThisWeek ? 1 : 0, link: '/morning', ama: true }] : []),
  ]

  const achievementScore = keyHabits.reduce((sum, h) => sum + h.fraction, 0)
  const achievementTotal = keyHabits.length
  const achievementLabel = Number.isInteger(achievementScore) ? String(achievementScore) : achievementScore.toFixed(1)

  // 習慣化率（個別項目カウント：朝のディナチャリア9 + 運動 + アビヤンガ + 夕食 = 12、金曜のみ+ファスティング=13）
  const habitFormationDone = dinacharyaDoneCount
    + (exerciseDone ? 1 : 0)
    + (abhyangaDone ? 1 : 0)
    + (dinnerDone ? 1 : 0)
    + (isFastingDay && fastingThisWeek ? 1 : 0)
  const habitFormationTotal = isFastingDay ? 13 : 12
  const habitFormationRate = Math.round((habitFormationDone / habitFormationTotal) * 100)

  const phase = experimentDay != null && experimentDay > 0
    ? experimentDay <= 30 ? 1 : experimentDay <= 60 ? 2 : experimentDay <= 90 ? 3 : null
    : null
  const phaseDay = phase != null && experimentDay != null
    ? experimentDay - (phase - 1) * 30
    : null
  const PHASES = [
    { label: 'Phase 1', name: '導入期', desc: '習慣の土台を作る', color: 'bg-emerald-600', light: 'bg-emerald-50 border-emerald-100 text-emerald-800' },
    { label: 'Phase 2', name: '強化期', desc: '習慣を深め、体の変化を観察', color: 'bg-teal-600', light: 'bg-teal-50 border-teal-100 text-teal-800' },
    { label: 'Phase 3', name: '定着期', desc: 'ライフスタイルとして根付かせる', color: 'bg-cyan-600', light: 'bg-cyan-50 border-cyan-100 text-cyan-800' },
  ]
  const currentPhase = phase != null ? PHASES[phase - 1] : null

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-stone-700 text-white px-4 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-stone-300 text-sm">{formatDate(today)}</p>
            <h1 className="text-2xl font-bold mt-1">Svayam</h1>
            <p className="text-stone-300 text-sm mt-0.5">
              {experimentDay != null && experimentDay > 0
                ? `実験 ${experimentDay} 日目`
                : 'アーユルヴェーダ実験トラッカー'}
            </p>
          </div>
          <Link href="/settings" className="mt-1 p-2 rounded-xl text-stone-300 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </Link>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Phase Banner */}
        {currentPhase && phase != null && phaseDay != null && (
          <section className={`rounded-2xl p-4 border ${currentPhase.light}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-bold opacity-70">{currentPhase.label}</span>
                <h2 className="text-base font-bold">{currentPhase.name}</h2>
                <p className="text-xs opacity-70 mt-0.5">{currentPhase.desc}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black">{phaseDay}<span className="text-xs font-normal opacity-60">/30日</span></p>
                <p className="text-xs opacity-60">全体 {experimentDay}日目</p>
              </div>
            </div>
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full ${currentPhase.color} rounded-full transition-all`}
                style={{ width: `${Math.min((phaseDay / 30) * 100, 100)}%` }}
              />
            </div>
          </section>
        )}

        {/* My Rhythm */}
        {(settings?.wake_time || settings?.lunch_time || settings?.sleep_time) && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-500 mb-3">今日のリズム目標</h2>
            <div className="grid grid-cols-3 gap-2">
              <RhythmCard icon="/icons/sunrise.svg" label="起床" time={settings.wake_time ?? '06:00'} />
              <RhythmCard icon="/icons/meal.svg" label="昼食" time={settings.lunch_time ?? '12:00'} />
              <RhythmCard icon="/icons/moon.svg" label="就寝" time={settings.sleep_time ?? '22:00'} />
            </div>
          </section>
        )}

        {/* Today's Status */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-500 mb-3">今日のステータス</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatusCard
              label="朝の記録"
              done={morningDone}
              detail={morningDone ? `E${record?.energy_level} A${record?.agni} 排${record?.bowel_movement ? '○' : '×'}` : '未記録'}
            />
            <StatusCard
              label="昨夜の夕食"
              done={eveningDone}
              detail={!eveningDone ? '未記録' : dinnerSkipped ? '食べなかった' : `${dinnerDetail} / ${['軽め','普通','重め'][((record?.dinner_amount ?? 1) as number) - 1]}`}
            />
          </div>
        </section>

        {/* Key Habits Achievement */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-500">今日の達成</h2>
            <span className="text-xs text-teal-700 font-semibold">
              {achievementLabel}/{achievementTotal}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {keyHabits.map((h) => {
              const isAma = h.ama
              return (
                <Link key={h.label} href={h.link} className={`flex items-center gap-3 px-3 py-2 rounded-xl active:bg-stone-50 ${isAma && h.done ? 'bg-amber-50' : ''}`}>
                  {isAma ? (
                    <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black leading-none ${h.done ? 'bg-amber-400 text-white' : 'border-2 border-stone-200 text-stone-300'}`}>
                      {h.done ? '◎' : '○'}
                    </span>
                  ) : (
                    <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${h.done ? 'bg-teal-600' : 'border-2 border-stone-200'}`}>
                      {h.done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  )}
                  <span className={`text-sm flex-1 ${h.done ? (isAma ? 'text-amber-700 font-semibold' : 'text-stone-500') : 'text-stone-700 font-medium'}`}>{h.label}</span>
                  <span className={`text-xs ${h.done ? (isAma ? 'text-amber-600 font-semibold' : 'text-teal-600') : 'text-stone-400'}`}>{h.detail}</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Habit Formation Rate */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-500">習慣化率</h2>
            <span className="text-teal-700 font-bold">{habitFormationDone}/{habitFormationTotal}<span className="text-xs font-normal text-stone-400 ml-1">{habitFormationRate}%</span></span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all"
              style={{ width: `${habitFormationRate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-stone-400">
            朝のディナチャリア{dinacharyaDoneCount}/9・運動{exerciseDone ? '○' : '×'}・アビヤンガ{abhyangaDone ? '○' : '×'}・夕食{dinnerDone ? '○' : '×'}{isFastingDay ? `・断食${fastingThisWeek ? '○' : '×'}` : ''}
          </p>
        </section>

        {/* Biometrics */}
        {(record?.weight || record?.hrv || record?.sleep_hours || record?.waist_cm) && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-500 mb-3">バイオデータ</h2>
            <div className="grid grid-cols-3 gap-2">
              {record.weight && (
                <MetricCard label="体重" value={`${record.weight}kg`} />
              )}
              {record.waist_cm && (
                <MetricCard label="腹囲" value={`${record.waist_cm}cm`} />
              )}
              {record.hrv && (
                <MetricCard label="HRV" value={`${record.hrv}ms`} />
              )}
              {record.sleep_hours && (
                <MetricCard label="睡眠" value={`${record.sleep_hours}h`} />
              )}
              {record.energy_level && (
                <MetricCard label="エネルギー" value={`${record.energy_level}/10`} />
              )}
              {record.agni && (
                <MetricCard label="アグニ" value={`${record.agni}/10`} />
              )}
              {record.calories && (
                <MetricCard label="カロリー" value={`${record.calories}kcal`} />
              )}
            </div>
          </section>
        )}

        {/* Encouragement */}
        <EncouragementCard
          keyScore={{ done: Math.round(achievementScore * 10) / 10, total: achievementTotal }}
          weight={record?.weight ?? null}
          calories={record?.calories ?? null}
          energy={record?.energy_level ?? null}
          excellentMeals={excellentMeals}
          totalMeals={mealLogs.length}
          experimentDay={experimentDay}
        />
      </div>

      <BottomNav />
    </div>
  )
}

function StatusCard({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return (
    <div className={`p-3 rounded-xl ${done ? 'bg-green-50' : 'bg-stone-50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${done ? 'bg-teal-600' : 'bg-stone-300'}`} />
        <span className="text-xs font-semibold text-stone-500">{label}</span>
      </div>
      <p className={`text-xs ${done ? 'text-teal-700' : 'text-stone-400'}`}>{detail}</p>
    </div>
  )
}

function RhythmCard({ icon, label, time }: { icon: string; label: string; time: string }) {
  return (
    <div className="bg-stone-50 rounded-xl p-3 text-center">
      <img src={icon} alt="" width={20} height={20} className="opacity-40 mx-auto mb-0.5" />
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-stone-700 font-mono">{time}</p>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 rounded-xl p-3 text-center">
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-stone-700">{value}</p>
    </div>
  )
}
