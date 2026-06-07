'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import BowelLogger from '@/components/BowelLogger'

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

export default function MorningPage() {
  const router = useRouter()
  const today = getTodayJST()

  const [energy, setEnergy] = useState(5)
  const [agni, setAgni] = useState(5)
  const [bowel, setBowel] = useState<boolean | null>(null) // kept for DB compat
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [hrv, setHrv] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load existing data
  useEffect(() => {
    fetch(`/api/record?date=${today}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        if (data.energy_level) setEnergy(data.energy_level)
        if (data.agni) setAgni(data.agni)
        if (data.bowel_movement != null) setBowel(data.bowel_movement)
        if (data.weight) setWeight(String(data.weight))
        if (data.body_fat) setBodyFat(String(data.body_fat))
        if (data.sleep_hours) setSleepHours(String(data.sleep_hours))
        if (data.hrv) setHrv(String(data.hrv))
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
          energy_level: energy,
          agni,
          weight: weight ? parseFloat(weight) : null,
          body_fat: bodyFat ? parseFloat(bodyFat) : null,
          sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
          hrv: hrv ? parseInt(hrv) : null,
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
      <header className="bg-amber-800 text-white px-4 pt-12 pb-6">
        <Link href="/" className="text-amber-200 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Image src="/icons/sunrise.png" alt="" width={26} height={26} className="invert opacity-90" />
          朝の記録
        </h1>
        <p className="text-amber-200 text-sm mt-0.5">{today}</p>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Energy */}
        <SliderSection
          label="エネルギーレベル"
          icon="/icons/energy.png"
          value={energy}
          onChange={setEnergy}
          min={1}
          max={10}
          color="amber"
        />

        {/* Agni */}
        <SliderSection
          label="アグニ（消化力）"
          icon="/icons/fire.png"
          value={agni}
          onChange={setAgni}
          min={1}
          max={10}
          color="orange"
        />

        {/* Bowel Movement */}
        <BowelLogger date={today} />

        {/* Biometrics */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">バイオデータ（任意）</h2>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="体重 (kg)" icon="/icons/weight.png" value={weight} onChange={setWeight} placeholder="68.5" type="decimal" />
            <InputField label="体脂肪率 (%)" value={bodyFat} onChange={setBodyFat} placeholder="22.0" type="decimal" />
            <InputField label="睡眠時間 (h)" icon="/icons/sleep.png" value={sleepHours} onChange={setSleepHours} placeholder="7.5" type="decimal" />
            <InputField label="HRV (ms)" icon="/icons/hrv.png" value={hrv} onChange={setHrv} placeholder="45" type="number" />
          </div>
        </section>

        {/* Note */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-2">📝 メモ（任意）</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今日の体調、気づきなど..."
            className="w-full text-sm text-stone-700 bg-stone-50 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-amber-700/30"
            rows={3}
          />
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 ${
            saved
              ? 'bg-teal-600'
              : saving
              ? 'bg-stone-300'
              : 'bg-amber-800 shadow-md'
          }`}
        >
          {saved ? '✅ 記録完了！' : saving ? '保存中...' : '記録を保存'}
        </button>
      </div>
    </div>
  )
}

function SliderSection({
  label, icon, value, onChange, min, max, color,
}: {
  label: string
  icon?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  color: string
}) {
  const colorMap: Record<string, string> = {
    amber: 'accent-amber-700',
    orange: 'accent-amber-800',
  }
  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-600 flex items-center gap-2">
          {icon && <Image src={icon} alt="" width={18} height={18} className="opacity-50" />}
          {label}
        </h2>
        <span className="text-2xl font-bold text-stone-800">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-full ${colorMap[color]} cursor-pointer`}
      />
      <div className="flex justify-between text-xs text-stone-400 mt-1">
        <span>{min} 最低</span>
        <span>最高 {max}</span>
      </div>
    </section>
  )
}

function InputField({
  label, icon, value, onChange, placeholder, type,
}: {
  label: string
  icon?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type: string
}) {
  return (
    <div>
      <label className="text-xs text-stone-500 mb-1 flex items-center gap-1">
        {icon && <Image src={icon} alt="" width={13} height={13} className="opacity-40" />}
        {label}
      </label>
      <input
        type={type === 'decimal' ? 'number' : 'number'}
        inputMode={type === 'decimal' ? 'decimal' : 'numeric'}
        step={type === 'decimal' ? '0.1' : '1'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-amber-700/30"
      />
    </div>
  )
}
