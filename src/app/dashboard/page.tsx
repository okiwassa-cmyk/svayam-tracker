'use client'

import { useState, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ChartPoint = {
  date: string
  label: string
  weight: number | null
  waist_cm: number | null
  hrv: number | null
  energy_level: number | null
  agni: number | null
  sleep_hours: number | null
  calories: number | null
  habit_rate: number | null
  score_total: number
}

export default function DashboardPage() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [activeChart, setActiveChart] = useState<'body' | 'energy' | 'habit'>('body')

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(({ data }) => {
        setData(data ?? [])
        setLoading(false)
      })
  }, [])

  // Stats
  const weights = data.filter((r) => r.weight != null).map((r) => r.weight!)
  const waists = data.filter((r) => r.waist_cm != null).map((r) => r.waist_cm!)
  const latestWeight = weights[weights.length - 1]
  const firstWeight = weights[0]
  const weightChange = latestWeight != null && firstWeight != null ? latestWeight - firstWeight : null
  const latestWaist = waists[waists.length - 1]
  const firstWaist = waists[0]
  const waistChange = latestWaist != null && firstWaist != null ? latestWaist - firstWaist : null

  const withEnergy = data.filter((r) => r.energy_level != null)
  const avgEnergy = withEnergy.length
    ? withEnergy.reduce((s, r) => s + (r.energy_level ?? 0), 0) / withEnergy.length
    : null

  const withHRV = data.filter((r) => r.hrv != null)
  const avgHrv = withHRV.length
    ? withHRV.reduce((s, r) => s + (r.hrv ?? 0), 0) / withHRV.length
    : null

  const withHabit = data.filter((r) => r.habit_rate != null)
  const avgHabitRate = withHabit.length
    ? withHabit.reduce((s, r) => s + (r.habit_rate ?? 0), 0) / withHabit.length
    : null

  const chartTabs = [
    { id: 'body' as const, label: '体重・腹囲' },
    { id: 'energy' as const, label: 'エネルギー' },
    { id: 'habit' as const, label: '習慣達成率' },
  ]

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-stone-700 text-white px-4 pt-12 pb-6">
        <p className="text-stone-300 text-sm">過去30日間</p>
        <h1 className="text-2xl font-bold mt-1">グラフ</h1>
        <p className="text-stone-300 text-sm mt-0.5">実験の進捗</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-300 border-t-teal-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              label="体重変化"
              value={weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg` : '--'}
              sub={latestWeight != null ? `現在 ${latestWeight}kg` : '記録なし'}
              good={weightChange != null && weightChange < 0}
            />
            <SummaryCard
              label="腹囲変化"
              value={waistChange != null ? `${waistChange > 0 ? '+' : ''}${waistChange.toFixed(1)}cm` : '--'}
              sub={latestWaist != null ? `現在 ${latestWaist}cm` : '記録なし'}
              good={waistChange != null && waistChange < 0}
            />
            <SummaryCard
              label="平均エネルギー"
              value={avgEnergy != null ? `${avgEnergy.toFixed(1)}/10` : '--'}
              sub={`${withEnergy.length}日分`}
              good={avgEnergy != null && avgEnergy >= 6}
            />
            <SummaryCard
              label="習慣達成率"
              value={avgHabitRate != null ? `${avgHabitRate.toFixed(0)}%` : '--'}
              sub={`${withHabit.length}日分の平均`}
              good={avgHabitRate != null && avgHabitRate >= 70}
            />
          </div>

          {/* HRV card */}
          {avgHrv != null && (
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="平均HRV"
                value={`${avgHrv.toFixed(0)}ms`}
                sub={`${withHRV.length}日分`}
                good={avgHrv >= 40}
              />
            </div>
          )}

          {/* Chart */}
          {data.length > 1 ? (
            <section className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex gap-1.5 mb-4 bg-stone-100 rounded-xl p-1">
                {chartTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChart(tab.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeChart === tab.id
                        ? 'bg-white text-stone-700 shadow-sm'
                        : 'text-stone-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    />
                    {activeChart === 'body' && (
                      <>
                        <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} name="体重(kg)" connectNulls />
                        <Line type="monotone" dataKey="waist_cm" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="腹囲(cm)" connectNulls />
                      </>
                    )}
                    {activeChart === 'energy' && (
                      <>
                        <Line type="monotone" dataKey="energy_level" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="エネルギー" connectNulls />
                        <Line type="monotone" dataKey="agni" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="アグニ" connectNulls />
                        <Line type="monotone" dataKey="hrv" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} name="HRV" connectNulls />
                      </>
                    )}
                    {activeChart === 'habit' && (
                      <Line type="monotone" dataKey="habit_rate" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="習慣達成率(%)" connectNulls />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <p className="text-stone-600 font-semibold">データが2件以上あるとグラフが表示されます</p>
              <p className="text-stone-400 text-sm mt-1">毎日記録を続けましょう</p>
            </section>
          )}

          {/* Recent records */}
          <section>
            <h2 className="text-sm font-semibold text-stone-500 mb-3">最近の記録</h2>
            <div className="space-y-2">
              {[...data].reverse().slice(0, 7).map((r) => (
                <div key={r.date} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-700">{r.label}</p>
                    <p className="text-xs text-stone-400">
                      {r.energy_level != null ? `E${r.energy_level}` : ''}
                      {r.agni != null ? ` A${r.agni}` : ''}
                      {r.habit_rate != null ? ` | 習慣${r.habit_rate}%` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.weight != null && <p className="text-sm font-bold text-teal-700">{r.weight}kg</p>}
                    {r.waist_cm != null && <p className="text-xs text-violet-600">{r.waist_cm}cm</p>}
                    {r.hrv != null && <p className="text-xs text-stone-400">HRV {r.hrv}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function SummaryCard({ label, value, sub, good }: {
  label: string; value: string; sub: string; good: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ${good ? 'bg-teal-50' : 'bg-white'}`}>
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${good ? 'text-teal-700' : 'text-stone-700'}`}>{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
    </div>
  )
}
