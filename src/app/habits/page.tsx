'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import BottomNav from '@/components/BottomNav'
import type { HabitWithLog } from '@/lib/types'

const habitIcons: Record<string, string> = {
  '白湯を飲む': '/icons/cup.svg',
  '昼食時にお腹が空いている': '/icons/eating.svg',
  '間食しない': '/icons/no-sign.svg',
  '18〜19時までに夕食': '/icons/clock.svg',
  '22〜23時までに就寝': '/icons/sleep.svg',
  '舌磨き': '/icons/tongue.svg',
  'オイルプリング': '/icons/drops.svg',
  '運動（30〜60分）': '/icons/swim.svg',
  'アビヤンガまたはガルシャナ': '/icons/hand.svg',
  'ヨガ・瞑想・呼吸法': '/icons/meditation.svg',
  'ファスティング': '/icons/fire.svg',
}

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}


const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function parseDays(days: string | null): number[] {
  if (!days) return [0, 1, 2, 3, 4, 5, 6]
  return days.split(',').map(Number)
}

function formatDays(days: number[]): string {
  if (days.length === 7) return '毎日'
  return days.map((d) => DAY_LABELS[d]).join('・')
}

export default function HabitsPage() {
  const today = getTodayJST()
  const [habits, setHabits] = useState<HabitWithLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)

  const loadHabits = useCallback(async () => {
    const res = await fetch(`/api/habits?date=${today}`)
    const { data } = await res.json()
    setHabits(data ?? [])
    setLoading(false)
  }, [today])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  async function updateDays(habitId: string, days: number[]) {
    const days_of_week = days.length === 7 ? null : days.sort((a, b) => a - b).join(',')
    const frequency = days.length
    setHabits((prev) => prev.map((h) => h.id === habitId ? { ...h, frequency, days_of_week } : h))
    await fetch('/api/habits', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: habitId, frequency, days_of_week }),
    })
  }

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

  const completedTotal = habits.filter((h) => h.completed).length

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-teal-800 text-white px-4 pt-12 pb-6">
        <p className="text-teal-200 text-sm">{today}</p>
        <h1 className="text-2xl font-bold mt-1 flex items-center gap-2">
          <Image src="/icons/habits.svg" unoptimized alt="" width={24} height={24} className="invert opacity-90" />
          習慣チェック
        </h1>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-teal-200 text-sm">
            {loading ? '読み込み中...' : `${completedTotal}/${habits.length} 達成`}
          </p>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${editMode ? 'bg-white text-teal-800' : 'bg-teal-600 text-white'}`}
          >
            {editMode ? '完了' : '頻度を編集'}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-300 border-t-green-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          <section className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-stone-50">
              {habits.map((habit) => (
                <div key={habit.id}>
                  <button
                    onClick={() => !editMode && toggle(habit)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-stone-50 transition-colors text-left"
                  >
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${
                      habit.completed ? 'bg-teal-600' : 'border-2 border-stone-200'
                    }`}>
                      {habit.completed && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {habitIcons[habit.name] ? (
                      <Image src={habitIcons[habit.name]} unoptimized alt="" width={20} height={20} className="opacity-50 flex-shrink-0" />
                    ) : (
                      <span className="text-lg mr-1">{habit.emoji}</span>
                    )}
                    <span className={`text-sm flex-1 ${habit.completed ? 'text-stone-400 line-through' : 'text-stone-700 font-medium'}`}>
                      {habit.name}
                    </span>
                    {!editMode && (
                      <span className="text-xs text-stone-300">
                        {formatDays(parseDays(habit.days_of_week ?? null))}
                      </span>
                    )}
                  </button>
                  {editMode && (
                    <div className="px-4 pb-3">
                      <div className="flex gap-1.5">
                        {DAY_LABELS.map((label, i) => {
                          const selectedDays = parseDays(habit.days_of_week ?? null)
                          const selected = selectedDays.includes(i)
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                const newDays = selected
                                  ? selectedDays.filter((d) => d !== i)
                                  : [...selectedDays, i]
                                if (newDays.length > 0) updateDays(habit.id, newDays)
                              }}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                selected ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-400'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

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
