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

const tier1Habits = ['白湯を飲む', '昼食を一番大きくする', '間食しない', '18〜19時までに夕食', '22〜23時までに就寝']
const tier2Habits = ['運動（30〜60分）', '舌磨き', 'オイルプリング', '食後散歩', 'ハーブティー']
const tier3Habits = ['ガルシャナ（乾布摩擦）', 'アビヤンガ', '瞑想・呼吸法', 'デジタルデトックス']

export default function EveningPage() {
  const router = useRouter()
  const today = getTodayJST()

  const [tier1, setTier1] = useState(0)
  const [tier2, setTier2] = useState(0)
  const [tier3, setTier3] = useState(0)
  const [calories, setCalories] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/record?date=${today}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        if (data.tier1_score != null) setTier1(data.tier1_score)
        if (data.tier2_score != null) setTier2(data.tier2_score)
        if (data.tier3_score != null) setTier3(data.tier3_score)
        if (data.calories) setCalories(String(data.calories))
        if (data.note) setNote(data.note)
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
          tier1_score: tier1,
          tier2_score: tier2,
          tier3_score: tier3,
          calories: calories ? parseInt(calories) : null,
          note: note || null,
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
          <Image src="/icons/moon.png" alt="" width={24} height={24} className="invert opacity-90" />
          夜の記録
        </h1>
        <p className="text-slate-300 text-sm mt-0.5">{today}</p>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Tier 1 */}
        <TierSection
          tier={1}
          label="Tier 1 — 毎日の基本習慣"
          habits={tier1Habits}
          max={5}
          value={tier1}
          onChange={setTier1}
          color="green"
        />

        {/* Tier 2 */}
        <TierSection
          tier={2}
          label="Tier 2 — 週5日目標"
          habits={tier2Habits}
          max={5}
          value={tier2}
          onChange={setTier2}
          color="blue"
        />

        {/* Tier 3 */}
        <TierSection
          tier={3}
          label="Tier 3 — 週3日目標"
          habits={tier3Habits}
          max={4}
          value={tier3}
          onChange={setTier3}
          color="purple"
        />

        {/* Calories */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-2">🍽 総カロリー（任意）</h2>
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
          <h2 className="text-sm font-semibold text-stone-600 mb-2">📝 メモ（任意）</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今日の気づき、明日への一言..."
            className="w-full text-sm text-stone-700 bg-stone-50 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-slate-400/40"
            rows={3}
          />
        </section>

        {/* Summary */}
        <section className="bg-slate-50 rounded-2xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-1">今日のスコア</p>
          <p className="text-3xl font-bold text-slate-800">{tier1}-{tier2}-{tier3}</p>
          <p className="text-xs text-slate-500 mt-0.5">Tier1/5 · Tier2/5 · Tier3/4</p>
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

function TierSection({
  tier, label, habits, max, value, onChange, color,
}: {
  tier: number
  label: string
  habits: string[]
  max: number
  value: number
  onChange: (v: number) => void
  color: string
}) {
  const colorMap: Record<string, { bg: string; text: string; btn: string; activebtn: string }> = {
    green: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      btn: 'bg-stone-100 text-stone-400',
      activebtn: 'bg-teal-600 text-white',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      btn: 'bg-stone-100 text-stone-400',
      activebtn: 'bg-sky-700 text-white',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      btn: 'bg-stone-100 text-stone-400',
      activebtn: 'bg-violet-700 text-white',
    },
  }
  const c = colorMap[color]

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-stone-600">{label}</h2>
        <span className={`text-xl font-bold ${c.text}`}>{value}/{max}</span>
      </div>
      <div className="text-xs text-stone-400 mb-3 space-y-0.5">
        {habits.map((h) => (
          <p key={h}>· {h}</p>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              value === i ? c.activebtn : c.btn
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </section>
  )
}
