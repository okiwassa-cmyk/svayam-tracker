'use client'

import { useState } from 'react'

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
        <p className="text-xs text-teal-500 font-semibold mb-2">グルからのメッセージ</p>
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
          <span>🌿</span>
          グルに励ましてもらう
        </>
      )}
    </button>
  )
}
