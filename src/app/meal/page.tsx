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
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mealType, setMealType] = useState('lunch')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<{ description: string; calories_estimate: number; kapha_score: string; pitta_score: string; advice: string } | null>(null)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)

  const loadMeals = useCallback(async () => {
    const res = await fetch(`/api/meal?date=${today}`)
    const { data } = await res.json()
    setMeals(data ?? [])
    setLoadingMeals(false)
  }, [today])

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

      const res = await fetch('/api/meal', { method: 'POST', body: fd })
      const { analysis, error } = await res.json()

      if (error) {
        alert('エラー: ' + error)
        return
      }

      setResult(analysis)
      setFile(null)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadMeals()
    } finally {
      setAnalyzing(false)
    }
  }

  async function analyze() {
    if (!file) return
    await analyzeFile(file)
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-orange-600 text-white px-4 pt-12 pb-6">
        <p className="text-orange-200 text-sm">{today}</p>
        <h1 className="text-2xl font-bold mt-1">🍽 食事記録</h1>
        <p className="text-orange-200 text-sm mt-0.5">写真でドーシャ判定</p>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Upload */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">📷 食事写真をアップロード</h2>

          {/* Meal type selector */}
          <div className="flex gap-2 mb-3">
            {mealTypes.map((m) => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mealType === m.value
                    ? 'bg-orange-500 text-white'
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Upload area */}
          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              className="w-full border-2 border-dashed border-stone-200 rounded-xl p-8 flex flex-col items-center gap-2 text-stone-400 active:bg-stone-50"
            >
              <span className="text-4xl">📷</span>
              <span className="text-sm">タップして写真を選択</span>
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
      </div>

      <BottomNav />
    </div>
  )
}
