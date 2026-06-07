'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import BottomNav from '@/components/BottomNav'
import type { HabitWithLog } from '@/lib/types'

const habitIcons: Record<string, string> = {
  '白湯を飲む': '/icons/cup.png',
  '舌磨き': '/icons/tongue.png',
  '食後散歩': '/icons/walk.png',
  '瞑想・呼吸法': '/icons/meditation.png',
  'デジタルデトックス': '/icons/no-phone.png',
  'アビヤンガ': '/icons/hand.png',
}

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

const tierColors = {
  1: { header: 'bg-teal-700', badge: 'bg-teal-50 text-teal-700', check: 'bg-teal-600', label: 'Tier 1 · 毎日' },
  2: { header: 'bg-sky-700', badge: 'bg-sky-50 text-sky-700', check: 'bg-sky-600', label: 'Tier 2 · 週5日' },
  3: { header: 'bg-violet-700', badge: 'bg-violet-50 text-violet-700', check: 'bg-violet-600', label: 'Tier 3 · 週3日' },
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
      <header className="bg-teal-800 text-white px-4 pt-12 pb-6">
        <p className="text-teal-200 text-sm">{today}</p>
        <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
          <Image src="/icons/habits.png" alt="" width={24} height={24} className="invert opacity-90" />
          習慣チェック
        </h1>
        <p className="text-teal-200 text-sm mt-0.5">
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
                      {habitIcons[habit.name] ? (
                        <Image src={habitIcons[habit.name]} alt="" width={20} height={20} className="opacity-50 flex-shrink-0" />
                      ) : (
                        <span className="text-lg mr-1">{habit.emoji}</span>
                      )}
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
              <p className="text-sm font-bold text-teal-700">
                {habits.length ? Math.round((completedTotal / habits.length) * 100) : 0}%
              </p>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-500"
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
