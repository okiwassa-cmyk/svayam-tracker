'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'

type ReviewData = {
  from: string
  to: string
  recordCount: number
  avgHabitRate: number | null
  habitRates: { date: string; rate: number }[]
  weightDelta: number | null
  lastWeight: number | null
  waistDelta: number | null
  avgEnergy: number | null
  avgAgni: number | null
  excellentMeals: number
  cautionMeals: number
  totalMeals: number
  bestDay: { date: string; rate: number } | null
}

type DailyRecord = {
  date: string
  weight: number | null
  body_fat: number | null
  waist_cm: number | null
  hrv: number | null
  sleep_hours: number | null
  sleep_score: number | null
  energy_level: number | null
  agni: number | null
  steps: number | null
  calories: number | null
  dinacharya_flags: Record<string, boolean> | null
}

const DAY_MAP = ['日', '月', '火', '水', '木', '金', '土']

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00+09:00')
  return `${dt.getMonth() + 1}/${dt.getDate()}(${DAY_MAP[dt.getDay()]})`
}

function delta(v: number | null, unit: string, goodNegative = false) {
  if (v == null) return '--'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v}${unit}`
}

export default function ReviewPage() {
  const [tab, setTab] = useState<'week' | 'data'>('week')
  const [data, setData] = useState<ReviewData | null>(null)
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/review')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  async function loadRecords() {
    if (loadingRecords || records.length > 0) return
    setLoadingRecords(true)
    const res = await fetch('/api/records')
    const { data } = await res.json()
    setRecords(data ?? [])
    setLoadingRecords(false)
  }

  useEffect(() => {
    if (!data) return
    const lines = [
      `【アーユルヴェーダ実験 週次レビュー】`,
      `期間：${fmtDate(data.from)} 〜 ${fmtDate(data.to)}`,
      ``,
      `◆ 習慣化率：${data.avgHabitRate != null ? `${data.avgHabitRate}%` : '--'}`,
      data.bestDay ? `  ベストデー：${fmtDate(data.bestDay.date)}（${data.bestDay.rate}%達成）` : '',
      ``,
      `◆ バイオデータ`,
      data.lastWeight ? `  体重：${data.lastWeight}kg（週変化 ${delta(data.weightDelta, 'kg')}）` : '  体重：未記録',
      data.waistDelta != null ? `  腹囲変化：${delta(data.waistDelta, 'cm')}` : '',
      data.avgEnergy ? `  平均エネルギー：${data.avgEnergy}/10` : '',
      data.avgAgni ? `  平均アグニ：${data.avgAgni}/10` : '',
      ``,
      `◆ 食事記録`,
      `  合計 ${data.totalMeals} 食`,
      data.totalMeals > 0 ? `  優良（◎）：${data.excellentMeals}食 / 要注意：${data.cautionMeals}食` : '',
      ``,
      `#アーユルヴェーダ #カファピッタ #90日実験`,
    ].filter((l) => l !== undefined)
    setNoteText(lines.join('\n'))
  }, [data])

  async function copyToClipboard() {
    await navigator.clipboard.writeText(noteText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-300 border-t-teal-700 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-teal-800 text-white px-4 pt-12 pb-4">
        <Link href="/" className="text-teal-200 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold">レビュー</h1>
        <div className="flex gap-1 mt-4 bg-teal-700/50 rounded-xl p-1">
          <button
            onClick={() => setTab('week')}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'week' ? 'bg-white text-teal-800' : 'text-teal-200'}`}
          >
            今週
          </button>
          <button
            onClick={() => { setTab('data'); loadRecords() }}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'data' ? 'bg-white text-teal-800' : 'text-teal-200'}`}
          >
            データ履歴
          </button>
        </div>
      </header>

      {tab === 'data' && (
        <DataHistory records={records} loading={loadingRecords} />
      )}
      {tab === 'week' && !data && (
        <div className="px-4 py-12 text-center">
          <p className="text-stone-500">今週はまだ記録がありません</p>
        </div>
      )}
      {tab === 'week' && data && data.recordCount === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-stone-500">今週はまだ記録がありません</p>
        </div>
      )}
      {tab === 'week' && data && data.recordCount > 0 && (
        <div className="px-4 py-4 space-y-4">
          {/* Habit rate */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase mb-3">習慣化率</h2>
            <div className="flex items-end gap-1 mb-2">
              {data.habitRates.map((r) => (
                <div key={r.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-stone-100 rounded-sm overflow-hidden" style={{ height: 60 }}>
                    <div
                      className={`w-full rounded-sm transition-all ${r.rate >= 80 ? 'bg-teal-500' : r.rate >= 50 ? 'bg-amber-400' : 'bg-stone-300'}`}
                      style={{ height: `${r.rate}%`, marginTop: `${100 - r.rate}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400">{new Date(r.date + 'T00:00:00+09:00').getDate()}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-stone-400">週平均</span>
              <span className={`text-xl font-bold ${(data.avgHabitRate ?? 0) >= 70 ? 'text-teal-600' : 'text-amber-500'}`}>
                {data.avgHabitRate != null ? `${data.avgHabitRate}%` : '--'}
              </span>
            </div>
          </section>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="体重変化" value={delta(data.weightDelta, 'kg')} sub={data.lastWeight ? `現在 ${data.lastWeight}kg` : ''} good={(data.weightDelta ?? 0) < 0} />
            <StatCard label="腹囲変化" value={delta(data.waistDelta, 'cm')} sub="" good={(data.waistDelta ?? 0) < 0} />
            <StatCard label="平均エネルギー" value={data.avgEnergy ? `${data.avgEnergy}/10` : '--'} sub="" good={(data.avgEnergy ?? 0) >= 6} />
            <StatCard label="平均アグニ" value={data.avgAgni ? `${data.avgAgni}/10` : '--'} sub="" good={(data.avgAgni ?? 0) >= 6} />
          </div>

          {/* Meals */}
          {data.totalMeals > 0 && (
            <section className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-xs font-semibold text-stone-400 uppercase mb-3">食事品質</h2>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{data.excellentMeals}</p>
                  <p className="text-xs text-stone-400">優良◎</p>
                </div>
                <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.totalMeals ? (data.excellentMeals / data.totalMeals) * 100 : 0}%` }} />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-stone-400">{data.totalMeals}</p>
                  <p className="text-xs text-stone-400">合計</p>
                </div>
              </div>
            </section>
          )}

          {/* Note export */}
          <section className="bg-stone-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-stone-500">note.com 用テキスト</h2>
              <button
                onClick={copyToClipboard}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${copied ? 'bg-teal-600 text-white' : 'bg-stone-200 text-stone-600'}`}
              >
                {copied ? 'コピーしました ✓' : 'コピー'}
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={12}
              className="w-full text-xs text-stone-600 bg-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-stone-400/30 resize-none leading-relaxed"
            />
          </section>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function DataHistory({ records, loading }: { records: DailyRecord[]; loading: boolean }) {
  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-teal-300 border-t-teal-700 rounded-full animate-spin" /></div>
  if (records.length === 0) return <div className="px-4 py-12 text-center text-stone-500">まだ記録がありません</div>

  const DAY = ['日', '月', '火', '水', '木', '金', '土']

  // records は日付降順。グラフ用に昇順へ
  const asc = [...records].reverse()
  const startMs = new Date(asc[0].date + 'T00:00:00+09:00').getTime()
  const endMs = new Date(asc[asc.length - 1].date + 'T00:00:00+09:00').getTime()
  const spanDays = Math.max(1, Math.round((endMs - startMs) / 86400000))
  const charts = [
    { label: '体重', unit: 'kg', color: '#0d9488', key: 'weight' as const },
    { label: '体脂肪', unit: '%', color: '#d97706', key: 'body_fat' as const },
    { label: '摂取エネルギー', unit: 'kcal', color: '#ea580c', key: 'calories' as const },
    { label: '睡眠スコア', unit: '', color: '#7c3aed', key: 'sleep_score' as const },
    { label: 'HRV', unit: 'ms', color: '#0284c7', key: 'hrv' as const },
  ]
  const series = charts.map((c) => ({
    ...c,
    points: asc.filter((r) => r[c.key] != null).map((r) => ({
      date: r.date,
      value: r[c.key] as number,
      offset: Math.round((new Date(r.date + 'T00:00:00+09:00').getTime() - startMs) / 86400000),
    })),
  }))
  const hasAnySeries = series.some((s) => s.points.length > 0)

  return (
    <div className="px-4 py-4 space-y-3">
      {hasAnySeries && (
        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-semibold text-stone-400 uppercase">ヘルスケア推移</h2>
          {series.map((s) => (
            <MetricChart key={s.key} label={s.label} unit={s.unit} color={s.color} points={s.points} spanDays={spanDays} />
          ))}
        </section>
      )}
      {records.map((r) => {
        const dt = new Date(r.date + 'T00:00:00+09:00')
        const dateLabel = `${dt.getMonth() + 1}/${dt.getDate()}(${DAY[dt.getDay()]})`
        const flags = r.dinacharya_flags as Record<string, boolean> | null
        const dinaDone = flags ? Object.values(flags).filter(Boolean).length : 0

        return (
          <section key={r.date} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-teal-700 mb-3">{dateLabel}</p>
            <div className="grid grid-cols-3 gap-2">
              {r.weight && <DataCell label="体重" value={`${r.weight}kg`} />}
              {r.body_fat && <DataCell label="体脂肪" value={`${r.body_fat}%`} />}
              {r.waist_cm && <DataCell label="腹囲" value={`${r.waist_cm}cm`} />}
              {r.hrv && <DataCell label="HRV" value={`${r.hrv}ms`} />}
              {r.sleep_hours && <DataCell label="睡眠" value={`${r.sleep_hours}h`} />}
              {r.sleep_score && <DataCell label="睡眠S" value={`${r.sleep_score}`} />}
              {r.energy_level && <DataCell label="エネルギー" value={`${r.energy_level}/10`} />}
              {r.agni && <DataCell label="アグニ" value={`${r.agni}/10`} />}
              {r.calories && <DataCell label="摂取エネルギー" value={`${r.calories}kcal`} />}
              {flags && <DataCell label="ディナチャリア" value={`${dinaDone}/9`} />}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function MetricChart({ label, unit, color, points, spanDays }: { label: string; unit: string; color: string; points: { date: string; value: number; offset: number }[]; spanDays: number }) {
  if (points.length === 0) return null
  const values = points.map((p) => p.value)
  const latest = values[values.length - 1]
  const diff = +(latest - values[0]).toFixed(1)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 320, H = 64, P = 6
  const coords = points.map((p) => ({
    x: P + (W - P * 2) * (spanDays > 0 ? p.offset / spanDays : 0.5),
    y: P + (H - P * 2) * (1 - (p.value - min) / range),
  }))
  const line = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const fmt = (v: number) => (unit === 'kcal' || unit === '') ? Math.round(v).toLocaleString() : v

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-stone-400">{label}</span>
        <span className="text-sm font-bold text-stone-700">
          {fmt(latest)}{unit && <span className="text-xs font-normal text-stone-400 ml-0.5">{unit}</span>}
          {points.length > 1 && (
            <span className={`text-xs font-semibold ml-2 ${diff < 0 ? 'text-teal-600' : diff > 0 ? 'text-amber-600' : 'text-stone-400'}`}>
              {diff > 0 ? '+' : ''}{fmt(diff)}
            </span>
          )}
        </span>
      </div>
      {points.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
          <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {coords.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      ) : (
        <p className="text-xs text-stone-300 py-3 text-center">推移には2日分以上の記録が必要</p>
      )}
    </div>
  )
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 rounded-xl p-2.5 text-center">
      <p className="text-xs text-stone-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-stone-700">{value}</p>
    </div>
  )
}

function StatCard({ label, value, sub, good }: { label: string; value: string; sub: string; good: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ${good ? 'bg-teal-50' : 'bg-white'}`}>
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${good ? 'text-teal-700' : 'text-stone-600'}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}
