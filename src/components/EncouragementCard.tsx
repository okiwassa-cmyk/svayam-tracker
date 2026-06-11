'use client'

import { useState } from 'react'

function YogaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="10" r="6" fill="currentColor" opacity="0.7" />
      <ellipse cx="32" cy="38" rx="16" ry="10" fill="currentColor" opacity="0.5" />
      <path d="M16 38 Q10 44 8 50 Q12 52 16 48 Q20 44 22 40" fill="currentColor" opacity="0.6" />
      <path d="M48 38 Q54 44 56 50 Q52 52 48 48 Q44 44 42 40" fill="currentColor" opacity="0.6" />
      <path d="M20 32 Q14 24 10 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M44 32 Q50 24 54 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <circle cx="10" cy="17" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="54" cy="17" r="3" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export default function EncouragementCard({
  keyScore,
  weight,
  calories,
  energy,
  excellentMeals,
  totalMeals,
  experimentDay,
}: {
  keyScore: { done: number; total: number }
  weight: number | null
  calories: number | null
  energy: number | null
  excellentMeals: number
  totalMeals: number
  experimentDay: number | null
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const scoreRate = keyScore.total > 0 ? Math.round((keyScore.done / keyScore.total) * 100) : 0

  async function getEncouragement() {
    setLoading(true)
    try {
      const res = await fetch('/api/encourage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyScore,
          weight,
          calories,
          energy,
          excellentMeals,
          totalMeals,
          dayNumber: experimentDay,
        }),
      })
      const { message } = await res.json()
      setMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
      {/* Today's summary */}
      <h2 className="text-xs font-semibold text-teal-600 mb-3">今日のまとめ</h2>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl p-3">
          <p className="text-xs text-stone-400 mb-1">習慣達成</p>
          <p className="text-lg font-bold text-teal-700">{keyScore.done}<span className="text-sm font-normal text-stone-400"> / {keyScore.total}</span></p>
          <div className="mt-1.5 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${scoreRate}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-3">
          <p className="text-xs text-stone-400 mb-1">食事品質</p>
          {totalMeals > 0 ? (
            <p className="text-lg font-bold text-green-600">{excellentMeals}<span className="text-sm font-normal text-stone-400"> / {totalMeals}食</span></p>
          ) : (
            <p className="text-sm text-stone-400">未記録</p>
          )}
          <p className="text-xs text-stone-400 mt-1">優良◎</p>
        </div>
        {weight && (
          <div className="bg-white rounded-xl p-3">
            <p className="text-xs text-stone-400 mb-1">体重</p>
            <p className="text-lg font-bold text-stone-700">{weight}<span className="text-xs font-normal text-stone-400">kg</span></p>
          </div>
        )}
        {calories && (
          <div className="bg-white rounded-xl p-3">
            <p className="text-xs text-stone-400 mb-1">カロリー</p>
            <p className="text-lg font-bold text-stone-700">{calories}<span className="text-xs font-normal text-stone-400">kcal</span></p>
          </div>
        )}
        {energy && (
          <div className="bg-white rounded-xl p-3">
            <p className="text-xs text-stone-400 mb-1">エネルギー</p>
            <p className="text-lg font-bold text-amber-600">{energy}<span className="text-xs font-normal text-stone-400"> / 10</span></p>
          </div>
        )}
      </div>

      {/* Guru section */}
      {message ? (
        <div>
          <div className="flex items-center gap-2 mb-2 text-teal-600">
            <YogaIcon />
            <p className="text-xs font-semibold">グルからのメッセージ</p>
          </div>
          <p className="text-sm text-teal-800 leading-relaxed">{message}</p>
          <button onClick={() => setMessage('')} className="mt-3 text-xs text-teal-400">閉じる</button>
        </div>
      ) : (
        <button
          onClick={getEncouragement}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-teal-200 text-teal-600 text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
              メッセージを受け取り中...
            </>
          ) : (
            <>
              <YogaIcon />
              グルに励ましてもらう
            </>
          )}
        </button>
      )}
    </section>
  )
}
