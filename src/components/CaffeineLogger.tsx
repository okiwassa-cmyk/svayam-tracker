'use client'

import { useState, useEffect, useCallback } from 'react'
import { timeInJST, isoForDateTime, nowTimeJST } from '@/lib/time'

type CaffeineLog = {
  id: string
  date: string
  logged_at: string
  type: string
  cups: number
  note: string | null
  created_at: string
}

const typeOptions = [
  { value: 'コーヒー', emoji: '☕️' },
  { value: '紅茶', emoji: '🫖' },
  { value: '緑茶', emoji: '🍵' },
  { value: '抹茶', emoji: '🍵' },
  { value: 'その他', emoji: '🥤' },
]

function emojiFor(type: string) {
  return typeOptions.find((o) => o.value === type)?.emoji ?? '🥤'
}

export default function CaffeineLogger({ date }: { date: string }) {
  const [logs, setLogs] = useState<CaffeineLog[]>([])
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<string | null>(null)
  const [cups, setCups] = useState(1)
  const [note, setNote] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/caffeine?date=${date}`)
    const { data } = await res.json()
    setLogs(data ?? [])
  }, [date])

  useEffect(() => { load() }, [load])

  function openForm() {
    setOpen(true)
    setType(null)
    setCups(1)
    setNote('')
    setTime(nowTimeJST())
  }

  function cancel() {
    setOpen(false)
    setType(null)
    setCups(1)
    setNote('')
    setTime('')
  }

  async function save() {
    if (!type) return
    setSaving(true)
    await fetch('/api/caffeine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        type,
        cups,
        note: note || null,
        logged_at: time ? isoForDateTime(date, time) : null,
      }),
    })
    cancel()
    setSaving(false)
    load()
  }

  // 飲んだ時刻を後から直せる。睡眠・HRVとの突き合わせに効くのは「記録した時刻」ではなく「飲んだ時刻」
  async function updateTime(id: string, next: string) {
    if (!next) return
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, logged_at: isoForDateTime(date, next) } : l)))
    await fetch('/api/caffeine', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, logged_at: isoForDateTime(date, next) }),
    })
  }

  async function remove(id: string) {
    await fetch(`/api/caffeine?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600 mb-3">カフェイン記録</h2>

      <button
        onClick={openForm}
        className="w-full py-2.5 rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold active:scale-95 active:bg-amber-100 mb-3"
      >
        + カフェインを記録
      </button>

      {logs.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{emojiFor(log.type)}</span>
                <span className="text-xs font-semibold text-stone-600">{log.type}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-700 text-white">{log.cups}杯</span>
                {log.note && <span className="text-xs text-stone-500">{log.note}</span>}
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

      {logs.length === 0 && !open && (
        <p className="text-xs text-stone-400 mb-3">まだ記録がありません</p>
      )}

      {open && (
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <p className="text-xs text-stone-500 font-medium">種類：</p>
          <div className="grid grid-cols-5 gap-2">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  type === opt.value ? 'bg-amber-700 text-white shadow-sm' : 'bg-stone-50 text-stone-600'
                }`}
              >
                <span className="block text-sm">{opt.emoji}</span>
                {opt.value}
              </button>
            ))}
          </div>

          <p className="text-xs text-stone-500 font-medium">杯数：</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCups((c) => Math.max(1, c - 1))}
              className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 text-xl font-semibold active:scale-95"
            >
              −
            </button>
            <span className="text-2xl font-bold text-stone-700 w-12 text-center">{cups}</span>
            <button
              onClick={() => setCups((c) => Math.min(20, c + 1))}
              className="w-10 h-10 rounded-full bg-stone-100 text-stone-600 text-xl font-semibold active:scale-95"
            >
              ＋
            </button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-stone-500 font-medium">飲んだ時刻：</p>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="text-sm bg-stone-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-700/20 text-stone-700"
            />
          </div>

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="メモ（任意）"
            className="w-full text-sm bg-stone-50 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-700/20"
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
              disabled={type == null || saving}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
                type != null && !saving ? 'bg-amber-700 active:scale-95' : 'bg-stone-300'
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
