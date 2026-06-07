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
  excellent: { text: '◎ 優秀', class: 'bg-green-100 text-green-700' },
  good: { text: '○ 良い', class: 'bg-blue-100 text-blue-700' },
  caution: { text: '△ 注意', class: 'bg-amber-100 text-amber-700' },
  avoid: { text: '✗ 避けて', class: 'bg-red-100 text-red-700' },
}

const mealTypes = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch', label: '昼食' },
  { value: 'dinner', label: '夕食' },
  { value: 'snack', label: '間食' },
]

export default function MealPage() {
  const today = getTodayJST()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState<'record' | 'history'>('record')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [mealType, setMealType] = useState('lunch')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<{ description: string; calories_estimate: number; kapha_score: string; pitta_score: string; advice: string } | null>(null)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [history, setHistory] = useState<MealLog[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null)

  const loadMeals = useCallback(async () => {
    const res = await fetch(`/api/meal?date=${today}`)
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
    setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function analyze() {
    if (!file && !textInput.trim()) return
    setAnalyzing(true)
    try {
      const fd = new FormData()
      if (file) fd.append('image', file)
      if (textInput.trim()) fd.append('text_description', textInput.trim())
      fd.append('date', today)
      fd.append('meal_type', mealType)
      const res = await fetch('/api/meal', { method: 'POST', body: fd })
      const { analysis, error } = await res.json()
      if (error) { alert('エラー: ' + error); return }
      setResult(analysis)
      setFile(null)
      setPreview(null)
      setTextInput('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadMeals()
    } finally {
      setAnalyzing(false)
    }
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

  async function deleteMeal(id: string) {
    await fetch(`/api/meal?id=${id}`, { method: 'DELETE' })
    loadMeals()
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-stone-600 text-white px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">食事記録</h1>
          <a href="/guide" className="text-xs bg-stone-500/60 px-3 py-1.5 rounded-full text-stone-200 font-semibold">食事ガイド</a>
        </div>
        <p className="text-stone-300 text-sm mt-0.5">ドーシャ判定・過去の記録</p>
        {/* Tab bar */}
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
          <a
            href="/guide"
            className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-center text-stone-200"
          >
            ガイド
          </a>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {tab === 'history' && <HistoryView history={history} loading={loadingHistory} mealTypes={mealTypes} scoreLabels={scoreLabels} expandedId={expandedId} setExpandedId={setExpandedId} />}
        {tab === 'record' && <>
        {/* Input section */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {/* Photo area */}
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="食事写真" className="w-full object-cover max-h-64" />
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
            {/* Meal type */}
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

            {/* Text input */}
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="食べたもの・食材をメモ（写真だけでもOK）"
              className="w-full text-sm bg-stone-50 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-stone-400/30"
              rows={2}
            />

            {/* Analyze button */}
            <button
              onClick={analyze}
              disabled={(!file && !textInput.trim()) || analyzing}
              className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95 ${
                (file || textInput.trim()) && !analyzing ? 'bg-stone-700 shadow-md' : 'bg-stone-300'
              }`}
            >
              {analyzing ? '分析中...' : 'ドーシャ判定する'}
            </button>
          </div>
        </section>

        {/* Result */}
        {result && (
          <section className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <h3 className="font-bold text-green-800 mb-2">✅ 判定結果</h3>
            <p className="text-stone-700 font-semibold mb-1">🍽 {result.description}</p>
            <p className="text-stone-500 text-sm mb-3">約 {result.calories_estimate} kcal</p>
            <div className="flex gap-2 mb-3">
              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${scoreLabels[result.kapha_score as keyof typeof scoreLabels]?.class ?? 'bg-stone-100 text-stone-500'}`}>
                カファ {scoreLabels[result.kapha_score as keyof typeof scoreLabels]?.text}
              </span>
              <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${scoreLabels[result.pitta_score as keyof typeof scoreLabels]?.class ?? 'bg-stone-100 text-stone-500'}`}>
                ピッタ {scoreLabels[result.pitta_score as keyof typeof scoreLabels]?.text}
              </span>
            </div>
            <p className="text-sm text-stone-600 bg-white rounded-xl p-3">{result.advice}</p>
          </section>
        )}

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
                <div key={meal.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {meal.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={meal.image_url} alt={meal.description ?? ''} className="w-full max-h-48 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-stone-400 font-medium">
                          {mealTypes.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type}
                        </span>
                        <p className="font-semibold text-stone-700 text-sm mt-0.5">{meal.description}</p>
                        {meal.calories_estimate && (
                          <p className="text-xs text-stone-400">約 {meal.calories_estimate} kcal</p>
                        )}
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col gap-1 text-right">
                          {meal.kapha_score && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${scoreLabels[meal.kapha_score as keyof typeof scoreLabels]?.class}`}>
                              カ{scoreLabels[meal.kapha_score as keyof typeof scoreLabels]?.text.split(' ')[0]}
                            </span>
                          )}
                          {meal.pitta_score && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${scoreLabels[meal.pitta_score as keyof typeof scoreLabels]?.class}`}>
                              ピ{scoreLabels[meal.pitta_score as keyof typeof scoreLabels]?.text.split(' ')[0]}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteMeal(meal.id)}
                          className="p-1.5 text-stone-300 active:text-red-500 flex-shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {meal.advice && (
                      <p className="text-xs text-stone-500 mt-2 bg-stone-50 rounded-lg p-2">{meal.advice}</p>
                    )}
                    {/* User note */}
                    {editingNote?.id === meal.id ? (
                      <div className="mt-2 flex gap-2">
                        <textarea
                          value={editingNote.note}
                          onChange={(e) => setEditingNote({ id: meal.id, note: e.target.value })}
                          placeholder="メモを追加..."
                          rows={2}
                          className="flex-1 text-xs bg-stone-50 rounded-lg p-2 outline-none focus:ring-2 focus:ring-stone-400/30 resize-none"
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <button onClick={() => saveNote(meal.id, editingNote.note)} className="text-xs bg-stone-700 text-white px-2 py-1 rounded-lg">保存</button>
                          <button onClick={() => setEditingNote(null)} className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-lg">取消</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingNote({ id: meal.id, note: meal.user_note ?? '' })}
                        className="mt-2 w-full text-left"
                      >
                        {meal.user_note
                          ? <p className="text-xs text-stone-600 bg-amber-50 rounded-lg p-2">{meal.user_note}</p>
                          : <p className="text-xs text-stone-300 mt-1">+ メモを追加</p>
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        </>}
      </div>

      <BottomNav />
    </div>
  )
}

function HistoryView({
  history, loading, mealTypes, scoreLabels, expandedId, setExpandedId,
}: {
  history: MealLog[]
  loading: boolean
  mealTypes: { value: string; label: string }[]
  scoreLabels: Record<string, { text: string; class: string }>
  expandedId: string | null
  setExpandedId: (id: string | null) => void
}) {
  if (loading) return <div className="text-center text-stone-400 text-sm py-8">読み込み中...</div>
  if (history.length === 0) return <div className="text-center text-stone-400 text-sm py-8">まだ記録がありません</div>

  // Group by date
  const byDate: Record<string, MealLog[]> = {}
  for (const m of history) {
    if (!byDate[m.date]) byDate[m.date] = []
    byDate[m.date].push(m)
  }

  return (
    <div className="space-y-4">
      {Object.entries(byDate).map(([date, meals]) => (
        <section key={date}>
          <p className="text-xs font-semibold text-stone-400 mb-2">
            {new Date(date + 'T00:00:00+09:00').toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
          <div className="space-y-2">
            {meals.map((meal) => (
              <button
                key={meal.id}
                onClick={() => setExpandedId(expandedId === meal.id ? null : meal.id)}
                className="w-full bg-white rounded-2xl shadow-sm text-left overflow-hidden"
              >
                {/* Photo thumbnail */}
                {meal.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meal.image_url} alt={meal.description ?? ''} className="w-full max-h-48 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-stone-400 font-medium">
                        {mealTypes.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type}
                      </span>
                      <p className="font-semibold text-stone-700 text-sm mt-0.5 truncate">{meal.description}</p>
                      {meal.calories_estimate && (
                        <p className="text-xs text-stone-400">約 {meal.calories_estimate} kcal</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {meal.kapha_score && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${scoreLabels[meal.kapha_score as keyof typeof scoreLabels]?.class}`}>
                          カ{scoreLabels[meal.kapha_score as keyof typeof scoreLabels]?.text.split(' ')[0]}
                        </span>
                      )}
                      {meal.pitta_score && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${scoreLabels[meal.pitta_score as keyof typeof scoreLabels]?.class}`}>
                          ピ{scoreLabels[meal.pitta_score as keyof typeof scoreLabels]?.text.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  {expandedId === meal.id && meal.advice && (
                    <p className="text-xs text-stone-500 mt-3 bg-stone-50 rounded-lg p-3 leading-relaxed text-left">
                      {meal.advice}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
