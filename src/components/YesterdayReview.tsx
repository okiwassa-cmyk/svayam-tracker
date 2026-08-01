'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MealLog } from '@/lib/types'

const RASA_ALL = ['甘', '酸', '塩', '辛', '苦', '渋']

const MEAL_LABEL: Record<string, string> = {
  breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食',
}

function timeInJST(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// その日の HH:MM を UTC の ISO にする。日付は記録の日を使う（今日ではない）
function isoForDateTime(date: string, time: string) {
  const [h, m] = time.split(':').map(Number)
  return new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`).toISOString()
}

// 朝の記録を終えたあとに、昨日の食事を見返して直すための画面。
// テキストを直すとサーバー側で六味を付け直すので、保存には少し時間がかかる
export default function YesterdayReview({ date }: { date: string }) {
  const [meals, setMeals] = useState<MealLog[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { menu: string; time: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/meal?date=${date}`, { cache: 'no-store' })
    const { data } = await res.json()
    // APIは新しい順に返す。見返すときは食べた順のほうが辿りやすい
    const rows: MealLog[] = (data ?? []).sort(
      (a: MealLog, b: MealLog) => (a.logged_at ?? '').localeCompare(b.logged_at ?? '')
    )
    setMeals(rows)
    setDrafts(Object.fromEntries(
      rows.map((m) => [m.id, { menu: m.user_input ?? '', time: timeInJST(m.logged_at) }])
    ))
  }, [date])

  useEffect(() => { load() }, [load])

  async function save(meal: MealLog) {
    const d = drafts[meal.id]
    if (!d) return
    setSavingId(meal.id)
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
      setSavingId(null)
    }
  }

  if (!meals) return null

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600 mb-1">昨日のふりかえり</h2>
      <p className="text-xs text-stone-400 mb-3">{date}　違っていたら直せます</p>

      {meals.length === 0 ? (
        <p className="text-sm text-stone-400 py-2">昨日の食事の記録はありません</p>
      ) : (
        <div className="space-y-4">
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
            const d = drafts[meal.id] ?? { menu: '', time: '' }
            const dirty = d.menu !== (meal.user_input ?? '') || d.time !== timeInJST(meal.logged_at)
            const got = RASA_ALL.filter((r) => (meal.rasa ?? '').split('・').map((s) => s.trim()).includes(r))
            const missing = RASA_ALL.filter((r) => !got.includes(r))

            return (
              <div key={meal.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-stone-600">{label}</span>
                  <input
                    type="time"
                    value={d.time}
                    onChange={(e) => setDrafts((p) => ({ ...p, [meal.id]: { ...d, time: e.target.value } }))}
                    className="text-xs bg-stone-50 rounded px-1.5 py-0.5 outline-none text-stone-600"
                  />
                  {dirty && (
                    <button
                      onClick={() => save(meal)}
                      disabled={savingId === meal.id}
                      className="ml-auto text-xs font-semibold text-teal-600"
                    >
                      {savingId === meal.id
                        ? d.menu !== (meal.user_input ?? '') ? '六味を付け直し中...' : '保存中...'
                        : '保存'}
                    </button>
                  )}
                </div>

                <textarea
                  value={d.menu}
                  onChange={(e) => setDrafts((p) => ({ ...p, [meal.id]: { ...d, menu: e.target.value } }))}
                  placeholder="料理名・食材"
                  rows={2}
                  className="w-full text-sm text-stone-700 bg-stone-50 rounded-xl p-2.5 resize-none outline-none focus:ring-2 focus:ring-amber-700/30 mb-1.5"
                />

                <div className="flex gap-1.5">
                  {RASA_ALL.map((r) => (
                    <span
                      key={r}
                      className={`flex-1 py-1 rounded-lg text-center text-xs font-semibold ${
                        got.includes(r)
                          ? 'bg-stone-600 text-white'
                          : 'bg-stone-50 text-stone-300 border border-dashed border-stone-200'
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                </div>
                {missing.length > 0 && (
                  <p className="text-[10px] text-stone-400 mt-1">足りない味：{missing.join('・')}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
