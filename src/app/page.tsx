import Link from 'next/link'
import Image from 'next/image'
import BottomNav from '@/components/BottomNav'
import { supabaseAdmin } from '@/lib/supabase'
import type { DailyRecord, HabitLog, Habit } from '@/lib/types'

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

  const [recordRes, habitLogsRes, habitsRes] = await Promise.all([
    supabaseAdmin
      .from('daily_records')
      .select('*')
      .eq('date', today)
      .maybeSingle(),
    supabaseAdmin
      .from('habit_logs')
      .select('*')
      .eq('date', today),
    supabaseAdmin
      .from('habits')
      .select('*')
      .order('sort_order'),
  ])

  return {
    today,
    record: recordRes.data as DailyRecord | null,
    habitLogs: (habitLogsRes.data ?? []) as HabitLog[],
    habits: (habitsRes.data ?? []) as Habit[],
  }
}

export default async function HomePage() {
  const { today, record, habitLogs, habits } = await getTodayData()

  const completedHabits = habitLogs.filter((l) => l.completed).length
  const totalHabits = habits.length

  const morningDone = record?.energy_level != null
  const eveningDone = record?.tier1_score != null

  const scoreLabel = (score: 'excellent' | 'good' | 'caution' | 'avoid' | null | undefined) => {
    if (!score) return ''
    return { excellent: '◎', good: '○', caution: '△', avoid: '✗' }[score]
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-stone-700 text-white px-4 pt-12 pb-6">
        <p className="text-stone-300 text-sm">{formatDate(today)}</p>
        <h1 className="text-2xl font-bold mt-1">Svayam</h1>
        <p className="text-stone-300 text-sm mt-0.5">アーユルヴェーダ実験トラッカー</p>
      </header>

      <div className="px-4 py-4 space-y-4">
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
              label="夜の記録"
              done={eveningDone}
              detail={eveningDone ? `T1:${record?.tier1_score} T2:${record?.tier2_score} T3:${record?.tier3_score}` : '未記録'}
            />
          </div>
        </section>

        {/* Habit Progress */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-500">習慣達成率</h2>
            <span className="text-teal-700 font-bold">{completedHabits}/{totalHabits}</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all"
              style={{ width: `${totalHabits ? (completedHabits / totalHabits) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {habits.slice(0, 5).map((h) => {
              const done = habitLogs.some((l) => l.habit_id === h.id && l.completed)
              return (
                <span
                  key={h.id}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    done ? 'bg-teal-50 text-teal-700' : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {h.emoji} {done ? '✓' : '○'}
                </span>
              )
            })}
          </div>
        </section>

        {/* Biometrics */}
        {(record?.weight || record?.hrv || record?.sleep_hours) && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-500 mb-3">バイオデータ</h2>
            <div className="grid grid-cols-3 gap-2">
              {record.weight && (
                <MetricCard label="体重" value={`${record.weight}kg`} />
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

        {/* Quick Actions */}
        <section>
          <h2 className="text-sm font-semibold text-stone-500 mb-3">クイックアクション</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/morning"
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-sm transition-all ${
                morningDone
                  ? 'bg-amber-50 text-amber-800 border-2 border-amber-200'
                  : 'bg-amber-800 text-white shadow-md active:scale-95'
              }`}
            >
              <Image src="/icons/sunrise.png" alt="" width={28} height={28} className={morningDone ? 'opacity-60' : 'invert opacity-90'} />
              <span>{morningDone ? '朝の記録（編集）' : '朝の記録'}</span>
            </Link>
            <Link
              href="/evening"
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl font-semibold text-sm transition-all ${
                eveningDone
                  ? 'bg-slate-100 text-slate-600 border-2 border-slate-200'
                  : 'bg-slate-700 text-white shadow-md active:scale-95'
              }`}
            >
              <Image src="/icons/moon.png" alt="" width={24} height={24} className={eveningDone ? 'opacity-50' : 'invert opacity-90'} />
              <span>{eveningDone ? '夜の記録（編集）' : '夜の記録'}</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Link
              href="/habits"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white text-stone-700 font-semibold text-sm shadow-sm border border-stone-100 active:scale-95"
            >
              <Image src="/icons/habits.png" alt="" width={24} height={24} className="opacity-40" />
              <span>習慣チェック</span>
            </Link>
            <Link
              href="/meal"
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white text-stone-700 font-semibold text-sm shadow-sm border border-stone-100 active:scale-95"
            >
              <Image src="/icons/meal.png" alt="" width={24} height={24} className="opacity-40" />
              <span>食事を記録</span>
            </Link>
          </div>
        </section>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 rounded-xl p-3 text-center">
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-stone-700">{value}</p>
    </div>
  )
}
