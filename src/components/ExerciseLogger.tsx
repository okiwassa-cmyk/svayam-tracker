'use client'

import { useState, useEffect, useCallback } from 'react'
import { timeInJST, isoForDateTime, nowTimeJST } from '@/lib/time'

type ExerciseLog = {
  id: string
  date: string
  logged_at: string
  type: string
  duration_min: number
  note: string | null
  created_at: string
}

const EXERCISE_TYPES = ['ヨガ', 'ボクササイズ', 'ランニング', '自転車', '散歩', 'その他']

export default function ExerciseLogger({ date }: { date: string }) {
  const [logs, setLogs] = useState<ExerciseLog[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [duration, setDuration] = useState('')
  const [note, setNote] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/exercise?date=${date}`)
    const { data } = await res.json()
    setLogs(data ?? [])
  }, [date])

  useEffect(() => { load() }, [load])

  function openForm() {
    setShowForm(true)
    setSelectedType(null)
    setDuration('')
    setNote('')
    setTime(nowTimeJST())
  }

  function cancel() {
    setShowForm(false)
    setSelectedType(null)
    setDuration('')
    setNote('')
    setTime('')
  }

  async function save() {
    if (!selectedType || !duration) return
    const mins = parseInt(duration)
    if (!mins || mins <= 0) return
    setSaving(true)
    await fetch('/api/exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        type: selectedType,
        duration_min: mins,
        note: note || null,
        logged_at: time ? isoForDateTime(date, time) : null,
      }),
    })
    cancel()
    setSaving(false)
    load()
  }

  // 運動した時刻を後から直せる。記録した時刻とは別物
  async function updateTime(id: string, next: string) {
    if (!next) return
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, logged_at: isoForDateTime(date, next) } : l)))
    await fetch('/api/exercise', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, logged_at: isoForDateTime(date, next) }),
    })
  }

  async function remove(id: string) {
    await fetch(`/api/exercise?id=${id}`, { method: 'DELETE' })
    load()
  }

  const totalMin = logs.reduce((sum, l) => sum + l.duration_min, 0)

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-600">運動記録</h2>
          {totalMin > 0 && (
            <p className="text-xs text-teal-600 font-semibold mt-0.5">合計 {totalMin} 分</p>
          )}
        </div>
        <button
          onClick={openForm}
          className="text-xs bg-teal-700 text-white px-3 py-1.5 rounded-lg font-semibold active:scale-95"
        >
          + 記録する
        </button>
      </div>

      {/* Existing logs */}
      {logs.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-semibold">
                  {log.type}
                </span>
                <span className="text-xs font-semibold text-stone-700">{log.duration_min}分</span>
                {log.note && <span className="text-xs text-stone-400">{log.note}</span>}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={timeInJST(log.logged_at)}
                  onChange={(e) => updateTime(log.id, e.target.value)}
                  className="text-xs bg-white rounded px-1.5 py-0.5 outline-none text-stone-500"
                />
                <button onClick={() => remove(log.id)} className="text-stone-300 text-xs active:text-red-400">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length === 0 && !showForm && (
        <p className="text-xs text-stone-400 mb-1">まだ記録がありません</p>
      )}

      {/* Input form */}
      {showForm && (
        <div className="space-y-3 pt-3 border-t border-stone-100">
          {/* Type selection */}
          <div className="grid grid-cols-3 gap-2">
            {EXERCISE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  selectedType === type
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-stone-50 text-stone-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="時間"
              className="flex-1 text-sm bg-stone-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-700/20 text-center font-semibold"
            />
            <span className="text-sm text-stone-500 font-semibold">分</span>
          </div>

          {/* いつ運動したか */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-stone-500 font-medium">時刻：</p>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-sm bg-stone-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-700/20 text-stone-700"
            />
          </div>

          {/* Note */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-700/20"
          />

          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-500 text-sm font-semibold"
            >
              キャンセル
            </button>
            <button
              onClick={save}
              disabled={!selectedType || !duration || saving}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
                selectedType && duration && !saving ? 'bg-teal-700 active:scale-95' : 'bg-stone-300'
              }`}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
