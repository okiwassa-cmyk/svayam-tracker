'use client'

import { useState } from 'react'

function YogaIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <circle cx="32" cy="10" r="6" fill="currentColor" opacity="0.7" />
      {/* Body sitting in lotus */}
      <ellipse cx="32" cy="38" rx="16" ry="10" fill="currentColor" opacity="0.5" />
      {/* Left leg */}
      <path d="M16 38 Q10 44 8 50 Q12 52 16 48 Q20 44 22 40" fill="currentColor" opacity="0.6" />
      {/* Right leg */}
      <path d="M48 38 Q54 44 56 50 Q52 52 48 48 Q44 44 42 40" fill="currentColor" opacity="0.6" />
      {/* Arms raised */}
      <path d="M20 32 Q14 24 10 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M44 32 Q50 24 54 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* Hands open */}
      <circle cx="10" cy="17" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="54" cy="17" r="3" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export default function EncouragementCard({
  habitRate,
  energy,
  experimentDay,
}: {
  habitRate: number | null
  energy: number | null
  experimentDay: number | null
}) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function getEncouragement() {
    setLoading(true)
    try {
      const res = await fetch('/api/encourage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitRate, energy, dayNumber: experimentDay }),
      })
      const { message } = await res.json()
      setMessage(message)
    } finally {
      setLoading(false)
    }
  }

  if (message) {
    return (
      <section className="bg-teal-50 border border-teal-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2 text-teal-600">
          <YogaIcon />
          <p className="text-xs font-semibold">グルからのメッセージ</p>
        </div>
        <p className="text-sm text-teal-800 leading-relaxed">{message}</p>
        <button
          onClick={() => setMessage('')}
          className="mt-3 text-xs text-teal-400"
        >
          閉じる
        </button>
      </section>
    )
  }

  return (
    <button
      onClick={getEncouragement}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-stone-100 text-stone-500 text-sm font-medium shadow-sm active:scale-95 transition-all disabled:opacity-50"
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          メッセージを受け取り中...
        </>
      ) : (
        <>
          <YogaIcon />
          グルに励ましてもらう
        </>
      )}
    </button>
  )
}
