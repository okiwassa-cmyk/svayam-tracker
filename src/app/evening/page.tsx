'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

export default function EveningPage() {
  const router = useRouter()
  const today = getTodayJST()

  const [calories, setCalories] = useState('')
  const [note, setNote] = useState('')
  const [dinnerTime, setDinnerTime] = useState<1|2|3>(1)
  const [dinnerAmount, setDinnerAmount] = useState<1|2|3>(2)
  const [alcohol, setAlcohol] = useState<1|2|3>(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/record?date=${today}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        if (data.calories) setCalories(String(data.calories))
        if (data.note) setNote(data.note)
        if (data.dinner_time) setDinnerTime(data.dinner_time as 1|2|3)
        if (data.dinner_amount) setDinnerAmount(data.dinner_amount as 1|2|3)
        if (data.alcohol) setAlcohol(data.alcohol as 1|2|3)
      })
  }, [today])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          calories: calories ? parseInt(calories) : null,
          note: note || null,
          dinner_time: dinnerTime,
          dinner_amount: dinnerAmount,
          alcohol,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => router.push('/'), 1000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="bg-slate-700 text-white px-4 pt-12 pb-6">
        <Link href="/" className="text-slate-300 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Image src="/icons/moon.svg" unoptimized alt="" width={24} height={24} className="invert opacity-90" />
          夜の記録
        </h1>
        <p className="text-slate-300 text-sm mt-0.5">{today}</p>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Evening choices */}
        <ChoiceSection
          label="夕食の時間"
          options={[
            { value: 1, label: '18時台', icon: '🌅' },
            { value: 2, label: '19時台', icon: '🌆' },
            { value: 3, label: '20時以降', icon: '🌃' },
          ]}
          value={dinnerTime}
          onChange={(v) => setDinnerTime(v as 1|2|3)}
        />
        <ChoiceSection
          label="夕食の量"
          options={[
            { value: 1, label: '軽め', icon: '🥗' },
            { value: 2, label: '普通', icon: '🍱' },
            { value: 3, label: '重め', icon: '🍖' },
          ]}
          value={dinnerAmount}
          onChange={(v) => setDinnerAmount(v as 1|2|3)}
        />
        <ChoiceSection
          label="飲酒"
          options={[
            { value: 1, label: 'なし', icon: '💧' },
            { value: 2, label: '少し', icon: '🥂' },
            { value: 3, label: '飲んだ', icon: '🍷' },
          ]}
          value={alcohol}
          onChange={(v) => setAlcohol(v as 1|2|3)}
        />

        {/* Calories */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-2">総カロリー（任意）</h2>
          <input
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="1800"
            className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-slate-400/40"
          />
        </section>

        {/* Note */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-2">メモ（任意）</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今日の気づき、明日への一言..."
            className="w-full text-sm text-stone-700 bg-stone-50 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-slate-400/40"
            rows={3}
          />
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 ${
            saved
              ? 'bg-green-500'
              : saving
              ? 'bg-stone-300'
              : 'bg-slate-700 shadow-md'
          }`}
        >
          {saved ? '✅ 記録完了！' : saving ? '保存中...' : '記録を保存'}
        </button>
      </div>
    </div>
  )
}

function ChoiceSection({
  label, options, value, onChange,
}: {
  label: string
  options: { value: number; label: string; icon: string }[]
  value: number
  onChange: (v: number) => void
}) {
  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600 mb-3">{label}</h2>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all active:scale-95 ${
              value === opt.value
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-stone-50 text-stone-600'
            }`}
          >
            <span className="text-xs font-semibold">{opt.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

