'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import ToiletLogger from '@/components/ToiletLogger'
import ExerciseLogger from '@/components/ExerciseLogger'
import AbhyangaCheck from '@/components/AbhyangaCheck'
import type { MealLog } from '@/lib/types'

const RASA_ALL = ['甘', '酸', '塩', '辛', '苦', '渋']
const DAY_MAP = ['日', '月', '火', '水', '木', '金', '土']
const MEAL_LABEL: Record<string, string> = {
  breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食',
}

function shiftDay(date: string, diff: number) {
  const d = new Date(`${date}T00:00:00+09:00`)
  d.setDate(d.getDate() + diff)
  return d.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-')
}

function fmtDate(date: string) {
  const d = new Date(`${date}T00:00:00+09:00`)
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAY_MAP[d.getDay()]})`
}

function timeInJST(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function isoForDateTime(date: string, time: string) {
  const [h, m] = time.split(':').map(Number)
  return new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`).toISOString()
}

type DayRecord = {
  morning_clarity: number | null
  tongue_coating: number | null
  tongue_color: number | null
  morning_hunger: number | null
  dinner_time: number | null
  dinner_amount: number | null
  alcohol: number | null
  weight: number | null
  body_fat: number | null
  sleep_hours: number | null
  sleep_score: number | null
  hrv: number | null
  note: string | null
}

const EMPTY: DayRecord = {
  morning_clarity: null, tongue_coating: null, tongue_color: null, morning_hunger: null,
  dinner_time: null, dinner_amount: null, alcohol: null,
  weight: null, body_fat: null, sleep_hours: null, sleep_score: null, hrv: null, note: null,
}

// あとから抜けを埋めるための画面。朝の記録で必須をやめた分、
// ここで「何が空か」を見て直せるようにしている
export default function DayDetail() {
  const { date } = useParams<{ date: string }>()
  const [rec, setRec] = useState<DayRecord>(EMPTY)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [mealDrafts, setMealDrafts] = useState<MealDrafts>({})
  const [loading, setLoading] = useState(true)
  const [savingMealId, setSavingMealId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch(`/api/record?date=${date}`, { cache: 'no-store' }),
      fetch(`/api/meal?date=${date}`, { cache: 'no-store' }),
    ])
    const { data: record } = await r1.json()
    const { data: mealRows } = await r2.json()
    setRec({ ...EMPTY, ...(record ?? {}) })
    const rows: MealLog[] = (mealRows ?? []).sort(
      (a: MealLog, b: MealLog) => (a.logged_at ?? '').localeCompare(b.logged_at ?? '')
    )
    setMeals(rows)
    setMealDrafts(Object.fromEntries(
      rows.map((m) => [m.id, { menu: m.user_input ?? '', time: timeInJST(m.logged_at) }])
    ))
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])

  async function patchRecord(fields: Partial<DayRecord>) {
    setRec((p) => ({ ...p, ...fields }))
    await fetch('/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, ...fields }),
    })
  }

  async function saveMeal(meal: MealLog) {
    const d = mealDrafts[meal.id]
    if (!d) return
    setSavingMealId(meal.id)
    try {
      await fetch('/api/meal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: meal.id,
          user_input: d.menu.trim() || null,
          logged_at: d.time ? isoForDateTime(date, d.time) : meal.logged_at,
        }),
      })
      await load()
    } finally {
      setSavingMealId(null)
    }
  }

  async function saveRasa(id: string, rasa: string | null) {
    await fetch('/api/meal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rasa }),
    })
    await load()
  }

  const missing = [
    rec.morning_clarity === null && '頭のクリアさ',
    rec.tongue_coating === null && '舌の苔',
    rec.tongue_color === null && '舌の色',
    rec.morning_hunger === null && '朝の空腹感',
    rec.dinner_time === null && '夕食の時間',
    rec.dinner_time !== null && rec.dinner_time !== 0 && rec.dinner_amount === null && '夕食の量',
    rec.alcohol === null && '飲酒',
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-stone-700 text-white px-4 pt-12 pb-5">
        <Link href="/review" className="text-stone-300 text-sm mb-2 inline-block">← レビュー</Link>
        <div className="flex items-center justify-between">
          <Link href={`/day/${shiftDay(date, -1)}`} className="text-stone-300 text-sm px-2 py-1">← 前日</Link>
          <h1 className="text-xl font-bold">{fmtDate(date)}</h1>
          <Link href={`/day/${shiftDay(date, 1)}`} className="text-stone-300 text-sm px-2 py-1">翌日 →</Link>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {missing.length > 0 ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
              空いている項目：{missing.join('・')}
            </p>
          ) : (
            <p className="text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-xl p-3">
              朝の記録はすべて埋まっています
            </p>
          )}

          {/* 朝の記録 */}
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-stone-600">朝の記録</h2>
            <Chips
              label="目覚め（オージャス）"
              options={[{ v: 1, l: 'スッキリ' }, { v: 2, l: '普通' }, { v: 3, l: 'だるい' }]}
              value={rec.morning_clarity}
              onPick={(v) => patchRecord({ morning_clarity: v })}
            />
            <Chips
              label="舌苔の量（アーマ）"
              options={[{ v: 1, l: 'なし' }, { v: 2, l: '少し' }, { v: 3, l: '多い' }]}
              value={rec.tongue_coating}
              onPick={(v) => patchRecord({ tongue_coating: v })}
            />
            <Chips
              label="舌苔の色（アーマ）"
              options={[{ v: 1, l: '白' }, { v: 2, l: '黄色' }, { v: 3, l: '褐色' }]}
              value={rec.tongue_color}
              onPick={(v) => patchRecord({ tongue_color: v })}
            />
            <Chips
              label="朝の空腹感（アグニ）"
              options={[{ v: 1, l: 'お腹空いた' }, { v: 2, l: '少し' }, { v: 3, l: '空かない' }]}
              value={rec.morning_hunger}
              onPick={(v) => patchRecord({ morning_hunger: v })}
            />
          </section>

          {/* 前夜の夕食・飲酒 */}
          <section className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-stone-600">前夜の夕食・飲酒</h2>
            <button
              onClick={() => patchRecord({ dinner_time: rec.dinner_time === 0 ? null : 0, dinner_amount: null })}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                rec.dinner_time === 0 ? 'bg-stone-700 text-white' : 'bg-stone-50 text-stone-600'
              }`}
            >
              食べなかった
            </button>
            {rec.dinner_time !== 0 && (
              <>
                <Chips
                  label="夕食の時間"
                  options={[{ v: 1, l: '18時台' }, { v: 2, l: '19時台' }, { v: 3, l: '20時以降' }]}
                  value={rec.dinner_time}
                  onPick={(v) => patchRecord({ dinner_time: v })}
                />
                <Chips
                  label="夕食の量"
                  options={[{ v: 1, l: '軽め' }, { v: 2, l: '普通' }, { v: 3, l: '重め' }]}
                  value={rec.dinner_amount}
                  onPick={(v) => patchRecord({ dinner_amount: v })}
                />
              </>
            )}
            <Chips
              label="飲酒"
              options={[{ v: 1, l: 'なし' }, { v: 2, l: '少し' }, { v: 3, l: '飲んだ' }]}
              value={rec.alcohol}
              onPick={(v) => patchRecord({ alcohol: v })}
            />
          </section>

          {/* 数値 */}
          <NumberSection rec={rec} onSave={patchRecord} />

          {/* 食事 */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-600 mb-3">食事</h2>
            {meals.length === 0 ? (
              <p className="text-sm text-stone-400">この日の食事の記録はありません</p>
            ) : (
              <div className="space-y-5">
                {meals.map((meal) => {
                  const label = MEAL_LABEL[meal.meal_type] ?? meal.meal_type
                  if (meal.skipped) {
                    return (
                      <div key={meal.id} className="flex items-center gap-2 text-xs text-stone-400">
                        <span className="font-semibold">{label}</span>
                        <span>食べなかった</span>
                      </div>
                    )
                  }
                  const d = mealDrafts[meal.id] ?? { menu: '', time: '' }
                  const dirty = d.menu !== (meal.user_input ?? '') || d.time !== timeInJST(meal.logged_at)
                  const got = (meal.rasa ?? '').split('・').map((s) => s.trim()).filter(Boolean)

                  return (
                    <div key={meal.id}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-stone-600">{label}</span>
                        <input
                          type="time"
                          value={d.time}
                          onChange={(e) => setMealDrafts((p) => ({ ...p, [meal.id]: { ...d, time: e.target.value } }))}
                          className="text-xs bg-stone-50 rounded px-1.5 py-0.5 outline-none text-stone-600"
                        />
                        {dirty && (
                          <button
                            onClick={() => saveMeal(meal)}
                            disabled={savingMealId === meal.id}
                            className="ml-auto text-xs font-semibold text-teal-600"
                          >
                            {savingMealId === meal.id
                              ? d.menu !== (meal.user_input ?? '') ? '六味を付け直し中...' : '保存中...'
                              : '保存'}
                          </button>
                        )}
                      </div>

                      <textarea
                        value={d.menu}
                        onChange={(e) => setMealDrafts((p) => ({ ...p, [meal.id]: { ...d, menu: e.target.value } }))}
                        placeholder="料理名・食材"
                        rows={2}
                        className="w-full text-sm text-stone-700 bg-stone-50 rounded-xl p-2.5 resize-none outline-none focus:ring-2 focus:ring-stone-400/30 mb-1.5"
                      />

                      <div className="flex gap-1.5">
                        {RASA_ALL.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              const next = got.includes(r) ? got.filter((x) => x !== r) : [...got, r]
                              saveRasa(meal.id, next.length > 0 ? next.join('・') : null)
                            }}
                            className={`flex-1 py-1 rounded-lg text-center text-xs font-semibold transition-all active:scale-95 ${
                              got.includes(r)
                                ? 'bg-stone-600 text-white'
                                : 'bg-stone-50 text-stone-300 border border-dashed border-stone-200'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1">六味はタップで付け外しできます</p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <ToiletLogger date={date} />
          <ExerciseLogger date={date} />
          <AbhyangaCheck date={date} />

          {/* メモ */}
          <section className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-stone-600 mb-2">メモ</h2>
            <textarea
              value={rec.note ?? ''}
              onChange={(e) => setRec((p) => ({ ...p, note: e.target.value }))}
              onBlur={() => patchRecord({ note: rec.note?.trim() || null })}
              placeholder="この日の体調、気づきなど..."
              rows={3}
              className="w-full text-sm text-stone-700 bg-stone-50 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-stone-400/30"
            />
          </section>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

type MealDrafts = { [id: string]: { menu: string; time: string } }

function Chips({
  label, options, value, onPick,
}: {
  label: string
  options: { v: number; l: string }[]
  value: number | null
  onPick: (v: number) => void
}) {
  return (
    <div>
      <p className="text-xs text-stone-400 mb-2">
        {label}
        {value === null && <span className="ml-2 text-amber-600">未入力</span>}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onPick(o.v)}
            className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              value === o.v ? 'bg-stone-700 text-white' : 'bg-stone-50 text-stone-600'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}

function NumberSection({ rec, onSave }: { rec: DayRecord; onSave: (f: Partial<DayRecord>) => void }) {
  const fields = [
    { key: 'weight' as const, label: '体重', unit: 'kg' },
    { key: 'body_fat' as const, label: '体脂肪', unit: '%' },
    { key: 'sleep_hours' as const, label: '睡眠時間', unit: 'h' },
    { key: 'sleep_score' as const, label: '睡眠スコア', unit: '' },
    { key: 'hrv' as const, label: 'HRV', unit: 'ms' },
  ]

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600 mb-3">数値</h2>
      <div className="grid grid-cols-3 gap-2">
        {fields.map((f) => (
          <div key={f.key}>
            <p className="text-xs text-stone-400 mb-1 text-center">{f.label}</p>
            <div className="flex items-baseline bg-stone-50 rounded-xl px-2 py-2.5">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                defaultValue={rec[f.key] ?? ''}
                onBlur={(e) => {
                  const raw = e.target.value
                  const n = raw === '' ? null : Number(raw)
                  if (n !== rec[f.key]) onSave({ [f.key]: Number.isNaN(n) ? null : n })
                }}
                placeholder="-"
                className="w-full text-center text-base font-semibold text-stone-700 bg-transparent outline-none"
              />
              {f.unit && <span className="text-xs text-stone-400 flex-shrink-0">{f.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-stone-400 mt-2">入力欄から離れると保存されます</p>
    </section>
  )
}
