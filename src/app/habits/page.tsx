'use client'

import { useState, useEffect, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'
import type { HabitWithLog } from '@/lib/types'

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

const tierColors = {
  1: { header: 'bg-green-600', badge: 'bg-green-100 text-green-700', check: 'bg-green-500', label: 'Tier 1 · 毎日' },
  2: { header: 'bg-blue-600', badge: 'bg-blue-100 text-blue-700', check: 'bg-blue-500', label: 'Tier 2 · 週5日' },
  3: { header: 'bg-purple-600', badge: 'bg-purple-100 text-purple-700', check: 'bg-purple-500', label: 'Tier 3 · 週3日' },
}

export default function HabitsPage() {
  const today = getTodayJST()
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadHabits = useCallback(async () => {
    const res = await fetch(`/api/habits?date=${today}`)
    const { data } = await res.json()
    setHabits(data ?? [])
    setLoading(false)
  }, [today])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  async function toggle(habit: HabitWithLog) {
    const newCompleted = !habit.completed
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, completed: newCompleted } : h))
    )
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, habit_id: habit.id, completed: newCompleted }),
    })
  }

  const tiers = [1, 2, 3] as const
  const completedTotal = habits.filter((h) => h.completed).length

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-green-700 text-white px-4 pt-12 pb-6">
        <p className="text-green-200 text-sm">{today}</p>
        <h1 className="text-2xl font-bold mt-1">✅ 習慣チェック</h1>
        <p className="text-green-200 text-sm mt-0.5">
          {loading ? '読み込み中...' : `${completedTotal}/${habits.length} 達成`}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-300 border-t-green-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {tiers.map((tier) => {
            const tierHabits = habits.filter((h) => h.tier === tier)
            const done = tierHabits.filter((h) => h.completed).length
            const c = tierColors[tier]
            return (
              <section key={tier} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className={`${c.header} px-4 py-3 flex items-center justify-between`}>
                  <span className="text-white font-semibold text-sm">{c.label}</span>
                  <span className="text-white font-bold">{done}/{tierHabits.length}</span>
                </div>
                <div className="divide-y divide-stone-50">
                  {tierHabits.map((habit) => (
                    <button
                      key={habit.id}
                      onClick={() => toggle(habit)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-stone-50 transition-colors text-left"
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                          habit.completed ? c.check : 'border-2 border-stone-200'
                        }`}
                      >
                        {habit.completed && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Label */}
                      <span className="text-lg mr-1">{habit.emoji}</span>
                      <span
                        className={`text-sm ${
                          habit.completed ? 'text-stone-400 line-through' : 'text-stone-700 font-medium'
                        }`}
                      >
                        {habit.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}

          {/* Progress bar */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-stone-600">今日の達成率</p>
              <p className="text-sm font-bold text-green-700">
                {habits.length ? Math.round((completedTotal / habits.length) * 100) : 0}%
              </p>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${habits.length ? (completedTotal / habits.length) * 100 : 0}%` }}
              />
            </div>
          </section>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
