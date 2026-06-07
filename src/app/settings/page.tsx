'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import NotificationToggle from '@/components/NotificationToggle'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export default function SettingsPage() {
  const [startDate, setStartDate] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [targetWaist, setTargetWaist] = useState('')
  const [fastingDay, setFastingDay] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        if (data.start_date) setStartDate(data.start_date)
        if (data.target_weight) setTargetWeight(String(data.target_weight))
        if (data.target_waist) setTargetWaist(String(data.target_waist))
        if (data.fasting_day != null) setFastingDay(data.fasting_day)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: startDate || null,
          target_weight: targetWeight || null,
          target_waist: targetWaist || null,
          fasting_day: fastingDay,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const experimentDay = startDate
    ? Math.floor((Date.now() - new Date(startDate + 'T00:00:00+09:00').getTime()) / 86400000) + 1
    : null

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-stone-800 text-white px-4 pt-12 pb-6">
        <Link href="/" className="text-stone-300 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold mt-1">設定</h1>
        {experimentDay != null && experimentDay > 0 && (
          <p className="text-stone-300 text-sm mt-0.5">実験 {experimentDay} 日目</p>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {/* Experiment start */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-600 mb-3">実験設定</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">実験開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-stone-400/40"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">ファスティング曜日</label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setFastingDay(fastingDay === i ? null : i)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        fastingDay === i
                          ? 'bg-stone-700 text-white'
                          : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {fastingDay != null && (
                  <p className="text-xs text-stone-400 mt-1.5">毎週{DAY_LABELS[fastingDay]}曜日がファスティングデーです</p>
                )}
              </div>
            </div>
          </section>

          {/* Goals */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-600 mb-3">目標値</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 mb-1 block">目標体重 (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder="65.0"
                  className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-stone-400/40"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1 block">目標腹囲 (cm)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={targetWaist}
                  onChange={(e) => setTargetWaist(e.target.value)}
                  placeholder="80.0"
                  className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-stone-400/40"
                />
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-600 mb-3">通知設定</h2>
            <NotificationToggle />
          </section>

          {/* Info */}
          <section className="bg-stone-50 rounded-2xl p-4">
            <p className="text-xs text-stone-500 leading-relaxed">
              体質：カファ・ピッタ（インドのドクター診断済み）<br />
              実験期間：90日間<br />
              目的：アーユルヴェーダ的生活習慣の科学的検証
            </p>
          </section>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 ${
              saved ? 'bg-teal-600' : saving ? 'bg-stone-300' : 'bg-stone-800 shadow-md'
            }`}
          >
            {saved ? '✓ 保存しました' : saving ? '保存中...' : '設定を保存'}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
