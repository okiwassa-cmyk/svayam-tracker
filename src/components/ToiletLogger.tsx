'use client'

import { useState, useEffect, useCallback } from 'react'

type ToiletLog = {
  id: string
  date: string
  logged_at: string
  type: 'bowel' | 'urine'
  condition: number
  note: string | null
  created_at: string
}

const bowelOptions = [
  { value: 1, label: '硬め',    color: 'bg-amber-700 text-white' },
  { value: 2, label: '普通',    color: 'bg-green-600 text-white' },
  { value: 3, label: '軟らかめ', color: 'bg-amber-500 text-white' },
  { value: 4, label: '水状',    color: 'bg-orange-500 text-white' },
]

function optionFor(condition: number) {
  return bowelOptions.find((o) => o.value === condition)
}

export default function ToiletLogger({ date }: { date: string }) {
  const [logs, setLogs] = useState<ToiletLog[]>([])
  const [activeType, setActiveType] = useState<'bowel' | null>(null)
  const [selectedCondition, setSelectedCondition] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/toilet?date=${date}`)
    const { data } = await res.json()
    setLogs(data ?? [])
  }, [date])

  useEffect(() => { load() }, [load])

  function openForm() {
    setActiveType('bowel')
    setSelectedCondition(null)
    setNote('')
  }

  function cancel() {
    setActiveType(null)
    setSelectedCondition(null)
    setNote('')
  }

  async function save() {
    if (!activeType || selectedCondition == null) return
    setSaving(true)
    await fetch('/api/toilet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, type: 'bowel', condition: selectedCondition, note: note || null }),
    })
    setActiveType(null)
    setSelectedCondition(null)
    setNote('')
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    await fetch(`/api/toilet?id=${id}`, { method: 'DELETE' })
    load()
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const bowelLogs = logs.filter((l) => l.type === 'bowel')

  const currentOptions = bowelOptions

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-600 mb-3">排便記録</h2>

      {/* Log button */}
      <div className="mb-3">
        <button
          onClick={openForm}
          className="w-full py-2.5 rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold active:scale-95 active:bg-amber-100"
        >
          + 排便を記録
        </button>
      </div>

      {/* Existing logs */}
      {bowelLogs.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {bowelLogs.map((log) => {
            const opt = optionFor(log.condition)
            return (
              <div key={log.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">排便</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${opt?.color ?? 'bg-stone-200'}`}>
                    {opt?.label ?? log.condition}
                  </span>
                  {log.note && <span className="text-xs text-stone-500">{log.note}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">{formatTime(log.created_at)}</span>
                  <button onClick={() => remove(log.id)} className="text-stone-300 text-xs active:text-red-400">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {bowelLogs.length === 0 && !activeType && (
        <p className="text-xs text-stone-400 mb-3">まだ記録がありません</p>
      )}

      {/* Input form */}
      {activeType && (
        <div className="space-y-3 pt-3 border-t border-stone-100">
          <p className="text-xs text-stone-500 font-medium">排便の様子：</p>
          <div className="grid grid-cols-4 gap-2">
            {currentOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedCondition(opt.value)}
                className={`py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  selectedCondition === opt.value
                    ? opt.color + ' shadow-sm'
                    : 'bg-stone-50 text-stone-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
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
              disabled={selectedCondition == null || saving}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all ${
                selectedCondition != null && !saving ? 'bg-amber-700 active:scale-95' : 'bg-stone-300'
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
