'use client'

import { useState, useEffect, useCallback } from 'react'

type AbhyangaLog = { id: string; date: string; type: 'abhyanga' | 'garshana' }

export default function AbhyangaCheck({ date }: { date: string }) {
  const [selected, setSelected] = useState<'abhyanga' | 'garshana' | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/abhyanga?date=${date}`)
    const { data } = await res.json()
    if (data && data.length > 0) setSelected((data as AbhyangaLog[])[0].type)
  }, [date])

  useEffect(() => { load() }, [load])

  async function select(type: 'abhyanga' | 'garshana') {
    if (saving) return
    if (selected === type) {
      // deselect
      setSaving(true)
      setSelected(null)
      await fetch(`/api/abhyanga?date=${date}`, { method: 'DELETE' })
      setSaving(false)
      return
    }
    setSaving(true)
    setSelected(type)
    await fetch('/api/abhyanga', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, type }),
    })
    setSaving(false)
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600 mb-3">アビヤンガ</h2>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => select('abhyanga')}
          className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
            selected === 'abhyanga'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'bg-stone-50 text-stone-600'
          }`}
        >
          アビヤンガ
        </button>
        <button
          onClick={() => select('garshana')}
          className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
            selected === 'garshana'
              ? 'bg-amber-700 text-white shadow-sm'
              : 'bg-stone-50 text-stone-600'
          }`}
        >
          ガルシャナ
        </button>
      </div>
    </section>
  )
}
