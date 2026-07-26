'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import BottomNav from '@/components/BottomNav'
import type { MealLog } from '@/lib/types'

function getTodayJST() {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

const scoreLabels = {
  excellent: { text: '◎ 優秀', short: '◎', class: 'bg-green-100 text-green-700' },
  good:      { text: '○ 良い', short: '○', class: 'bg-blue-100 text-blue-700' },
  caution:   { text: '△ 注意', short: '△', class: 'bg-amber-100 text-amber-700' },
  avoid:     { text: '✗ 避けて', short: '✗', class: 'bg-red-100 text-red-700' },
}

const mealTypes = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch',     label: '昼食' },
  { value: 'dinner',    label: '夕食' },
  { value: 'snack',     label: '間食' },
]

async function compressImage(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('decode failed'))
    image.src = dataUrl
  })
  const maxDim = 1280
  let width = img.width
  let height = img.height
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unsupported')
  ctx.drawImage(img, 0, 0, width, height)
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('compress failed'))),
      'image/jpeg',
      0.8
    )
  })
}

function formatNoteForCopy(meal: MealLog) {
  const typeLabel = mealTypes.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type
  const timeStr = meal.logged_at
    ? new Date(meal.logged_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
    : ''
  const kapha = scoreLabels[meal.kapha_score as keyof typeof scoreLabels]
  const pitta = scoreLabels[meal.pitta_score as keyof typeof scoreLabels]

  return [
    `【${typeLabel}${timeStr ? ' ' + timeStr : ''}】`,
    meal.user_input ?? '',
    meal.calories_estimate ? `約 ${meal.calories_estimate} kcal` : '',
    kapha || pitta ? `カファ：${kapha?.short ?? '--'} / ピッタ：${pitta?.short ?? '--'}` : '',
    meal.rasa ? `六味：${meal.rasa}` : '',
    meal.advice ? `\nアドバイス：\n${meal.advice}` : '',
    meal.user_note ? `\nメモ：${meal.user_note}` : '',
  ].filter(Boolean).join('\n')
}

export default function MealPage() {
  const today = getTodayJST()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'record' | 'history'>('record')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileLoggedAt, setFileLoggedAt] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [analyzing, setAnalyzing] = useState(false)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [history, setHistory] = useState<MealLog[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null)
  const [editingTime, setEditingTime] = useState<{ id: string; time: string } | null>(null)
  const [editingInput, setEditingInput] = useState<{ id: string; text: string } | null>(null)
  const [hungryBefore, setHungryBefore] = useState<boolean | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadMeals = useCallback(async () => {
    const res = await fetch(`/api/meal?date=${today}`, { cache: 'no-store' })
    const { data } = await res.json()
    setMeals(data ?? [])
    setLoadingMeals(false)
  }, [today])

  const loadHistory = useCallback(async () => {
    if (loadingHistory) return
    setLoadingHistory(true)
    const res = await fetch('/api/meal?history=true')
    const { data } = await res.json()
    setHistory(data ?? [])
    setLoadingHistory(false)
  }, [loadingHistory])

  useEffect(() => { loadMeals() }, [loadMeals])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setFileLoggedAt(new Date().toISOString())
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function skipMeal(type: string) {
    await fetch('/api/meal', {
      method: 'POST',
      body: (() => {
        const fd = new FormData()
        fd.append('date', today)
        fd.append('meal_type', type)
        fd.append('skipped', 'true')
        fd.append('logged_at', new Date().toISOString())
        return fd
      })(),
    })
    loadMeals()
  }

  async function analyze() {
    if (!file && !textInput.trim()) return
    setAnalyzing(true)
    try {
      const fd = new FormData()
      if (file) {
        let imageBlob: Blob = file
        try {
          imageBlob = await compressImage(file)
        } catch {
          // Fall back to the original file if compression fails
        }
        fd.append('image', new File([imageBlob], 'meal.jpg', { type: 'image/jpeg' }))
      }
      if (textInput.trim()) fd.append('text_description', textInput.trim())
      fd.append('date', today)
      fd.append('meal_type', mealType)
      if (fileLoggedAt) fd.append('logged_at', fileLoggedAt)
      if (hungryBefore !== null) fd.append('hungry_before', String(hungryBefore))
      const res = await fetch('/api/meal', { method: 'POST', body: fd })
      const { error } = await res.json()
      if (error) { alert('エラー: ' + error); return }
      setFile(null)
      setFileLoggedAt(null)
      setPreview(null)
      setTextInput('')
      setHungryBefore(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadMeals()
    } catch (e) {
      alert('判定に失敗しました。通信環境を確認して、もう一度お試しください。\n' + String(e))
    } finally {
      setAnalyzing(false)
    }
  }

  async function copyMeal(meal: MealLog) {
    const text = formatNoteForCopy(meal)
    try {
      if (meal.image_url && navigator.canShare) {
        const res = await fetch(meal.image_url)
        const blob = await res.blob()
        const ext = blob.type.split('/')[1] ?? 'jpg'
        const f = new File([blob], `meal.${ext}`, { type: blob.type })
        if (navigator.canShare({ files: [f] })) {
          await navigator.share({ files: [f], text })
          return
        }
      }
      if (navigator.share) {
        await navigator.share({ text })
        return
      }
    } catch { /* cancelled or not supported */ }
    await navigator.clipboard.writeText(text)
    setCopiedId(meal.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function saveNote(id: string, note: string) {
    await fetch('/api/meal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_note: note || null }),
    })
    setEditingNote(null)
    loadMeals()
  }

  async function saveTime(id: string, timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number)
    const jstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    jstDate.setHours(h, m, 0, 0)
    const utcMs = jstDate.getTime() - (9 * 60 * 60 * 1000)
    const logged_at = new Date(utcMs).toISOString()
    await fetch('/api/meal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, logged_at }),
    })
    setEditingTime(null)
    loadMeals()
  }

  async function saveHungry(id: string, value: boolean | null) {
    await fetch('/api/meal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hungry_before: value }),
    })
    loadMeals()
  }

  async function saveInput(id: string, text: string) {
    await fetch('/api/meal', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_input: text.trim() || null }),
    })
    setEditingInput(null)
    loadMeals()
  }

  // 朝食・昼食はアグニの指標として必ず記録する（朝の記録の空腹感と対になる）
  const hungerRequired = (mealType === 'breakfast' || mealType === 'lunch') && hungryBefore === null

  async function deleteMeal(id: string) {
    await fetch(`/api/meal?id=${id}`, { method: 'DELETE' })
    loadMeals()
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-stone-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">食事記録</h1>
        </div>
        <p className="text-stone-300 text-sm mt-0.5">ドーシャ判定・過去の記録</p>
        <div className="flex gap-1 mt-4 bg-stone-500/40 rounded-xl p-1">
          <button
            onClick={() => setTab('record')}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'record' ? 'bg-white text-stone-700' : 'text-stone-200'}`}
          >
            今日記録する
          </button>
          <button
            onClick={() => { setTab('history'); loadHistory() }}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === 'history' ? 'bg-white text-stone-700' : 'text-stone-200'}`}
          >
            履歴
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {tab === 'history' && (
          <HistoryView
            history={history}
            loading={loadingHistory}
            mealTypes={mealTypes}
            scoreLabels={scoreLabels}
            copiedId={copiedId}
            onCopy={copyMeal}
          />
        )}
        {tab === 'record' && <>
        {!meals.some((m) => m.meal_type === 'breakfast') && (
          <button
            onClick={() => skipMeal('breakfast')}
            className="w-full py-3 rounded-2xl bg-stone-50 text-stone-400 text-sm font-medium active:bg-stone-100"
          >
            朝食を食べなかった
          </button>
        )}

        {/* Input section */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="食事写真" className="w-full object-cover object-top max-h-64" />
              <button
                onClick={() => { setPreview(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-stone-400 border-b border-stone-100 active:bg-stone-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="text-sm">写真を撮影・選択（任意）</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              {mealTypes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMealType(m.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mealType === m.value ? 'bg-stone-600 text-white' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 flex-shrink-0">
                食前お腹が空いていた？
                {hungerRequired && (
                  <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">必須</span>
                )}
              </span>
              <div className="flex gap-1.5 ml-auto">
                <button
                  onClick={() => setHungryBefore(hungryBefore === true ? null : true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${hungryBefore === true ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-500'}`}
                >
                  空腹
                </button>
                <button
                  onClick={() => setHungryBefore(hungryBefore === false ? null : false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${hungryBefore === false ? 'bg-stone-500 text-white' : 'bg-stone-100 text-stone-500'}`}
                >
                  空腹でない
                </button>
              </div>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="料理名・食材を入力（写真と一緒に解析されます）"
              className="w-full text-sm bg-stone-50 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-stone-400/30"
              rows={2}
            />

            <button
              onClick={analyze}
              disabled={(!file && !textInput.trim()) || analyzing || hungerRequired}
              className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95 ${
                (file || textInput.trim()) && !analyzing && !hungerRequired ? 'bg-stone-700 shadow-md' : 'bg-stone-300'
              }`}
            >
              {analyzing ? '分析中...' : hungerRequired ? '食前の空腹感を選んでください' : 'ドーシャ判定する'}
            </button>
          </div>
        </section>

        {/* 今日の六味（満たされたか） */}
        <RasaPanel date={today} refreshKey={meals.length} />

        {/* Today's meals */}
        <section>
          <h2 className="text-sm font-semibold text-stone-500 mb-3">今日の食事記録</h2>
          {loadingMeals ? (
            <div className="text-center text-stone-400 text-sm py-4">読み込み中...</div>
          ) : meals.length === 0 ? (
            <div className="text-center text-stone-400 text-sm py-4">まだ記録がありません</div>
          ) : (
            <div className="space-y-3">
              {meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  mealTypes={mealTypes}
                  scoreLabels={scoreLabels}
                  copiedId={copiedId}
                  editingTime={editingTime}
                  editingNote={editingNote}
                  editingInput={editingInput}
                  onCopy={copyMeal}
                  onDelete={deleteMeal}
                  onEditTime={(id, time) => setEditingTime({ id, time })}
                  onSaveTime={saveTime}
                  onCancelTime={() => setEditingTime(null)}
                  onEditNote={(id, note) => setEditingNote({ id, note })}
                  onSaveNote={saveNote}
                  onCancelNote={() => setEditingNote(null)}
                  onSaveHungry={saveHungry}
                  onEditInput={(id, text) => setEditingInput({ id, text })}
                  onSaveInput={saveInput}
                  onCancelInput={() => setEditingInput(null)}
                />
              ))}
            </div>
          )}
        </section>

        {!meals.some((m) => m.meal_type === 'dinner') && (
          <button
            onClick={() => skipMeal('dinner')}
            className="w-full py-3 rounded-2xl bg-stone-50 text-stone-400 text-sm font-medium active:bg-stone-100"
          >
            夕食を食べなかった
          </button>
        )}
        </>}
      </div>

      <BottomNav />
    </div>
  )
}

const RASA_ALL = ['甘', '酸', '塩', '辛', '苦', '渋']

type RasaDish = { name: string; tastes: string[]; note: string }

function RasaPanel({ date, refreshKey }: { date: string; refreshKey: number }) {
  const [data, setData] = useState<{ got: string[]; missing: string[]; dishes: RasaDish[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/rasa-suggest?date=${date}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (!j.error) setData(j) })
      .finally(() => setLoading(false))
  }, [date, refreshKey])

  if (!data) return null

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-500">今日の六味</h2>
        <span className="text-xs text-stone-400">{data.got.length} / 6</span>
      </div>
      <div className="flex gap-1.5 mb-3">
        {RASA_ALL.map((r) => (
          <span
            key={r}
            className={`flex-1 py-1.5 rounded-lg text-center text-xs font-semibold ${
              data.got.includes(r) ? 'bg-stone-600 text-white' : 'bg-stone-50 text-stone-300 border border-dashed border-stone-200'
            }`}
          >
            {r}
          </span>
        ))}
      </div>
      {data.missing.length === 0 ? (
        <p className="text-xs text-teal-700">六味がそろいました。</p>
      ) : (
        <>
          <p className="text-xs text-stone-400 mb-2">
            足りない味：<span className="font-semibold text-stone-600">{data.missing.join('・')}</span>
          </p>
          {loading ? (
            <p className="text-xs text-stone-400">今日の献立に足せる一品を考えています...</p>
          ) : data.dishes.length === 0 ? (
            <p className="text-xs text-stone-400">提案を出せませんでした。</p>
          ) : (
            <div className="space-y-2">
              {data.dishes.map((d) => (
                <div key={d.name} className="bg-stone-50 rounded-xl px-3 py-2">
                  <p className="text-sm font-semibold text-stone-700">
                    {d.name}
                    <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded align-middle">
                      {d.tastes?.join('・')}
                    </span>
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{d.note}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function MealCard({
  meal, mealTypes, scoreLabels, copiedId, editingTime, editingNote, editingInput,
  onCopy, onDelete, onEditTime, onSaveTime, onCancelTime, onEditNote, onSaveNote, onCancelNote,
  onSaveHungry, onEditInput, onSaveInput, onCancelInput,
}: {
  meal: MealLog
  mealTypes: { value: string; label: string }[]
  scoreLabels: Record<string, { text: string; short: string; class: string }>
  copiedId: string | null
  editingTime: { id: string; time: string } | null
  editingNote: { id: string; note: string } | null
  editingInput: { id: string; text: string } | null
  onCopy: (meal: MealLog) => void
  onDelete: (id: string) => void
  onEditTime: (id: string, time: string) => void
  onSaveTime: (id: string, time: string) => void
  onCancelTime: () => void
  onEditNote: (id: string, note: string) => void
  onSaveNote: (id: string, note: string) => void
  onCancelNote: () => void
  onSaveHungry: (id: string, value: boolean | null) => void
  onEditInput: (id: string, text: string) => void
  onSaveInput: (id: string, text: string) => void
  onCancelInput: () => void
}) {
  const typeLabel = mealTypes.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type
  const timeStr = meal.logged_at
    ? new Date(meal.logged_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
    : null

  if (meal.skipped) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 font-medium">{typeLabel}</span>
          <span className="text-xs text-stone-400">食べなかった</span>
        </div>
        <button onClick={() => onDelete(meal.id)} className="text-stone-300 text-xs active:text-red-400">✕</button>
      </div>
    )
  }

  const kapha = scoreLabels[meal.kapha_score as keyof typeof scoreLabels]
  const pitta = scoreLabels[meal.pitta_score as keyof typeof scoreLabels]

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {meal.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meal.image_url} alt="" className="w-full max-h-56 object-cover object-top" />
      )}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400 font-medium">{typeLabel}</span>
            {editingTime?.id === meal.id ? (
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={editingTime.time}
                  onChange={(e) => onEditTime(meal.id, e.target.value)}
                  className="text-xs bg-stone-100 rounded px-1 py-0.5 outline-none"
                />
                <button onClick={() => onSaveTime(meal.id, editingTime.time)} className="text-xs text-teal-600 font-semibold">保存</button>
                <button onClick={onCancelTime} className="text-xs text-stone-400">取消</button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const t = meal.logged_at
                    ? new Date(meal.logged_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false })
                    : new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false })
                  onEditTime(meal.id, t)
                }}
                className="text-xs text-stone-400 underline-offset-2 hover:underline"
              >
                {timeStr ?? '時刻を設定'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCopy(meal)}
              className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all ${copiedId === meal.id ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-500 active:bg-stone-200'}`}
            >
              {copiedId === meal.id ? 'コピー済み' : 'コピー'}
            </button>
            <button onClick={() => onDelete(meal.id)} className="p-1.5 text-stone-300 active:text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Dish name (editable) */}
        {editingInput?.id === meal.id ? (
          <div className="flex gap-2 mb-1">
            <input
              type="text"
              value={editingInput.text}
              onChange={(e) => onEditInput(meal.id, e.target.value)}
              placeholder="料理名・食材"
              className="flex-1 text-base font-semibold text-stone-800 bg-stone-50 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-stone-400/30"
              autoFocus
            />
            <button onClick={() => onSaveInput(meal.id, editingInput.text)} className="text-xs text-teal-600 font-semibold px-1">保存</button>
            <button onClick={onCancelInput} className="text-xs text-stone-400 px-1">取消</button>
          </div>
        ) : (
          <button
            onClick={() => onEditInput(meal.id, meal.user_input ?? '')}
            className="text-left mb-1 w-full"
          >
            {meal.user_input
              ? <span className="text-base font-semibold text-stone-800 hover:underline underline-offset-2">{meal.user_input}</span>
              : <span className="text-sm text-stone-300">+ 料理名を追加</span>}
          </button>
        )}

        {/* Calories */}
        {meal.calories_estimate && (
          <p className="text-sm text-stone-500 mb-2">約 {meal.calories_estimate} kcal</p>
        )}

        {/* Scores */}
        {(kapha || pitta) && (
          <div className="flex gap-2 mb-3">
            {kapha && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${kapha.class}`}>
                カファ {kapha.text}
              </span>
            )}
            {pitta && (
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${pitta.class}`}>
                ピッタ {pitta.text}
              </span>
            )}
          </div>
        )}

        {/* Rasa (six tastes) */}
        {meal.rasa && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <span className="text-xs text-stone-400">六味</span>
            {meal.rasa.split('・').map((r, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Advice */}
        {meal.advice && (
          <div className="bg-stone-50 rounded-xl p-3 mb-2">
            <p className="text-xs text-stone-400 font-semibold mb-1">アドバイス</p>
            <p className="text-sm text-stone-600 leading-relaxed">{meal.advice}</p>
          </div>
        )}

        {/* Hungry before (editable, so it can be set even if forgotten at logging) */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-stone-400 flex-shrink-0">食前お腹が空いていた？</span>
          <div className="flex gap-1.5 ml-auto">
            <button
              onClick={() => onSaveHungry(meal.id, meal.hungry_before === true ? null : true)}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${meal.hungry_before === true ? 'bg-green-600 text-white' : 'bg-stone-100 text-stone-500'}`}
            >
              空腹
            </button>
            <button
              onClick={() => onSaveHungry(meal.id, meal.hungry_before === false ? null : false)}
              className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all ${meal.hungry_before === false ? 'bg-stone-500 text-white' : 'bg-stone-100 text-stone-500'}`}
            >
              空腹でない
            </button>
          </div>
        </div>

        {/* Note */}
        {editingNote?.id === meal.id ? (
          <div className="flex gap-2">
            <textarea
              value={editingNote.note}
              onChange={(e) => onEditNote(meal.id, e.target.value)}
              placeholder="メモを追加..."
              rows={2}
              className="flex-1 text-xs bg-stone-50 rounded-lg p-2 outline-none focus:ring-2 focus:ring-stone-400/30 resize-none"
              autoFocus
            />
            <div className="flex flex-col gap-1">
              <button onClick={() => onSaveNote(meal.id, editingNote.note)} className="text-xs bg-stone-700 text-white px-2 py-1 rounded-lg">保存</button>
              <button onClick={onCancelNote} className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-lg">取消</button>
            </div>
          </div>
        ) : (
          <button onClick={() => onEditNote(meal.id, meal.user_note ?? '')} className="w-full text-left">
            {meal.user_note
              ? <p className="text-xs text-stone-600 bg-amber-50 rounded-lg p-2">{meal.user_note}</p>
              : <p className="text-xs text-stone-300">+ メモを追加</p>
            }
          </button>
        )}
      </div>
    </div>
  )
}

function HistoryView({
  history, loading, mealTypes, scoreLabels, copiedId, onCopy,
}: {
  history: MealLog[]
  loading: boolean
  mealTypes: { value: string; label: string }[]
  scoreLabels: Record<string, { text: string; short: string; class: string }>
  copiedId: string | null
  onCopy: (meal: MealLog) => void
}) {
  if (loading) return <div className="text-center text-stone-400 text-sm py-8">読み込み中...</div>
  if (history.length === 0) return <div className="text-center text-stone-400 text-sm py-8">まだ記録がありません</div>

  const byDate: Record<string, MealLog[]> = {}
  for (const m of history) {
    if (!byDate[m.date]) byDate[m.date] = []
    byDate[m.date].push(m)
  }

  return (
    <div className="space-y-6">
      {Object.entries(byDate).map(([date, meals]) => (
        <section key={date}>
          <p className="text-xs font-semibold text-stone-400 mb-2">
            {new Date(date + 'T00:00:00+09:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
          <div className="space-y-3">
            {meals.filter((m) => !m.skipped).map((meal) => {
              const typeLabel = mealTypes.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type
              const timeStr = meal.logged_at
                ? new Date(meal.logged_at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
                : null
              const kapha = scoreLabels[meal.kapha_score as keyof typeof scoreLabels]
              const pitta = scoreLabels[meal.pitta_score as keyof typeof scoreLabels]

              return (
                <div key={meal.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {meal.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meal.image_url} alt="" className="w-1/2 object-contain" />
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400 font-medium">{typeLabel}</span>
                        {timeStr && <span className="text-xs text-stone-400">{timeStr}</span>}
                      </div>
                      <button
                        onClick={() => onCopy(meal)}
                        className={`text-xs px-2 py-1 rounded-lg font-semibold transition-all ${copiedId === meal.id ? 'bg-teal-100 text-teal-700' : 'bg-stone-100 text-stone-500 active:bg-stone-200'}`}
                      >
                        {copiedId === meal.id ? 'コピー済み' : 'コピー'}
                      </button>
                    </div>

                    {meal.user_input && (
                      <p className="text-base font-semibold text-stone-800 mb-1">{meal.user_input}</p>
                    )}
                    {meal.calories_estimate && (
                      <p className="text-sm text-stone-500 mb-2">約 {meal.calories_estimate} kcal</p>
                    )}
                    {(kapha || pitta) && (
                      <div className="flex gap-2 mb-3">
                        {kapha && <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${kapha.class}`}>カファ {kapha.text}</span>}
                        {pitta && <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${pitta.class}`}>ピッタ {pitta.text}</span>}
                      </div>
                    )}
                    {meal.rasa && (
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <span className="text-xs text-stone-400">六味</span>
                        {meal.rasa.split('・').map((r, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600">{r}</span>
                        ))}
                      </div>
                    )}
                    {meal.advice && (
                      <div className="bg-stone-50 rounded-xl p-3">
                        <p className="text-xs text-stone-400 font-semibold mb-1">アドバイス</p>
                        <p className="text-sm text-stone-600 leading-relaxed">{meal.advice}</p>
                      </div>
                    )}
                    {meal.user_note && (
                      <p className="text-xs text-stone-600 bg-amber-50 rounded-lg p-2 mt-2">{meal.user_note}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
