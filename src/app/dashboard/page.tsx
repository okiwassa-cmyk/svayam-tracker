'use client'

import { useState, useEffect } from 'react'
import BottomNav from '@/components/BottomNav'
import type { DailyRecord } from '@/lib/types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type ChartRecord = {
  date: string
  label: string
  weight: number | null
  energy_level: number | null
  agni: number | null
  hrv: number | null
  tier1_score: number | null
  tier2_score: number | null
  tier3_score: number | null
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00+09:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function DashboardPage() {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeChart, setActiveChart] = useState<'weight' | 'energy' | 'habit'>('weight')

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(({ data }) => {
        setRecords(data ?? [])
        setLoading(false)
      })
  }, [])

  const chartData: ChartRecord[] = records.map((r) => ({
    date: r.date,
    label: formatShortDate(r.date),
    weight: r.weight,
    energy_level: r.energy_level,
    agni: r.agni,
    hrv: r.hrv,
    tier1_score: r.tier1_score,
    tier2_score: r.tier2_score,
    tier3_score: r.tier3_score,
  }))

  // Stats
  const weights = records.filter((r) => r.weight != null).map((r) => r.weight!)
  const latestWeight = weights[weights.length - 1]
  const firstWeight = weights[0]
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null

  const avgEnergy = records.length
    ? records.filter((r) => r.energy_level).reduce((s, r) => s + (r.energy_level ?? 0), 0) /
      records.filter((r) => r.energy_level).length
    : null

  const avgHrv = records.length
    ? records.filter((r) => r.hrv).reduce((s, r) => s + (r.hrv ?? 0), 0) /
      records.filter((r) => r.hrv).length
    : null

  const tier1Avg = records.filter((r) => r.tier1_score != null)
  const tier1Rate = tier1Avg.length
    ? tier1Avg.reduce((s, r) => s + (r.tier1_score ?? 0), 0) / (tier1Avg.length * 5) * 100
    : null

  const chartTabs = [
    { id: 'weight' as const, label: '体重', emoji: '⚖️' },
    { id: 'energy' as const, label: 'エネルギー', emoji: '⚡' },
    { id: 'habit' as const, label: '習慣スコア', emoji: '✅' },
  ]

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-teal-700 text-white px-4 pt-12 pb-6">
        <p className="text-teal-200 text-sm">過去30日間</p>
        <h1 className="text-2xl font-bold mt-1">📊 ダッシュボード</h1>
        <p className="text-teal-200 text-sm mt-0.5">実験の進捗を確認</p>
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
              emoji="⚖️"
              label="体重変化"
              value={weightChange != null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}kg` : '--'}
              sub={latestWeight ? `現在 ${latestWeight}kg` : '記録なし'}
              good={weightChange != null && weightChange < 0}
            />
            <SummaryCard
              emoji="⚡"
              label="平均エネルギー"
              value={avgEnergy != null ? `${avgEnergy.toFixed(1)}/10` : '--'}
              sub={`${records.filter((r) => r.energy_level).length}日分`}
              good={avgEnergy != null && avgEnergy >= 6}
            />
            <SummaryCard
              emoji="💓"
              label="平均HRV"
              value={avgHrv != null ? `${avgHrv.toFixed(0)}ms` : '--'}
              sub="心拍変動"
              good={avgHrv != null && avgHrv >= 40}
            />
            <SummaryCard
              emoji="✅"
              label="Tier1 達成率"
              value={tier1Rate != null ? `${tier1Rate.toFixed(0)}%` : '--'}
              sub={`${tier1Avg.length}日分`}
              good={tier1Rate != null && tier1Rate >= 80}
            />
          </div>

          {/* Chart */}
          {chartData.length > 1 ? (
            <section className="bg-white rounded-2xl p-4 shadow-sm">
              {/* Tab selector */}
              <div className="flex gap-2 mb-4">
                {chartTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChart(tab.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeChart === tab.id
                        ? 'bg-teal-600 text-white'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {tab.emoji} {tab.label}
                  </button>
                ))}
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    />
                    {activeChart === 'weight' && (
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#0d9488"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="体重(kg)"
                        connectNulls
                      />
                    )}
                    {activeChart === 'energy' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="energy_level"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="エネルギー"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="agni"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="アグニ"
                          connectNulls
                        />
                      </>
                    )}
                    {activeChart === 'habit' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="tier1_score"
                          stroke="#16a34a"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Tier1(/5)"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="tier2_score"
                          stroke="#2563eb"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Tier2(/5)"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="tier3_score"
                          stroke="#9333ea"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Tier3(/4)"
                          connectNulls
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <p className="text-4xl mb-3">📈</p>
              <p className="text-stone-600 font-semibold">データが2件以上あるとグラフが表示されます</p>
              <p className="text-stone-400 text-sm mt-1">毎日記録を続けましょう！</p>
            </section>
          )}

          {/* Records list */}
          <section>
            <h2 className="text-sm font-semibold text-stone-500 mb-3">最近の記録</h2>
            <div className="space-y-2">
              {[...records].reverse().slice(0, 7).map((r) => (
                <div key={r.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-700">{formatShortDate(r.date)}</p>
                    <p className="text-xs text-stone-400">
                      {r.energy_level ? `E${r.energy_level}` : ''}{r.agni ? ` A${r.agni}` : ''}
                      {r.tier1_score != null ? ` | ${r.tier1_score}-${r.tier2_score}-${r.tier3_score}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    {r.weight && <p className="text-sm font-bold text-teal-700">{r.weight}kg</p>}
                    {r.hrv && <p className="text-xs text-stone-400">HRV {r.hrv}</p>}
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

function SummaryCard({
  emoji, label, value, sub, good,
}: {
  emoji: string
  label: string
  value: string
  sub: string
  good: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 ${good ? 'bg-green-50' : 'bg-white'} shadow-sm`}>
      <p className="text-lg mb-1">{emoji}</p>
      <p className="text-xs text-stone-400">{label}</p>
      <p className={`text-xl font-bold ${good ? 'text-green-700' : 'text-stone-700'}`}>{value}</p>
      <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
    </div>
  )
}
