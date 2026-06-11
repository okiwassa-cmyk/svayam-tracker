'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ToiletLogger from '@/components/ToiletLogger'

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

const DINACHARYA_ITEMS = [
  { key: 'sleep', label: '昨日22〜23時に就寝した' },
  { key: 'wake', label: '5時に起きる' },
  { key: 'water', label: 'コップ1杯のお水を飲む' },
  { key: 'tongue_check', label: '舌苔チェック' },
  { key: 'brush', label: '歯磨き' },
  { key: 'gandusha', label: 'ガヴァラ（オイルうがい）' },
  { key: 'jala_neti', label: 'ジャラネティ（鼻洗浄）' },
  { key: 'nasya', label: 'ナスヤ（点鼻）' },
  { key: 'hayu', label: '白湯を作る' },
] as const

type DinacharyaKey = typeof DINACHARYA_ITEMS[number]['key']

export default function MorningPage() {
  const router = useRouter()
  const today = getTodayJST()

  // Dinacharya checklist (local only, not persisted)
  const [dinacharya, setDinacharya] = useState<Record<DinacharyaKey, boolean>>({
    sleep: false, wake: false, water: false, tongue_check: false, brush: false, gandusha: false, jala_neti: false, nasya: false, hayu: false,
  })

  // 1=スッキリ/なし/ある, 2=普通/少し/少し, 3=だるい/多い/ない
  const [clarity, setClarity] = useState<1|2|3>(2)
  const [tongue, setTongue] = useState<1|2|3>(1)
  const [tongueColor, setTongueColor] = useState<1|2|3>(1) // 1=白, 2=黄色, 3=褐色
  const [hunger, setHunger] = useState<1|2|3>(1)
  const [dinnerTime, setDinnerTime] = useState<0|1|2|3>(1) // 0=食べなかった
  const [dinnerAmount, setDinnerAmount] = useState<1|2|3>(1)
  const [alcohol, setAlcohol] = useState<1|2|3>(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fastingAlert, setFastingAlert] = useState<'eve' | 'day' | null>(null)

  // Asukken photo upload
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing data + check fasting schedule
  useEffect(() => {
    fetch(`/api/record?date=${today}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        if (data.morning_clarity) setClarity(data.morning_clarity as 1|2|3)
        else if (data.energy_level) setClarity(data.energy_level >= 7 ? 1 : data.energy_level >= 4 ? 2 : 3)
        if (data.tongue_coating) setTongue(data.tongue_coating as 1|2|3)
        if (data.tongue_color) setTongueColor(data.tongue_color as 1|2|3)
        if (data.morning_hunger) setHunger(data.morning_hunger as 1|2|3)
        if (data.dinner_time != null) setDinnerTime(data.dinner_time as 0|1|2|3)
        if (data.dinner_amount) setDinnerAmount(data.dinner_amount as 1|2|3)
        if (data.alcohol) setAlcohol(data.alcohol as 1|2|3)
        if (data.note) setNote(data.note)
        if (data.asukken_photo_url) setPhotoUrl(data.asukken_photo_url)
        if (data.dinacharya_flags) setDinacharya((prev) => ({ ...prev, ...data.dinacharya_flags }))
      })

    fetch('/api/settings')
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.fasting_day == null) return
        const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
        const todayDow = nowJST.getDay()
        const tomorrowDow = (todayDow + 1) % 7
        if (todayDow === data.fasting_day) setFastingAlert('day')
        else if (tomorrowDow === data.fasting_day) setFastingAlert('eve')
      })
  }, [today])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('date', today)
      const res = await fetch('/api/upload-asukken', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setPhotoUrl(url)
      }
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const clarityToEnergy: Record<number, number> = { 1: 8, 2: 5, 3: 2 }
      const tongueScore: Record<number, number> = { 1: 9, 2: 5, 3: 2 }
      const hungerScore: Record<number, number> = { 1: 9, 2: 5, 3: 2 }
      const agniVal = Math.round((tongueScore[tongue] + hungerScore[hunger]) / 2)

      const res = await fetch('/api/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          morning_clarity: clarity,
          tongue_coating: tongue,
          tongue_color: tongueColor,
          morning_hunger: hunger,
          energy_level: clarityToEnergy[clarity],
          agni: agniVal,
          dinner_time: dinnerTime,
          dinner_amount: dinnerTime === 0 ? null : dinnerAmount,
          alcohol,
          note: note || null,
          asukken_photo_url: photoUrl || null,
          dinacharya_flags: dinacharya,
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

  function toggleDinacharya(key: DinacharyaKey) {
    setDinacharya((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const dinacharyaDone = Object.values(dinacharya).filter(Boolean).length

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="bg-amber-800 text-white px-4 pt-12 pb-6">
        <Link href="/" className="text-amber-200 text-sm mb-2 inline-block">← ホームへ</Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Image src="/icons/sunrise.svg" unoptimized alt="" width={26} height={26} className="invert opacity-90" />
          朝の記録
        </h1>
        <p className="text-amber-200 text-sm mt-0.5">{today}</p>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Fasting Alert */}
        {fastingAlert === 'eve' && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-amber-800 mb-1">明日はアーマパーチャナの日</p>
            <p className="text-xs text-amber-700 leading-relaxed mb-3">
              明日のファスティングに向けて、今日の食事で消化器を整えましょう。
            </p>
            <div className="space-y-2">
              <div className="bg-white rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">昼食（今日一番の食事）</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  ムング豆のスープ・蒸し野菜・温かいお粥など消化しやすいものを。スパイスは生姜・クミン・コリアンダーで消化を助ける。
                </p>
              </div>
              <div className="bg-white rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">夕食（18時までに・軽め）</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  野菜スープかムング豆粥のみ。乳製品・揚げ物・生野菜・重い食べ物は避ける。白湯をたっぷり飲む。
                </p>
              </div>
              <div className="bg-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  避けるもの：乳製品、小麦、砂糖、肉、油っこいもの、冷たい飲み物
                </p>
              </div>
            </div>
          </section>
        )}
        {fastingAlert === 'day' && (
          <section className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-teal-800 mb-1">今日はアーマパーチャナ（ファスティング）</p>
            <p className="text-xs text-teal-700 leading-relaxed mb-2">
              体の毒素を燃やす浄化の日。瞑想・ヨーガ・呼吸法は通常通り行いましょう。激しい運動はお休みです。
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-2.5 text-center">
                <p className="text-xs text-teal-700">続ける</p>
                <p className="text-xs font-semibold text-stone-700 mt-0.5">瞑想・ヨーガ・呼吸法</p>
              </div>
              <div className="bg-white rounded-xl p-2.5 text-center">
                <p className="text-xs text-stone-400">お休み</p>
                <p className="text-xs font-semibold text-stone-400 mt-0.5">激しい運動</p>
              </div>
            </div>
            <p className="text-xs text-teal-600 mt-2">白湯・生姜湯・ハーブティーを飲んで過ごしましょう。</p>
          </section>
        )}

        {/* Dinacharya Checklist */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-600">朝のディナチャリア</h2>
            <span className="text-xs text-amber-700 font-semibold">{dinacharyaDone} / {DINACHARYA_ITEMS.length}</span>
          </div>
          <div className="space-y-2">
            {DINACHARYA_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => toggleDinacharya(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.98] ${
                  dinacharya[item.key]
                    ? 'bg-amber-700 text-white'
                    : 'bg-stone-50 text-stone-600'
                }`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  dinacharya[item.key] ? 'border-white bg-white' : 'border-stone-300'
                }`}>
                  {dinacharya[item.key] && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Morning Clarity */}
        <ChoiceSection
          label="目覚め"
          options={[
            { value: 1, label: 'スッキリ' },
            { value: 2, label: '普通' },
            { value: 3, label: 'だるい' },
          ]}
          value={clarity}
          onChange={(v) => setClarity(v as 1|2|3)}
        />

        {/* Tongue Coating amount */}
        <ChoiceSection
          label="舌苔の量（起床後に確認）"
          options={[
            { value: 1, label: 'なし' },
            { value: 2, label: '少し' },
            { value: 3, label: '多い' },
          ]}
          value={tongue}
          onChange={(v) => setTongue(v as 1|2|3)}
        />

        {/* Tongue Coating color */}
        <ChoiceSection
          label="舌苔の色"
          options={[
            { value: 1, label: '白' },
            { value: 2, label: '黄色' },
            { value: 3, label: '褐色' },
          ]}
          value={tongueColor}
          onChange={(v) => setTongueColor(v as 1|2|3)}
        />

        {/* Morning Hunger */}
        <ChoiceSection
          label="朝の空腹感（アグニ）"
          options={[
            { value: 1, label: 'お腹空いた' },
            { value: 2, label: '少し' },
            { value: 3, label: '空かない' },
          ]}
          value={hunger}
          onChange={(v) => setHunger(v as 1|2|3)}
        />

        {/* Previous night dinner */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">昨夜の夕食</h2>
          <div className="space-y-3">
            <button onClick={() => setDinnerTime(dinnerTime === 0 ? 1 : 0)}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${dinnerTime === 0 ? 'bg-amber-700 text-white' : 'bg-stone-50 text-stone-600'}`}>
              食べなかった
            </button>
            {dinnerTime !== 0 && (
              <>
                <div>
                  <p className="text-xs text-stone-400 mb-2">夕食の時間</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([{ value: 1, label: '18時台' }, { value: 2, label: '19時台' }, { value: 3, label: '20時以降' }] as const).map((opt) => (
                      <button key={opt.value} onClick={() => setDinnerTime(opt.value)}
                        className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${dinnerTime === opt.value ? 'bg-amber-700 text-white' : 'bg-stone-50 text-stone-600'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-2">夕食の量</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([{ value: 1, label: '軽め' }, { value: 2, label: '普通' }, { value: 3, label: '重め' }] as const).map((opt) => (
                      <button key={opt.value} onClick={() => setDinnerAmount(opt.value)}
                        className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${dinnerAmount === opt.value ? 'bg-amber-700 text-white' : 'bg-stone-50 text-stone-600'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <p className="text-xs text-stone-400 mb-2">飲酒</p>
              <div className="grid grid-cols-3 gap-2">
                {([{ value: 1, label: 'なし' }, { value: 2, label: '少し' }, { value: 3, label: '飲んだ' }] as const).map((opt) => (
                  <button key={opt.value} onClick={() => setAlcohol(opt.value)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${alcohol === opt.value ? 'bg-amber-700 text-white' : 'bg-stone-50 text-stone-600'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Toilet Logger */}
        <ToiletLogger date={today} />

        {/* Asukken Photo Upload */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">あすけんデータ（体組成）</h2>
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="あすけん" className="w-full rounded-xl object-cover max-h-64" />
              <button
                onClick={() => setPhotoUrl(null)}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
              >
                削除
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photoUploading}
              className="w-full py-8 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 text-sm flex flex-col items-center gap-2 active:bg-stone-50"
            >
              {photoUploading ? (
                <span>アップロード中...</span>
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  <span>スクリーンショットを追加</span>
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </section>

        {/* Note */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-2">メモ（任意）</h2>
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
          {saved ? '記録完了！' : saving ? '保存中...' : '記録を保存'}
        </button>
      </div>
    </div>
  )
}

function ChoiceSection({
  label, options, value, onChange,
}: {
  label: string
  options: { value: number; label: string }[]
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
                ? 'bg-amber-700 text-white shadow-sm'
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
