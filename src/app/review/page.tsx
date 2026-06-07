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
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/review')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!data) return
    const lines = [
      `【アーユルヴェーダ実験 週次レビュー】`,
      `期間：${fmtDate(data.from)} 〜 ${fmtDate(data.to)}`,
      ``,
      `◆ 習慣達成率：${data.avgHabitRate != null ? `${data.avgHabitRate}%` : '--'}`,
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
      <header className="bg-teal-800 text-white px-4 pt-12 pb-6">
        <Link href="/" className="text-teal-200 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold">週次レビュー</h1>
        {data && <p className="text-teal-200 text-sm mt-0.5">{fmtDate(data.from)} 〜 {fmtDate(data.to)}</p>}
      </header>

      {!data || data.recordCount === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-stone-500">今週はまだ記録がありません</p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {/* Habit rate */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-xs font-semibold text-stone-400 uppercase mb-3">習慣達成率</h2>
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

function StatCard({ label, value, sub, good }: { label: string; value: string; sub: string; good: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ${good ? 'bg-teal-50' : 'bg-white'}`}>
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${good ? 'text-teal-700' : 'text-stone-600'}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  )
}
