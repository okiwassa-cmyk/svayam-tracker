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
  const [mode, setMode] = useState<'photo' | 'text'>('photo')
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

  useEffect(() => {
    loadMeals()
  }, [loadMeals])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
    analyzeFile(f)
  }

  async function analyzeFile(f: File) {
    setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('image', f)
      fd.append('date', today)
      fd.append('meal_type', mealType)
      await submitAnalysis(fd)
      setFile(null)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setAnalyzing(false)
    }
  }

  async function analyzeText() {
    if (!textInput.trim()) return
    setAnalyzing(true)
    try {
      const fd = new FormData()
      fd.append('text_description', textInput.trim())
      fd.append('date', today)
      fd.append('meal_type', mealType)
      await submitAnalysis(fd)
      setTextInput('')
    } finally {
      setAnalyzing(false)
    }
  }

  async function submitAnalysis(fd: FormData) {
    const res = await fetch('/api/meal', { method: 'POST', body: fd })
    const { analysis, error } = await res.json()
    if (error) { alert('エラー: ' + error); return }
    setResult(analysis)
    loadMeals()
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-stone-600 text-white px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold">食事記録</h1>
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
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {tab === 'history' && <HistoryView history={history} loading={loadingHistory} mealTypes={mealTypes} scoreLabels={scoreLabels} expandedId={expandedId} setExpandedId={setExpandedId} />}
        {tab === 'record' && <>
        {/* Upload / Text */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          {/* Mode toggle */}
          <div className="flex gap-1 mb-4 bg-stone-100 rounded-xl p-1">
            <button
              onClick={() => setMode('photo')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'photo' ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-400'}`}
            >
              📷 写真
            </button>
            <button
              onClick={() => setMode('text')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'text' ? 'bg-white text-stone-700 shadow-sm' : 'text-stone-400'}`}
            >
              ✏️ テキスト
            </button>
          </div>

          {/* Meal type selector */}
          <div className="flex gap-2 mb-3">
            {mealTypes.map((m) => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mealType === m.value
                    ? 'bg-stone-600 text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'photo' ? (
            <>
              {!preview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzing}
                  className="w-full border-2 border-dashed border-stone-200 rounded-xl p-8 flex flex-col items-center gap-2 text-stone-400 active:bg-stone-50"
                >
                  <span className="text-4xl">📷</span>
                  <span className="text-sm">タップして撮影・選択</span>
                  <span className="text-xs">選択すると自動で分析します</span>
                </button>
              ) : (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="食事写真" className="w-full rounded-xl object-cover max-h-64" />
                  {analyzing && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl animate-pulse">🌿</span>
                      <span className="text-white text-sm font-semibold">分析中...</span>
                    </div>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          ) : (
            <>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="例：鶏むね肉の蒸し野菜添え、玄米ご飯、みそ汁"
                className="w-full text-sm bg-stone-50 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-stone-400/30 mb-3"
                rows={3}
              />
              <button
                onClick={analyzeText}
                disabled={!textInput.trim() || analyzing}
                className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95 ${
                  textInput.trim() && !analyzing ? 'bg-stone-600 shadow-md' : 'bg-stone-300'
                }`}
              >
                {analyzing ? '🤔 分析中...' : '🌿 ドーシャ判定する'}
              </button>
            </>
          )}
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
                <div key={meal.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs text-stone-400 font-medium">
                        {mealTypes.find((m) => m.value === meal.meal_type)?.label ?? meal.meal_type}
                      </span>
                      <p className="font-semibold text-stone-700 text-sm mt-0.5">{meal.description}</p>
                      {meal.calories_estimate && (
                        <p className="text-xs text-stone-400">約 {meal.calories_estimate} kcal</p>
                      )}
                    </div>
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
                  </div>
                  {meal.advice && (
                    <p className="text-xs text-stone-500 mt-2 bg-stone-50 rounded-lg p-2">{meal.advice}</p>
                  )}
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
                className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
              >
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
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
