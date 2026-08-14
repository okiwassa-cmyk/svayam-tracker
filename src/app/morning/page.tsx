'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ToiletLogger from '@/components/ToiletLogger'
import CaffeineLogger from '@/components/CaffeineLogger'
import YesterdayReview from '@/components/YesterdayReview'

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

function previousDay(date: string) {
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-')
}

// 睡眠時間：DBは小数（6.5）で保存、入力欄は H:MM（6:30）で表示
function decimalToHHMM(dec: number) {
  const h = Math.floor(dec)
  const m = Math.round((dec - h) * 60)
  if (m === 60) return `${h + 1}:00`
  return `${h}:${String(m).padStart(2, '0')}`
}

function hhmmToDecimal(str: string): number | null {
  const s = str.trim()
  if (!s) return null
  if (s.includes(':')) {
    const [h, m] = s.split(':')
    const hn = parseInt(h, 10) || 0
    const mn = parseInt(m, 10) || 0
    return Math.round((hn + mn / 60) * 100) / 100
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
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
  // オージャス・アーマ・アグニの指標なので初期値を置かない（未入力と「1」を取り違えないため）
  const [clarity, setClarity] = useState<1|2|3|null>(null)
  const [tongue, setTongue] = useState<1|2|3|null>(null)
  const [tongueColor, setTongueColor] = useState<1|2|3|null>(null) // 1=白, 2=黄色, 3=褐色
  const [hunger, setHunger] = useState<1|2|3|null>(null)
  const [dinnerTime, setDinnerTime] = useState<0|1|2|3|null>(null) // 0=食べなかった
  const [dinnerAmount, setDinnerAmount] = useState<1|2|3|null>(null)
  const [alcohol, setAlcohol] = useState<1|2|3|null>(null)
  // SOXAI sleep data (manual input)
  const [sleepScore, setSleepScore] = useState('')
  const [hrv, setHrv] = useState('')
  const [sleepH, setSleepH] = useState('')
  const [sleepM, setSleepM] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // 'after' = 昨日がアーマパーチャナの日だった。できたかどうかは終わってみないと分からないので翌朝に振り返る
  const [fastingAlert, setFastingAlert] = useState<'eve' | 'day' | 'after' | null>(null)
  const [fastingHabitId, setFastingHabitId] = useState<string | null>(null)
  const [fastingDone, setFastingDone] = useState<boolean | null>(null)

  // Asukken photo upload
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tongue photo upload（3段階の目盛りでは拾えない差を後から見返すため）
  const [tonguePhotoUrl, setTonguePhotoUrl] = useState<string | null>(null)
  const [tongueUploading, setTongueUploading] = useState(false)
  const tongueInputRef = useRef<HTMLInputElement>(null)

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
        if (data.sleep_score != null) setSleepScore(String(data.sleep_score))
        if (data.hrv != null) setHrv(String(data.hrv))
        if (data.sleep_hours != null) {
          const [h, m] = decimalToHHMM(Number(data.sleep_hours)).split(':')
          setSleepH(h); setSleepM(m)
        }
        if (data.note) setNote(data.note)
        if (data.asukken_photo_url) setPhotoUrl(data.asukken_photo_url)
        if (data.tongue_photo_url) setTonguePhotoUrl(data.tongue_photo_url)
        if (data.dinacharya_flags) setDinacharya((prev) => ({ ...prev, ...data.dinacharya_flags }))
      })

    fetch('/api/settings')
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.fasting_day == null) return
        const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
        const todayDow = nowJST.getDay()
        const tomorrowDow = (todayDow + 1) % 7
        const yesterdayDow = (todayDow + 6) % 7
        if (todayDow === data.fasting_day) setFastingAlert('day')
        else if (tomorrowDow === data.fasting_day) setFastingAlert('eve')
        else if (yesterdayDow === data.fasting_day) {
          // 昨日の分をこれから振り返る。すでに付けてあれば、その状態を出す
          setFastingAlert('after')
          fetch(`/api/habits?date=${previousDay(today)}`)
            .then((r) => r.json())
            .then(({ data: habits }) => {
              const h = (habits ?? []).find((x: { name: string }) => x.name === 'ファスティング')
              if (!h) return
              setFastingHabitId(h.id)
              if (h.log_id) setFastingDone(h.completed)
            })
        }
      })
  }, [today])

  // 昨日の日付で habit_logs に書く。当日チェックだと「やりきったか」がまだ分からない
  async function saveFasting(done: boolean) {
    if (!fastingHabitId) return
    setFastingDone(done)
    await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: previousDay(today), habit_id: fastingHabitId, completed: done }),
    })
  }

  async function uploadPhoto(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'asukken' | 'tongue',
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('date', today)
      formData.append('kind', kind)
      const res = await fetch('/api/upload-photo', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        setUrl(url)
      }
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (incomplete) return
    if (clarity === null || tongue === null || tongueColor === null || hunger === null) return
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
          sleep_score: sleepScore,
          hrv,
          sleep_hours: (sleepH || sleepM) ? hhmmToDecimal(`${sleepH || '0'}:${sleepM || '0'}`) : null,
          note: note || null,
          asukken_photo_url: photoUrl || null,
          tongue_photo_url: tonguePhotoUrl || null,
          dinacharya_flags: dinacharya,
        }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  function toggleDinacharya(key: DinacharyaKey) {
    setDinacharya((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const dinacharyaDone = Object.values(dinacharya).filter(Boolean).length
  // 夕食を食べた日は時間と量まで、飲酒は毎日（HRV・睡眠との突き合わせに使うため）
  // 揃わなくても保存はできる。抜けはあとで日別画面から埋める
  const dinnerIncomplete = dinnerTime === null || (dinnerTime !== 0 && dinnerAmount === null) || alcohol === null
  const missing = [
    clarity === null && '頭のクリアさ',
    tongue === null && '舌の苔',
    tongueColor === null && '舌の色',
    hunger === null && '朝の空腹感',
    dinnerTime === null && '昨夜の夕食の時間',
    dinnerTime !== null && dinnerTime !== 0 && dinnerAmount === null && '昨夜の夕食の量',
    alcohol === null && '飲酒',
  ].filter(Boolean) as string[]

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
        {fastingAlert === 'after' && fastingHabitId && (
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-stone-600 mb-1">昨日のアーマパーチャナ</p>
            <p className="text-xs text-stone-400 mb-3">終わってから振り返る記録です</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'できた', value: true },
                { label: 'できなかった', value: false },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => saveFasting(o.value)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    fastingDone === o.value ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
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

        {/* Morning Clarity（オージャス／サットヴァの指標） */}
        <ChoiceSection
          label="目覚め（オージャス）"
          required
          options={[
            { value: 1, label: 'スッキリ' },
            { value: 2, label: '普通' },
            { value: 3, label: 'だるい' },
          ]}
          value={clarity}
          onChange={(v) => setClarity(v as 1|2|3)}
        />

        {/* Tongue Coating amount（アーマの量） */}
        <ChoiceSection
          label="舌苔の量（アーマ）"
          required
          options={[
            { value: 1, label: 'なし' },
            { value: 2, label: '少し' },
            { value: 3, label: '多い' },
          ]}
          value={tongue}
          onChange={(v) => setTongue(v as 1|2|3)}
        />

        {/* Tongue Coating color（アーマの質） */}
        <ChoiceSection
          label="舌苔の色（アーマ）"
          required
          options={[
            { value: 1, label: '白' },
            { value: 2, label: '黄色' },
            { value: 3, label: '褐色' },
          ]}
          value={tongueColor}
          onChange={(v) => setTongueColor(v as 1|2|3)}
        />

        {/* Tongue photo（任意） */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">舌の写真（任意）</h2>
          {tonguePhotoUrl ? (
            <div className="relative">
              <img src={tonguePhotoUrl} alt="舌" className="w-full rounded-xl object-cover max-h-64" />
              <button
                onClick={() => setTonguePhotoUrl(null)}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
              >
                削除
              </button>
            </div>
          ) : (
            <button
              onClick={() => tongueInputRef.current?.click()}
              disabled={tongueUploading}
              className="w-full py-8 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 text-sm flex flex-col items-center gap-2 active:bg-stone-50"
            >
              {tongueUploading ? (
                <span>アップロード中...</span>
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  <span>写真を追加</span>
                </>
              )}
            </button>
          )}
          <input
            ref={tongueInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => uploadPhoto(e, 'tongue', setTongueUploading, setTonguePhotoUrl)}
          />
        </section>

        {/* Morning Hunger（アグニが燃えているか） */}
        <ChoiceSection
          label="朝の空腹感（アグニ）"
          required
          options={[
            { value: 1, label: 'お腹空いた' },
            { value: 2, label: '少し' },
            { value: 3, label: '空かない' },
          ]}
          value={hunger}
          onChange={(v) => setHunger(v as 1|2|3)}
        />

        {/* Previous night dinner */}
        <section className={`bg-white rounded-2xl p-4 shadow-sm ${dinnerIncomplete ? 'ring-2 ring-amber-400' : ''}`}>
          <h2 className="text-sm font-semibold text-stone-600 mb-3">
            昨夜の夕食
            {dinnerIncomplete && (
              <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">未入力</span>
            )}
          </h2>
          <div className="space-y-3">
            <button onClick={() => setDinnerTime(dinnerTime === 0 ? null : 0)}
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

        {/* SOXAI sleep data */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-1">睡眠データ（SOXAI）</h2>
          <p className="text-xs text-stone-400 mb-3">SOXAIアプリの昨夜の数値を入力</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: '睡眠スコア', value: sleepScore, set: setSleepScore, unit: '', step: '1' },
              { label: 'HRV', value: hrv, set: setHrv, unit: 'ms', step: '1' },
            ] as const).map((f) => (
              <div key={f.label}>
                <p className="text-xs text-stone-400 mb-1 text-center">{f.label}</p>
                <div className="flex items-baseline bg-stone-50 rounded-xl px-2 py-2.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={f.step}
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder="-"
                    className="w-full text-center text-base font-semibold text-stone-700 bg-transparent outline-none"
                  />
                  {f.unit && <span className="text-xs text-stone-400 flex-shrink-0">{f.unit}</span>}
                </div>
              </div>
            ))}
            <div>
              <p className="text-xs text-stone-400 mb-1 text-center">睡眠時間</p>
              <div className="flex items-baseline justify-center bg-stone-50 rounded-xl px-2 py-2.5 gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={sleepH}
                  onChange={(e) => setSleepH(e.target.value.replace(/\D/g, ''))}
                  onFocus={(e) => e.target.select()}
                  placeholder="6"
                  className="w-8 text-center text-base font-semibold text-stone-700 bg-transparent outline-none"
                />
                <span className="text-base font-semibold text-stone-400">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={sleepM}
                  onChange={(e) => setSleepM(e.target.value.replace(/\D/g, ''))}
                  onFocus={(e) => e.target.select()}
                  placeholder="30"
                  className="w-8 text-center text-base font-semibold text-stone-700 bg-transparent outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Toilet Logger */}
        <ToiletLogger date={today} />

        {/* Caffeine Logger */}
        <CaffeineLogger date={today} />

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
            onChange={(e) => uploadPhoto(e, 'asukken', setPhotoUploading, setPhotoUrl)}
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
        {!saved && missing.length > 0 && (
          <p className="text-xs text-stone-500 leading-relaxed">
            未入力：{missing.join('・')}
            <br />
            <span className="text-stone-400">このまま保存できます。あとから日別の記録で埋められます。</span>
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 ${
            saved ? 'bg-teal-600' : saving ? 'bg-stone-300' : 'bg-amber-800 shadow-md'
          }`}
        >
          {saved ? '記録完了！' : saving ? '保存中...' : missing.length > 0 ? `未入力${missing.length}件のまま保存` : '記録を保存'}
        </button>

        {/* 記録を終えてから昨日を見返す。忘れないうちに直せる場所がここしかない */}
        {saved && (
          <>
            <YesterdayReview date={previousDay(today)} />
            <button
              onClick={() => router.push('/')}
              className="w-full py-4 rounded-2xl font-bold text-stone-600 text-base bg-stone-100 active:scale-95 transition-all"
            >
              ホームへ
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ChoiceSection({
  label, options, value, onChange, required = false,
}: {
  label: string
  options: { value: number; label: string }[]
  value: number | null
  onChange: (v: number) => void
  required?: boolean
}) {
  return (
    <section className={`bg-white rounded-2xl p-4 shadow-sm ${required && value === null ? 'ring-2 ring-amber-400' : ''}`}>
      <h2 className="text-sm font-semibold text-stone-600 mb-3 flex items-center gap-2">
        {label}
        {required && value === null && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">未入力</span>
        )}
      </h2>
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
